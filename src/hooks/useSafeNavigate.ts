import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHaptic } from '@/lib/haptics';
import { getHierarchicalFallbackPath } from '@/utils/navigation';
import { useBrowserStateStore } from '@/store/useBrowserStateStore';

/**
 * 全站安全導航與層級返回 Hook
 * 解決直接開啟網址或外部跳轉進入時，點擊返回導致跳出 App 或退回瀏覽器空白/新標籤頁的問題
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

    // 路由語意上下文同步：若當前在詳情頁，同步父級管理列表對應之 Tab
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
      // 模組退出銷毀合約：從食物管理列表返回上一層（/settings）時，徹底銷毀過濾與搜尋快取
      useBrowserStateStore.getState().resetFoodBrowserState();
    } else if (currentPath === '/settings/exercises') {
      // 模組退出銷毀合約：從動作管理列表返回上一層（/settings）時，徹底銷毀過濾與搜尋快取
      useBrowserStateStore.getState().resetWorkoutBrowserState();
    }

    // React Router 於單頁應用內部每一次 pushState 都會遞增 window.history.state.idx
    // 當 idx > 0 時，代表當前分頁前面確實存在站內歷史，可安全調用 navigate(-1) 後退
    // 當 idx <= 0 或 state 為 null 時，代表當前頁面是該分頁進入本站的第一筆記錄（直接貼網址、新標籤頁、重新載入）
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
