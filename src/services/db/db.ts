import Dexie, { type Table } from 'dexie';
import type {
  FoodItem,
  FoodCategory,
  FoodRecipe,
  FoodLog,
  DailyDietLog,
  Exercise,
  WorkoutRoutine,
  WorkoutLog,
  BodyMetric,
  UserProfile,
  UserBaseInfo,
  DietPlan,
  ExerciseCategory,
  DetailedMuscle,
  Equipment,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
  DEFAULT_EQUIPMENTS,
  DEFAULT_EXERCISES,
  DEFAULT_FOODS,
  DEFAULT_RECIPES,
  PRIMARY_USER_ID,
  DEFAULT_USER_PROFILE_ID,
  LEGACY_ID_TO_UUID_MAP,
  restoreMissingDefaultData,
} from './defaultData';

export class ZenfitDatabase extends Dexie {
  foods!: Table<FoodItem>;
  recipes!: Table<FoodRecipe>;
  daily_diet_logs!: Table<DailyDietLog>;
  food_logs!: Table<FoodLog>;
  exercises!: Table<Exercise>;
  routines!: Table<WorkoutRoutine>;
  equipments!: Table<Equipment>;
  workout_logs!: Table<WorkoutLog>;
  body_metrics!: Table<BodyMetric>;
  user_profile!: Table<UserProfile>;
  user_base_info!: Table<UserBaseInfo>;
  diet_plans!: Table<DietPlan>;

