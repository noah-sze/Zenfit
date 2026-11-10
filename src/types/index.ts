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
  rev?: number;
}

export interface RecipeIngredient {
  foodId: string;
  quantity: number;
  unit: string;
  isOptional?: boolean;
}

export interface FoodRecipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  isCustom: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
  rev?: number;
}

/**
 * 飲食記錄唯一客觀事實表 (SSOT Ground Truth)
 * 只記錄物理行為事實：何時、何餐、哪種食材 ID、攝入份量與單位
 * 營養素與食材名稱由維度表 foods 動態推算，日誌不保留靜態快照
 */
export interface FoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodId?: string; // 若為自訂粗估/佔位條目，此處為 undefined
  foodName?: string; // 自訂佔位條目或配額名稱（如 "快速粗估"、"外食火鍋"、"正常飲食配額"）
  calories?: number; // 粗估直接指定的熱量
  carbs?: number; // 粗估直接指定的碳水（g）
  protein?: number; // 粗估直接指定的蛋白質（g）
  fat?: number; // 粗估直接指定的脂肪（g）
  isPlaceholder?: boolean; // 標記為佔位粗估
  isAsPlanned?: boolean; // 標記為算我正常吃配額
  quantity: number;
  unit: string;
  bundleId?: string; // 所屬菜餚 ID (Recipe ID)
  createdAt: number;
  updatedAt: number;
  rev?: number;
}

/**
 * 視圖層裝載後的飲食記錄（包含即時推算的客觀營養素與食物名稱）
 */
export interface HydratedFoodLog extends FoodLog {
  date: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * 飲食計劃實體 (DietPlan Ground Truth)
 * 遵循單一真理源原則：只記錄使用者的客觀決策輸入（活動係數 activityLevel 與供能比 macroSplit）
 * 目標熱量與三大營養素目標克數嚴禁在資料庫與備份中保留靜態快照，全站統一交由軟體純函數即時動態推算
 */
export interface DietPlan {
  id: string; // 唯一識別碼 (UUID)
  date: string; // YYYY-MM-DD
  activityLevel?: number; // 當日活動係數 (PAL)
  macroSplit?: MacroSplit; // 當日供能比 (C/P/F)
  // 視圖層裝載 / 向下相容之動態推算屬性
  caloriesTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  createdAt: number;
  updatedAt: number;
  rev?: number;
}

export interface HydratedDietPlan extends DietPlan {
  activityLevel: number;
  macroSplit: MacroSplit;
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

/**
 * 每日飲食背景環境與設定 (Daily Diet Meta)
 * 記錄當天的生理基準事實（活動係數與供能比目標），做為當日自包含膠囊的一部分（日誌頭部）
 */
export interface DailyDietMeta {
  activityLevel: number;
  macroSplit: MacroSplit;
}

/**
 * 自包含的每日飲食日誌膠囊 (Daily Diet Log Capsule)
 * 聚合了當日的生理環境參數 (meta 日誌頭部) 與當日實際進食的物理事實 (entries 日誌組件)
 * 全站單一真理源，徹底取代舊版獨立的 diet_plans 與平鋪 food_logs
 */
export interface DailyDietLog {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  meta: DailyDietMeta; // ⭐️ 日誌頭部 (SSOT)
  entries: FoodLog[]; // ⭐️ 當日物理進食記錄
  createdAt: number;
  updatedAt: number;
  rev?: number;
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

export type PredefinedEquipmentId = string;
export type EquipmentType = string;

export interface Equipment {
  id: string;
  name: string;
  isCustom: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
  rev?: number;
}

/**
 * 經典 3 級運動機能學肌群角色 (Three-Tier Muscle Role Model)
 * - primary: 主動肌 (Agonist / Prime Mover)
 * - secondary: 協同肌 (Synergist / Secondary Mover)
 * - stabilizer: 穩定肌 (Stabilizer / Fixator)
 */
export type MuscleRole = 'primary' | 'secondary' | 'stabilizer';

export interface Exercise {
  id: string;
  name: string;
  category?: ExerciseCategory; // 淘汰/選填：向後相容
  equipment: EquipmentType;
  targetMuscles: Partial<Record<DetailedMuscle, MuscleRole | number>>;
  notes?: string;
  isCustom: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
  rev?: number;
}

export interface RoutineExerciseItem {
  exerciseId: string;
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
  rev?: number;
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

/**
 * 訓練記錄中的動作群組客觀事實
 * 嚴禁包含 notes，亦不儲存動作名稱與分類快照
 */
export interface WorkoutExerciseGroup {
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface HydratedWorkoutExerciseGroup extends WorkoutExerciseGroup {
  exerciseName: string;
  category?: string;
}

/**
 * 訓練記錄實體
 * 遵循極簡與單一真理源，嚴禁包含 notes 欄位
 */
export interface WorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  routineId?: string; // 課表 ID（選填，若由課表載入）
  startTime?: number;
  endTime?: number;
  durationMinutes?: number;
  exercises: WorkoutExerciseGroup[];
  createdAt: number;
  updatedAt: number;
  rev?: number;
}

export interface HydratedWorkoutLog extends Omit<WorkoutLog, 'exercises'> {
  title: string; // 前端記憶體中即時解析（優先課表名，次為首個動作名，再次為「訓練」）
  routineName?: string;
  exercises: HydratedWorkoutExerciseGroup[];
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
  rev?: number;
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
  createdAt: number;
  updatedAt: number;
  rev?: number;
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

// 體態追蹤與忽略偏好 (Body Metric Tracking & Ignore Preferences)
export interface BodyPreferences {
  /** 忽略「胸腰臀」（胸圍、腰圍、臀圍與軀幹幾何比例） */
  ignoreTorsoCircumferences: boolean;
  /** 忽略「手臂、大腿圍」（四肢部位圍度） */
  ignoreLimbCircumferences: boolean;
}

export const DEFAULT_BODY_PREFERENCES: BodyPreferences = {
  ignoreTorsoCircumferences: false,
  ignoreLimbCircumferences: false,
};


