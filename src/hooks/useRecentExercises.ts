import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { WorkoutLog } from '@/types';

let inMemoryRecentExerciseIds: string[] | null = null;
let inMemoryRecentRoutineIds: string[] | null = null;

/**
 * 從歷史訓練日誌中提取去重、按最後訓練時間倒序排列的動作與組合 ID 列表 (Pure Function)
 */
export function extractRecentExerciseAndRoutineIds(workoutLogs: WorkoutLog[]): {
  recentExerciseIds: string[];
  recentRoutineIds: string[];
} {
  const exerciseLastUsedMap = new Map<string, number>();
  const routineLastUsedMap = new Map<string, number>();

  for (const log of workoutLogs) {
    const time = log.createdAt || log.updatedAt || new Date(log.date).getTime() || 0;

    if (log.routineId) {
      const existing = routineLastUsedMap.get(log.routineId) || 0;
      if (time > existing) {
        routineLastUsedMap.set(log.routineId, time);
      }
    }

    const exercises = log.exercises || [];
    for (const group of exercises) {
      if (group.exerciseId) {
        const existing = exerciseLastUsedMap.get(group.exerciseId) || 0;
        if (time > existing) {
          exerciseLastUsedMap.set(group.exerciseId, time);
        }
      }
    }
  }

  const recentExerciseIds = Array.from(exerciseLastUsedMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const recentRoutineIds = Array.from(routineLastUsedMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  return { recentExerciseIds, recentRoutineIds };
}

export function useRecentExercises() {
  const result = useLiveQuery(
    async () => {
      if (typeof indexedDB === 'undefined') {
        return { recentExerciseIds: [], recentRoutineIds: [] };
      }

      // 倒序獲取最近 50 次訓練記錄
      const workoutLogs = await db.workout_logs.orderBy('date').reverse().limit(50).toArray();
      const extracted = extractRecentExerciseAndRoutineIds(workoutLogs);

      inMemoryRecentExerciseIds = extracted.recentExerciseIds;
      inMemoryRecentRoutineIds = extracted.recentRoutineIds;

      return extracted;
    },
    []
  );

  const recentExerciseIds = result?.recentExerciseIds ?? inMemoryRecentExerciseIds ?? [];
  const recentRoutineIds = result?.recentRoutineIds ?? inMemoryRecentRoutineIds ?? [];

  return {
    recentExerciseIds,
    recentRoutineIds,
    isLoading: result === undefined && inMemoryRecentExerciseIds === null,
  };
}

// 模組載入時主動發起一次非同步預熱，在使用者點擊開啟彈窗前完成內存常駐
if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
  db.workout_logs.orderBy('date').reverse().limit(50).toArray()
    .then((workoutLogs) => {
      const extracted = extractRecentExerciseAndRoutineIds(workoutLogs);
      inMemoryRecentExerciseIds = extracted.recentExerciseIds;
      inMemoryRecentRoutineIds = extracted.recentRoutineIds;
    })
    .catch(() => {});
}
