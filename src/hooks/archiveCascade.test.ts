import { describe, it, expect, vi, beforeEach } from 'vitest';
import { archiveFoodAndCleanRecipes } from './useFoods';
import { archiveExerciseAndCleanRoutines } from './useExercises';
import type { FoodItem, FoodRecipe, Exercise, WorkoutRoutine } from '@/types';

let mockFoods: FoodItem[] = [];
let mockRecipes: FoodRecipe[] = [];
let mockExercises: Exercise[] = [];
let mockRoutines: WorkoutRoutine[] = [];

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn().mockReturnValue(undefined),
}));

vi.mock('@/services/db/db', () => ({
  db: {
    transaction: vi.fn().mockImplementation(async (_mode: string, _tables: unknown, callback: () => Promise<void>) => {
      await callback();
    }),
    foods: {
      update: vi.fn().mockImplementation(async (id: string, changes: Partial<FoodItem>) => {
        const idx = mockFoods.findIndex((f) => f.id === id);
        if (idx >= 0) {
          mockFoods[idx] = { ...mockFoods[idx], ...changes };
          return 1;
        }
        return 0;
      }),
    },
    recipes: {
      filter: vi.fn().mockImplementation((predicate: (r: FoodRecipe) => boolean) => ({
        toArray: vi.fn().mockImplementation(async () => mockRecipes.filter(predicate)),
      })),
      update: vi.fn().mockImplementation(async (id: string, changes: Partial<FoodRecipe>) => {
        const idx = mockRecipes.findIndex((r) => r.id === id);
        if (idx >= 0) {
          mockRecipes[idx] = { ...mockRecipes[idx], ...changes };
          return 1;
        }
        return 0;
      }),
    },
    exercises: {
      update: vi.fn().mockImplementation(async (id: string, changes: Partial<Exercise>) => {
        const idx = mockExercises.findIndex((e) => e.id === id);
        if (idx >= 0) {
          mockExercises[idx] = { ...mockExercises[idx], ...changes };
          return 1;
        }
        return 0;
      }),
    },
    routines: {
      filter: vi.fn().mockImplementation((predicate: (r: WorkoutRoutine) => boolean) => ({
        toArray: vi.fn().mockImplementation(async () => mockRoutines.filter(predicate)),
      })),
      update: vi.fn().mockImplementation(async (id: string, changes: Partial<WorkoutRoutine>) => {
        const idx = mockRoutines.findIndex((r) => r.id === id);
        if (idx >= 0) {
          mockRoutines[idx] = { ...mockRoutines[idx], ...changes };
          return 1;
        }
        return 0;
      }),
    },
  },
}));

describe('歸檔級聯剔除合約測試 (Archive Cascade Cleanup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFoods = [
      {
        id: 'food-1',
        name: '雞胸肉',
        category: 'natural',
        servingSize: 100,
        servingUnit: 'g',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        isCustom: false,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'food-2',
        name: '白米',
        category: 'natural',
        servingSize: 100,
        servingUnit: 'g',
        calories: 350,
        protein: 7,
        carbs: 78,
        fat: 0.6,
        isCustom: false,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    mockRecipes = [
      {
        id: 'recipe-a',
        name: '食譜 A',
        ingredients: [
          { foodId: 'food-1', quantity: 150, unit: 'g' },
          { foodId: 'food-2', quantity: 100, unit: 'g' },
        ],
        isCustom: true,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'recipe-b',
        name: '食譜 B（僅含 food-1）',
        ingredients: [{ foodId: 'food-1', quantity: 200, unit: 'g' }],
        isCustom: true,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'recipe-c',
        name: '食譜 C（不含 food-1）',
        ingredients: [{ foodId: 'food-2', quantity: 120, unit: 'g' }],
        isCustom: true,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    mockExercises = [
      {
        id: 'ex-1',
        name: '槓鈴臥推',
        equipment: 'barbell',
        targetMuscles: { mid_lower_chest: 100 },
        isCustom: false,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'ex-2',
        name: '啞鈴飛鳥',
        equipment: 'dumbbell',
        targetMuscles: { mid_lower_chest: 100 },
        isCustom: false,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    mockRoutines = [
      {
        id: 'routine-a',
        name: '組合 A',
        exercises: [{ exerciseId: 'ex-1' }, { exerciseId: 'ex-2' }],
        isCustom: true,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'routine-b',
        name: '組合 B（僅含 ex-1）',
        exercises: [{ exerciseId: 'ex-1' }],
        isCustom: true,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'routine-c',
        name: '組合 C（不含 ex-1）',
        exercises: [{ exerciseId: 'ex-2' }],
        isCustom: true,
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];
  });

  it('歸檔食物 1 時，應將其標記為已歸檔並從包含該食物的所有食譜中剔除', async () => {
    const res = await archiveFoodAndCleanRecipes('food-1');

    // 食物 1 已歸檔，食物 2 不受影響
    expect(mockFoods.find((f) => f.id === 'food-1')?.isArchived).toBe(true);
    expect(mockFoods.find((f) => f.id === 'food-2')?.isArchived).toBe(false);

    // 回傳受影響食譜 ID
    expect(res.removedFromRecipeIds).toEqual(['recipe-a', 'recipe-b']);

    // 食譜 A 剔除 food-1，保留 food-2，且 updatedAt 更新
    const recipeA = mockRecipes.find((r) => r.id === 'recipe-a')!;
    expect(recipeA.ingredients).toEqual([{ foodId: 'food-2', quantity: 100, unit: 'g' }]);
    expect(recipeA.updatedAt).toBeGreaterThan(1000);

    // 食譜 B 剔除 food-1 後安全為空陣列
    const recipeB = mockRecipes.find((r) => r.id === 'recipe-b')!;
    expect(recipeB.ingredients).toEqual([]);
    expect(recipeB.updatedAt).toBeGreaterThan(1000);

    // 食譜 C 不受影響，updatedAt 維持原樣
    const recipeC = mockRecipes.find((r) => r.id === 'recipe-c')!;
    expect(recipeC.ingredients).toEqual([{ foodId: 'food-2', quantity: 120, unit: 'g' }]);
    expect(recipeC.updatedAt).toBe(1000);
  });

  it('歸檔動作 1 時，應將其標記為已歸檔並從包含該動作的所有組合中剔除', async () => {
    const res = await archiveExerciseAndCleanRoutines('ex-1');

    // 動作 1 已歸檔，動作 2 不受影響
    expect(mockExercises.find((e) => e.id === 'ex-1')?.isArchived).toBe(true);
    expect(mockExercises.find((e) => e.id === 'ex-2')?.isArchived).toBe(false);

    // 回傳受影響組合 ID
    expect(res.removedFromRoutineIds).toEqual(['routine-a', 'routine-b']);

    // 組合 A 剔除 ex-1，保留 ex-2，且 updatedAt 更新
    const routineA = mockRoutines.find((r) => r.id === 'routine-a')!;
    expect(routineA.exercises).toEqual([{ exerciseId: 'ex-2' }]);
    expect(routineA.updatedAt).toBeGreaterThan(1000);

    // 組合 B 剔除 ex-1 後安全為空陣列
    const routineB = mockRoutines.find((r) => r.id === 'routine-b')!;
    expect(routineB.exercises).toEqual([]);
    expect(routineB.updatedAt).toBeGreaterThan(1000);

    // 組合 C 不受影響，updatedAt 維持原樣
    const routineC = mockRoutines.find((r) => r.id === 'routine-c')!;
    expect(routineC.exercises).toEqual([{ exerciseId: 'ex-2' }]);
    expect(routineC.updatedAt).toBe(1000);
  });
});
