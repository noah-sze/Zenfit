import type { DetailedMuscle, WorkoutLog, Exercise, MuscleRole } from '@/types';
import { DEFAULT_EXERCISES } from '@/services/db/defaultData';

/**
 * 大肌群基準完全超補償恢復天數：3 天 (72 小時)
 */
export const LARGE_MUSCLE_RECOVERY_DAYS = 3;
export const LARGE_MUSCLE_RECOVERY_HOURS = 72;

/**
 * 小肌群基準完全超補償恢復天數：2 天 (48 小時)
 */
export const SMALL_MUSCLE_RECOVERY_DAYS = 2;
export const SMALL_MUSCLE_RECOVERY_HOURS = 48;

/**
 * 大肌群集合（神經徵召高、肌肉體積大、微創傷修復需 3 天 / 72h）
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
 * 小肌群集合（慢肌比例高或單關節孤立，修復需 2 天 / 48h）
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
 * 獲取肌群的標準恢復窗口（天數）
 */
export function getMuscleRecoveryWindowDays(muscle: DetailedMuscle): number {
  return LARGE_MUSCLES.has(muscle) ? LARGE_MUSCLE_RECOVERY_DAYS : SMALL_MUSCLE_RECOVERY_DAYS;
}

/**
 * 獲取肌群的標準恢復窗口（小時，向下相容）
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
  /** 距基準日期經過的天數，若從未刺激過為 null */
  daysElapsed: number | null;
  /** 距基準時間經過的小時數 (向下相容) */
  hoursElapsed: number | null;
  /** 估算恢復百分比 (0 ~ 100%)，從未刺激過為 100% */
  recoveryPercent: number;
  /** 視覺渲染強度數值 (0 ~ 100)，0 為完全恢復變淡透明，100 為深紅高刺激 */
  intensity: number;
  /** 客觀生理階段階梯 */
  tier: MuscleRecoveryTier;
  /** 最近一次受刺激的日期字串 (YYYY-MM-DD) */
  lastTrainedDate: string | null;
  /** 最近一次受刺激的時間戳 (ms) (向下相容) */
  lastTrainedTimestamp: number | null;
  /** 最近刺激該肌群的動作名稱 */
  lastExerciseName: string | null;
}

export interface BodyRecoverySummary {
  /** 各肌群的詳細恢復狀態 */
  muscles: Record<DetailedMuscle, DetailedMuscleRecoveryStatus>;
  /** 用於 BodyHighlighter 的純強度映射表 (0 ~ 100) */
  intensityMap: Partial<Record<DetailedMuscle, number>>;
  /** 處於急性修復期 (Day 0) 的肌群數量 */
  acuteCount: number;
  /** 處於恢復期 (未滿 100% 恢復) 的肌群總數 */
  recoveringCount: number;
  /** 最近一次訓練距今經過的天數 */
  latestWorkoutDaysElapsed: number | null;
  /** 最近一次訓練距今小時數 (向下相容) */
  latestWorkoutHoursElapsed: number | null;
}

export interface CalculateRecoveryOptions {
  /** 參考基準日期 (YYYY-MM-DD)，預設為今日 */
  referenceDate?: string;
  /** 參考基準時間戳 (向下相容) */
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
 * 計算兩日期之間的客觀跨日天數差 (Δdays = referenceDate - targetDate)
 * 使用 Date.UTC 杜絕任何時區與夏令時間誤差
 */
export function calculateDaysBetweenDates(targetDate: string, referenceDate: string): number {
  if (!targetDate || !referenceDate) return 0;
  const [tY, tM, tD] = targetDate.split('-').map(Number);
  const [rY, rM, rD] = referenceDate.split('-').map(Number);
  if (!tY || !tM || !tD || !rY || !rM || !rD) return 0;
  const utcTarget = Date.UTC(tY, tM - 1, tD);
  const utcRef = Date.UTC(rY, rM - 1, rD);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((utcRef - utcTarget) / msPerDay);
}

/**
 * 解析訓練記錄的時間戳 (向下相容工具)
 */
export function getWorkoutLogTimestamp(log: WorkoutLog): number {
  if (log.createdAt && !isNaN(log.createdAt) && log.createdAt > 0) {
    return log.createdAt;
  }
  const [year, month, day] = (log.date || '').split('-').map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day, 12, 0, 0).getTime();
  }
  return 0;
}

/**
 * 計算單一肌群的天數衰減強度 (方案 A：客觀日曆天數模型)
 * @param daysElapsed 經過天數
 * @param windowDays 基準完全恢復窗口（如大肌群 3 天、小肌群 2 天）
 * @param stimulusWeight 刺激權重 (0 ~ 1.0)
 * @returns intensity: 0 ~ 100
 */
export function calculateDecayedIntensity(
  daysElapsed: number,
  windowDays: number,
  stimulusWeight: number = 1.0
): number {
  if (daysElapsed < 0) return 100;
  if (daysElapsed >= windowDays) return 0;

  // 線性衰減並結合刺激角色權重
  const rawRatio = (1 - daysElapsed / windowDays) * stimulusWeight;
  const clamped = Math.max(0, Math.min(1, rawRatio));
  return Math.round(clamped * 100);
}

