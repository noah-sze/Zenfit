import type { WorkoutRoutine, Exercise, DetailedMuscle, WorkoutSet, WorkoutLog } from '@/types';
import { muscleRoleToNumericWeight } from '@/utils/muscleIntensity';

/**
 * 預估 1RM 力量極限 (Brzycki Formula)
 * 公式: Weight * (36 / (37 - Reps))
 * 純函數，100% 覆蓋邊界情況
 */
export function calculateE1RM(weight: number, reps: number): number {
  if (typeof weight !== 'number' || isNaN(weight) || weight <= 0) {
    return 0;
  }
  if (typeof reps !== 'number' || isNaN(reps) || reps <= 0) {
    return 0;
  }

  const cleanWeight = Math.max(0, weight);
  const cleanReps = Math.floor(Math.max(1, reps));

  if (cleanReps === 1) {
    return Math.round(cleanWeight * 10) / 10;
  }

  // 防止次數 >= 37 導致分母 <= 0
  const clampedReps = Math.min(cleanReps, 36);
  const e1rm = cleanWeight * (36 / (37 - clampedReps));

  return Math.round(e1rm * 10) / 10;
}

/**
 * 計算已完成組的訓練總容量 (Total Volume, kg)
 * 公式: sum(Weight * Reps) for completed sets
 */
export function calculateTotalVolume(sets: Pick<WorkoutSet, 'weight' | 'reps' | 'isCompleted'>[]): number {
  if (!Array.isArray(sets)) return 0;

  const total = sets.reduce((acc, set) => {
    if (!set.isCompleted) return acc;
    const w = typeof set.weight === 'number' && !isNaN(set.weight) && set.weight > 0 ? set.weight : 0;
    const r = typeof set.reps === 'number' && !isNaN(set.reps) && set.reps > 0 ? set.reps : 0;
    return acc + w * r;
  }, 0);

  return Math.round(total * 10) / 10;
}

export interface MuscleSummary {
  muscle: DetailedMuscle;
  maxIntensity: number;
}

export interface RoutineFactSummary {
  exerciseCount: number;
  totalPlannedSets: number;
  coveredMuscles: MuscleSummary[];
}

/**
 * 統計訓練組合的純粹客觀事實：
 * - 總動作數
 * - 總計劃組數
 * - 涵蓋的目標肌群清單及在該組合中受刺激的最高強度
 */
export function getRoutineFactSummary(
  routine: Pick<WorkoutRoutine, 'exercises'> | null | undefined,
  exerciseMap: Map<string, Exercise>
): RoutineFactSummary {
  if (!routine || !Array.isArray(routine.exercises)) {
    return { exerciseCount: 0, totalPlannedSets: 0, coveredMuscles: [] };
  }

  const exerciseCount = routine.exercises.length;
  let totalPlannedSets = 0;
  const muscleIntensityMap = new Map<DetailedMuscle, number>();

  for (const item of routine.exercises) {
    totalPlannedSets += Math.max(0, Math.floor(item.defaultSets || 0));
    const ex = exerciseMap.get(item.exerciseId);
    if (ex && ex.targetMuscles) {
      for (const [mKey, intensity] of Object.entries(ex.targetMuscles)) {
        const muscle = mKey as DetailedMuscle;
        const val =
          typeof intensity === 'number' && !isNaN(intensity)
            ? Math.min(100, Math.max(0, intensity))
            : muscleRoleToNumericWeight(intensity);
        const existing = muscleIntensityMap.get(muscle) || 0;
        if (val > existing) {
          muscleIntensityMap.set(muscle, val);
        }
      }
    }
  }

  const coveredMuscles: MuscleSummary[] = Array.from(muscleIntensityMap.entries()).map(
    ([muscle, maxIntensity]) => ({
      muscle,
      maxIntensity,
    })
  );

  return {
    exerciseCount,
    totalPlannedSets,
    coveredMuscles,
  };
}

/**
 * 尋找指定動作在歷史訓練日誌中的最近一筆有效組記錄
 *
 * 排序優先級：
 * 1. 日期降序 (YYYY-MM-DD)
 * 2. 建立時間降序 (createdAt)
 *
 * 匹配條件：
 * - exerciseId 相同，或 exerciseName 不區分大小寫相同
 * - 組內 weight > 0
 *
 * 取得最近一筆有效組（同一動作群組中取最後一組有效記錄）
 */
