import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHaptic } from '@/lib/haptics';
import { getHierarchicalFallbackPath } from '@/utils/navigation';
import { useBrowserStateStore } from '@/store/useBrowserStateStore';
import { useInAppNavigation, hasActiveSessionHistoryState } from '@/store/useInAppNavigation';

/**
 * 全站安全導航與層級返回 Hook
 * 支援單一 URL (/app) 視圖棧與傳統路由兩種模式下的安全回退
 */
export function useSafeNavigate() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * 智慧安全返回
   * @param customFallback 自訂兜底路徑（若未提供則自動依層級父路由推導）
   */
  const goBack = (customFallback?: string) => {
    triggerHaptic('light');

    // 1. 單一 URL 內聚狀態架構：若子視圖棧中有頁面，優先安全回退上一層視圖
    const inAppNav = useInAppNavigation.getState();
    if (inAppNav.subViewStack.length > 0) {
      if (hasActiveSessionHistoryState()) {
        window.history.back();
      } else {
        inAppNav.popSubView();
      }
      return;
    }

    // 2. 傳統路由上下文同步 (向後相容)
    const currentPath = location.pathname;
    if (currentPath.startsWith('/settings/recipes/')) {
      useBrowserStateStore.getState().setFoodTab('recipes');
    } else if (currentPath.startsWith('/settings/foods/')) {
      useBrowserStateStore.getState().setFoodTab('foods');
    } else if (currentPath.startsWith('/settings/routines/')) {
      useBrowserStateStore.getState().setWorkoutTab('routines');
    } else if (currentPath.startsWith('/settings/exercises/')) {
      useBrowserStateStore.getState().setWorkoutTab('exercises');
    } else if (currentPath === '/settings/foods') {
      useBrowserStateStore.getState().resetFoodBrowserState();
    } else if (currentPath === '/settings/exercises') {
      useBrowserStateStore.getState().resetWorkoutBrowserState();
    }

    const hasInAppHistory =
      typeof window !== 'undefined' &&
      window.history.state &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0;

    if (hasInAppHistory) {
      navigate(-1);
    } else {
      const fallbackPath = customFallback || getHierarchicalFallbackPath(location.pathname);
      navigate(fallbackPath, { replace: true });
    }
  };

  return { goBack };
}
