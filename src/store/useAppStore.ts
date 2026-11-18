import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getInitialDateSession, recordDateSession } from '@/utils/dateSession';
import type { NutritionDisplayMode } from '@/utils/nutritionMath';

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

  // 首次記錄食材前是否已閱讀並確認生重計算基準
  hasConfirmedRawWeight: boolean;
  setHasConfirmedRawWeight: (confirmed: boolean) => void;

  hidePwaInstallPrompt: boolean;
  setHidePwaInstallPrompt: (hide: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedDate: getInitialDateSession(),
      setSelectedDate: (selectedDate) => {
        recordDateSession(selectedDate);
        set({ selectedDate });
      },

      isSyncing: false,
      lastSyncTime: null,
      setSyncing: (isSyncing) => set({ isSyncing }),
      setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),

      nutritionDisplayMode: 'serving',
      setNutritionDisplayMode: (nutritionDisplayMode) => set({ nutritionDisplayMode }),

      hasConfirmedRawWeight: false,
      setHasConfirmedRawWeight: (hasConfirmedRawWeight) => set({ hasConfirmedRawWeight }),

      hidePwaInstallPrompt: false,
      setHidePwaInstallPrompt: (hidePwaInstallPrompt) => set({ hidePwaInstallPrompt }),
    }),
    {
      name: 'zenfit-app-storage',
      // selectedDate 永遠作為純內存會話狀態，絕不持久化至 localStorage，保證重開應用必定位至今天
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime,
        hidePwaInstallPrompt: state.hidePwaInstallPrompt,
        nutritionDisplayMode: state.nutritionDisplayMode,
        hasConfirmedRawWeight: state.hasConfirmedRawWeight,
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
