import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import type { NutritionDisplayMode } from '@/utils/nutritionMath';

export type QuickAddType = 'food' | 'workout' | 'metric';

interface AppState {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;

  isSyncing: boolean;
  lastSyncTime: string | null;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: string) => void;

  // 營養數據顯示基準（每份 vs 每 100g）
  nutritionDisplayMode: NutritionDisplayMode;
  setNutritionDisplayMode: (mode: NutritionDisplayMode) => void;

  // Add / Edit Modal Controls
  isAddModalOpen: boolean;
  addModalType: QuickAddType;
  editingFoodLogId: string | null;
  editingWorkoutLogId: string | null;
  hidePwaInstallPrompt: boolean;

  setHidePwaInstallPrompt: (hide: boolean) => void;
  openAddModal: (type?: QuickAddType, editFoodId?: string | null, editWorkoutId?: string | null) => void;
  closeAddModal: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      setSelectedDate: (selectedDate) => set({ selectedDate }),

      isSyncing: false,
      lastSyncTime: null,
      setSyncing: (isSyncing) => set({ isSyncing }),
      setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),

      nutritionDisplayMode: 'serving',
      setNutritionDisplayMode: (nutritionDisplayMode) => set({ nutritionDisplayMode }),

      isAddModalOpen: false,
      addModalType: 'food',
      editingFoodLogId: null,
      editingWorkoutLogId: null,
      hidePwaInstallPrompt: false,

      setHidePwaInstallPrompt: (hidePwaInstallPrompt) => set({ hidePwaInstallPrompt }),

      openAddModal: (type = 'food', editFoodId = null, editWorkoutId = null) =>
        set({
          isAddModalOpen: true,
          addModalType: type,
          editingFoodLogId: editFoodId,
          editingWorkoutLogId: editWorkoutId,
        }),

      closeAddModal: () =>
        set({
          isAddModalOpen: false,
          editingFoodLogId: null,
          editingWorkoutLogId: null,
        }),
    }),
    {
      name: 'zenfit-app-storage',
      // selectedDate 永遠作為純內存會話狀態，絕不持久化至 localStorage，保證重開應用必定位至今天
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime,
        hidePwaInstallPrompt: state.hidePwaInstallPrompt,
        nutritionDisplayMode: state.nutritionDisplayMode,
      }),
      merge: (persistedState: unknown, currentState) => ({
        ...currentState,
        ...((persistedState as object) || {}),
        // 防禦性水合：徹底阻斷歷史殘留於 localStorage 的舊日期，確保第 0 幀恆定為今天的物理日期
        selectedDate: currentState.selectedDate,
      }),
    }
  )
);
