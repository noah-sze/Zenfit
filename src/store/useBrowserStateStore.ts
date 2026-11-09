import { create } from 'zustand';
import type { FoodCategory, NutritionTag } from '@/types';
import type { WorkoutTab } from '@/components/workout/WorkoutManagementBrowser';

export interface FoodBrowserState {
  activeTab: 'foods' | 'recipes';
  selectedCategory: 'recent' | 'all' | FoodCategory;
  selectedNutritionTag: 'all' | NutritionTag;
  foodSearchQuery: string;
  showFoodArchived: boolean;
  recipeSearchQuery: string;
  showRecipeArchived: boolean;
  selectedRecipeNutritionTag: 'all' | NutritionTag;
}

export interface WorkoutBrowserState {
  activeTab: WorkoutTab;
  exerciseSearchQuery: string;
  showExerciseArchived: boolean;
  selectedMuscleGroup: string;
  selectedEquipment: string;
  routineSearchQuery: string;
  showRoutineArchived: boolean;
  equipmentSearchQuery: string;
  showEquipmentArchived: boolean;
}

export const initialFoodBrowserState: FoodBrowserState = {
  activeTab: 'foods',
  selectedCategory: 'all',
  selectedNutritionTag: 'all',
  foodSearchQuery: '',
  showFoodArchived: false,
  recipeSearchQuery: '',
  showRecipeArchived: false,
  selectedRecipeNutritionTag: 'all',
};

export const initialWorkoutBrowserState: WorkoutBrowserState = {
  activeTab: 'exercises',
  exerciseSearchQuery: '',
  showExerciseArchived: false,
  selectedMuscleGroup: 'all',
  selectedEquipment: 'all',
  routineSearchQuery: '',
  showRoutineArchived: false,
  equipmentSearchQuery: '',
  showEquipmentArchived: false,
};

interface BrowserStoreState {
  // 食物管理狀態
  foodBrowser: FoodBrowserState;
  setFoodTab: (activeTab: 'foods' | 'recipes') => void;
  setFoodBrowserState: (partial: Partial<FoodBrowserState>) => void;
  resetFoodBrowserState: () => void;

  // 動作管理狀態
  workoutBrowser: WorkoutBrowserState;
  setWorkoutTab: (activeTab: WorkoutTab) => void;
  setWorkoutBrowserState: (partial: Partial<WorkoutBrowserState>) => void;
  resetWorkoutBrowserState: () => void;
}

export const useBrowserStateStore = create<BrowserStoreState>((set) => ({
  foodBrowser: { ...initialFoodBrowserState },
  setFoodTab: (activeTab) =>
    set((state) => ({
      foodBrowser: { ...state.foodBrowser, activeTab },
    })),
  setFoodBrowserState: (partial) =>
    set((state) => ({
      foodBrowser: { ...state.foodBrowser, ...partial },
    })),
  resetFoodBrowserState: () =>
    set({
      foodBrowser: { ...initialFoodBrowserState },
    }),

  workoutBrowser: { ...initialWorkoutBrowserState },
  setWorkoutTab: (activeTab) =>
    set((state) => ({
      workoutBrowser: { ...state.workoutBrowser, activeTab },
    })),
  setWorkoutBrowserState: (partial) =>
    set((state) => ({
      workoutBrowser: { ...state.workoutBrowser, ...partial },
    })),
  resetWorkoutBrowserState: () =>
    set({
      workoutBrowser: { ...initialWorkoutBrowserState },
    }),
}));
