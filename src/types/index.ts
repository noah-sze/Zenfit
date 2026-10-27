export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodCategory = 'natural' | 'processed' | 'beverage' | 'oil' | 'condiment';

export type NutritionTag = 'high-protein' | 'carb-source' | 'fat-source' | 'low-calorie' | 'high-calorie';

export interface FoodItem {
  id: string;
  name: string;
  category?: FoodCategory; // 天然食材 | 工業食品 | 飲品 | 食用油 | 調味品
  brand?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  labelBasisSize?: number; // 營養標籤依據數值（如每 100g 或每 1 oz）
  labelBasisUnit?: string; // 營養標籤依據單位（如 'g', 'oz', 'ml', 'fl oz'）
  rawNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  isCustom: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;
  isOptional?: boolean;
}

export interface FoodRecipe {
  id: string;
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  isCustom: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodId?: string;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DietPlan {
  id: string; // 唯一識別碼 (UUID)
  date: string; // YYYY-MM-DD
  planName?: string; // 計劃名稱（例如：「高碳訓練日」、「減脂期平日」）
  caloriesTarget: number; // 目標總熱量 (kcal)
  proteinTarget: number; // 蛋白質目標 (g)
  carbsTarget: number; // 碳水化合物目標 (g)
  fatTarget: number; // 脂肪目標 (g)
  waterMlTarget?: number; // 目標飲水量 (ml)
  notes?: string; // 飲食備註
  createdAt: number;
  updatedAt: number;
}

export type MuscleCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'other';

export type ExerciseCategory =
  | 'free_weight'
  | 'machine'
  | 'bodyweight'
  | 'cardio';

export type MajorMuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core';

export type DetailedMuscle =
  | 'upper_chest'
  | 'mid_lower_chest'
  | 'lats'
  | 'upper_back_traps'
  | 'lower_back'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'obliques';

export type PredefinedEquipmentId =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'specialty_bar'
  | 'cable'
  | 'pin_loaded_machine'
  | 'plate_loaded_machine'
  | 'smith_machine'
  | 'leg_press'
  | 'hack_squat'
  | 'bodyweight'
  | 'weighted_bodyweight'
  | 'resistance_band'
  | 'gymnastic_rings'
  | 'cardio_machine'
  | 'machine' // 相容舊版固定器械
  | 'other';

export type EquipmentType = PredefinedEquipmentId | (string & {});

export interface Equipment {
  id: string;
  name: string;
  isCustom: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Exercise {
  id: string;
  name: string;
  category?: ExerciseCategory; // 淘汰/選填：向後相容
  equipment: EquipmentType;
  targetMuscles: Partial<Record<DetailedMuscle, number>>;
  notes?: string;
  isCustom: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RoutineExerciseItem {
  exerciseId: string;
  defaultSets: number;
  notes?: string;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  notes?: string;
  exercises: RoutineExerciseItem[];
  isCustom: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  durationSeconds?: number;
  distanceKm?: number;
  isWarmup?: boolean;
  isCompleted: boolean;
}

export interface WorkoutExerciseGroup {
  exerciseId: string;
  exerciseName: string;
  category?: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  startTime?: number;
  endTime?: number;
  durationMinutes?: number;
  exercises: WorkoutExerciseGroup[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BodyMetric {
  id: string;
  date: string; // YYYY-MM-DD
  weight?: number; // kg
  bodyFat?: number; // %
  muscleMass?: number; // kg
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
  armsCm?: number;
  thighsCm?: number;
  calvesCm?: number;
  waterMl?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type FitnessGoalType = 'lose_fat' | 'build_muscle' | 'maintain' | 'strength';

export interface MacroSplit {
  carbs: number; // 百分比 (0-100)
  protein: number; // 百分比 (0-100)
  fat: number; // 百分比 (0-100)
}

export interface UserBaseInfo {
  id: string; // 唯一識別碼，預設為 'primary_user'
  name: string; // 姓名
  gender: 'male' | 'female'; // 生理性別
  birthDate?: string; // 出生年月 ('YYYY-MM' 或 'YYYY-MM-DD')
  heightCm: number; // 身高 (cm)
  weightUnit: 'kg' | 'lbs'; // 預設度量衡單位
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age?: number;
  birthDate?: string;
  heightCm: number;
  currentWeightKg: number;
  activityLevel?: number;
  goalType?: FitnessGoalType;
  dailyCaloriesTarget?: number;
  proteinGramsTarget?: number;
  carbsGramsTarget?: number;
  fatGramsTarget?: number;
  dailyWaterMlTarget?: number;
  macroSplit?: MacroSplit;
  weightUnit: 'kg' | 'lbs';
  isSetupCompleted: boolean;
  updatedAt: number;
}

// 度量衡單位偏好體系
export type UnitSystemPreset = 'metric' | 'imperial' | 'custom';
export type BodyWeightUnit = 'kg' | 'lbs';
export type FoodWeightUnit = 'g' | 'oz';
export type FoodVolumeUnit = 'ml' | 'fl oz';
export type LengthUnit = 'cm' | 'in';
export type EnergyUnit = 'kcal' | 'kJ';

export interface UnitPreferences {
  preset: UnitSystemPreset;
  bodyWeight: BodyWeightUnit;
  foodWeight: FoodWeightUnit;
  foodVolume: FoodVolumeUnit;
  length: LengthUnit;
  energy: EnergyUnit;
}

export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = {
  preset: 'metric',
  bodyWeight: 'kg',
  foodWeight: 'g',
  foodVolume: 'ml',
  length: 'cm',
  energy: 'kcal',
};


