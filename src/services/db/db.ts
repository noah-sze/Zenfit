import Dexie, { type Table } from 'dexie';
import type {
  FoodItem,
  FoodCategory,
  FoodRecipe,
  FoodLog,
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
  restoreMissingDefaultData,
} from './defaultData';

export class ZenfitDatabase extends Dexie {
  foods!: Table<FoodItem>;
  recipes!: Table<FoodRecipe>;
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
            weightUnit: old.weightUnit || 'kg',
            createdAt: old.updatedAt || Date.now(),
            updatedAt: old.updatedAt || Date.now(),
          });

          // 若已有舊目標且今天無飲食計劃，可為今日建立初始計劃
          const todayStr = new Date().toISOString().slice(0, 10);
          if (old.dailyCaloriesTarget) {
            await tx.table('diet_plans').put({
              id: uuidv4(),
              date: todayStr,
              planName: '標準目標',
              caloriesTarget: old.dailyCaloriesTarget || 2000,
              proteinTarget: old.proteinGramsTarget || 140,
              carbsTarget: old.carbsGramsTarget || 220,
              fatTarget: old.fatGramsTarget || 60,
              waterMlTarget: old.dailyWaterMlTarget || 2500,
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
      DEFAULT_EXERCISES.map((ex) => ({ ...ex, id: uuidv4(), createdAt: now, updatedAt: now }))
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
        id: 'default-user-profile',
        name: 'Noah',
        gender: 'male',
        heightCm: 175,
        currentWeightKg: 70,
        activityLevel: 1.55,
        goalType: 'lose_fat',
        dailyCaloriesTarget: 2000,
        proteinGramsTarget: 140,
        carbsGramsTarget: 220,
        fatGramsTarget: 60,
        dailyWaterMlTarget: 2500,
        weightUnit: 'kg',
        isSetupCompleted: true,
        updatedAt: now,
      });
    }

    const baseInfoCount = await this.user_base_info.count();
    if (baseInfoCount === 0) {
      await this.user_base_info.add({
        id: 'primary_user',
        name: 'Noah',
        gender: 'male',
        birthDate: '1999-01',
        heightCm: 175,
        weightUnit: 'kg',
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
}

export const db = new ZenfitDatabase();

// 自動檢查初始化種子資料
db.seedDefaultData().catch(console.error);
