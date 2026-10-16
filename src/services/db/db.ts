import Dexie, { type Table } from 'dexie';
import type { FoodItem, FoodLog, Exercise, WorkoutLog, BodyMetric, UserProfile } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class ZenfitDatabase extends Dexie {
  foods!: Table<FoodItem>;
  food_logs!: Table<FoodLog>;
  exercises!: Table<Exercise>;
  workout_logs!: Table<WorkoutLog>;
  body_metrics!: Table<BodyMetric>;
  user_profile!: Table<UserProfile>;

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
    if (foodCount === 0) {
      const defaultFoods: FoodItem[] = [
        { id: uuidv4(), name: '香煎雞胸肉', servingSize: 100, servingUnit: 'g', calories: 165, protein: 31, carbs: 0, fat: 3.6, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '全蛋 (中顆)', servingSize: 50, servingUnit: 'g', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '白米飯', servingSize: 100, servingUnit: 'g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '蒸地瓜', servingSize: 100, servingUnit: 'g', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '乳清蛋白粉 (1匙)', servingSize: 30, servingUnit: 'g', calories: 120, protein: 24, carbs: 2, fat: 1.5, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '大燕麥片', servingSize: 100, servingUnit: 'g', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '瘦牛肉 (板腱)', servingSize: 100, servingUnit: 'g', calories: 180, protein: 24, carbs: 0, fat: 9, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '無糖希臘式優格', servingSize: 100, servingUnit: 'g', calories: 60, protein: 10, carbs: 3.5, fat: 0.5, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '香煎鮭魚排', servingSize: 100, servingUnit: 'g', calories: 208, protein: 20, carbs: 0, fat: 13, isCustom: false, createdAt: now, updatedAt: now },
        { id: uuidv4(), name: '無糖高纖豆漿', servingSize: 250, servingUnit: 'ml', calories: 85, protein: 8.5, carbs: 4.5, fat: 3.5, isCustom: false, createdAt: now, updatedAt: now },
      ];
      await this.foods.bulkAdd(defaultFoods);
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
  }
}

export const db = new ZenfitDatabase();

// 自動檢查初始化種子資料
db.seedDefaultData().catch(console.error);
