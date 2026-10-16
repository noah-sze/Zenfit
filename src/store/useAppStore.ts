import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';

export type QuickAddType = 'food' | 'workout' | 'metric';

interface AppState {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;

  isSyncing: boolean;
  lastSyncTime: string | null;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: string) => void;

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
      partialize: (state) => ({
        selectedDate: state.selectedDate,
        lastSyncTime: state.lastSyncTime,
        hidePwaInstallPrompt: state.hidePwaInstallPrompt,
      }),
    }
  )
);
