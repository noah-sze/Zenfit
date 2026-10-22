import type { WorkoutRoutine, Exercise, DetailedMuscle, WorkoutSet } from '@/types';

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
        const val = typeof intensity === 'number' && !isNaN(intensity) ? intensity : 0;
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
