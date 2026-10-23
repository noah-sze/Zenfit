import type { Equipment, Exercise, FoodItem, FoodRecipe } from '@/types';
import type { ZenfitDatabase } from './db';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_EQUIPMENTS: Equipment[] = [
  { id: 'barbell', name: '槓鈴', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'dumbbell', name: '啞鈴', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'kettlebell', name: '壺鈴', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'specialty_bar', name: '專項槓', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'cable', name: '繩索滑輪', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'pin_loaded_machine', name: '插銷式器械', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'plate_loaded_machine', name: '掛片式器械', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'smith_machine', name: '史密斯機', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'leg_press', name: '腿舉機', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'hack_squat', name: '哈克機', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'bodyweight', name: '徒手自重', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'weighted_bodyweight', name: '負重自重', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'resistance_band', name: '彈力帶', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'gymnastic_rings', name: '體操吊環', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'cardio_machine', name: '有氧設備', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: 'other', name: '其他', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
];

export const DEFAULT_EXERCISES: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // 胸部動作
  {
    name: '槓鈴臥推 (Bench Press)',
    category: 'free_weight',
    equipment: 'barbell',
    targetMuscles: { mid_lower_chest: 100, front_delts: 50, triceps: 40 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '上斜啞鈴臥推 (Incline Dumbbell Press)',
    category: 'free_weight',
    equipment: 'dumbbell',
    targetMuscles: { upper_chest: 100, front_delts: 60, triceps: 40 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '滑輪夾胸 (Cable Fly)',
    category: 'machine',
    equipment: 'cable',
    targetMuscles: { mid_lower_chest: 100 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '雙槓臂屈伸 (Dips)',
    category: 'bodyweight',
    equipment: 'bodyweight',
    targetMuscles: { mid_lower_chest: 90, triceps: 80, front_delts: 40 },
    isCustom: false,
    isArchived: false,
  },
  // 背部動作
  {
    name: '傳統硬舉 (Deadlift)',
    category: 'free_weight',
    equipment: 'barbell',
    targetMuscles: { lower_back: 100, glutes: 90, hamstrings: 70, upper_back_traps: 70, forearms: 50 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '槓鈴划船 (Barbell Row)',
    category: 'free_weight',
    equipment: 'barbell',
    targetMuscles: { lats: 90, upper_back_traps: 80, biceps: 50, lower_back: 40 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '引體向上 (Pull-up)',
    category: 'bodyweight',
    equipment: 'bodyweight',
    targetMuscles: { lats: 100, upper_back_traps: 60, biceps: 60, forearms: 40 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '滑輪下拉 (Lat Pulldown)',
    category: 'machine',
    equipment: 'cable',
    targetMuscles: { lats: 100, biceps: 50, upper_back_traps: 40 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '坐姿划船 (Seated Cable Row)',
    category: 'machine',
    equipment: 'cable',
    targetMuscles: { upper_back_traps: 90, lats: 70, biceps: 50 },
    isCustom: false,
    isArchived: false,
  },
  // 腿部動作
  {
    name: '槓鈴深蹲 (Barbell Squat)',
    category: 'free_weight',
    equipment: 'barbell',
    targetMuscles: { quads: 100, glutes: 80, abs: 30, lower_back: 30 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '羅馬尼亞硬舉 (Romanian Deadlift)',
    category: 'free_weight',
    equipment: 'barbell',
    targetMuscles: { hamstrings: 100, glutes: 80, lower_back: 50 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '腿推機 (Leg Press)',
    category: 'machine',
    equipment: 'leg_press',
    targetMuscles: { quads: 100, glutes: 60 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '腿伸展 (Leg Extension)',
    category: 'machine',
    equipment: 'pin_loaded_machine',
    targetMuscles: { quads: 100 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '腿彎舉 (Leg Curl)',
    category: 'machine',
    equipment: 'pin_loaded_machine',
    targetMuscles: { hamstrings: 100 },
    isCustom: false,
    isArchived: false,
  },
  // 肩部動作
  {
    name: '站姿槓鈴推舉 (Overhead Press)',
    category: 'free_weight',
    equipment: 'barbell',
    targetMuscles: { front_delts: 100, triceps: 60, upper_chest: 40, abs: 30 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '啞鈴側平舉 (Dumbbell Lateral Raise)',
    category: 'free_weight',
    equipment: 'dumbbell',
    targetMuscles: { side_delts: 100, upper_back_traps: 30 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '繩索面拉 (Face Pull)',
    category: 'machine',
    equipment: 'cable',
    targetMuscles: { rear_delts: 100, upper_back_traps: 70 },
    isCustom: false,
    isArchived: false,
  },
  // 手臂動作
  {
    name: '滑輪三頭下壓 (Tricep Pushdown)',
    category: 'machine',
    equipment: 'cable',
    targetMuscles: { triceps: 100 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '槓鈴二頭彎舉 (Barbell Curl)',
    category: 'free_weight',
    equipment: 'barbell',
    targetMuscles: { biceps: 100, forearms: 40 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '啞鈴錘式彎舉 (Hammer Curl)',
    category: 'free_weight',
    equipment: 'dumbbell',
    targetMuscles: { forearms: 90, biceps: 80 },
    isCustom: false,
    isArchived: false,
  },
  // 核心與有氧
  {
    name: '平板支撐 (Plank)',
    category: 'bodyweight',
    equipment: 'bodyweight',
    targetMuscles: { abs: 90, obliques: 60 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '懸垂舉腿 (Hanging Leg Raise)',
    category: 'bodyweight',
    equipment: 'bodyweight',
    targetMuscles: { abs: 100, forearms: 30 },
    isCustom: false,
    isArchived: false,
  },
  {
    name: '跑步機慢跑 (Treadmill Running)',
    category: 'cardio',
    equipment: 'cardio_machine',
    targetMuscles: { calves: 60, quads: 40 },
    isCustom: false,
    isArchived: false,
  },
];

export const DEFAULT_FOODS: Omit<FoodItem, 'createdAt' | 'updatedAt'>[] = [
  { id: 'food_chicken_breast', name: '雞胸肉', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 110, protein: 23, carbs: 0, fat: 1.2, isCustom: false, isArchived: false },
  { id: 'food_whole_egg', name: '雞蛋', category: 'natural', servingSize: 50, servingUnit: 'g', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, isCustom: false, isArchived: false },
  { id: 'food_white_rice', name: '白米飯', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, isCustom: false, isArchived: false },
  { id: 'food_sweet_potato', name: '地瓜', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, isCustom: false, isArchived: false },
  { id: 'food_whey_protein', name: '乳清蛋白粉', category: 'processed', servingSize: 30, servingUnit: 'g', calories: 120, protein: 24, carbs: 2, fat: 1.5, isCustom: false, isArchived: false },
  { id: 'food_rolled_oats', name: '大燕麥片', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, isCustom: false, isArchived: false },
  { id: 'food_beef_flank', name: '牛板腱', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 180, protein: 24, carbs: 0, fat: 9, isCustom: false, isArchived: false },
  { id: 'food_greek_yogurt', name: '無糖希臘優格', category: 'processed', servingSize: 100, servingUnit: 'g', calories: 60, protein: 10, carbs: 3.5, fat: 0.5, isCustom: false, isArchived: false },
  { id: 'food_salmon', name: '鮭魚', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 208, protein: 20, carbs: 0, fat: 13, isCustom: false, isArchived: false },
  { id: 'food_soy_milk', name: '無糖豆漿', category: 'processed', servingSize: 250, servingUnit: 'ml', calories: 85, protein: 8.5, carbs: 4.5, fat: 3.5, isCustom: false, isArchived: false },
  { id: 'food_tomato', name: '牛番茄', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, isCustom: false, isArchived: false },
  { id: 'food_cooking_oil', name: '食用植物油', category: 'oil', servingSize: 10, servingUnit: 'g', calories: 90, protein: 0, carbs: 0, fat: 10, isCustom: false, isArchived: false },
  { id: 'food_black_pepper', name: '黑胡椒粒', category: 'condiment', servingSize: 5, servingUnit: 'g', calories: 13, protein: 0.5, carbs: 3.2, fat: 0.2, isCustom: false, isArchived: false },
];

export const DEFAULT_RECIPES: Omit<FoodRecipe, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'recipe_tomato_egg',
    name: '經典家常番茄炒蛋',
    description: '經典少油高蛋白家常菜，油脂可自由依烹調習慣調整',
    ingredients: [
      { foodId: 'food_tomato', foodName: '牛番茄', quantity: 150, unit: 'g', isOptional: false },
      { foodId: 'food_whole_egg', foodName: '雞蛋', quantity: 100, unit: 'g', isOptional: false },
      { foodId: 'food_cooking_oil', foodName: '食用植物油', quantity: 10, unit: 'g', isOptional: true },
    ],
    isCustom: false,
    isArchived: false,
  },
  {
    id: 'recipe_oat_bowl',
    name: '高蛋白燕麥優格碗',
    description: '無油純淨碳水與蛋白質組合，飽腹感極佳',
    ingredients: [
      { foodId: 'food_rolled_oats', foodName: '大燕麥片', quantity: 50, unit: 'g', isOptional: false },
      { foodId: 'food_greek_yogurt', foodName: '無糖希臘優格', quantity: 100, unit: 'g', isOptional: false },
      { foodId: 'food_whey_protein', foodName: '乳清蛋白粉', quantity: 30, unit: 'g', isOptional: false },
    ],
    isCustom: false,
    isArchived: false,
  },
  {
    id: 'recipe_chicken_rice_box',
    name: '經典低脂雞胸便當',
    description: '標準乾淨減脂主食，可選配微量烹調油',
    ingredients: [
      { foodId: 'food_chicken_breast', foodName: '雞胸肉', quantity: 150, unit: 'g', isOptional: false },
      { foodId: 'food_white_rice', foodName: '白米飯', quantity: 150, unit: 'g', isOptional: false },
      { foodId: 'food_cooking_oil', foodName: '食用植物油', quantity: 5, unit: 'g', isOptional: true },
    ],
    isCustom: false,
    isArchived: false,
  },
];

/**
 * 恢復預設數據 (無害補齊缺失項目，不覆蓋用戶已修改內容與自訂項目)
 */
export async function restoreMissingDefaultData(db: ZenfitDatabase): Promise<{
  totalRestored: number;
  details: { foods: number; exercises: number; equipments: number; recipes: number };
}> {
  const now = Date.now();
  let foodsRestored = 0;
  let exercisesRestored = 0;
  let equipmentsRestored = 0;
  let recipesRestored = 0;

  // 1. 補齊器械
  for (const eq of DEFAULT_EQUIPMENTS) {
    const existingById = await db.equipments.get(eq.id);
    const existingByName = await db.equipments.where('name').equals(eq.name).first();
    if (!existingById && !existingByName) {
      await db.equipments.add({ ...eq, createdAt: now, updatedAt: now });
      equipmentsRestored += 1;
    }
  }

  // 2. 補齊食材
  for (const f of DEFAULT_FOODS) {
    const existingById = await db.foods.get(f.id);
    const existingByName = await db.foods.where('name').equals(f.name).first();
    if (!existingById && !existingByName) {
      await db.foods.add({ ...f, createdAt: now, updatedAt: now });
      foodsRestored += 1;
    }
  }

  // 3. 補齊動作
  for (const ex of DEFAULT_EXERCISES) {
    const existingByName = await db.exercises.where('name').equals(ex.name).first();
    if (!existingByName) {
      await db.exercises.add({ ...ex, id: uuidv4(), createdAt: now, updatedAt: now });
      exercisesRestored += 1;
    }
  }

  // 4. 補齊菜餚
  for (const r of DEFAULT_RECIPES) {
    const existingById = await db.recipes.get(r.id);
    const existingByName = await db.recipes.where('name').equals(r.name).first();
    if (!existingById && !existingByName) {
      await db.recipes.add({ ...r, createdAt: now, updatedAt: now });
      recipesRestored += 1;
    }
  }

  const totalRestored = foodsRestored + exercisesRestored + equipmentsRestored + recipesRestored;
  return {
    totalRestored,
    details: {
      foods: foodsRestored,
      exercises: exercisesRestored,
      equipments: equipmentsRestored,
      recipes: recipesRestored,
    },
  };
}
