import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EQUIPMENTS,
  DEFAULT_EXERCISES,
  DEFAULT_FOODS,
  DEFAULT_RECIPES,
  DEFAULT_FOOD_IDS,
  PRIMARY_USER_ID,
  DEFAULT_USER_PROFILE_ID,
} from './defaultData';

describe('系統預設數據完整性與原子計量規範測試', () => {
  it('所有默認實體之 ID 均必須符合標準 RFC 4122 UUID 格式', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const food of DEFAULT_FOODS) {
      expect(food.id).toMatch(uuidRegex);
    }
    for (const recipe of DEFAULT_RECIPES) {
      expect(recipe.id).toMatch(uuidRegex);
      for (const ing of recipe.ingredients) {
        expect(ing.foodId).toMatch(uuidRegex);
      }
    }
    for (const eq of DEFAULT_EQUIPMENTS) {
      expect(eq.id).toMatch(uuidRegex);
    }
    for (const ex of DEFAULT_EXERCISES) {
      expect(ex.id).toMatch(uuidRegex);
      if (ex.equipment) {
        expect(ex.equipment).toMatch(uuidRegex);
      }
    }
    expect(PRIMARY_USER_ID).toMatch(uuidRegex);
    expect(DEFAULT_USER_PROFILE_ID).toMatch(uuidRegex);
  });

  it('所有默認器械應具備唯一 ID 與非空名稱', () => {
    const ids = new Set<string>();
    for (const eq of DEFAULT_EQUIPMENTS) {
      expect(eq.id).toBeTruthy();
      expect(eq.name.trim()).toBeTruthy();
      expect(ids.has(eq.id)).toBe(false);
      ids.add(eq.id);
    }
  });

  it('所有默認單品食材應符合物理克數/毫升標準且熱量宏量素非負', () => {
    const foodIds = new Set<string>();
    for (const food of DEFAULT_FOODS) {
      expect(foodIds.has(food.id)).toBe(false);
      foodIds.add(food.id);

      expect(food.servingSize).toBeGreaterThan(0);
      expect(['g', 'ml']).toContain(food.servingUnit);
      expect(food.calories).toBeGreaterThanOrEqual(0);
      expect(food.protein).toBeGreaterThanOrEqual(0);
      expect(food.carbs).toBeGreaterThanOrEqual(0);
      expect(food.fat).toBeGreaterThanOrEqual(0);
      expect(['natural', 'processed', 'beverage', 'oil', 'condiment']).toContain(food.category);
      // 確保單品名稱不包含主觀修飾形容詞或烹飪手法
      expect(food.name).not.toMatch(/^(香煎|水煮|清炒|油炸|烤|炸)/);
    }

    const soyMilk = DEFAULT_FOODS.find((f) => f.id === DEFAULT_FOOD_IDS.soy_milk);
    expect(soyMilk?.category).toBe('beverage');
    expect(soyMilk?.servingUnit).toBe('ml');
  });

  it('所有默認動作之刺激肌群應符合經典 3 級 MuscleRole 標準', () => {
    for (const ex of DEFAULT_EXERCISES) {
      expect(ex.name.trim()).toBeTruthy();
      expect(['free_weight', 'machine', 'bodyweight', 'cardio']).toContain(ex.category);

      const muscleEntries = Object.entries(ex.targetMuscles || {});
      expect(muscleEntries.length).toBeGreaterThan(0);
      for (const [, roleOrIntensity] of muscleEntries) {
        if (typeof roleOrIntensity === 'string') {
          expect(['primary', 'secondary', 'stabilizer']).toContain(roleOrIntensity);
        } else {
          expect(roleOrIntensity).toBeGreaterThanOrEqual(0);
          expect(roleOrIntensity).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('所有默認動作名稱應符合方案 B 極簡純粹標準，不得包含英文括號對照', () => {
    for (const ex of DEFAULT_EXERCISES) {
      expect(ex.name.trim()).toBeTruthy();
      expect(ex.name).not.toMatch(/\([A-Za-z0-9\s\-_/]+\)/);
    }
  });

  it('所有默認菜餚配方中所引用的食材 ID 必須客觀存在於單品食材庫中', () => {
    const defaultFoodIdSet = new Set(DEFAULT_FOODS.map((f) => f.id));
    for (const recipe of DEFAULT_RECIPES) {
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      for (const ing of recipe.ingredients) {
        expect(defaultFoodIdSet.has(ing.foodId)).toBe(true);
        expect(ing.quantity).toBeGreaterThan(0);
        expect(ing.unit).toBe('g');
      }
    }
  });

  it('菜餚分組 notes 清理邏輯：應精確提取括號內菜餚名並清除冗餘 notes，且不影響自訂備註', () => {
    const cleanNotes = (notes?: string, bundleName?: string) => {
      if (!notes) return { notes, bundleName };
      const bracketMatch = notes.match(/^\[(.*)\]$/);
      if (bracketMatch) {
        const extracted = bracketMatch[1].trim();
        return {
          notes: '',
          bundleName: bundleName || extracted,
        };
      }
      return { notes, bundleName };
    };

    // 測試情境 1：典型括號便當名，已帶 bundleName
    expect(cleanNotes('[經典低脂雞胸便當]', '經典低脂雞胸便當')).toEqual({
      notes: '',
      bundleName: '經典低脂雞胸便當',
    });

    // 測試情境 2：典型括號便當名，過去無 bundleName
    expect(cleanNotes('[經典低脂雞胸便當]')).toEqual({
      notes: '',
      bundleName: '經典低脂雞胸便當',
    });

    // 測試情境 3：使用者個人的真實筆記（如「少油多菜」），絕不誤傷
    expect(cleanNotes('少油多菜', '經典低脂雞胸便當')).toEqual({
      notes: '少油多菜',
      bundleName: '經典低脂雞胸便當',
    });
  });

  it('Version 11 遷移邏輯：訓練記錄必須徹底剝離 notes 與動作組冗餘快照，並補齊 routineId', () => {
    const migrateWorkout = (rawLog: any, routines: Array<{ id: string; name: string }>) => {
      const routineMap = new Map(routines.map((r) => [r.name.trim().toLowerCase(), r.id]));
      let routineId = rawLog.routineId;

      if (!routineId) {
        const titleKey = (rawLog.title || '').trim().toLowerCase();
        if (routineMap.has(titleKey)) {
          routineId = routineMap.get(titleKey);
        }
      }

      const cleanExercises = (rawLog.exercises || []).map((group: any) => ({
        exerciseId: group.exerciseId,
        sets: group.sets || [],
      }));

      const { notes: _removedNotes, title: _removedTitle, ...rest } = rawLog;

      return {
        ...rest,
        routineId,
        exercises: cleanExercises,
      };
    };

    const mockRoutines = [{ id: 'routine_chest_triceps', name: '經典推力訓練' }];
    const legacyWorkout = {
      id: 'w_123',
      date: '2026-11-06',
      title: '經典推力訓練',
      notes: '[經典推力訓練] 練後泵感強烈',
      exercises: [
        {
          exerciseId: 'ex_bench_press',
          exerciseName: '槓鈴臥推',
          category: 'free_weight',
          notes: '熱身充分',
          sets: [{ id: 's_1', setNumber: 1, weight: 80, reps: 8, isCompleted: true }],
        },
      ],
    };

    const migrated = migrateWorkout(legacyWorkout, mockRoutines);

    // 斷言：完全無 notes 與 title 欄位
    expect('notes' in migrated).toBe(false);
    expect('title' in migrated).toBe(false);
    expect(migrated.routineId).toBe('routine_chest_triceps');

    // 斷言：動作組內無 notes、exerciseName、category
    expect(migrated.exercises[0]).toEqual({
      exerciseId: 'ex_bench_press',
      sets: [{ id: 's_1', setNumber: 1, weight: 80, reps: 8, isCompleted: true }],
    });
    expect('notes' in migrated.exercises[0]).toBe(false);
    expect('exerciseName' in migrated.exercises[0]).toBe(false);
    expect('category' in migrated.exercises[0]).toBe(false);
  });

  it('Version 11 遷移邏輯：飲食記錄必須徹底剝離 foodName、熱量三大營養素快照與 notes', () => {
    const migrateFoodLog = (rawLog: any) => {
      const {
        foodName: _fn,
        calories: _cal,
        protein: _p,
        carbs: _c,
        fat: _f,
        notes: _notes,
        ...ssotLog
      } = rawLog;
      return ssotLog;
    };

    const legacyFoodLog = {
      id: 'fl_123',
      date: '2026-11-06',
      mealType: 'lunch',
      foodId: 'food_chicken_breast',
      foodName: '去皮雞胸肉',
      quantity: 150,
      unit: 'g',
      calories: 248,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
      notes: '[經典低脂雞胸便當]',
      bundleId: 'bundle_1',
      bundleName: '經典低脂雞胸便當',
    };

    const migrated = migrateFoodLog(legacyFoodLog);

    expect(migrated).toEqual({
      id: 'fl_123',
      date: '2026-11-06',
      mealType: 'lunch',
      foodId: 'food_chicken_breast',
      quantity: 150,
      unit: 'g',
      bundleId: 'bundle_1',
      bundleName: '經典低脂雞胸便當',
    });
    expect('foodName' in migrated).toBe(false);
    expect('calories' in migrated).toBe(false);
    expect('protein' in migrated).toBe(false);
    expect('carbs' in migrated).toBe(false);
    expect('fat' in migrated).toBe(false);
    expect('notes' in migrated).toBe(false);
  });

  it('Version 11 遷移邏輯：diet_plans 必須徹底剝離寫死之熱量與三大營養素，回歸純粹 activityLevel 與 macroSplit', () => {
    const migrateDietPlan = (rawPlan: any) => {
      let macroSplit = rawPlan.macroSplit;
      if (!macroSplit) {
        if (rawPlan.carbsTarget && rawPlan.proteinTarget && rawPlan.fatTarget) {
          const cK = rawPlan.carbsTarget * 4;
          const pK = rawPlan.proteinTarget * 4;
          const fK = rawPlan.fatTarget * 9;
          const tK = cK + pK + fK;
          if (tK > 0) {
            const cP = Math.round((cK / tK) * 100);
            const pP = Math.round((pK / tK) * 100);
            const fP = Math.max(0, 100 - cP - pP);
            macroSplit = { carbs: cP, protein: pP, fat: fP };
          }
        }
        if (!macroSplit) {
          macroSplit = { carbs: 40, protein: 30, fat: 30 };
        }
      }

      const activityLevel = rawPlan.activityLevel || 1.55;

      const {
        caloriesTarget: _cal,
        proteinTarget: _p,
        carbsTarget: _c,
        fatTarget: _f,
        waterMlTarget: _w,
        planName: _pn,
        ...restPlan
      } = rawPlan;

      return {
        ...restPlan,
        activityLevel,
        macroSplit,
      };
    };

    const legacyPlan = {
      id: 'dp_123',
      date: '2026-11-06',
      planName: '標準目標',
      caloriesTarget: 2100,
      proteinTarget: 184,
      carbsTarget: 210,
      fatTarget: 58,
      waterMlTarget: 2500,
      createdAt: 100,
      updatedAt: 100,
    };

    const migrated = migrateDietPlan(legacyPlan);

    expect(migrated.id).toBe('dp_123');
    expect(migrated.activityLevel).toBe(1.55);
    expect(migrated.macroSplit).toBeDefined();

    // 斷言：寫死數值與主觀計劃名徹底剝離
    expect('planName' in migrated).toBe(false);
    expect('caloriesTarget' in migrated).toBe(false);
    expect('proteinTarget' in migrated).toBe(false);
    expect('carbsTarget' in migrated).toBe(false);
    expect('fatTarget' in migrated).toBe(false);
    expect('waterMlTarget' in migrated).toBe(false);
  });

  it('Version 14 遷移邏輯：將歷史平鋪之 food_logs 與 diet_plans 完整合併為自包含之 daily_diet_logs', () => {
    const legacyDietPlans = [
      {
        id: 'dp_1',
        date: '2026-11-06',
        activityLevel: 1.725,
        macroSplit: { carbs: 50, protein: 30, fat: 20 },
        planName: '高碳日',
        createdAt: 100,
        updatedAt: 100,
      },
    ];

    const legacyFoodLogs = [
      {
        id: 'fl_1',
        date: '2026-11-06',
        mealType: 'breakfast',
        foodId: '11504467-3117-4122-97c6-305bb10ff4dc',
        quantity: 150,
        unit: 'g',
        createdAt: 200,
        updatedAt: 200,
      },
      {
        id: 'fl_2',
        date: '2026-11-06',
        mealType: 'lunch',
        foodId: '182261b5-6e77-4f51-9cdd-4a2b3c5ab785',
        quantity: 10,
        unit: 'g',
        createdAt: 300,
        updatedAt: 300,
      },
    ];

    const planByDate = new Map(legacyDietPlans.map((p) => [p.date, p]));
    const logsByDate = new Map<string, any[]>();
    for (const log of legacyFoodLogs) {
      const list = logsByDate.get(log.date) || [];
      list.push(log);
      logsByDate.set(log.date, list);
    }

    const allDates = new Set([...planByDate.keys(), ...logsByDate.keys()]);
    const consolidatedDailyLogs: any[] = [];

    for (const date of allDates) {
      const plan = planByDate.get(date);
      const rawEntries = logsByDate.get(date) || [];
      rawEntries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      const dailyLog = {
        date,
        meta: {
          activityLevel: plan?.activityLevel ?? 1.55,
          macroSplit: plan?.macroSplit ?? { carbs: 40, protein: 30, fat: 30 },
        },
        entries: rawEntries,
      };
      consolidatedDailyLogs.push(dailyLog);
    }

    expect(consolidatedDailyLogs.length).toBe(1);
    const day = consolidatedDailyLogs[0];
    expect(day.date).toBe('2026-11-06');
    expect(day.meta.activityLevel).toBe(1.725);
    expect('planName' in day.meta).toBe(false);
    expect(day.entries.length).toBe(2);
    expect(day.entries[0].mealType).toBe('breakfast');
    expect(day.entries[1].mealType).toBe('lunch');
  });

  describe('resetDatabaseToFactory (出廠重置核心邏輯)', () => {
    it('應正確清空所有業務記錄，刪除自定義實體，並保留預設出廠實體與個人出廠狀態', async () => {
      const mockClearMap: Record<string, boolean> = {};
      const mockDeletedCustom: Record<string, boolean> = {};
      const mockUnarchived: Record<string, boolean> = {};
      const mockAddedItems: Record<string, any[]> = {};

      const createMockTable = (name: string, items: any[] = []) => ({
        clear: async () => {
          mockClearMap[name] = true;
        },
        filter: (_predicate: any) => ({
          delete: async () => {
            mockDeletedCustom[name] = true;
          },
          first: async () => null,
        }),
        toCollection: () => ({
          modify: async (_updates: any) => {
            mockUnarchived[name] = true;
          },
        }),
        get: async () => null,
        where: () => ({
          equals: () => ({
            first: async () => null,
          }),
        }),
        add: async (item: any) => {
          if (!mockAddedItems[name]) mockAddedItems[name] = [];
          mockAddedItems[name].push(item);
        },
        bulkAdd: async () => {},
        toArray: async () => items,
      });

      const mockDb: any = {
        daily_diet_logs: createMockTable('daily_diet_logs'),
        workout_logs: createMockTable('workout_logs'),
        body_metrics: createMockTable('body_metrics'),
        routines: createMockTable('routines'),
        foods: createMockTable('foods', DEFAULT_FOODS),
        recipes: createMockTable('recipes', DEFAULT_RECIPES),
        exercises: createMockTable('exercises', DEFAULT_EXERCISES),
        equipments: createMockTable('equipments', DEFAULT_EQUIPMENTS),
        user_profile: createMockTable('user_profile'),
        user_base_info: createMockTable('user_base_info'),
      };

      const { resetDatabaseToFactory } = await import('./defaultData');
      await resetDatabaseToFactory(mockDb);

      expect(mockClearMap.daily_diet_logs).toBe(true);
      expect(mockClearMap.workout_logs).toBe(true);
      expect(mockClearMap.body_metrics).toBe(true);
      expect(mockClearMap.routines).toBe(true);
      expect(mockDeletedCustom.foods).toBe(true);
      expect(mockDeletedCustom.recipes).toBe(true);
      expect(mockDeletedCustom.exercises).toBe(true);
      expect(mockDeletedCustom.equipments).toBe(true);
      expect(mockUnarchived.foods).toBe(true);
      expect(mockUnarchived.recipes).toBe(true);
      expect(mockUnarchived.exercises).toBe(true);
      expect(mockUnarchived.equipments).toBe(true);

      // 驗證個人資料重置為出廠空白態
      expect(mockClearMap.user_profile).toBe(true);
      expect(mockClearMap.user_base_info).toBe(true);
      expect(mockAddedItems.user_profile?.[0]?.name).toBe('');
      expect(mockAddedItems.user_profile?.[0]?.heightCm).toBe(0);
      expect(mockAddedItems.user_profile?.[0]?.currentWeightKg).toBe(0);
      expect(mockAddedItems.user_profile?.[0]?.isSetupCompleted).toBe(false);
      expect(mockAddedItems.user_base_info?.[0]?.name).toBe('');
      expect(mockAddedItems.user_base_info?.[0]?.birthDate).toBe('');
      expect(mockAddedItems.user_base_info?.[0]?.heightCm).toBe(0);
      // 驗證未捏造虛假體重記錄
      expect(mockAddedItems.body_metrics).toBeUndefined();
    });
  });
});