/**
 * 依據經過天數判定階梯 (方案 A)
 */
export function getRecoveryTier(
  daysElapsed: number | null,
  windowDays: number
): MuscleRecoveryTier {
  if (daysElapsed === null || daysElapsed >= windowDays) {
    return 'recovered';
  }
  if (daysElapsed === 0) {
    return 'acute';
  }
  if (daysElapsed === 1) {
    return 'recovering';
  }
  return 'near_ready';
}

/**
 * 全域計算全身肌群恢復狀態核心純函數 (方案 A：純粹客觀日曆天數模型)
 */
export function calculateBodyRecovery(
  logs: WorkoutLog[],
  options?: CalculateRecoveryOptions
): BodyRecoverySummary {
  const todayStr = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();
  const refDate = options?.referenceDate || todayStr;
  const exerciseMap = options?.exerciseMap;

  // 建立名稱索引快取
  const exerciseByNameMap = new Map<string, Exercise>();
  if (exerciseMap) {
    for (const ex of exerciseMap.values()) {
      if (ex.name) exerciseByNameMap.set(ex.name, ex);
    }
  }

  // 1. 初始化各肌群記錄快取
  const muscleLatestMap = new Map<
    DetailedMuscle,
    {
      date: string;
      daysElapsed: number;
      weight: number;
      exerciseName: string;
      timestamp: number;
    }
  >();

  let minWorkoutDaysElapsed: number | null = null;

  // 2. 遍歷歷史訓練記錄
  for (const log of logs) {
    if (!log.date) continue;
    const daysElapsed = calculateDaysBetweenDates(log.date, refDate);
    if (daysElapsed < 0) continue; // 未來記錄不計入

    if (minWorkoutDaysElapsed === null || daysElapsed < minWorkoutDaysElapsed) {
      minWorkoutDaysElapsed = daysElapsed;
    }

    // 遍歷所有動作組
    for (const group of log.exercises || []) {
      let targetMuscles: Partial<Record<DetailedMuscle, MuscleRole | number>> | undefined;
      const legacyName = (group as any).exerciseName;
      let exName = legacyName || '動作';

      // 1. 優先透過 exerciseId 匹配
      if (group.exerciseId && exerciseMap?.has(group.exerciseId)) {
        const ex = exerciseMap.get(group.exerciseId);
        targetMuscles = ex?.targetMuscles;
        if (ex?.name) exName = ex.name;
      }

      // 2. 次選透過 legacyName 在庫中匹配 (向後相容)
      if (!targetMuscles && legacyName) {
        const ex = exerciseByNameMap.get(legacyName);
        targetMuscles = ex?.targetMuscles;
        if (ex?.name) exName = ex.name;
      }

      // 3. 兜底在預設動作庫匹配 (處理舊組合或未載入情況)
      if (!targetMuscles && legacyName) {
        const defaultEx = DEFAULT_EXERCISES.find(
          (d) => d.name === legacyName || legacyName.startsWith(d.name)
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
        // 若尚未記錄，或當前 log 更近（daysElapsed 較小），或同日但刺激權重更高
        if (
          !existing ||
          daysElapsed < existing.daysElapsed ||
          (daysElapsed === existing.daysElapsed && weight > existing.weight)
        ) {
          muscleLatestMap.set(muscle, {
            date: log.date,
            daysElapsed,
            weight,
            exerciseName: exName,
            timestamp: log.createdAt || 0,
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
    const windowDays = getMuscleRecoveryWindowDays(muscle);

    if (!latest) {
      // 未曾訓練過：完全就緒
      musclesResult[muscle] = {
        muscle,
        daysElapsed: null,
        hoursElapsed: null,
        recoveryPercent: 100,
        intensity: 0,
        tier: 'recovered',
        lastTrainedDate: null,
        lastTrainedTimestamp: null,
        lastExerciseName: null,
      };
      intensityMap[muscle] = 0;
      continue;
    }

    const daysElapsed = latest.daysElapsed;
    const intensity = calculateDecayedIntensity(daysElapsed, windowDays, latest.weight);
    const recoveryPercent = Math.min(100, Math.max(0, Math.round((1 - intensity / 100) * 100)));
    const tier = getRecoveryTier(daysElapsed, windowDays);

    if (tier === 'acute') acuteCount++;
    if (tier !== 'recovered') recoveringCount++;

    musclesResult[muscle] = {
      muscle,
      daysElapsed,
      hoursElapsed: daysElapsed * 24,
      recoveryPercent,
      intensity,
      tier,
      lastTrainedDate: latest.date,
      lastTrainedTimestamp: latest.timestamp,
      lastExerciseName: latest.exerciseName,
    };
    intensityMap[muscle] = intensity;
  }

  return {
    muscles: musclesResult,
    intensityMap,
    acuteCount,
    recoveringCount,
    latestWorkoutDaysElapsed: minWorkoutDaysElapsed,
    latestWorkoutHoursElapsed: minWorkoutDaysElapsed !== null ? minWorkoutDaysElapsed * 24 : null,
  };
}
