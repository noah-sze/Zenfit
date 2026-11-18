import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { WorkoutLog } from '@/types';

let inMemoryRecentExerciseIds: string[] | null = null;
let inMemoryRecentRoutineIds: string[] | null = null;
let inMemoryExerciseLastUsedMap: Map<string, number> | null = null;
let inMemoryRoutineLastUsedMap: Map<string, number> | null = null;

/**
 * 從歷史訓練日誌中提取去重、按最後訓練時間倒序排列的動作與組合 ID 列表及最後使用時間映射 (Pure Function)
 */
export function extractRecentExerciseAndRoutineIds(workoutLogs: WorkoutLog[]): {
  recentExerciseIds: string[];
  recentRoutineIds: string[];
  exerciseLastUsedMap: Map<string, number>;
  routineLastUsedMap: Map<string, number>;
} {
  const exerciseLastUsedMap = new Map<string, number>();
  const routineLastUsedMap = new Map<string, number>();

  for (const log of workoutLogs) {
    const time =
      Math.max(log.createdAt || 0, log.updatedAt || 0) ||
      new Date(log.date).getTime() ||
      0;

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

  return { recentExerciseIds, recentRoutineIds, exerciseLastUsedMap, routineLastUsedMap };
}

const EMPTY_LAST_USED_MAP = new Map<string, number>();

export function useRecentExercises() {
  const result = useLiveQuery(
    async () => {
      if (typeof indexedDB === 'undefined') {
        return {
          recentExerciseIds: [],
          recentRoutineIds: [],
          exerciseLastUsedMap: new Map<string, number>(),
          routineLastUsedMap: new Map<string, number>(),
        };
      }

      // 倒序獲取最近 50 次訓練記錄
      const workoutLogs = await db.workout_logs.orderBy('date').reverse().limit(50).toArray();
      const extracted = extractRecentExerciseAndRoutineIds(workoutLogs);

      inMemoryRecentExerciseIds = extracted.recentExerciseIds;
      inMemoryRecentRoutineIds = extracted.recentRoutineIds;
      inMemoryExerciseLastUsedMap = extracted.exerciseLastUsedMap;
      inMemoryRoutineLastUsedMap = extracted.routineLastUsedMap;

      return extracted;
    },
    []
  );

  const recentExerciseIds = result?.recentExerciseIds ?? inMemoryRecentExerciseIds ?? [];
  const recentRoutineIds = result?.recentRoutineIds ?? inMemoryRecentRoutineIds ?? [];
  const exerciseLastUsedMap =
    result?.exerciseLastUsedMap ?? inMemoryExerciseLastUsedMap ?? EMPTY_LAST_USED_MAP;
  const routineLastUsedMap =
    result?.routineLastUsedMap ?? inMemoryRoutineLastUsedMap ?? EMPTY_LAST_USED_MAP;

  return {
    recentExerciseIds,
    recentRoutineIds,
    exerciseLastUsedMap,
    routineLastUsedMap,
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
      inMemoryExerciseLastUsedMap = extracted.exerciseLastUsedMap;
      inMemoryRoutineLastUsedMap = extracted.routineLastUsedMap;
    })
    .catch(() => {});
}
