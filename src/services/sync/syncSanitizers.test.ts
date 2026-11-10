import { describe, it, expect } from 'vitest';
import {
  sanitizeRecipe,
  sanitizeFoodLog,
  sanitizeDailyDietLog,
  sanitizeWorkoutLog,
  sanitizeWorkoutRoutine,
  sanitizeUserBaseInfo,
} from './syncSanitizers';
import {
  DEFAULT_FOOD_IDS,
  DEFAULT_RECIPE_IDS,
  PRIMARY_USER_ID,
} from '../db/defaultData';

describe('syncSanitizers (同步與持久化邊界純粹度清洗)', () => {
  describe('sanitizeRecipe', () => {
    it('徹底剔除食材中的 foodName 快照與菜餚根級別的 description，並將舊 ID 自動對齊為 UUID', () => {
      const dirtyRecipe = {
        id: 'recipe_chicken_rice_box',
        name: '經典低脂雞胸便當',
        description: '標準乾淨減脂主食，可選配微量烹調油',
        ingredients: [
          {
            foodId: 'food_chicken_breast',
            foodName: '雞胸肉',
            quantity: 150,
            unit: 'g',
            isOptional: false,
          },
          {
            foodId: 'food_cooking_oil',
            foodName: '食用植物油',
            quantity: 5,
            unit: 'g',
            isOptional: true,
          },
        ],
        isCustom: false,
        isArchived: false,
        createdAt: 1793076065780,
        updatedAt: 1793076065780,
      };

      const cleaned = sanitizeRecipe(dirtyRecipe);

      expect(cleaned).toEqual({
        id: DEFAULT_RECIPE_IDS.chicken_rice_box,
        name: '經典低脂雞胸便當',
        ingredients: [
          { foodId: DEFAULT_FOOD_IDS.chicken_breast, quantity: 150, unit: 'g', isOptional: false },
          { foodId: DEFAULT_FOOD_IDS.cooking_oil, quantity: 5, unit: 'g', isOptional: true },
        ],
        isCustom: false,
        isArchived: false,
        createdAt: 1793076065780,
        updatedAt: 1793076065780,
      });

      expect((cleaned as any).description).toBeUndefined();
      expect((cleaned.ingredients[0] as any).foodName).toBeUndefined();
      expect((cleaned.ingredients[1] as any).foodName).toBeUndefined();
    });

    it('保留已是 UUID 的自訂菜餚 ID 與食材 ID', () => {
      const customRecipe = {
        id: '99999999-9999-4999-8999-999999999999',
        name: '自訂健康餐',
        ingredients: [
          {
            foodId: '88888888-8888-4888-8888-888888888888',
            quantity: 200,
            unit: 'g',
          },
        ],
        isCustom: true,
        createdAt: 2000,
        updatedAt: 2000,
      };

      const cleaned = sanitizeRecipe(customRecipe);
      expect(cleaned.id).toBe('99999999-9999-4999-8999-999999999999');
      expect(cleaned.ingredients[0].foodId).toBe('88888888-8888-4888-8888-888888888888');
    });
  });

  describe('sanitizeFoodLog', () => {
    it('徹底剔除食物名稱與靜態營養素快照，並將舊食材 ID 自動映射為 UUID', () => {
      const dirtyLog = {
        id: 'log-1',
        date: '2026-11-06',
        mealType: 'breakfast',
        foodId: 'food_chicken_breast',
        foodName: '雞胸肉',
        calories: 165,
        protein: 34.5,
        carbs: 0,
        fat: 1.8,
        quantity: 150,
        unit: 'g',
        notes: '[早餐]',
        createdAt: 1000,
        updatedAt: 1000,
      };

      const cleaned = sanitizeFoodLog(dirtyLog);

      expect(cleaned).toEqual({
        id: 'log-1',
        date: '2026-11-06',
        mealType: 'breakfast',
        foodId: DEFAULT_FOOD_IDS.chicken_breast,
        quantity: 150,
        unit: 'g',
        createdAt: 1000,
        updatedAt: 1000,
      });

      expect((cleaned as any).foodName).toBeUndefined();
      expect((cleaned as any).calories).toBeUndefined();
      expect((cleaned as any).protein).toBeUndefined();
      expect((cleaned as any).carbs).toBeUndefined();
      expect((cleaned as any).fat).toBeUndefined();
      expect((cleaned as any).notes).toBeUndefined();
    });

    it('完整保留快速粗估與算我正常吃配額的自訂名稱與營養素欄位', () => {
      const placeholderLog = {
        id: 'p-1',
        date: '2026-11-10',
        mealType: 'lunch',
        foodName: '外食火鍋',
        calories: 850,
        carbs: 60,
        protein: 45,
        fat: 35,
        isPlaceholder: true,
        quantity: 1,
        unit: '份',
        createdAt: 2000,
        updatedAt: 2000,
      };

      const cleaned = sanitizeFoodLog(placeholderLog);
      expect(cleaned).toEqual({
        id: 'p-1',
        date: '2026-11-10',
        mealType: 'lunch',
        foodName: '外食火鍋',
        calories: 850,
        carbs: 60,
        protein: 45,
        fat: 35,
        isPlaceholder: true,
        quantity: 1,
        unit: '份',
        createdAt: 2000,
        updatedAt: 2000,
      });

      const asPlannedLog = {
        id: 'plan-1',
        date: '2026-11-10',
        mealType: 'breakfast',
        foodName: '早餐目標配額',
        calories: 500,
        carbs: 50,
        protein: 38,
        fat: 17,
        isAsPlanned: true,
        quantity: 1,
        unit: '份',
        createdAt: 2000,
        updatedAt: 2000,
      };

      const cleanedPlanned = sanitizeFoodLog(asPlannedLog);
      expect(cleanedPlanned).toEqual({
        id: 'plan-1',
        date: '2026-11-10',
        mealType: 'breakfast',
        foodName: '早餐目標配額',
        calories: 500,
        carbs: 50,
        protein: 38,
        fat: 17,
        isAsPlanned: true,
        quantity: 1,
        unit: '份',
        createdAt: 2000,
        updatedAt: 2000,
      });
    });
  });

  describe('sanitizeWorkoutLog', () => {
    it('徹底剔除動作組內的 exerciseName、category 與 notes，以及日誌頂層的 title 快照', () => {
      const dirtyLog = {
        id: 'wlog-1',
        date: '2026-11-06',
        title: '胸部訓練',
        notes: '[課表日]',
        exercises: [
          {
            exerciseId: 'ex_bench',
            exerciseName: '槓鈴臥推',
            category: 'free_weight',
            notes: '熱身組完成',
            sets: [
              { id: 's1', setNumber: 1, weight: 100, reps: 5, isCompleted: true },
            ],
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const cleaned = sanitizeWorkoutLog(dirtyLog);

      expect(cleaned).toEqual({
        id: 'wlog-1',
        date: '2026-11-06',
        exercises: [
          {
            exerciseId: 'ex_bench',
            sets: [
              { id: 's1', setNumber: 1, weight: 100, reps: 5, isCompleted: true },
            ],
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      });

      expect((cleaned as any).title).toBeUndefined();
      expect((cleaned as any).notes).toBeUndefined();
      expect((cleaned.exercises[0] as any).exerciseName).toBeUndefined();
      expect((cleaned.exercises[0] as any).category).toBeUndefined();
      expect((cleaned.exercises[0] as any).notes).toBeUndefined();
    });
  });

  describe('sanitizeUserBaseInfo', () => {
    it('徹底剔除 weightUnit 與 activityLevel，並將舊使用者 ID 自動映射為 UUID', () => {
      const dirtyInfo = {
        id: 'primary_user',
        name: 'Noah',
        gender: 'male',
        birthDate: '1999-01',
        heightCm: 175,
        weightUnit: 'kg',
        activityLevel: 1.55,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const cleaned = sanitizeUserBaseInfo(dirtyInfo);

      expect(cleaned).toEqual({
        id: PRIMARY_USER_ID,
        name: 'Noah',
        gender: 'male',
        birthDate: '1999-01',
        heightCm: 175,
        createdAt: 1000,
        updatedAt: 1000,
      });

      expect((cleaned as any).weightUnit).toBeUndefined();
      expect((cleaned as any).activityLevel).toBeUndefined();
    });
  });

  describe('sanitizeDailyDietLog', () => {
    it('規範化自包含日誌頭部 meta 與內部 entries，並將舊食材 ID 自動映射至 UUID', () => {
      const dirtyDailyLog = {
        id: 'daily_1',
        date: '2026-11-06',
        meta: {
          activityLevel: 1.725,
          macroSplit: { carbs: 50, protein: 30, fat: 20 },
          planName: '高碳訓練日',
        },
        entries: [
          {
            id: 'e1',
            mealType: 'breakfast',
            foodId: 'food_chicken_breast',
            foodName: '雞胸肉',
            bundleId: 'recipe_chicken_rice_box',
            bundleName: '經典低脂雞胸便當',
            quantity: 150,
            unit: 'g',
            calories: 165,
            notes: '[早餐]',
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const cleaned = sanitizeDailyDietLog(dirtyDailyLog);

      expect(cleaned.id).toBe('daily_1');
      expect(cleaned.date).toBe('2026-11-06');
      expect(cleaned.meta).toEqual({
        activityLevel: 1.725,
        macroSplit: { carbs: 50, protein: 30, fat: 20 },
      });
      expect(cleaned.entries.length).toBe(1);
      expect(cleaned.entries[0]).toEqual({
        id: 'e1',
        date: '',
        mealType: 'breakfast',
        foodId: DEFAULT_FOOD_IDS.chicken_breast,
        bundleId: DEFAULT_RECIPE_IDS.chicken_rice_box,
        quantity: 150,
        unit: 'g',
        createdAt: 1000,
        updatedAt: 1000,
      });
      expect((cleaned.entries[0] as any).foodName).toBeUndefined();
      expect((cleaned.entries[0] as any).calories).toBeUndefined();
      expect((cleaned.entries[0] as any).notes).toBeUndefined();
    });
  });

  describe('sanitizeWorkoutRoutine', () => {
    it('徹底剔除動作組內的 defaultSets 等組數設定，僅保留 exerciseId 純關聯', () => {
      const dirtyRoutine = {
        id: 'routine_1',
        name: '推力訓練',
        notes: '胸三頭',
        exercises: [
          { exerciseId: 'barbell_bench_press', defaultSets: 4, notes: '正式組' },
          { exerciseId: 'incline_dumbbell_press', defaultSets: 3 },
        ],
        isCustom: true,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const cleaned = sanitizeWorkoutRoutine(dirtyRoutine);

      expect(cleaned.exercises).toEqual([
        { exerciseId: 'barbell_bench_press' },
        { exerciseId: 'incline_dumbbell_press' },
      ]);
      expect('defaultSets' in cleaned.exercises[0]).toBe(false);
      expect('notes' in cleaned.exercises[0]).toBe(false);
    });
  });
});
