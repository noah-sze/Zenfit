import { describe, it, expect } from 'vitest';
import {
  calculateE1RM,
  calculateTotalVolume,
  getRoutineFactSummary,
  findLastExerciseSet,
  findLastExerciseRecord,
} from './workoutMath';
import type { Exercise, WorkoutRoutine, WorkoutLog } from '@/types';

describe('workoutMath 純數學客觀計算函數', () => {
  describe('calculateE1RM (Brzycki 力量極限估算)', () => {
    it('正常計算：100kg 做 10 次', () => {
      // 100 * (36 / (37 - 10)) = 100 * (36 / 27) = 133.33 -> 133.3
      const result = calculateE1RM(100, 10);
      expect(result).toBe(133.3);
    });

    it('次數為 1 時應直接等於原重量', () => {
      expect(calculateE1RM(120, 1)).toBe(120);
    });

    it('異常邊界防護：重量 <= 0 或次數 <= 0 回傳 0', () => {
      expect(calculateE1RM(0, 10)).toBe(0);
      expect(calculateE1RM(-50, 10)).toBe(0);
      expect(calculateE1RM(100, 0)).toBe(0);
      expect(calculateE1RM(100, -5)).toBe(0);
      expect(calculateE1RM(NaN, 10)).toBe(0);
      expect(calculateE1RM(100, NaN)).toBe(0);
    });

    it('極端次數防護：次數 >= 37 不會除以零或負數', () => {
      // 當次數高達 40 時，clampedReps 為 36，分母為 1
      const result = calculateE1RM(50, 40);
      expect(result).toBe(1800);
    });
  });

  describe('calculateTotalVolume (已完成組容量累計)', () => {
    it('正確累加已完成組的總重量次數乘積', () => {
      const sets = [
        { weight: 100, reps: 10, isCompleted: true },
        { weight: 100, reps: 8, isCompleted: true },
        { weight: 100, reps: 6, isCompleted: false }, // 未完成不計入
      ];
      // 100*10 + 100*8 = 1800
      expect(calculateTotalVolume(sets)).toBe(1800);
    });

    it('無有效組或傳入空陣列時回傳 0', () => {
      expect(calculateTotalVolume([])).toBe(0);
      expect(calculateTotalVolume([{ weight: 0, reps: 10, isCompleted: true }])).toBe(0);
    });
  });

  describe('getRoutineFactSummary (訓練組合客觀事實概覽)', () => {
    const mockEx1: Exercise = {
      id: 'ex_1',
      name: '槓鈴臥推',
      category: 'free_weight',
      equipment: 'barbell',
      targetMuscles: { mid_lower_chest: 100, front_delts: 50, triceps: 40 },
      isCustom: false,
      createdAt: 0,
      updatedAt: 0,
    };

    const mockEx2: Exercise = {
      id: 'ex_2',
      name: '雙槓臂屈伸',
      category: 'bodyweight',
      equipment: 'bodyweight',
      targetMuscles: { mid_lower_chest: 90, triceps: 80 },
      isCustom: false,
      createdAt: 0,
      updatedAt: 0,
    };

    const exerciseMap = new Map<string, Exercise>([
      [mockEx1.id, mockEx1],
      [mockEx2.id, mockEx2],
    ]);

    it('正確統計動作數與受刺激肌群清單', () => {
      const mockRoutine: WorkoutRoutine = {
        id: 'r_1',
        name: '胸部經典組合',
        exercises: [
          { exerciseId: 'ex_1' },
          { exerciseId: 'ex_2' },
        ],
        isCustom: true,
        createdAt: 0,
        updatedAt: 0,
      };

      const summary = getRoutineFactSummary(mockRoutine, exerciseMap);
      expect(summary.exerciseCount).toBe(2);

      // 涵蓋肌群包含 mid_lower_chest (max 100), front_delts (max 50), triceps (max 80)
      const chest = summary.coveredMuscles.find((m) => m.muscle === 'mid_lower_chest');
      const triceps = summary.coveredMuscles.find((m) => m.muscle === 'triceps');
      const frontDelts = summary.coveredMuscles.find((m) => m.muscle === 'front_delts');

      expect(chest?.maxIntensity).toBe(100);
      expect(triceps?.maxIntensity).toBe(80);
      expect(frontDelts?.maxIntensity).toBe(50);

      // 驗證機能學排序：主動肌在前 (mid_lower_chest 100, triceps 80)，協同肌在後 (front_delts 50)
      expect(summary.coveredMuscles.map((m) => m.muscle)).toEqual([
        'mid_lower_chest',
        'triceps',
        'front_delts',
      ]);
    });

    it('邊界情況：空組合安全回傳', () => {
      const emptySummary = getRoutineFactSummary(null, exerciseMap);
      expect(emptySummary.exerciseCount).toBe(0);
      expect(emptySummary.coveredMuscles).toEqual([]);
    });
  });

  describe('findLastExerciseSet (動作歷史最近有效組查詢)', () => {
    it('多日誌跨日期排序：正確繼承最近日期的重量與次數', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'log_3days_ago',
          date: '2026-11-01',
          createdAt: 1000,
          updatedAt: 1000,
          exercises: [
            {
              exerciseId: 'ex_bench',
              sets: [{ id: 's1', setNumber: 1, weight: 10, reps: 12, isCompleted: true }],
            },
          ],
        },
        {
          id: 'log_yesterday',
          date: '2026-11-03',
          createdAt: 2000,
          updatedAt: 2000,
          exercises: [
            {
              exerciseId: 'ex_bench',
              sets: [{ id: 's2', setNumber: 1, weight: 15, reps: 8, isCompleted: true }],
            },
          ],
        },
      ];

      // 即使傳入未排序陣列，也應取得 2026-11-03 的 15kg / 8 reps
      const result = findLastExerciseSet(logs, 'ex_bench');
      expect(result).toEqual({ weight: 15, reps: 8 });
    });

    it('同日多筆日誌：依 createdAt 降序取最新記錄', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'log_morning',
          date: '2026-11-04',
          createdAt: 100,
          updatedAt: 100,
          exercises: [
            {
              exerciseId: 'ex_squat',
              sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 5, isCompleted: true }],
            },
          ],
        },
        {
          id: 'log_evening',
          date: '2026-11-04',
          createdAt: 200,
          updatedAt: 200,
          exercises: [
            {
              exerciseId: 'ex_squat',
              sets: [{ id: 's2', setNumber: 1, weight: 90, reps: 3, isCompleted: true }],
            },
          ],
        },
      ];

      const result = findLastExerciseSet(logs, 'ex_squat');
      expect(result).toEqual({ weight: 90, reps: 3 });
    });

    it('同日誌多組不同重量：取最後一組有效記錄', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'log_1',
          date: '2026-11-04',
          createdAt: 100,
          updatedAt: 100,
          exercises: [
            {
              exerciseId: 'ex_leg_press',
              sets: [
                { id: 's1', setNumber: 1, weight: 100, reps: 12, isCompleted: true },
                { id: 's2', setNumber: 2, weight: 120, reps: 10, isCompleted: true },
                { id: 's3', setNumber: 3, weight: 140, reps: 8, isCompleted: true },
              ],
            },
          ],
        },
      ];

      const result = findLastExerciseSet(logs, 'ex_leg_press');
      expect(result).toEqual({ weight: 140, reps: 8 });
    });

    it('支援透過 exerciseName 不區分大小寫匹配', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'log_1',
          date: '2026-11-04',
          createdAt: 100,
          updatedAt: 100,
          exercises: [
            {
              exerciseId: 'different_id',
              exerciseName: 'Lat Pulldown',
              sets: [{ id: 's1', setNumber: 1, weight: 55, reps: 10, isCompleted: true }],
            } as any,
          ],
        },
      ];

      const result = findLastExerciseSet(logs, 'non_existent_id', 'lat pulldown');
      expect(result).toEqual({ weight: 55, reps: 10 });
    });

    it('無歷史記錄時回傳 null', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'log_1',
          date: '2026-11-04',
          createdAt: 100,
          updatedAt: 100,
          exercises: [
            {
              exerciseId: 'ex_bench',
              sets: [{ id: 's1', setNumber: 1, weight: 60, reps: 10, isCompleted: true }],
            },
          ],
        },
      ];

      expect(findLastExerciseSet(logs, 'ex_deadlift')).toBeNull();
    });

    it('異常邊界防護：空值、負數或無效組安全回退', () => {
      expect(findLastExerciseSet([], 'ex_1')).toBeNull();
      expect(findLastExerciseSet(null, 'ex_1')).toBeNull();
      expect(findLastExerciseSet(undefined, 'ex_1')).toBeNull();
      expect(
        findLastExerciseSet(
          [{ id: '1', date: '2026-11-04', createdAt: 0, updatedAt: 0, exercises: [] }],
          ''
        )
      ).toBeNull();

      // 只有 weight <= 0 或 NaN
      const invalidLogs: WorkoutLog[] = [
        {
          id: 'log_invalid',
          date: '2026-11-04',
          createdAt: 100,
          updatedAt: 100,
          exercises: [
            {
              exerciseId: 'ex_zero',
              sets: [
                { id: 's1', setNumber: 1, weight: 0, reps: 10, isCompleted: true },
                { id: 's2', setNumber: 2, weight: -10, reps: 10, isCompleted: true },
                { id: 's3', setNumber: 3, weight: NaN, reps: 10, isCompleted: true },
              ],
            },
          ],
        },
      ];
      expect(findLastExerciseSet(invalidLogs, 'ex_zero')).toBeNull();

      // 當 reps <= 0 或無效時回退預設 10
      const zeroRepsLogs: WorkoutLog[] = [
        {
          id: 'log_zero_reps',
          date: '2026-11-04',
          createdAt: 100,
          updatedAt: 100,
          exercises: [
            {
              exerciseId: 'ex_weight_only',
              sets: [{ id: 's1', setNumber: 1, weight: 25, reps: 0, isCompleted: true }],
            },
          ],
        },
      ];
      expect(findLastExerciseSet(zeroRepsLogs, 'ex_weight_only')).toEqual({ weight: 25, reps: 10 });
    });
  });

  describe('findLastExerciseRecord (動作歷史最近完整記錄：組數與各組重量)', () => {
    it('跨日期多筆日誌：正確繼承最新日期的組數與各組重量', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'log_old',
          date: '2026-11-01',
          createdAt: 1000,
          updatedAt: 1000,
          exercises: [
            {
              exerciseId: 'ex_bench',
              sets: [
                { id: 's1', setNumber: 1, weight: 50, reps: 10, isCompleted: true },
                { id: 's2', setNumber: 2, weight: 60, reps: 8, isCompleted: true },
              ],
            },
          ],
        },
        {
          id: 'log_new',
          date: '2026-11-03',
          createdAt: 2000,
          updatedAt: 2000,
          exercises: [
            {
              exerciseId: 'ex_bench',
              sets: [
                { id: 's3', setNumber: 1, weight: 60, reps: 12, isCompleted: true },
                { id: 's4', setNumber: 2, weight: 70, reps: 10, isCompleted: true },
                { id: 's5', setNumber: 3, weight: 80, reps: 8, isCompleted: true },
                { id: 's6', setNumber: 4, weight: 85, reps: 6, isCompleted: true },
              ],
            },
          ],
        },
      ];

      const record = findLastExerciseRecord(logs, 'ex_bench');
      expect(record).toEqual({
        setsCount: 4,
        weights: [60, 70, 80, 85],
        lastWeight: 85,
      });
    });

    it('同日多筆日誌：依 createdAt 降序取最新記錄', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'log_morning',
          date: '2026-11-04',
          createdAt: 100,
          updatedAt: 100,
          exercises: [
            {
              exerciseId: 'ex_squat',
              sets: [{ id: 's1', setNumber: 1, weight: 60, reps: 10, isCompleted: true }],
            },
          ],
        },
        {
          id: 'log_night',
          date: '2026-11-04',
          createdAt: 200,
          updatedAt: 200,
          exercises: [
            {
              exerciseId: 'ex_squat',
              sets: [
                { id: 's2', setNumber: 1, weight: 80, reps: 5, isCompleted: true },
                { id: 's3', setNumber: 2, weight: 90, reps: 5, isCompleted: true },
                { id: 's4', setNumber: 3, weight: 100, reps: 3, isCompleted: true },
              ],
            },
          ],
        },
      ];

      const record = findLastExerciseRecord(logs, 'ex_squat');
      expect(record).toEqual({
        setsCount: 3,
        weights: [80, 90, 100],
        lastWeight: 100,
      });
    });

    it('以動作名稱 (大小寫不敏感) 匹配', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'log_1',
          date: '2026-11-04',
          createdAt: 100,
          updatedAt: 100,
          exercises: [
            {
              exerciseId: 'ex_lat_id',
              exerciseName: 'Lat Pulldown',
              sets: [
                { id: 's1', setNumber: 1, weight: 45, reps: 12, isCompleted: true },
                { id: 's2', setNumber: 2, weight: 50, reps: 10, isCompleted: true },
              ],
            } as any,
          ],
        },
      ];

      const record = findLastExerciseRecord(logs, 'unknown_id', 'lat pulldown');
      expect(record).toEqual({
        setsCount: 2,
        weights: [45, 50],
        lastWeight: 50,
      });
    });

    it('邊界情況：空日誌、無效輸入、無匹配回傳 null', () => {
      expect(findLastExerciseRecord([], 'ex_1')).toBeNull();
      expect(findLastExerciseRecord(null, 'ex_1')).toBeNull();
      expect(findLastExerciseRecord(undefined, 'ex_1')).toBeNull();
      expect(findLastExerciseRecord([{ id: '1', date: '2026-11-04', createdAt: 1, updatedAt: 1, exercises: [] }], 'ex_1')).toBeNull();
    });
  });
});
