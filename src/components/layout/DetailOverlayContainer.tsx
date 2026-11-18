import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export interface DetailOverlayContainerProps {
  children: ReactNode;
}

/**
 * 頂層詳情頁全屏滾動覆蓋容器 (Single Source of Truth)
 * 基於 React Router 原生 location.key 與 navigationType 管理滾動位置：
 * - PUSH / REPLACE（進入新詳情頁）：強制置頂 scrollTop = 0
 * - POP（返回上一層詳情頁）：還原該歷史條目先前記錄的 scrollTop
 */
export function DetailOverlayContainer({ children }: DetailOverlayContainerProps) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const isRestoringRef = useRef<boolean>(false);

  const handleScroll = () => {
    if (isRestoringRef.current || !scrollRef.current) return;
    scrollPositionsRef.current[location.key] = scrollRef.current.scrollTop;
  };

  useLayoutEffect(() => {
    isRestoringRef.current = true;
    const targetScroll =
      navigationType === 'POP' ? (scrollPositionsRef.current[location.key] ?? 0) : 0;

    if (scrollRef.current) {
      scrollRef.current.scrollTop = targetScroll;
    }

    const rafId = requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = targetScroll;
      }
      isRestoringRef.current = false;
    });

    return () => cancelAnimationFrame(rafId);
  }, [location.key, navigationType]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="fixed inset-x-0 bottom-0 top-14 z-30 bg-background overflow-y-auto no-scrollbar"
    >
      <div className="w-full max-w-xl mx-auto px-4 py-4 pb-8">{children}</div>
    </div>
  );
}
