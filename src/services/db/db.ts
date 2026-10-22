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
  }

  async seedDefaultData() {
    const now = Date.now();

    // 初始化預設器械庫
    const equipmentCount = await this.equipments.count();
    if (equipmentCount === 0) {
      const defaultEquipments: Equipment[] = [
        { id: 'barbell', name: '槓鈴', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'dumbbell', name: '啞鈴', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'kettlebell', name: '壺鈴', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'specialty_bar', name: '專項槓', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'cable', name: '繩索滑輪', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'pin_loaded_machine', name: '插銷式器械', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'plate_loaded_machine', name: '掛片式器械', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'smith_machine', name: '史密斯機', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'leg_press', name: '腿舉機', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'hack_squat', name: '哈克機', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'bodyweight', name: '徒手自重', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'weighted_bodyweight', name: '負重自重', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'resistance_band', name: '彈力帶', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'gymnastic_rings', name: '體操吊環', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'cardio_machine', name: '有氧設備', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: 'other', name: '其他', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
      ];
      await this.equipments.bulkAdd(defaultEquipments);
    }

    const exerciseCount = await this.exercises.count();

    if (exerciseCount === 0) {
      const defaultExercises: Exercise[] = [
        // 胸部動作
        {
          id: uuidv4(),
          name: '槓鈴臥推 (Bench Press)',
          category: 'free_weight',
          equipment: 'barbell',
          targetMuscles: { mid_lower_chest: 100, front_delts: 50, triceps: 40 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '上斜啞鈴臥推 (Incline Dumbbell Press)',
          category: 'free_weight',
          equipment: 'dumbbell',
          targetMuscles: { upper_chest: 100, front_delts: 60, triceps: 40 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '滑輪夾胸 (Cable Fly)',
          category: 'machine',
          equipment: 'cable',
          targetMuscles: { mid_lower_chest: 100 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '雙槓臂屈伸 (Dips)',
          category: 'bodyweight',
          equipment: 'bodyweight',
          targetMuscles: { mid_lower_chest: 90, triceps: 80, front_delts: 40 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        // 背部動作
        {
          id: uuidv4(),
          name: '傳統硬舉 (Deadlift)',
          category: 'free_weight',
          equipment: 'barbell',
          targetMuscles: { lower_back: 100, glutes: 90, hamstrings: 70, upper_back_traps: 70, forearms: 50 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '槓鈴划船 (Barbell Row)',
          category: 'free_weight',
          equipment: 'barbell',
          targetMuscles: { lats: 90, upper_back_traps: 80, biceps: 50, lower_back: 40 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '引體向上 (Pull-up)',
          category: 'bodyweight',
          equipment: 'bodyweight',
          targetMuscles: { lats: 100, upper_back_traps: 60, biceps: 60, forearms: 40 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '滑輪下拉 (Lat Pulldown)',
          category: 'machine',
          equipment: 'cable',
          targetMuscles: { lats: 100, biceps: 50, upper_back_traps: 40 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '坐姿划船 (Seated Cable Row)',
          category: 'machine',
          equipment: 'cable',
          targetMuscles: { upper_back_traps: 90, lats: 70, biceps: 50 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        // 腿部動作
        {
          id: uuidv4(),
          name: '槓鈴深蹲 (Barbell Squat)',
          category: 'free_weight',
          equipment: 'barbell',
          targetMuscles: { quads: 100, glutes: 80, abs: 30, lower_back: 30 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '羅馬尼亞硬舉 (Romanian Deadlift)',
          category: 'free_weight',
          equipment: 'barbell',
          targetMuscles: { hamstrings: 100, glutes: 80, lower_back: 50 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '腿推機 (Leg Press)',
          category: 'machine',
          equipment: 'leg_press',
          targetMuscles: { quads: 100, glutes: 60 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '腿伸展 (Leg Extension)',
          category: 'machine',
          equipment: 'pin_loaded_machine',
          targetMuscles: { quads: 100 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '腿彎舉 (Leg Curl)',
          category: 'machine',
          equipment: 'pin_loaded_machine',
          targetMuscles: { hamstrings: 100 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        // 肩部動作
        {
          id: uuidv4(),
          name: '站姿槓鈴推舉 (Overhead Press)',
          category: 'free_weight',
          equipment: 'barbell',
          targetMuscles: { front_delts: 100, triceps: 60, upper_chest: 40, abs: 30 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '啞鈴側平舉 (Dumbbell Lateral Raise)',
          category: 'free_weight',
          equipment: 'dumbbell',
          targetMuscles: { side_delts: 100, upper_back_traps: 30 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '繩索面拉 (Face Pull)',
          category: 'machine',
          equipment: 'cable',
          targetMuscles: { rear_delts: 100, upper_back_traps: 70 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        // 手臂動作
        {
          id: uuidv4(),
          name: '滑輪三頭下壓 (Tricep Pushdown)',
          category: 'machine',
          equipment: 'cable',
          targetMuscles: { triceps: 100 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '槓鈴二頭彎舉 (Barbell Curl)',
          category: 'free_weight',
          equipment: 'barbell',
          targetMuscles: { biceps: 100, forearms: 40 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '啞鈴錘式彎舉 (Hammer Curl)',
          category: 'free_weight',
          equipment: 'dumbbell',
          targetMuscles: { forearms: 90, biceps: 80 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        // 核心與有氧
        {
          id: uuidv4(),
          name: '平板支撐 (Plank)',
          category: 'bodyweight',
          equipment: 'bodyweight',
          targetMuscles: { abs: 90, obliques: 60 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '懸垂舉腿 (Hanging Leg Raise)',
          category: 'bodyweight',
          equipment: 'bodyweight',
          targetMuscles: { abs: 100, forearms: 30 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          name: '跑步機慢跑 (Treadmill Running)',
          category: 'cardio',
          equipment: 'cardio_machine',
          targetMuscles: { calves: 60, quads: 40 },
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
      ];
      await this.exercises.bulkAdd(defaultExercises);
    }

    const foodCount = await this.foods.count();
    const defaultFoods: FoodItem[] = [
      { id: 'food_chicken_breast', name: '雞胸肉', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 110, protein: 23, carbs: 0, fat: 1.2, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_whole_egg', name: '雞蛋', category: 'natural', servingSize: 50, servingUnit: 'g', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_white_rice', name: '白米飯', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_sweet_potato', name: '地瓜', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_whey_protein', name: '乳清蛋白粉', category: 'processed', servingSize: 30, servingUnit: 'g', calories: 120, protein: 24, carbs: 2, fat: 1.5, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_rolled_oats', name: '大燕麥片', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_beef_flank', name: '牛板腱', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 180, protein: 24, carbs: 0, fat: 9, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_greek_yogurt', name: '無糖希臘優格', category: 'processed', servingSize: 100, servingUnit: 'g', calories: 60, protein: 10, carbs: 3.5, fat: 0.5, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_salmon', name: '鮭魚', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 208, protein: 20, carbs: 0, fat: 13, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_soy_milk', name: '無糖豆漿', category: 'processed', servingSize: 250, servingUnit: 'ml', calories: 85, protein: 8.5, carbs: 4.5, fat: 3.5, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_tomato', name: '牛番茄', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_cooking_oil', name: '食用植物油', category: 'oil', servingSize: 10, servingUnit: 'g', calories: 90, protein: 0, carbs: 0, fat: 10, isCustom: false, createdAt: now, updatedAt: now },
      { id: 'food_black_pepper', name: '黑胡椒粒', category: 'condiment', servingSize: 5, servingUnit: 'g', calories: 13, protein: 0.5, carbs: 3.2, fat: 0.2, isCustom: false, createdAt: now, updatedAt: now },
    ];

    if (foodCount === 0) {
      await this.foods.bulkAdd(defaultFoods);
    } else {
      // 平滑升級遷移：將既有系統預設食物名稱與數值標準化 (去除烹飪前綴與模糊量詞，填補分類)
      const standardizationMap: Record<string, Partial<FoodItem>> = {
        food_chicken_breast: { name: '雞胸肉', category: 'natural', calories: 110, protein: 23, carbs: 0, fat: 1.2 },
        food_whole_egg: { name: '雞蛋', category: 'natural', servingSize: 50, servingUnit: 'g' },
        food_white_rice: { category: 'natural' },
        food_sweet_potato: { name: '地瓜', category: 'natural' },
        food_whey_protein: { name: '乳清蛋白粉', category: 'processed' },
        food_rolled_oats: { category: 'natural' },
        food_beef_flank: { name: '牛板腱', category: 'natural' },
        food_greek_yogurt: { name: '無糖希臘優格', category: 'processed' },
        food_salmon: { name: '鮭魚', category: 'natural' },
        food_soy_milk: { name: '無糖豆漿', category: 'processed' },
        food_tomato: { category: 'natural' },
        food_cooking_oil: { category: 'oil' },
      };

      for (const [foodId, updates] of Object.entries(standardizationMap)) {
        const food = await this.foods.get(foodId);
        if (food && !food.isCustom) {
          await this.foods.update(foodId, { ...updates, updatedAt: now });
        }
      }

      // 增量補充牛番茄與食用油與調味品（若不存在）
      const existingTomato = await this.foods.where('name').equals('牛番茄').first();
      if (!existingTomato) {
        await this.foods.add({
          id: 'food_tomato',
          name: '牛番茄',
          category: 'natural',
          servingSize: 100,
          servingUnit: 'g',
          calories: 18,
          protein: 0.9,
          carbs: 3.9,
          fat: 0.2,
          isCustom: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      const existingOil = await this.foods.where('name').equals('食用植物油').first();
      if (!existingOil) {
        await this.foods.add({
          id: 'food_cooking_oil',
          name: '食用植物油',
          category: 'oil',
          servingSize: 10,
          servingUnit: 'g',
          calories: 90,
          protein: 0,
          carbs: 0,
          fat: 10,
          isCustom: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      const existingPepper = await this.foods.where('name').equals('黑胡椒粒').first();
      if (!existingPepper) {
        await this.foods.add({
          id: 'food_black_pepper',
          name: '黑胡椒粒',
          category: 'condiment',
          servingSize: 5,
          servingUnit: 'g',
          calories: 13,
          protein: 0.5,
          carbs: 3.2,
          fat: 0.2,
          isCustom: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 同時同步菜餚組合中的 ingredients foodName
      const allRecipes = await this.recipes.toArray();
      for (const recipe of allRecipes) {
        let changed = false;
        const newIngredients = recipe.ingredients.map((ing) => {
          const matchedUpdate = standardizationMap[ing.foodId];
          if (matchedUpdate && matchedUpdate.name && matchedUpdate.name !== ing.foodName) {
            changed = true;
            return { ...ing, foodName: matchedUpdate.name };
          }
          return ing;
        });
        if (changed) {
          await this.recipes.update(recipe.id, { ingredients: newIngredients, updatedAt: now });
        }
      }
    }

    // 初始化菜餚組合預設種子資料
    const recipeCount = await this.recipes.count();
    if (recipeCount === 0) {
      const allFoods = await this.foods.toArray();
      const findFood = (queryName: string) => allFoods.find((f) => f.name.includes(queryName));

      const tomatoFood = findFood('牛番茄');
      const eggFood = findFood('雞蛋') || findFood('全蛋');
      const oilFood = findFood('食用植物油');
      const oatsFood = findFood('大燕麥片');
      const yogurtFood = findFood('優格');
      const wheyFood = findFood('乳清蛋白');
      const chickenFood = findFood('雞胸肉');
      const riceFood = findFood('白米飯');

      const defaultRecipes: FoodRecipe[] = [];

      if (tomatoFood && eggFood) {
        defaultRecipes.push({
          id: 'recipe_tomato_egg',
          name: '經典家常番茄炒蛋',
          description: '經典少油高蛋白家常菜，油脂可自由依烹調習慣調整',
          ingredients: [
            { foodId: tomatoFood.id, foodName: tomatoFood.name, quantity: 150, unit: 'g', isOptional: false },
            { foodId: eggFood.id, foodName: eggFood.name, quantity: 100, unit: 'g', isOptional: false },
            ...(oilFood ? [{ foodId: oilFood.id, foodName: oilFood.name, quantity: 10, unit: 'g', isOptional: true }] : []),
          ],
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (oatsFood && yogurtFood) {
        defaultRecipes.push({
          id: 'recipe_oat_bowl',
          name: '高蛋白燕麥優格碗',
          description: '無油純淨碳水與蛋白質組合，飽腹感極佳',
          ingredients: [
            { foodId: oatsFood.id, foodName: oatsFood.name, quantity: 50, unit: 'g', isOptional: false },
            { foodId: yogurtFood.id, foodName: yogurtFood.name, quantity: 100, unit: 'g', isOptional: false },
            ...(wheyFood ? [{ foodId: wheyFood.id, foodName: wheyFood.name, quantity: 30, unit: 'g', isOptional: false }] : []),
          ],
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (chickenFood && riceFood) {
        defaultRecipes.push({
          id: 'recipe_chicken_rice_box',
          name: '經典低脂雞胸便當',
          description: '標準乾淨減脂主食，可選配微量烹調油',
          ingredients: [
            { foodId: chickenFood.id, foodName: chickenFood.name, quantity: 150, unit: 'g', isOptional: false },
            { foodId: riceFood.id, foodName: riceFood.name, quantity: 150, unit: 'g', isOptional: false },
            ...(oilFood ? [{ foodId: oilFood.id, foodName: oilFood.name, quantity: 5, unit: 'g', isOptional: true }] : []),
          ],
          isCustom: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (defaultRecipes.length > 0) {
        await this.recipes.bulkAdd(defaultRecipes);
      }
    }

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
  }
}

export const db = new ZenfitDatabase();

// 自動檢查初始化種子資料
db.seedDefaultData().catch(console.error);