export function findLastExerciseSet(
  logs: WorkoutLog[] | null | undefined,
  exerciseId: string,
  exerciseName?: string
): { weight: number; reps: number } | null {
  if (!Array.isArray(logs) || logs.length === 0) {
    return null;
  }

  const cleanExerciseId = exerciseId ? exerciseId.trim() : '';
  const cleanExerciseName = exerciseName ? exerciseName.trim().toLowerCase() : '';

  if (!cleanExerciseId && !cleanExerciseName) {
    return null;
  }

  // 1. 依日期降序，同日依建立時間降序排序
  const sortedLogs = [...logs].sort((a, b) => {
    const dateComp = (b.date || '').localeCompare(a.date || '');
    if (dateComp !== 0) return dateComp;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // 2. 依序遍歷排好序的日誌
  for (const log of sortedLogs) {
    if (!Array.isArray(log.exercises)) continue;

    // 從後往前尋找匹配的動作群組（同一訓練中若重複出現以最後一個為主）
    for (let g = log.exercises.length - 1; g >= 0; g--) {
      const exGroup = log.exercises[g];
      if (!exGroup) continue;

      const idMatch = Boolean(cleanExerciseId && exGroup.exerciseId === cleanExerciseId);
      const nameMatch = Boolean(
        cleanExerciseName &&
        (exGroup as any).exerciseName &&
        String((exGroup as any).exerciseName).trim().toLowerCase() === cleanExerciseName
      );

      if (idMatch || nameMatch) {
        if (Array.isArray(exGroup.sets)) {
          // 從後往前尋找最後一筆 weight > 0 的有效組
          for (let s = exGroup.sets.length - 1; s >= 0; s--) {
            const set = exGroup.sets[s];
            if (
              set &&
              typeof set.weight === 'number' &&
              !isNaN(set.weight) &&
              set.weight > 0
            ) {
              const validReps =
                typeof set.reps === 'number' && !isNaN(set.reps) && set.reps > 0
                  ? set.reps
                  : 10;
              return {
                weight: set.weight,
                reps: validReps,
              };
            }
          }
        }
      }
    }
  }

  return null;
}

export interface LastExerciseRecord {
  /** 歷史總組數 (至少為 1) */
  setsCount: number;
  /** 歷史各組重量列表 (長度為 setsCount，單位 kg) */
  weights: number[];
  /** 最新有效基準重量 (單位 kg) */
  lastWeight: number;
}

/**
 * 尋找指定動作在歷史訓練日誌中的最近一次完整記錄（包含組數與各組重量）
 *
 * 排序優先級：
 * 1. 日期降序 (YYYY-MM-DD)
 * 2. 建立時間降序 (createdAt)
 *
 * 匹配條件：
 * - exerciseId 相同，或 exerciseName 不區分大小寫相同
 * - 且該動作群組包含組數 (sets.length > 0)
 */
export function findLastExerciseRecord(
  logs: WorkoutLog[] | null | undefined,
  exerciseId: string,
  exerciseName?: string
): LastExerciseRecord | null {
  if (!Array.isArray(logs) || logs.length === 0) {
    return null;
  }

  const cleanExerciseId = exerciseId ? exerciseId.trim() : '';
  const cleanExerciseName = exerciseName ? exerciseName.trim().toLowerCase() : '';

  if (!cleanExerciseId && !cleanExerciseName) {
    return null;
  }

  // 1. 依日期降序，同日依建立時間降序排序
  const sortedLogs = [...logs].sort((a, b) => {
    const dateComp = (b.date || '').localeCompare(a.date || '');
    if (dateComp !== 0) return dateComp;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // 2. 依序遍歷排好序的日誌
  for (const log of sortedLogs) {
    if (!Array.isArray(log.exercises)) continue;

    for (let g = log.exercises.length - 1; g >= 0; g--) {
      const exGroup = log.exercises[g];
      if (!exGroup) continue;

      const idMatch = Boolean(cleanExerciseId && exGroup.exerciseId === cleanExerciseId);
      const nameMatch = Boolean(
        cleanExerciseName &&
        (exGroup as any).exerciseName &&
        String((exGroup as any).exerciseName).trim().toLowerCase() === cleanExerciseName
      );

      if (idMatch || nameMatch) {
        if (Array.isArray(exGroup.sets) && exGroup.sets.length > 0) {
          // 找出該群組中最後一筆 weight > 0 的有效基準重量
          let fallbackWeight = 20;
          for (let s = exGroup.sets.length - 1; s >= 0; s--) {
            const set = exGroup.sets[s];
            if (
              set &&
              typeof set.weight === 'number' &&
              !isNaN(set.weight) &&
              set.weight > 0
            ) {
              fallbackWeight = set.weight;
              break;
            }
          }

          // 提取各組重量，若某組 <= 0 或無重量則以 fallbackWeight 補充
          const weights = exGroup.sets.map((set) => {
            if (
              set &&
              typeof set.weight === 'number' &&
              !isNaN(set.weight) &&
              set.weight > 0
            ) {
              return set.weight;
            }
            return fallbackWeight;
          });

          return {
            setsCount: Math.max(1, exGroup.sets.length),
            weights,
            lastWeight: fallbackWeight,
          };
        }
      }
    }
  }

  return null;
}

