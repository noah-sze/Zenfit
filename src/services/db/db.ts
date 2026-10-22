import Dexie, { type Table } from 'dexie';
import type { FoodItem, FoodCategory, FoodRecipe, FoodLog, Exercise, WorkoutLog, BodyMetric, UserProfile, UserBaseInfo, DietPlan } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class ZenfitDatabase extends Dexie {
  foods!: Table<FoodItem>;
  recipes!: Table<FoodRecipe>;
  food_logs!: Table<FoodLog>;
  exercises!: Table<Exercise>;
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
  }

  async seedDefaultData() {
    const exerciseCount = await this.exercises.count();
    const now = Date.now();

    if (exerciseCount === 0) {
      const defaultExercises: Exercise[] = [
        // 胸部
        { id: uuidv4(), name: '槓鈴臥推 (Bench Press)', category: 'chest', equipment: 'barbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '上斜啞鈴臥推 (Incline Dumbbell Press)', category: 'chest', equipment: 'dumbbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '滑輪夾胸 (Cable Fly)', category: 'chest', equipment: 'cable', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '雙槓臂屈伸 (Dips)', category: 'chest', equipment: 'bodyweight', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        // 背部
        { id: uuidv4(), name: '傳統硬舉 (Deadlift)', category: 'back', equipment: 'barbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '槓鈴划船 (Barbell Row)', category: 'back', equipment: 'barbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '引體向上 (Pull-up)', category: 'back', equipment: 'bodyweight', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '滑輪下拉 (Lat Pulldown)', category: 'back', equipment: 'cable', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '坐姿划船 (Seated Cable Row)', category: 'back', equipment: 'cable', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        // 腿部
        { id: uuidv4(), name: '槓鈴深蹲 (Barbell Squat)', category: 'legs', equipment: 'barbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '羅馬尼亞硬舉 (Romanian Deadlift)', category: 'legs', equipment: 'barbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '腿推機 (Leg Press)', category: 'legs', equipment: 'machine', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '腿伸展 (Leg Extension)', category: 'legs', equipment: 'machine', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '腿彎舉 (Leg Curl)', category: 'legs', equipment: 'machine', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        // 肩部
        { id: uuidv4(), name: '站姿槓鈴推舉 (Overhead Press)', category: 'shoulders', equipment: 'barbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '啞鈴側平舉 (Dumbbell Lateral Raise)', category: 'shoulders', equipment: 'dumbbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '繩索面拉 (Face Pull)', category: 'shoulders', equipment: 'cable', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        // 手臂
        { id: uuidv4(), name: '滑輪三頭下壓 (Tricep Pushdown)', category: 'arms', equipment: 'cable', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '槓鈴二頭彎舉 (Barbell Curl)', category: 'arms', equipment: 'barbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '啞鈴錘式彎舉 (Hammer Curl)', category: 'arms', equipment: 'dumbbell', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        // 核心與有氧
        { id: uuidv4(), name: '平板支撐 (Plank)', category: 'core', equipment: 'bodyweight', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '懸垂舉腿 (Hanging Leg Raise)', category: 'core', equipment: 'bodyweight', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '跑步機慢跑 (Treadmill Running)', category: 'cardio', equipment: 'machine', isCustom: false, isArchived: false, createdAt: now, updatedAt: now },
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
