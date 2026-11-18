import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHaptic } from '@/lib/haptics';
import { getHierarchicalFallbackPath } from '@/utils/navigation';

/**
 * 全站安全返回 Hook (Single Source of Truth)
 * 有站內瀏覽歷史時直接呼叫標準 React Router navigate(-1)；
 * 無前置歷史（如直接貼網址開啟）時自動回退至層級父路由。
 */
export function useSafeNavigate() {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = useCallback(
    (customFallback?: string) => {
      triggerHaptic('light');

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
    },
    [navigate, location.pathname]
  );

  return { goBack };
}
