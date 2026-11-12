import { describe, it, expect, beforeEach } from 'vitest';
import {
  getInMemoryFoodsCache,
  setInMemoryFoodsCache,
  clearFoodsCache,
  prewarmFoodsCache,
} from './useFoods';
import {
  getInMemoryRecipesCache,
  setInMemoryRecipesCache,
  clearRecipesCache,
  prewarmRecipesCache,
} from './useRecipes';
import {
  getInMemoryExercisesCache,
  setInMemoryExercisesCache,
  clearExercisesCache,
  prewarmExercisesCache,
} from './useExercises';
import {
  getInMemoryDailyDietLogsCache,
  setInMemoryDailyDietLogsCache,
  clearDailyDietLogsCache,
} from './useFoodLogs';
import {
  getInMemoryRoutinesCache,
  setInMemoryRoutinesCache,
  clearRoutinesCache,
} from './useRoutines';
import {
  getInMemoryWorkoutLogsCache,
  setInMemoryWorkoutLogsCache,
  clearWorkoutLogsCache,
} from './useWorkoutLogs';
import type { FoodItem, FoodRecipe, Exercise, DailyDietLog, WorkoutRoutine, WorkoutLog } from '@/types';

describe('In-Memory Hydration Cache (即時記憶體注水架構)', () => {
  beforeEach(() => {
    clearFoodsCache();
    clearRecipesCache();
    clearExercisesCache();
    clearDailyDietLogsCache();
    clearRoutinesCache();
    clearWorkoutLogsCache();
  });

  describe('useFoods 食材快取', () => {
    it('初始狀態快取應為 null', () => {
      expect(getInMemoryFoodsCache()).toBeNull();
    });

    it('setInMemoryFoodsCache 應能即時寫入快取並成功讀取', () => {
      const mockFoods: FoodItem[] = [
        {
          id: 'food-1',
          name: '燕麥片',
          category: 'natural',
          servingSize: 100,
          servingUnit: 'g',
          calories: 389,
          protein: 16.9,
          carbs: 66.3,
          fat: 6.9,
          isCustom: false,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      setInMemoryFoodsCache(mockFoods);
      expect(getInMemoryFoodsCache()).toEqual(mockFoods);
    });

    it('clearFoodsCache 應能徹底清空快取', () => {
      setInMemoryFoodsCache([
        {
          id: 'food-2',
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
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
      expect(getInMemoryFoodsCache()).not.toBeNull();

      clearFoodsCache();
      expect(getInMemoryFoodsCache()).toBeNull();
    });

    it('prewarmFoodsCache 在已有快取時應直接返回快照', async () => {
      const mockFoods: FoodItem[] = [
        {
          id: 'food-3',
          name: '香蕉',
          category: 'natural',
          servingSize: 100,
          servingUnit: 'g',
          calories: 89,
          protein: 1.1,
          carbs: 22.8,
          fat: 0.3,
          isCustom: false,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      setInMemoryFoodsCache(mockFoods);

      const result = await prewarmFoodsCache();
      expect(result).toBe(mockFoods);
    });
  });

  describe('useRecipes 菜餚快取', () => {
    it('初始狀態快取應為 null', () => {
      expect(getInMemoryRecipesCache()).toBeNull();
    });

    it('setInMemoryRecipesCache 應能即時寫入快取並成功讀取', () => {
      const mockRecipes: FoodRecipe[] = [
        {
          id: 'recipe-1',
          name: '燕麥高蛋白奶昔',
          ingredients: [],
          isCustom: true,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      setInMemoryRecipesCache(mockRecipes);
      expect(getInMemoryRecipesCache()).toEqual(mockRecipes);
    });

    it('clearRecipesCache 應能徹底清空快取', () => {
      setInMemoryRecipesCache([]);
      expect(getInMemoryRecipesCache()).toEqual([]);

      clearRecipesCache();
      expect(getInMemoryRecipesCache()).toBeNull();
    });

    it('prewarmRecipesCache 在已有快取時應直接返回快照', async () => {
      const mockRecipes: FoodRecipe[] = [
        {
          id: 'recipe-2',
          name: '水煮雞胸肉沙拉',
          ingredients: [],
          isCustom: false,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      setInMemoryRecipesCache(mockRecipes);

      const result = await prewarmRecipesCache();
      expect(result).toBe(mockRecipes);
    });
  });

  describe('useExercises 動作快取', () => {
    it('初始狀態快取應為 null', () => {
      expect(getInMemoryExercisesCache()).toBeNull();
    });

    it('setInMemoryExercisesCache 應能即時寫入快取並成功讀取', () => {
      const mockExercises: Exercise[] = [
        {
          id: 'ex-1',
          name: '槓鈴臥推',
          equipment: 'barbell',
          targetMuscles: { mid_lower_chest: 'primary' },
          isCustom: false,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      setInMemoryExercisesCache(mockExercises);
      expect(getInMemoryExercisesCache()).toEqual(mockExercises);
    });

    it('clearExercisesCache 應能徹底清空快取', () => {
      setInMemoryExercisesCache([]);
      expect(getInMemoryExercisesCache()).toEqual([]);

      clearExercisesCache();
      expect(getInMemoryExercisesCache()).toBeNull();
    });

    it('prewarmExercisesCache 在已有快取時應直接返回快照', async () => {
      const mockExercises: Exercise[] = [
        {
          id: 'ex-2',
          name: '深蹲',
          equipment: 'barbell',
          targetMuscles: { quads: 'primary' },
          isCustom: false,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      setInMemoryExercisesCache(mockExercises);

      const result = await prewarmExercisesCache();
      expect(result).toBe(mockExercises);
    });
  });

  describe('useFoodLogs / useRoutines / useWorkoutLogs 擴充快取', () => {
    it('setInMemoryDailyDietLogsCache 應能即時寫入與清空', () => {
      expect(getInMemoryDailyDietLogsCache()).toBeNull();
      const mockLogs: DailyDietLog[] = [
        {
          id: 'd-1',
          date: '2026-11-12',
          meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
          entries: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      setInMemoryDailyDietLogsCache(mockLogs);
      expect(getInMemoryDailyDietLogsCache()).toEqual(mockLogs);
      clearDailyDietLogsCache();
      expect(getInMemoryDailyDietLogsCache()).toBeNull();
    });

    it('setInMemoryRoutinesCache 與 setInMemoryWorkoutLogsCache 應能即時寫入與清空', () => {
      expect(getInMemoryRoutinesCache()).toBeNull();
      expect(getInMemoryWorkoutLogsCache()).toBeNull();
      const mockRoutines: WorkoutRoutine[] = [
        {
          id: 'r-1',
          name: '推力日',
          exercises: [],
          isCustom: true,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      const mockWorkouts: WorkoutLog[] = [
        {
          id: 'w-1',
          date: '2026-11-12',
          exercises: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      setInMemoryRoutinesCache(mockRoutines);
      setInMemoryWorkoutLogsCache(mockWorkouts);
      expect(getInMemoryRoutinesCache()).toEqual(mockRoutines);
      expect(getInMemoryWorkoutLogsCache()).toEqual(mockWorkouts);
      clearRoutinesCache();
      clearWorkoutLogsCache();
      expect(getInMemoryRoutinesCache()).toBeNull();
      expect(getInMemoryWorkoutLogsCache()).toBeNull();
    });
  });
});
