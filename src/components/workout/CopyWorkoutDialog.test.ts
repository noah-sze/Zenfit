import { describe, it, expect } from 'vitest';
import { adjustWorkoutSets } from './CopyWorkoutDialog';
import type { WorkoutSet } from '@/types';

describe('CopyWorkoutDialog - adjustWorkoutSets', () => {
  it('當目標組數大於現有組數時，應追加新組並沿用最後一組的重量與次數', () => {
    const initialSets: WorkoutSet[] = [
      { id: '1', setNumber: 1, weight: 60, reps: 12, isCompleted: true },
      { id: '2', setNumber: 2, weight: 80, reps: 8, isCompleted: true },
    ];

    const result = adjustWorkoutSets(initialSets, 4);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual(initialSets[0]);
    expect(result[1]).toEqual(initialSets[1]);

    // 第 3 與第 4 組應繼承第 2 組的 weight (80) 與 reps (8)
    expect(result[2].weight).toBe(80);
    expect(result[2].reps).toBe(8);
    expect(result[2].setNumber).toBe(3);
    expect(result[2].isCompleted).toBe(true);

    expect(result[3].weight).toBe(80);
    expect(result[3].reps).toBe(8);
    expect(result[3].setNumber).toBe(4);
    expect(result[3].isCompleted).toBe(true);
  });

  it('當目標組數小於現有組數時，應截斷至目標組數並重新對齊 setNumber', () => {
    const initialSets: WorkoutSet[] = [
      { id: '1', setNumber: 1, weight: 50, reps: 10, isCompleted: true },
      { id: '2', setNumber: 2, weight: 60, reps: 8, isCompleted: true },
      { id: '3', setNumber: 3, weight: 70, reps: 6, isCompleted: true },
    ];

    const result = adjustWorkoutSets(initialSets, 2);
    expect(result).toHaveLength(2);
    expect(result[0].weight).toBe(50);
    expect(result[1].weight).toBe(60);
    expect(result[0].setNumber).toBe(1);
    expect(result[1].setNumber).toBe(2);
  });

  it('當目標組數等於現有組數時，應直接回傳原陣列', () => {
    const initialSets: WorkoutSet[] = [
      { id: '1', setNumber: 1, weight: 50, reps: 10, isCompleted: true },
    ];

    const result = adjustWorkoutSets(initialSets, 1);
    expect(result).toBe(initialSets);
  });

  it('邊界防護：目標組數小於等於 0 或為非整數時，應安全約束為至少 1 組且為整數', () => {
    const initialSets: WorkoutSet[] = [
      { id: '1', setNumber: 1, weight: 40, reps: 12, isCompleted: true },
      { id: '2', setNumber: 2, weight: 45, reps: 10, isCompleted: true },
    ];

    const zeroResult = adjustWorkoutSets(initialSets, 0);
    expect(zeroResult).toHaveLength(1);
    expect(zeroResult[0].weight).toBe(40);

    const negativeResult = adjustWorkoutSets(initialSets, -5);
    expect(negativeResult).toHaveLength(1);

    const floatResult = adjustWorkoutSets(initialSets, 3.8);
    expect(floatResult).toHaveLength(3);
  });

  it('邊界防護：原陣列為空時，應安全建立 1 組預設值', () => {
    const result = adjustWorkoutSets([], 2);
    expect(result).toHaveLength(2);
    expect(result[0].weight).toBe(0);
    expect(result[0].reps).toBe(0);
    expect(result[1].weight).toBe(0);
    expect(result[1].reps).toBe(0);
  });
});
