import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMainTab = 'dashboard' | 'diet' | 'workout' | 'body';

export type InAppSubView =
  | { type: 'settings' }
  | { type: 'profile' }
  | { type: 'foods'; id?: string; mode?: 'foods' | 'recipes' }
  | { type: 'exercises'; id?: string; mode?: 'exercises' | 'routines' };

interface InAppNavigationState {
  activeTab: AppMainTab;
  subViewStack: InAppSubView[];

  setActiveTab: (tab: AppMainTab) => void;
  pushSubView: (view: InAppSubView) => void;
  popSubView: () => void;
  clearSubViews: () => void;
}

export const useInAppNavigation = create<InAppNavigationState>()(
  persist(
    (set, get) => ({
      activeTab: 'dashboard',
      subViewStack: [],

      setActiveTab: (activeTab) => {
        // 切換主 Tab 時清理可能殘留的子視圖棧
        set({ activeTab, subViewStack: [] });
      },

      pushSubView: (view) => {
        const currentStack = get().subViewStack;
        // 虛擬歷史記錄橋接：推入一筆歷史狀態，但不改變 /app 路徑
        if (typeof window !== 'undefined') {
          window.history.pushState({ zenfitSubViewDepth: currentStack.length + 1 }, '', '/app');
        }
        set({ subViewStack: [...currentStack, view] });
      },

      popSubView: () => {
        const currentStack = get().subViewStack;
        if (currentStack.length > 0) {
          set({ subViewStack: currentStack.slice(0, -1) });
        }
      },

      clearSubViews: () => {
        set({ subViewStack: [] });
      },
    }),
    {
      name: 'zenfit-in-app-nav-storage',
      // 只持久化 activeTab，保證按 F5 時保留用戶最後查看的分頁；子視圖棧在重新開機時安全歸位
      partialize: (state) => ({ activeTab: state.activeTab }),
    }
  )
);
