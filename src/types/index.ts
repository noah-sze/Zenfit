export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
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

export type MuscleCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'other';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'other';

export interface Exercise {
  id: string;
  name: string;
  category: MuscleCategory;
  equipment: EquipmentType;
  notes?: string;
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
  category: MuscleCategory;
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
