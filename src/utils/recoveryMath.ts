import type { DetailedMuscle, WorkoutLog, Exercise, MuscleRole } from '@/types';
import { DEFAULT_EXERCISES } from '@/services/db/defaultData';

/**
 * 大肌群基準完全超補償恢復時長：72 小時
 */
export const LARGE_MUSCLE_RECOVERY_HOURS = 72;

/**
 * 小肌群基準完全超補償恢復時長：48 小時
 */
export const SMALL_MUSCLE_RECOVERY_HOURS = 48;

/**
 * 大肌群集合（神經徵召高、肌肉體積大、微創傷修復需 48～72h）
 */
export const LARGE_MUSCLES: ReadonlySet<DetailedMuscle> = new Set([
  'upper_chest',
  'mid_lower_chest',
  'lats',
  'upper_back_traps',
  'lower_back',
  'quads',
  'hamstrings',
  'glutes',
]);

/**
 * 小肌群集合（慢肌比例高或單關節孤立，修復需 24～48h）
 */
export const SMALL_MUSCLES: ReadonlySet<DetailedMuscle> = new Set([
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'calves',
]);

/**
 * 獲取肌群的標準恢復窗口（小時）
 */
export function getMuscleRecoveryWindowHours(muscle: DetailedMuscle): number {
  return LARGE_MUSCLES.has(muscle) ? LARGE_MUSCLE_RECOVERY_HOURS : SMALL_MUSCLE_RECOVERY_HOURS;
}

/**
 * 角色權重因子
 */
export function getMuscleRoleWeight(role: MuscleRole | number | undefined): number {
  if (role === undefined || role === null) return 0;
  if (typeof role === 'number') {
    return Math.max(0, Math.min(1, role / 100));
  }
  switch (role) {
    case 'primary':
      return 1.0;
    case 'secondary':
      return 0.6;
    case 'stabilizer':
      return 0.3;
    default:
      return 0.5;
  }
}

export type MuscleRecoveryTier = 'acute' | 'recovering' | 'near_ready' | 'recovered';

export interface DetailedMuscleRecoveryStatus {
  muscle: DetailedMuscle;
  /** 距基準時間經過的小時數，若從未刺激過為 null */
  hoursElapsed: number | null;
  /** 估算恢復百分比 (0 ~ 100%)，從未刺激過為 100% */
  recoveryPercent: number;
  /** 視覺渲染強度數值 (0 ~ 100)，0 為完全恢復變淡透明，100 為深紅高刺激 */
  intensity: number;
  /** 客觀生理階段階梯 */
  tier: MuscleRecoveryTier;
  /** 最近一次受刺激的時間戳 (ms) */
  lastTrainedTimestamp: number | null;
  /** 最近刺激該肌群的動作名稱 */
  lastExerciseName: string | null;
}

export interface BodyRecoverySummary {
  /** 各肌群的詳細恢復狀態 */
  muscles: Record<DetailedMuscle, DetailedMuscleRecoveryStatus>;
  /** 用於 BodyHighlighter 的純強度映射表 (0 ~ 100) */
  intensityMap: Partial<Record<DetailedMuscle, number>>;
  /** 處於急性修復期 (0~24h) 的肌群數量 */
  acuteCount: number;
  /** 處於恢復期 (未滿 100% 恢復) 的肌群總數 */
  recoveringCount: number;
  /** 最近一次訓練距今小時數 */
  latestWorkoutHoursElapsed: number | null;
}

export interface CalculateRecoveryOptions {
  /** 參考基準時間戳 (預設為 Date.now()) */
  referenceTimestamp?: number;
  /** 動作字典 Map */
  exerciseMap?: Map<string, Exercise>;
}

const ALL_DETAILED_MUSCLES: DetailedMuscle[] = [
  'upper_chest',
  'mid_lower_chest',
  'lats',
  'upper_back_traps',
  'lower_back',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
];

/**
 * 解析訓練記錄的時間戳
 */
export function getWorkoutLogTimestamp(log: WorkoutLog): number {
  if (log.createdAt && !isNaN(log.createdAt) && log.createdAt > 0) {
    return log.createdAt;
  }
  // 若僅有 YYYY-MM-DD，解析為當天正午 12:00:00，避免時區偏移
  const [year, month, day] = log.date.split('-').map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day, 12, 0, 0).getTime();
  }
  return 0;
}

/**
 * 計算單一肌群的時間衰減強度
 * @param hoursElapsed 經過小時數
 * @param windowHours 基準完全恢復窗口（如 72h 或 48h）
 * @param stimulusWeight 刺激權重 (0 ~ 1.0)
 * @returns intensity: 0 ~ 100
 */
export function calculateDecayedIntensity(
  hoursElapsed: number,
  windowHours: number,
  stimulusWeight: number = 1.0
): number {
  if (hoursElapsed < 0) return 100;
  if (hoursElapsed >= windowHours) return 0;

  // 線性衰減並結合刺激角色權重
  const rawRatio = (1 - hoursElapsed / windowHours) * stimulusWeight;
  const clamped = Math.max(0, Math.min(1, rawRatio));
  return Math.round(clamped * 100);
}

/**
 * 依據經過時數判定階梯
 */
