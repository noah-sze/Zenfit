import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMainTab = 'dashboard' | 'diet' | 'workout' | 'body';

interface InAppNavigationState {
  activeTab: AppMainTab;
  setActiveTab: (tab: AppMainTab) => void;
}

/**
 * 主頁底欄分頁狀態 (純客戶端 Keep-Alive Tab 狀態)
 * 子頁面導航與返回棧完全由標準 React Router 與瀏覽器原生 History 接管。
 */
export const useInAppNavigation = create<InAppNavigationState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    {
      name: 'zenfit-in-app-nav-storage',
      partialize: (state) => ({ activeTab: state.activeTab }),
    }
  )
);
