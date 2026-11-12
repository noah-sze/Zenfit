import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '@/i18n/config';
import {
  getAiExportScopeByPath,
  buildDailyExportPayload,
  formatDailyExportData,
} from './aiDataExport';
import type {
  BodyMetric,
  Exercise,
  FoodItem,
  FoodLog,
  FoodRecipe,
  WorkoutLog,
  WorkoutRoutine,
} from '@/types';

describe('aiDataExport', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW');
  });

  describe('getAiExportScopeByPath', () => {
    it('maps core routes to their corresponding export scopes', () => {
      expect(getAiExportScopeByPath('/')).toBe('all');
      expect(getAiExportScopeByPath('/diet')).toBe('diet');
      expect(getAiExportScopeByPath('/workout')).toBe('workout');
      expect(getAiExportScopeByPath('/body')).toBe('body');
    });
  });

  describe('Diet data export (hydrated & denormalized)', () => {
    const mockFoods: FoodItem[] = [
      {
        id: 'food-chicken',
        name: '舒肥雞胸肉',
        brand: '卜蜂',
        servingSize: 100,
        servingUnit: 'g',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        isCustom: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'food-rice',
        name: '白飯',
        servingSize: 100,
        servingUnit: 'g',
        calories: 130,
        protein: 2.7,
        carbs: 28.2,
        fat: 0.3,
        isCustom: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'food-oats',
        name: '大燕麥片',
        brand: '桂格',
        servingSize: 100,
        servingUnit: 'g',
        calories: 389,
        protein: 13.5,
        carbs: 66.3,
        fat: 6.9,
        isCustom: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const mockRecipes: FoodRecipe[] = [
      {
        id: 'recipe-bowl',
        name: '高蛋白雞肉飯',
        ingredients: [
          { foodId: 'food-chicken', quantity: 200, unit: 'g' },
          { foodId: 'food-rice', quantity: 150, unit: 'g' },
        ],
        isCustom: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const mockFoodLogs: FoodLog[] = [
      // 早餐：普通單品食物
      {
        id: 'log-1',
        date: '2026-04-17',
        mealType: 'breakfast',
        entryType: 'item',
        foodId: 'food-oats',
        quantity: 60,
        unit: 'g',
        createdAt: 1000,
        updatedAt: 1000,
      },
      // 午餐：食譜組合 (bundleId 聚合)
      {
        id: 'log-2',
        date: '2026-04-17',
        mealType: 'lunch',
        entryType: 'item',
        foodId: 'food-chicken',
        quantity: 200,
        unit: 'g',
        bundleId: 'recipe-bowl',
        createdAt: 2000,
        updatedAt: 2000,
      },
      {
        id: 'log-3',
        date: '2026-04-17',
        mealType: 'lunch',
        entryType: 'item',
        foodId: 'food-rice',
        quantity: 150,
        unit: 'g',
        bundleId: 'recipe-bowl',
        createdAt: 2000,
        updatedAt: 2000,
      },
      // 晚餐：快速粗估
      {
        id: 'log-4',
        date: '2026-04-17',
        mealType: 'dinner',
        entryType: 'estimate',
        scenario: 'hotpot',
        calories: 750,
        carbs: 18.8,
        protein: 46.9,
        fat: 54.2,
        isPlaceholder: true,
        createdAt: 3000,
        updatedAt: 3000,
      },
      // 點心：歷史均值配額
      {
        id: 'log-5',
        date: '2026-04-17',
        mealType: 'snack',
        entryType: 'as_planned',
        calories: 200,
        carbs: 20,
        protein: 15,
        fat: 6.7,
        isAsPlanned: true,
        createdAt: 4000,
        updatedAt: 4000,
      },
    ];

    it('hydrates food names, aggregates recipe bundles, and strips all internal IDs in JSON & Text', () => {
      const payload = buildDailyExportPayload({
        date: '2026-04-17',
        scope: 'diet',
        foods: mockFoods,
        recipes: mockRecipes,
        foodLogs: mockFoodLogs,
        dietPlan: {
          activityLevel: 1.55,
          macroSplit: { carbs: 40, protein: 30, fat: 30 },
          caloriesTarget: 2200,
          carbsTarget: 220,
          proteinTarget: 165,
          fatTarget: 73,
        },
      });

      expect(payload.diet).toBeDefined();
      expect(payload.workout).toBeUndefined();
      expect(payload.body).toBeUndefined();

      const diet = payload.diet!;
      expect(diet.activityLabel).toBe('中度活動');
      expect(diet.target.calories).toBe(2200);
      // 60g oats (233 kcal) + 200g chicken (330 kcal) + 150g rice (195 kcal) + 750 + 200 = 1708 kcal
      expect(diet.actual.calories).toBe(1708);
      expect(diet.calorieDiff).toBe(1708 - 2200);

      // 早餐單品
      const breakfast = diet.meals.find((m) => m.mealType === 'breakfast')!;
      expect(breakfast.items).toHaveLength(1);
      expect(breakfast.items[0]).toEqual({
        type: 'food',
        name: '桂格 · 大燕麥片',
        amount: '60g',
        calories: 233,
        carbs: 39.8,
        protein: 8.1,
        fat: 4.1,
      });

      // 午餐食譜聚合
      const lunch = diet.meals.find((m) => m.mealType === 'lunch')!;
      expect(lunch.items).toHaveLength(1);
      expect(lunch.items[0].type).toBe('recipe');
      if (lunch.items[0].type === 'recipe') {
        expect(lunch.items[0].name).toBe('高蛋白雞肉飯');
        expect(lunch.items[0].calories).toBe(525); // 330 + 195
        expect(lunch.items[0].ingredients).toHaveLength(2);
        expect(lunch.items[0].ingredients[0].name).toBe('卜蜂 · 舒肥雞胸肉');
        expect(lunch.items[0].ingredients[1].name).toBe('白飯');
      }

      // 純文本與 JSON 不應洩漏內部 ID
      const jsonStr = formatDailyExportData(
        {
          date: '2026-04-17',
          scope: 'diet',
          foods: mockFoods,
          recipes: mockRecipes,
          foodLogs: mockFoodLogs,
        },
        'json'
      );
      expect(jsonStr).not.toContain('food-chicken');
      expect(jsonStr).not.toContain('recipe-bowl');
      expect(jsonStr).not.toContain('log-1');
      expect(jsonStr).toContain('卜蜂 · 舒肥雞胸肉');
      expect(jsonStr).toContain('高蛋白雞肉飯');

      const textStr = formatDailyExportData(
        {
          date: '2026-04-17',
          scope: 'diet',
          foods: mockFoods,
          recipes: mockRecipes,
          foodLogs: mockFoodLogs,
        },
        'text'
      );
      expect(textStr).toContain('[食譜] 高蛋白雞肉飯');
      expect(textStr).toContain('卜蜂 · 舒肥雞胸肉 200g');
      expect(textStr).toContain('[快速估算] 火鍋');
      expect(textStr).toContain('[歷史均值] 歷史均值');
    });
  });

  describe('Workout data export (hydrated & denormalized)', () => {
    const mockExercises: Exercise[] = [
      {
        id: 'ex-bench',
        name: '槓鈴臥推',
        equipment: 'barbell',
        targetMuscles: {
          mid_lower_chest: 'primary',
          front_delts: 'secondary',
          triceps: 'secondary',
        },
        isCustom: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const mockRoutines: WorkoutRoutine[] = [
      {
        id: 'routine-push',
        name: '推日課表 A',
        exercises: [{ exerciseId: 'ex-bench' }],
        isCustom: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const mockWorkoutLogs: WorkoutLog[] = [
      {
        id: 'wlog-1',
        date: '2026-04-17',
        routineId: 'routine-push',
        exercises: [
          {
            exerciseId: 'ex-bench',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 8, isCompleted: true },
              { id: 's2', setNumber: 2, weight: 85, reps: 6, rpe: 8.5, isCompleted: true },
            ],
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    it('resolves routine title, exercise equipment, muscles, sets, and volume without IDs', () => {
      const payload = buildDailyExportPayload({
        date: '2026-04-17',
        scope: 'workout',
        exercises: mockExercises,
        routines: mockRoutines,
        workoutLogs: mockWorkoutLogs,
        unitPreferences: { bodyWeight: 'kg' },
      });

      const workout = payload.workout!;
      expect(workout.summary.totalExercises).toBe(1);
      expect(workout.summary.totalSets).toBe(2);
      // 80 * 8 + 85 * 6 = 640 + 510 = 1150 kg
      expect(workout.summary.totalVolume).toBe(1150);
      expect(workout.sessions[0].routineTitle).toBe('推日課表 A');

      const ex = workout.sessions[0].exercises[0];
      expect(ex.name).toBe('槓鈴臥推');
      expect(ex.equipment).toBe('槓鈴');
      expect(ex.primaryMuscles).toEqual(['中下胸']);
      expect(ex.secondaryMuscles).toEqual(['三角肌前束', '肱三頭肌']);
      expect(ex.sets).toEqual([
        { setNumber: 1, weight: 80, unit: 'kg', reps: 8 },
        { setNumber: 2, weight: 85, unit: 'kg', reps: 6, rpe: 8.5 },
      ]);

      const textStr = formatDailyExportData(
        {
          date: '2026-04-17',
          scope: 'workout',
          exercises: mockExercises,
          routines: mockRoutines,
          workoutLogs: mockWorkoutLogs,
        },
        'text'
      );
      expect(textStr).toContain('課表: 推日課表 A');
      expect(textStr).toContain('### 槓鈴臥推 (槓鈴 | 主肌群: 中下胸 | 協同肌群: 三角肌前束、肱三頭肌)');
      expect(textStr).toContain('- 第 1 組: 80 kg × 8 次');
      expect(textStr).toContain('- 第 2 組: 85 kg × 6 次 @ RPE 8.5');
      expect(textStr).not.toContain('ex-bench');
      expect(textStr).not.toContain('routine-push');
    });
  });

  describe('Body data export (weight, trend weight, body fat, non-empty circumferences)', () => {
    const mockHistory: BodyMetric[] = [
      {
        id: 'bm-1',
        date: '2026-04-16',
        weight: 72.0,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'bm-2',
        date: '2026-04-17',
        weight: 71.2,
        bodyFat: 14.5,
        chestCm: 102,
        waistCm: 76.5,
        armsCm: 38,
        // hipsCm, shouldersCm, thighsCm 未填寫，應自動過濾
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];

    it('exports weight, trend weight, bodyFat, and filters out empty circumferences', () => {
      const payload = buildDailyExportPayload({
        date: '2026-04-17',
        scope: 'body',
        bodyMetric: mockHistory[1],
        allBodyMetrics: mockHistory,
        unitPreferences: { bodyWeight: 'kg', length: 'cm' },
      });

      const body = payload.body!;
      expect(body.weight).toBe(71.2);
      // EWMA: 0.15 * 71.2 + 0.85 * 72.0 = 10.68 + 61.2 = 71.88 -> rounded to 1 decimal = 71.9
      expect(body.trendWeight).toBe(71.9);
      expect(body.bodyFat).toBe(14.5);
      expect(body.circumferences).toEqual([
        { key: 'chest', label: '胸圍', value: 102, unit: 'cm' },
        { key: 'waist', label: '腰圍', value: 76.5, unit: 'cm' },
        { key: 'arms', label: '手臂圍', value: 38, unit: 'cm' },
      ]);

      const textStr = formatDailyExportData(
        {
          date: '2026-04-17',
          scope: 'body',
          bodyMetric: mockHistory[1],
          allBodyMetrics: mockHistory,
        },
        'text'
      );
      expect(textStr).toContain('當日體重: 71.2 kg');
      expect(textStr).toContain('平滑趨勢體重: 71.9 kg');
      expect(textStr).toContain('體脂率: 14.5%');
      expect(textStr).toContain('身體圍度: 胸圍 102cm · 腰圍 76.5cm · 手臂圍 38cm');
      expect(textStr).not.toContain('臀圍');
      expect(textStr).not.toContain('大腿圍');
    });
  });
});
