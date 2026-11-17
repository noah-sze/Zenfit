import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const IN_APP_NAV_SESSION_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function hasActiveSessionHistoryState(): boolean {
  if (typeof window === 'undefined') return false;
  const state = window.history?.state as
    | { zenfitSessionId?: string; zenfitSubViewDepth?: number }
    | null
    | undefined;
  return Boolean(
    state &&
      state.zenfitSessionId === IN_APP_NAV_SESSION_ID &&
      typeof state.zenfitSubViewDepth === 'number' &&
      state.zenfitSubViewDepth > 0
  );
}

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
  truncateSubViews: (depth: number) => void;
  clearSubViews: () => void;
}

function isSameSubView(a: InAppSubView, b: InAppSubView): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'foods' && b.type === 'foods') {
    return a.id === b.id && a.mode === b.mode;
  }
  if (a.type === 'exercises' && b.type === 'exercises') {
    return a.id === b.id && a.mode === b.mode;
  }
  return true;
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
        const existingIndex = currentStack.findIndex((item) => isSameSubView(item, view));

        // 導航棧去重回捲：若目標視圖已存在於棧中，直接回退至該層級，杜絕 A → B → A → B 無限疊加
        if (existingIndex !== -1) {
          const targetDepth = existingIndex + 1;
          const stepsToPop = currentStack.length - targetDepth;
          if (stepsToPop <= 0) return;

          if (typeof window !== 'undefined' && typeof window.history?.go === 'function' && hasActiveSessionHistoryState()) {
            window.history.go(-stepsToPop);
          } else {
            set({ subViewStack: currentStack.slice(0, targetDepth) });
          }
          return;
        }

        // 虛擬歷史記錄橋接：推入一筆帶當前會話識別碼的歷史狀態，但不改變 /app 路徑
        if (typeof window !== 'undefined') {
          window.history.pushState(
            {
              zenfitSessionId: IN_APP_NAV_SESSION_ID,
              zenfitSubViewDepth: currentStack.length + 1,
            },
            '',
            '/app'
          );
        }
        set({ subViewStack: [...currentStack, view] });
      },

      popSubView: () => {
        const currentStack = get().subViewStack;
        if (currentStack.length > 0) {
          set({ subViewStack: currentStack.slice(0, -1) });
        }
      },

      truncateSubViews: (depth) => {
        const currentStack = get().subViewStack;
        const clampedDepth = Math.max(0, Math.min(depth, currentStack.length));
        if (clampedDepth !== currentStack.length) {
          set({ subViewStack: currentStack.slice(0, clampedDepth) });
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
