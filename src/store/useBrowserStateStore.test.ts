import { describe, it, expect, beforeEach } from 'vitest';
import { useBrowserStateStore, initialFoodBrowserState, initialWorkoutBrowserState } from './useBrowserStateStore';

describe('useBrowserStateStore', () => {
  beforeEach(() => {
    // 重置 store 狀態
    useBrowserStateStore.setState({
      foodBrowser: { ...initialFoodBrowserState },
      workoutBrowser: { ...initialWorkoutBrowserState },
    });
  });

  describe('食物管理瀏覽器狀態', () => {
    it('能正確切換與保持食物管理 Tab', () => {
      const { setFoodTab } = useBrowserStateStore.getState();
      setFoodTab('recipes');
      expect(useBrowserStateStore.getState().foodBrowser.activeTab).toBe('recipes');

      setFoodTab('foods');
      expect(useBrowserStateStore.getState().foodBrowser.activeTab).toBe('foods');
    });

    it('能正確保存搜尋關鍵字與過濾標籤', () => {
      const { setFoodBrowserState } = useBrowserStateStore.getState();
      setFoodBrowserState({
        recipeSearchQuery: '優格碗',
        showRecipeArchived: true,
      });

      const current = useBrowserStateStore.getState().foodBrowser;
      expect(current.recipeSearchQuery).toBe('優格碗');
      expect(current.showRecipeArchived).toBe(true);
      expect(current.activeTab).toBe('foods'); // 未修改欄位保持不變
    });

    it('能徹底重置食物管理狀態回初始預設值', () => {
      const { setFoodBrowserState, resetFoodBrowserState } = useBrowserStateStore.getState();
      setFoodBrowserState({
        activeTab: 'recipes',
        recipeSearchQuery: '燕麥',
        showFoodArchived: true,
      });

      resetFoodBrowserState();
      expect(useBrowserStateStore.getState().foodBrowser).toEqual(initialFoodBrowserState);
    });
  });

  describe('動作管理瀏覽器狀態', () => {
    it('能正確切換與保持動作管理 Tab', () => {
      const { setWorkoutTab } = useBrowserStateStore.getState();
      setWorkoutTab('routines');
      expect(useBrowserStateStore.getState().workoutBrowser.activeTab).toBe('routines');

      setWorkoutTab('equipments');
      expect(useBrowserStateStore.getState().workoutBrowser.activeTab).toBe('equipments');
    });

    it('能正確保存動作搜尋條件', () => {
      const { setWorkoutBrowserState } = useBrowserStateStore.getState();
      setWorkoutBrowserState({
        exerciseSearchQuery: '臥推',
        showExerciseArchived: true,
      });

      const current = useBrowserStateStore.getState().workoutBrowser;
      expect(current.exerciseSearchQuery).toBe('臥推');
      expect(current.showExerciseArchived).toBe(true);
    });

    it('能徹底重置動作管理狀態回初始預設值', () => {
      const { setWorkoutBrowserState, resetWorkoutBrowserState } = useBrowserStateStore.getState();
      setWorkoutBrowserState({
        activeTab: 'routines',
        routineSearchQuery: '推力日',
      });

      resetWorkoutBrowserState();
      expect(useBrowserStateStore.getState().workoutBrowser).toEqual(initialWorkoutBrowserState);
    });
  });
});
