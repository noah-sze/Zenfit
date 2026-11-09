import { describe, it, expect } from 'vitest';
import { extractRecentExerciseAndRoutineIds } from './useRecentExercises';
import type { WorkoutLog } from '@/types';

describe('extractRecentExerciseAndRoutineIds', () => {
  it('應該在空訓練日誌時回傳空陣列', () => {
    const result = extractRecentExerciseAndRoutineIds([]);
    expect(result.recentExerciseIds).toEqual([]);
    expect(result.recentRoutineIds).toEqual([]);
  });

  it('應該按最後訓練時間倒序去重排列動作 ID', () => {
    const mockLogs: WorkoutLog[] = [
      {
        id: 'w1',
        date: '2026-11-01',
        routineId: 'routine-push',
        exercises: [
          {
            exerciseId: 'ex-bench-press',
            sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, isCompleted: true }],
          },
          {
            exerciseId: 'ex-incline-dumbbell',
            sets: [{ id: 's2', setNumber: 1, weight: 30, reps: 10, isCompleted: true }],
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'w2',
        date: '2026-11-03',
        routineId: 'routine-pull',
        exercises: [
          {
            exerciseId: 'ex-pull-up',
            sets: [{ id: 's3', setNumber: 1, weight: 0, reps: 10, isCompleted: true }],
          },
          {
            exerciseId: 'ex-bench-press', // 再次訓練臥推，時間為 3000
            sets: [{ id: 's4', setNumber: 1, weight: 85, reps: 6, isCompleted: true }],
          },
        ],
        createdAt: 3000,
        updatedAt: 3000,
      },
    ];

    const result = extractRecentExerciseAndRoutineIds(mockLogs);
    // 動作順序：ex-bench-press (3000) > ex-pull-up (3000) > ex-incline-dumbbell (1000)
    expect(result.recentExerciseIds[0]).toBe('ex-bench-press');
    expect(result.recentExerciseIds).toContain('ex-pull-up');
    expect(result.recentExerciseIds).toContain('ex-incline-dumbbell');
    expect(result.recentExerciseIds.length).toBe(3);

    // 課表順序：routine-pull (3000) > routine-push (1000)
    expect(result.recentRoutineIds).toEqual(['routine-pull', 'routine-push']);
  });

  it('應該優雅處理缺失 createdAt/updatedAt 的情況（以日誌日期為保底）', () => {
    const mockLogs: WorkoutLog[] = [
      {
        id: 'w1',
        date: '2026-10-10',
        exercises: [
          {
            exerciseId: 'ex-squat',
            sets: [],
          },
        ],
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'w2',
        date: '2026-10-20',
        exercises: [
          {
            exerciseId: 'ex-deadlift',
            sets: [],
          },
        ],
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const result = extractRecentExerciseAndRoutineIds(mockLogs);
    expect(result.recentExerciseIds).toEqual(['ex-deadlift', 'ex-squat']);
  });
});