export function getRecoveryTier(hoursElapsed: number | null, windowHours: number): MuscleRecoveryTier {
  if (hoursElapsed === null || hoursElapsed >= windowHours) {
    return 'recovered';
  }
  if (hoursElapsed <= 24) {
    return 'acute';
  }
  if (hoursElapsed <= 48) {
    return 'recovering';
  }
  return 'near_ready';
}

/**
 * 全域計算全身肌群恢復狀態核心純函數
 */
export function calculateBodyRecovery(
  logs: WorkoutLog[],
  options?: CalculateRecoveryOptions
): BodyRecoverySummary {
  const refTime = options?.referenceTimestamp ?? Date.now();
  const exerciseMap = options?.exerciseMap;

  // 建立名稱索引快取
  const exerciseByNameMap = new Map<string, Exercise>();
  if (exerciseMap) {
    for (const ex of exerciseMap.values()) {
      if (ex.name) exerciseByNameMap.set(ex.name, ex);
    }
  }

  // 1. 初始化各肌群空狀態
  const muscleLatestMap = new Map<
    DetailedMuscle,
    { timestamp: number; weight: number; exerciseName: string }
  >();

  let latestWorkoutTime: number | null = null;

  // 2. 遍歷歷史訓練記錄（按時間降序或比對最新）
  for (const log of logs) {
    let logTime = getWorkoutLogTimestamp(log);
    if (logTime <= 0) continue;

    // 若時間戳微大於參考時間 (如剛在當下添加的記錄)，收斂為當前基準時間
    if (logTime > refTime) {
      logTime = refTime;
    }

    if (latestWorkoutTime === null || logTime > latestWorkoutTime) {
      latestWorkoutTime = logTime;
    }

    // 遍歷所有動作組
    for (const group of log.exercises || []) {
      let targetMuscles: Partial<Record<DetailedMuscle, MuscleRole | number>> | undefined;
      let exName = group.exerciseName || '動作';

      // 1. 優先透過 exerciseId 匹配
      if (group.exerciseId && exerciseMap?.has(group.exerciseId)) {
        const ex = exerciseMap.get(group.exerciseId);
        targetMuscles = ex?.targetMuscles;
        if (ex?.name) exName = ex.name;
      }

      // 2. 次選透過 exerciseName 在庫中匹配
      if (!targetMuscles && group.exerciseName) {
        const ex = exerciseByNameMap.get(group.exerciseName);
        targetMuscles = ex?.targetMuscles;
        if (ex?.name) exName = ex.name;
      }

      // 3. 兜底在預設動作庫匹配 (處理舊組合或未載入情況)
      if (!targetMuscles && group.exerciseName) {
        const defaultEx = DEFAULT_EXERCISES.find(
          (d) => d.name === group.exerciseName || group.exerciseName.startsWith(d.name)
        );
        targetMuscles = defaultEx?.targetMuscles;
        if (defaultEx?.name) exName = defaultEx.name;
      }

      if (!targetMuscles) continue;

      // 檢查此動作中所有受刺激肌群
      for (const [mKey, role] of Object.entries(targetMuscles)) {
        const muscle = mKey as DetailedMuscle;
        const weight = getMuscleRoleWeight(role);
        if (weight <= 0) continue;

        const existing = muscleLatestMap.get(muscle);
        if (!existing || logTime > existing.timestamp) {
          muscleLatestMap.set(muscle, {
            timestamp: logTime,
            weight,
            exerciseName: exName,
          });
        }
      }
    }
  }

  // 3. 匯總計算 17 個肌群的恢復指標
  const musclesResult = {} as Record<DetailedMuscle, DetailedMuscleRecoveryStatus>;
  const intensityMap: Partial<Record<DetailedMuscle, number>> = {};
  let acuteCount = 0;
  let recoveringCount = 0;

  for (const muscle of ALL_DETAILED_MUSCLES) {
    const latest = muscleLatestMap.get(muscle);
    const windowHours = getMuscleRecoveryWindowHours(muscle);

    if (!latest) {
      // 未曾訓練過：完全就緒
      musclesResult[muscle] = {
        muscle,
        hoursElapsed: null,
        recoveryPercent: 100,
        intensity: 0,
        tier: 'recovered',
        lastTrainedTimestamp: null,
        lastExerciseName: null,
      };
      intensityMap[muscle] = 0;
      continue;
    }

    const diffMs = Math.max(0, refTime - latest.timestamp);
    const hoursElapsed = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
    const intensity = calculateDecayedIntensity(hoursElapsed, windowHours, latest.weight);
    const recoveryPercent = Math.min(100, Math.max(0, Math.round((1 - intensity / 100) * 100)));
    const tier = getRecoveryTier(hoursElapsed, windowHours);

    if (tier === 'acute') acuteCount++;
    if (tier !== 'recovered') recoveringCount++;

    musclesResult[muscle] = {
      muscle,
      hoursElapsed,
      recoveryPercent,
      intensity,
      tier,
      lastTrainedTimestamp: latest.timestamp,
      lastExerciseName: latest.exerciseName,
    };
    intensityMap[muscle] = intensity;
  }

  const latestWorkoutHoursElapsed =
    latestWorkoutTime !== null
      ? Math.round((Math.max(0, refTime - latestWorkoutTime) / (1000 * 60 * 60)) * 10) / 10
      : null;

  return {
    muscles: musclesResult,
    intensityMap,
    acuteCount,
    recoveringCount,
    latestWorkoutHoursElapsed,
  };
}
