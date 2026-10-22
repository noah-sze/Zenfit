import { describe, it, expect } from 'vitest';
import { calculateE1RM, calculateTotalVolume, getRoutineFactSummary } from './workoutMath';
import type { Exercise, WorkoutRoutine } from '@/types';

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

    it('正確統計動作數、總計劃組數與受刺激肌群清單', () => {
      const mockRoutine: WorkoutRoutine = {
        id: 'r_1',
        name: '胸部經典組合',
        exercises: [
          { exerciseId: 'ex_1', defaultSets: 4 },
          { exerciseId: 'ex_2', defaultSets: 3 },
        ],
        isCustom: true,
        createdAt: 0,
        updatedAt: 0,
      };

      const summary = getRoutineFactSummary(mockRoutine, exerciseMap);
      expect(summary.exerciseCount).toBe(2);
      expect(summary.totalPlannedSets).toBe(7); // 4 + 3

      // 涵蓋肌群包含 mid_lower_chest (max 100), front_delts (max 50), triceps (max 80)
      const chest = summary.coveredMuscles.find((m) => m.muscle === 'mid_lower_chest');
      const triceps = summary.coveredMuscles.find((m) => m.muscle === 'triceps');
      const frontDelts = summary.coveredMuscles.find((m) => m.muscle === 'front_delts');

      expect(chest?.maxIntensity).toBe(100);
      expect(triceps?.maxIntensity).toBe(80);
      expect(frontDelts?.maxIntensity).toBe(50);
    });

    it('邊界情況：空組合安全回傳', () => {
      const emptySummary = getRoutineFactSummary(null, exerciseMap);
      expect(emptySummary.exerciseCount).toBe(0);
      expect(emptySummary.totalPlannedSets).toBe(0);
      expect(emptySummary.coveredMuscles).toEqual([]);
    });
  });
});