  constructor() {
    super('ZenfitDB');

    this.version(2).stores({
      foods: 'id, name, updatedAt',
      food_logs: 'id, date, mealType, foodId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
    });

    this.version(3).stores({
      foods: 'id, name, updatedAt',
      food_logs: 'id, date, mealType, foodId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      try {
        const oldProfiles = await tx.table('user_profile').toArray();
        if (oldProfiles.length > 0) {
          const old = oldProfiles[0];
          await tx.table('user_base_info').put({
            id: 'primary_user',
            name: old.name || 'Noah',
            gender: old.gender || 'male',
            birthDate: old.birthDate || '1999-01',
            heightCm: old.heightCm || 175,
            createdAt: old.updatedAt || Date.now(),
            updatedAt: old.updatedAt || Date.now(),
          });

          // 若已有舊目標且今天無飲食計劃，可為今日建立初始計劃
          const todayStr = new Date().toISOString().slice(0, 10);
          if (old.dailyCaloriesTarget) {
            await tx.table('diet_plans').put({
              id: uuidv4(),
              date: todayStr,
              caloriesTarget: old.dailyCaloriesTarget || 2000,
              proteinTarget: old.proteinGramsTarget || 140,
              carbsTarget: old.carbsGramsTarget || 220,
              fatTarget: old.fatGramsTarget || 60,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }

          // 若無體重記錄，為今日建立初始體重
          const metricCount = await tx.table('body_metrics').count();
          if (metricCount === 0 && old.currentWeightKg) {
            await tx.table('body_metrics').put({
              id: uuidv4(),
              date: todayStr,
              weight: old.currentWeightKg,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
        }
      } catch (err) {
        console.error('Dexie migration version 3 error:', err);
      }
    });

    this.version(4).stores({
      foods: 'id, name, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (_tx) => {
      // 升級版本 4：新增菜餚組合 (recipes) 表，平滑相容
    });

    this.version(5).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      // 升級版本 5：為既有單品食材補齊 category 欄位
      const allFoods = await tx.table('foods').toArray();
      for (const food of allFoods) {
        if (!food.category) {
          let category: FoodCategory = 'natural';
          if (food.id === 'food_cooking_oil' || food.name.includes('油')) {
            category = 'oil';
          } else if (
            food.id === 'food_whey_protein' ||
            food.id === 'food_greek_yogurt' ||
            food.id === 'food_soy_milk'
          ) {
            category = 'processed';
          } else if (
            food.name.includes('鹽') ||
            food.name.includes('醬') ||
            food.name.includes('醋') ||
            food.name.includes('胡椒') ||
            food.name.includes('粉')
          ) {
            category = 'condiment';
          }
          await tx.table('foods').update(food.id, { category });
        }
      }
    });

    this.version(6).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, isCustom, isArchived, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      // 升級版本 6：為既有單品動作遷移形態分類與細分肌群刺激強度
      const allExercises = await tx.table('exercises').toArray();
      const validCategories: ExerciseCategory[] = ['free_weight', 'machine', 'bodyweight', 'cardio'];
      for (const ex of allExercises) {
        let newCat: ExerciseCategory = 'free_weight';
        if (validCategories.includes(ex.category as any)) {
          newCat = ex.category as ExerciseCategory;
        } else if (ex.equipment === 'machine' || ex.equipment === 'cable') {
          newCat = 'machine';
        } else if (ex.equipment === 'bodyweight') {
          newCat = 'bodyweight';
        } else if (ex.category === 'cardio') {
          newCat = 'cardio';
        } else {
          newCat = 'free_weight';
        }

        let targetMuscles: Partial<Record<DetailedMuscle, number>> = ex.targetMuscles || {};
        if (Object.keys(targetMuscles).length === 0) {
          const oldCat = String(ex.category || '');
          if (oldCat === 'chest') targetMuscles = { mid_lower_chest: 100, front_delts: 50, triceps: 40 };
          else if (oldCat === 'back') targetMuscles = { lats: 90, upper_back_traps: 70, biceps: 50 };
          else if (oldCat === 'legs') targetMuscles = { quads: 100, glutes: 70 };
          else if (oldCat === 'shoulders') targetMuscles = { front_delts: 90, side_delts: 70 };
          else if (oldCat === 'arms') targetMuscles = { biceps: 80, triceps: 80 };
          else if (oldCat === 'core') targetMuscles = { abs: 90 };
          else targetMuscles = { mid_lower_chest: 50 };
        }

        await tx.table('exercises').update(ex.id, {
          category: newCat,
          targetMuscles,
        });
      }
    });

    this.version(7).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, isCustom, isArchived, updatedAt',
      equipments: 'id, name, isCustom, isArchived, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      // 升級版本 7：為既有動作精確遷移器械載荷
      const allExercises = await tx.table('exercises').toArray();
      for (const ex of allExercises) {
        if (ex.equipment === 'machine') {
          let newEq = 'pin_loaded_machine';
          if (ex.name.includes('腿舉') || ex.name.includes('倒蹬') || ex.name.includes('腿推')) newEq = 'leg_press';
          else if (ex.name.includes('哈克')) newEq = 'hack_squat';
          else if (ex.name.includes('史密斯')) newEq = 'smith_machine';
          else if (ex.name.includes('跑步機')) newEq = 'cardio_machine';
          await tx.table('exercises').update(ex.id, { equipment: newEq });
        }
      }

      // 平滑升級：若既有預設器械存在斜線，更新為標準單一名詞
      const legPress = await tx.table('equipments').get('leg_press');
      if (legPress && legPress.name.includes('/')) {
        await tx.table('equipments').update('leg_press', { name: '腿舉機' });
      }
    });

    this.version(8).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, bundleId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, isCustom, isArchived, updatedAt',
      equipments: 'id, name, isCustom, isArchived, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (_tx) => {
      // 升級版本 8：為 food_logs 新增 bundleId 索引以支援食材動態分組 (Meal Bundle)，平滑向下相容既有數據
    });

    this.version(9).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, bundleId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, isCustom, isArchived, updatedAt',
      equipments: 'id, name, isCustom, isArchived, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      // 升級版本 9：清理既有動作庫與歷史訓練日誌中的括號英文名稱，落實極簡純粹命名標準 (方案 B)
      const cleanExerciseName = (rawName: string): string => {
        const matched = rawName.match(/^(.+?)\s*\([A-Za-z0-9\s\-_/]+\)$/);
        return matched ? matched[1].trim() : rawName.trim();
      };

      // 1. 遷移既有 exercises 資料表
      const exercisesTable = tx.table('exercises');
      const allExercises = await exercisesTable.toArray();
      const nameUpdateMap = new Map<string, string>();

      for (const ex of allExercises) {
        const cleanedName = cleanExerciseName(ex.name);
        if (cleanedName !== ex.name) {
          nameUpdateMap.set(ex.name, cleanedName);
          await exercisesTable.update(ex.id, {
            name: cleanedName,
            updatedAt: Date.now(),
          });
        }
      }

      // 2. 遷移既有 workout_logs 裡的 exerciseName，確保歷史記錄關聯與統計無縫平滑
      const workoutLogsTable = tx.table('workout_logs');
      const allWorkoutLogs = await workoutLogsTable.toArray();

      for (const log of allWorkoutLogs) {
        let hasChanges = false;
        const updatedExercises = log.exercises?.map((group: any) => {
          const rawName = group.exerciseName || '';
          const directMatch = nameUpdateMap.get(rawName);
          const cleaned = directMatch || cleanExerciseName(rawName);
          if (cleaned !== group.exerciseName) {
            hasChanges = true;
            return {
              ...group,
              exerciseName: cleaned,
            };
          }
          return group;
        });

        if (hasChanges) {
          await workoutLogsTable.update(log.id, {
            exercises: updatedExercises,
            updatedAt: Date.now(),
          });
        }
      }
    });

    this.version(10).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, bundleId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, isCustom, isArchived, updatedAt',
      equipments: 'id, name, isCustom, isArchived, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      // 升級版本 10：清理既有 food_logs 中冗餘的 [菜餚名稱] notes，回歸純粹 bundleId/bundleName
      const foodLogsTable = tx.table('food_logs');
      const allLogs = await foodLogsTable.toArray();
      const now = Date.now();

      for (const log of allLogs) {
        let shouldUpdate = false;
        let cleanedNotes = log.notes;
        let bundleName = log.bundleName;

        if (log.notes) {
          const bracketMatch = log.notes.match(/^\[(.*)\]$/);
          if (bracketMatch) {
            const extractedName = bracketMatch[1].trim();
            if (log.bundleId || log.bundleName) {
              if (!bundleName) bundleName = extractedName;
              cleanedNotes = '';
              shouldUpdate = true;
            } else if (extractedName) {
              bundleName = extractedName;
              cleanedNotes = '';
              shouldUpdate = true;
            }
          }
        }

        if (shouldUpdate) {
          await foodLogsTable.update(log.id, {
            notes: cleanedNotes,
            bundleName,
            updatedAt: now,
            rev: (log.rev || 1) + 1,
          });
        }
      }
    });

    this.version(11).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, bundleId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, isCustom, isArchived, updatedAt',
      equipments: 'id, name, isCustom, isArchived, updatedAt',
      workout_logs: 'id, date, title, routineId, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      // 升級版本 11：落實 SSOT 純粹客觀真理源標準
      // 1. 訓練記錄徹底移除 notes；動作群組移除 notes、動作名稱與分類快照
      // 2. 飲食記錄移除食物名稱快照、營養素快照 (calories/protein/carbs/fat) 與 notes
      const now = Date.now();

      // 1. 遷移 workout_logs
      const workoutLogsTable = tx.table('workout_logs');
      const allWorkouts = await workoutLogsTable.toArray();
      const allRoutines = await tx.table('routines').toArray();
      const routineNameMap = new Map<string, string>();
      for (const r of allRoutines) {
        if (r.name) routineNameMap.set(r.name.trim().toLowerCase(), r.id);
      }

      for (const log of allWorkouts) {
        let changed = false;
        let matchedRoutineId = log.routineId;

        if (!matchedRoutineId) {
          const tClean = (log.title || '').trim().toLowerCase();
          if (routineNameMap.has(tClean)) {
            matchedRoutineId = routineNameMap.get(tClean);
            changed = true;
          } else if (log.notes) {
            const m = String(log.notes).match(/^\[(.*?)\]/);
            if (m && routineNameMap.has(m[1].trim().toLowerCase())) {
              matchedRoutineId = routineNameMap.get(m[1].trim().toLowerCase());
              changed = true;
            }
          }
        }

        const cleanedExercises = (log.exercises || []).map((group: any) => {
          if ('exerciseName' in group || 'category' in group || 'notes' in group) {
            changed = true;
          }
          return {
            exerciseId: group.exerciseId,
            sets: group.sets || [],
          };
        });

        if ('notes' in log || changed) {
          const { notes: _removedNotes, ...restLog } = log as any;
          await workoutLogsTable.put({
            ...restLog,
            routineId: matchedRoutineId,
            exercises: cleanedExercises,
            updatedAt: now,
            rev: (log.rev || 1) + 1,
          });
        }
      }

      // 2. 遷移 food_logs
      const foodLogsTable = tx.table('food_logs');
      const allFoodLogs = await foodLogsTable.toArray();

      for (const log of allFoodLogs) {
        if (
          'foodName' in log ||
          'calories' in log ||
          'protein' in log ||
          'carbs' in log ||
          'fat' in log ||
          'notes' in log
        ) {
          const {
            foodName: _fn,
            calories: _cal,
            protein: _p,
            carbs: _c,
            fat: _f,
            notes: _notes,
            ...ssotLog
          } = log as any;

          await foodLogsTable.put({
            ...ssotLog,
            updatedAt: now,
            rev: (log.rev || 1) + 1,
          });
        }
      }

      // 3. 遷移 diet_plans：落實 SSOT，移除寫死之熱量與三大營養素，只保留 activityLevel 與 macroSplit
      const dietPlansTable = tx.table('diet_plans');
      const allDietPlans = await dietPlansTable.toArray();

      for (const plan of allDietPlans) {
        let macroSplit = plan.macroSplit;
        if (!macroSplit) {
          if (plan.carbsTarget && plan.proteinTarget && plan.fatTarget) {
            const cK = plan.carbsTarget * 4;
            const pK = plan.proteinTarget * 4;
            const fK = plan.fatTarget * 9;
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

        const activityLevel = plan.activityLevel || 1.55;

        // 徹底剔除寫死目標克數、熱量與飲水目標
        const {
          caloriesTarget: _cal,
          proteinTarget: _p,
          carbsTarget: _c,
          fatTarget: _f,
          waterMlTarget: _w,
          ...restPlan
        } = plan as any;

        await dietPlansTable.put({
          ...restPlan,
          activityLevel,
          macroSplit,
          updatedAt: now,
          rev: (plan.rev || 1) + 1,
        });
      }
    });

    this.version(12).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, bundleId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, isCustom, isArchived, updatedAt',
      equipments: 'id, name, isCustom, isArchived, updatedAt',
      workout_logs: 'id, date, title, routineId, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      // 升級版本 12：落實純 ID 關聯正規化與徹底清理 IndexedDB 歷史殘留快照
      // 1. recipes: 徹底剔除 ingredients 內的 foodName 與根層級的 description
      // 2. food_logs: 徹底剔除 foodName, calories, protein, carbs, fat, notes
      // 3. workout_logs: 徹底剔除 exercises 內的 exerciseName, category, notes
      // 4. user_base_info: 徹底剔除 weightUnit 與 activityLevel
      const now = Date.now();

      // 1. 遷移既有 recipes
      const recipesTable = tx.table('recipes');
      const allRecipes = await recipesTable.toArray();
      for (const recipe of allRecipes) {
        let changed = false;
        if ('description' in recipe) changed = true;
        const cleanedIngredients = (recipe.ingredients || []).map((ing: any) => {
          if ('foodName' in ing) changed = true;
          return {
            foodId: ing.foodId,
            quantity: ing.quantity,
            unit: ing.unit,
            ...(typeof ing.isOptional === 'boolean' ? { isOptional: ing.isOptional } : {}),
          };
        });

        if (changed) {
          const { description: _desc, ...restRecipe } = recipe as any;
          await recipesTable.put({
            ...restRecipe,
            ingredients: cleanedIngredients,
            updatedAt: now,
            rev: (recipe.rev || 1) + 1,
          });
        }
      }

      // 2. 遷移既有 food_logs
      const foodLogsTable = tx.table('food_logs');
      const allFoodLogs = await foodLogsTable.toArray();
      for (const log of allFoodLogs) {
        if (
          'foodName' in log ||
          'calories' in log ||
          'protein' in log ||
          'carbs' in log ||
          'fat' in log ||
          'notes' in log
        ) {
          const {
            foodName: _fn,
            calories: _c,
            protein: _p,
            carbs: _cb,
            fat: _f,
            notes: _n,
            ...restLog
          } = log as any;
          await foodLogsTable.put({
            ...restLog,
            updatedAt: now,
            rev: (log.rev || 1) + 1,
          });
        }
      }

      // 3. 遷移既有 workout_logs
      const workoutLogsTable = tx.table('workout_logs');
      const allWorkoutLogs = await workoutLogsTable.toArray();
      for (const wLog of allWorkoutLogs) {
        let needsClean = 'notes' in wLog;
        const cleanedExercises = (wLog.exercises || []).map((group: any) => {
          if ('exerciseName' in group || 'category' in group || 'notes' in group) {
            needsClean = true;
          }
          return {
            exerciseId: group.exerciseId,
            sets: (group.sets || []).map((s: any) => ({
              id: s.id,
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              isCompleted: Boolean(s.isCompleted),
              ...(s.rpe !== undefined ? { rpe: s.rpe } : {}),
            })),
          };
        });
        if (needsClean) {
          const { notes: _wn, ...restWLog } = wLog as any;
          await workoutLogsTable.put({
            ...restWLog,
            exercises: cleanedExercises,
            updatedAt: now,
            rev: (wLog.rev || 1) + 1,
          });
        }
      }

      // 4. 遷移既有 user_base_info
      const baseInfoTable = tx.table('user_base_info');
      const allBaseInfo = await baseInfoTable.toArray();
      for (const info of allBaseInfo) {
        if ('weightUnit' in info || 'activityLevel' in info) {
          const { weightUnit: _wu, activityLevel: _al, ...restInfo } = info as any;
          await baseInfoTable.put({
            ...restInfo,
            updatedAt: now,
            rev: (info.rev || 1) + 1,
          });
        }
      }
    });

    this.version(13).stores({
      foods: 'id, name, category, updatedAt',
      recipes: 'id, name, isCustom, isArchived, updatedAt',
      food_logs: 'id, date, mealType, foodId, bundleId, createdAt, updatedAt, [date+mealType]',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, isCustom, isArchived, updatedAt',
      equipments: 'id, name, isCustom, isArchived, updatedAt',
      workout_logs: 'id, date, title, routineId, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      diet_plans: 'id, date, updatedAt',
    }).upgrade(async (tx) => {
      // 升級版本 13：實體 ID 全面隨機化/UUID 化與外鍵級聯更新 (Cascade Migration)
      // 1. foods: 主鍵 ID 遷移至標準固定 UUID
      // 2. recipes: 主鍵 ID 與 ingredients[].foodId 遷移至標準固定 UUID
      // 3. food_logs: foodId 外鍵級聯遷移至新 UUID
      // 4. equipments: 主鍵 ID 遷移至標準固定 UUID
      // 5. exercises: equipment 外鍵級聯遷移至新 UUID
      // 6. user_base_info: 主鍵 ID 遷移至標準固定 UUID
      // 7. user_profile: 主鍵 ID 遷移至標準固定 UUID
      const now = Date.now();

      // 1. 遷移 foods 主鍵
      const foodsTable = tx.table('foods');
      const allFoods = await foodsTable.toArray();
      for (const food of allFoods) {
        const targetUuid = LEGACY_ID_TO_UUID_MAP[food.id];
        if (targetUuid && targetUuid !== food.id) {
          await foodsTable.delete(food.id);
          await foodsTable.put({
            ...food,
            id: targetUuid,
            updatedAt: now,
            rev: (food.rev || 1) + 1,
          });
        }
      }

      // 2. 遷移 recipes 主鍵與配方中的 foodId 引用
      const recipesTable = tx.table('recipes');
      const allRecipes = await recipesTable.toArray();
      for (const recipe of allRecipes) {
        const targetRecipeUuid = LEGACY_ID_TO_UUID_MAP[recipe.id] || recipe.id;
        let ingredientsChanged = false;
        const nextIngredients = (recipe.ingredients || []).map((ing: any) => {
          const mappedFoodId = LEGACY_ID_TO_UUID_MAP[ing.foodId];
          if (mappedFoodId && mappedFoodId !== ing.foodId) {
            ingredientsChanged = true;
            return { ...ing, foodId: mappedFoodId };
          }
          return ing;
        });

        if (targetRecipeUuid !== recipe.id || ingredientsChanged) {
          if (targetRecipeUuid !== recipe.id) {
            await recipesTable.delete(recipe.id);
          }
          await recipesTable.put({
            ...recipe,
            id: targetRecipeUuid,
            ingredients: nextIngredients,
            updatedAt: now,
            rev: (recipe.rev || 1) + 1,
          });
        }
      }

      // 3. 遷移 food_logs 中的 foodId 引用
      const foodLogsTable = tx.table('food_logs');
      const allFoodLogs = await foodLogsTable.toArray();
      for (const log of allFoodLogs) {
        if (log.foodId && LEGACY_ID_TO_UUID_MAP[log.foodId]) {
          const newFoodId = LEGACY_ID_TO_UUID_MAP[log.foodId];
          await foodLogsTable.update(log.id, {
            foodId: newFoodId,
            updatedAt: now,
            rev: (log.rev || 1) + 1,
          });
        }
      }

      // 4. 遷移 equipments 主鍵
      const equipmentsTable = tx.table('equipments');
      const allEquipments = await equipmentsTable.toArray();
      for (const eq of allEquipments) {
        const targetEqUuid = LEGACY_ID_TO_UUID_MAP[eq.id];
        if (targetEqUuid && targetEqUuid !== eq.id) {
          await equipmentsTable.delete(eq.id);
          await equipmentsTable.put({
            ...eq,
            id: targetEqUuid,
            updatedAt: now,
            rev: (eq.rev || 1) + 1,
          });
        }
      }

      // 5. 遷移 exercises 中的 equipment 外鍵引用
      const exercisesTable = tx.table('exercises');
      const allExercises = await exercisesTable.toArray();
      for (const ex of allExercises) {
        if (ex.equipment && LEGACY_ID_TO_UUID_MAP[ex.equipment]) {
          const newEqUuid = LEGACY_ID_TO_UUID_MAP[ex.equipment];
          await exercisesTable.update(ex.id, {
            equipment: newEqUuid,
            updatedAt: now,
            rev: (ex.rev || 1) + 1,
          });
        }
      }

      // 6. 遷移 user_base_info 主鍵
      const baseInfoTable = tx.table('user_base_info');
      const legacyBaseUser = await baseInfoTable.get('primary_user');
      if (legacyBaseUser) {
        await baseInfoTable.delete('primary_user');
        await baseInfoTable.put({
          ...legacyBaseUser,
          id: PRIMARY_USER_ID,
          updatedAt: now,
          rev: (legacyBaseUser.rev || 1) + 1,
        });
      }

      // 7. 遷移 user_profile 主鍵
      const profileTable = tx.table('user_profile');
      const legacyProfile = await profileTable.get('default-user-profile');
      if (legacyProfile) {
        await profileTable.delete('default-user-profile');
        await profileTable.put({
          ...legacyProfile,
          id: DEFAULT_USER_PROFILE_ID,
          updatedAt: now,
          rev: (legacyProfile.rev || 1) + 1,
        });
      }
    });

    this.version(14).stores({
      foods: 'id, name, updatedAt',
      recipes: 'id, name, updatedAt',
      daily_diet_logs: 'id, &date, updatedAt',
      exercises: 'id, name, category, equipment, updatedAt',
      routines: 'id, name, updatedAt',
      equipments: 'id, name, updatedAt',
      workout_logs: 'id, date, title, createdAt, updatedAt',
      body_metrics: 'id, date, updatedAt',
      user_profile: 'id, updatedAt',
      user_base_info: 'id, updatedAt',
      food_logs: null,
      diet_plans: null,
    }).upgrade(async (tx) => {
      // 升級版本 14：將歷史平鋪之 food_logs 與 diet_plans 完整合併為自包含之 daily_diet_logs（日誌頭部 meta + 進食組件 entries）
      const dietPlansTable = tx.table('diet_plans');
      const foodLogsTable = tx.table('food_logs');
      const dailyDietLogsTable = tx.table('daily_diet_logs');

      const allDietPlans = await dietPlansTable.toArray();
      const planByDate = new Map<string, any>();
      for (const p of allDietPlans) {
        if (p.date) {
          planByDate.set(p.date, p);
        }
      }

      const allFoodLogs = await foodLogsTable.toArray();
      const logsByDate = new Map<string, any[]>();
      for (const log of allFoodLogs) {
        if (!log.date) continue;
        const list = logsByDate.get(log.date) || [];
        list.push(log);
        logsByDate.set(log.date, list);
      }

      const allDates = new Set<string>([...planByDate.keys(), ...logsByDate.keys()]);

      for (const date of allDates) {
        const plan = planByDate.get(date);
        const rawEntries = logsByDate.get(date) || [];

        rawEntries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        const entries = rawEntries.map((e) => ({
          id: e.id || uuidv4(),
          date: e.date || date,
          mealType: e.mealType || 'breakfast',
          foodId: e.foodId,
          quantity: e.quantity || 100,
          unit: e.unit || 'g',
          ...(e.bundleId ? { bundleId: e.bundleId } : {}),
          createdAt: e.createdAt || Date.now(),
          updatedAt: e.updatedAt || Date.now(),
        }));

        const meta = {
          activityLevel: plan?.activityLevel ?? 1.55,
          macroSplit: plan?.macroSplit ?? { carbs: 40, protein: 30, fat: 30 },
        };

        const now = Date.now();
        const dailyLog: DailyDietLog = {
          id: uuidv4(),
          date,
          meta,
          entries,
          createdAt: plan?.createdAt || entries[0]?.createdAt || now,
          updatedAt: Math.max(plan?.updatedAt || 0, ...entries.map((e) => e.updatedAt || 0), now),
        };

        await dailyDietLogsTable.put(dailyLog);
      }
    });

    this.version(15).upgrade(async (tx) => {
      // 升級版本 15：嚴格踐行純 ID 引用正規化 (Rule 24) 與客觀測量儀哲學
      // 1. 徹底清除 daily_diet_logs.meta 中的 planName
      // 2. 徹底清除 daily_diet_logs.entries 中的 bundleName
      // 3. 若 entry 帶有舊版 bundleName 且 bundleId 尚未對齊 recipe.id，自動透過菜餚名稱查找對齊其 recipe.id
      const recipes = await tx.table('recipes').toArray();
      const recipeNameToIdMap = new Map<string, string>();
      for (const r of recipes) {
        if (r.name) recipeNameToIdMap.set(r.name, r.id);
      }

      const dailyLogs = await tx.table('daily_diet_logs').toArray();
      for (const log of dailyLogs) {
        let changed = false;
        if (log.meta && 'planName' in log.meta) {
          delete log.meta.planName;
          changed = true;
        }
        if (Array.isArray(log.entries)) {
          for (const entry of log.entries) {
            if ('bundleName' in entry) {
              const bName = (entry as any).bundleName;
              if (bName && recipeNameToIdMap.has(bName)) {
                entry.bundleId = recipeNameToIdMap.get(bName);
              }
              delete (entry as any).bundleName;
              changed = true;
            }
          }
        }
        if (changed) {
          await tx.table('daily_diet_logs').put(log);
        }
      }

      // 4. 徹底清除 workout_logs 中的 title 快照；若缺少 routineId 且 title 匹配課表名稱，自動補全 routineId
      const routines = await tx.table('routines').toArray();
      const routineNameToIdMap = new Map<string, string>();
      for (const r of routines) {
        if (r.name) routineNameToIdMap.set(r.name.trim().toLowerCase(), r.id);
      }

      const workoutLogs = await tx.table('workout_logs').toArray();
      for (const log of workoutLogs) {
        let changed = false;
        if ('title' in log) {
          const tName = (log as any).title?.trim()?.toLowerCase();
          if (!log.routineId && tName && routineNameToIdMap.has(tName)) {
            log.routineId = routineNameToIdMap.get(tName);
          }
          delete (log as any).title;
          changed = true;
        }
        if (changed) {
          await tx.table('workout_logs').put(log);
        }
      }

      // 5. 徹底清除 routines.exercises 中的 defaultSets 等組數設定
      const allRoutines = await tx.table('routines').toArray();
      for (const r of allRoutines) {
        if (Array.isArray(r.exercises)) {
          let modified = false;
          const cleanEx = r.exercises.map((item: any) => {
            if ('defaultSets' in item || 'notes' in item) {
              modified = true;
              return { exerciseId: item.exerciseId };
            }
            return item;
          });
          if (modified) {
            r.exercises = cleanEx;
            await tx.table('routines').put(r);
          }
        }
      }
    });
  }

  async seedDefaultData() {
    const SEED_STORAGE_KEY = 'zenfit_seed_initialized';
    const isSeeded = typeof window !== 'undefined' && localStorage.getItem(SEED_STORAGE_KEY);
    if (isSeeded) {
      return;
    }

    const now = Date.now();
    const foodCount = await this.foods.count();
    const exerciseCount = await this.exercises.count();
    const equipmentCount = await this.equipments.count();

    // 若既有資料庫已存在數據，表示使用者已初始化過，僅記錄標記防復活，絕不覆寫或增補
    if (foodCount > 0 || exerciseCount > 0 || equipmentCount > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEED_STORAGE_KEY, 'true');
      }
      return;
    }

    // 全新資料庫初始種子寫入
    await this.equipments.bulkAdd(
      DEFAULT_EQUIPMENTS.map((eq) => ({ ...eq, createdAt: now, updatedAt: now }))
    );
    await this.exercises.bulkAdd(
      DEFAULT_EXERCISES.map((ex) => ({ ...ex, createdAt: now, updatedAt: now }))
    );
    await this.foods.bulkAdd(
      DEFAULT_FOODS.map((f) => ({ ...f, createdAt: now, updatedAt: now }))
    );
    await this.recipes.bulkAdd(
      DEFAULT_RECIPES.map((r) => ({ ...r, createdAt: now, updatedAt: now }))
    );

    const profileCount = await this.user_profile.count();
    if (profileCount === 0) {
      await this.user_profile.add({
        id: DEFAULT_USER_PROFILE_ID,
        name: 'Noah',
        gender: 'male',
        heightCm: 175,
        currentWeightKg: 70,
        activityLevel: 1.55,
        goalType: 'lose_fat',
        weightUnit: 'kg',
        isSetupCompleted: true,
        updatedAt: now,
      });
    }

    const baseInfoCount = await this.user_base_info.count();
    if (baseInfoCount === 0) {
      await this.user_base_info.add({
        id: PRIMARY_USER_ID,
        name: 'Noah',
        gender: 'male',
        birthDate: '1999-01',
        heightCm: 175,
        createdAt: now,
        updatedAt: now,
      });
    }

    const metricCount = await this.body_metrics.count();
    if (metricCount === 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      await this.body_metrics.add({
        id: uuidv4(),
        date: todayStr,
        weight: 70,
        waterMl: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(SEED_STORAGE_KEY, 'true');
    }
  }

  async restoreDefaultData() {
    return await restoreMissingDefaultData(this);
  }

  /**
   * 導出整座資料庫所有表的原始無損數據快照（供除錯與架構審查）
   */
  async exportRawSnapshot(): Promise<Record<string, unknown[]>> {
    const snapshot: Record<string, unknown[]> = {};
    for (const table of this.tables) {
      snapshot[table.name] = await table.toArray();
    }
    return snapshot;
  }

  /**
   * 瀏覽器控制台便捷除錯：一鍵將全資料庫下載為格式化 JSON 檔案
   */
  async dump() {
    if (typeof window === 'undefined') return;
    const snapshot = await this.exportRawSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenfit-raw-db-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('[ZenfitDB] 原始資料庫快照已匯出下載。包含表格：', Object.keys(snapshot));
    return snapshot;
  }
}

export const db = new ZenfitDatabase();

// 自動檢查初始化種子資料
db.seedDefaultData().catch(console.error);

// 掛載至 window 便於開發者與架構審查在 Console 即時檢視
if (typeof window !== 'undefined') {
  (window as any).db = db;
}
