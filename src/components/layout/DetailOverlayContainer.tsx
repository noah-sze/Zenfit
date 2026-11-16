import { useLayoutEffect, useRef, type ReactNode } from 'react';

export interface DetailOverlayContainerProps {
  /** 當前導航棧深度 (subViewStack.length) */
  stackDepth: number;
  /** 當前詳情視圖識別鍵 (例如 mode:id) */
  detailKey: string;
  children: ReactNode;
}

/**
 * 頂層詳情頁全屏滾動覆蓋容器 (Single Source of Truth)
 * 實作棧深度滾動生命週期：
 * - PUSH（進入新詳情頁）：強制置頂 scrollTop = 0
 * - POP（返回上一層詳情頁）：還原該層先前記錄的 scrollTop
 */
export function DetailOverlayContainer({
  stackDepth,
  detailKey,
  children,
}: DetailOverlayContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionsRef = useRef<Record<number, number>>({});
  const prevDepthRef = useRef<number>(stackDepth);
  const prevKeyRef = useRef<string>(detailKey);
  const isRestoringRef = useRef<boolean>(false);

  const handleScroll = () => {
    if (isRestoringRef.current || !scrollRef.current) return;
    scrollPositionsRef.current[stackDepth] = scrollRef.current.scrollTop;
  };

  useLayoutEffect(() => {
    const prevDepth = prevDepthRef.current;
    const prevKey = prevKeyRef.current;

    if (stackDepth === prevDepth && detailKey === prevKey) {
      return;
    }

    isRestoringRef.current = true;

    let targetScroll = 0;
    if (stackDepth < prevDepth) {
      // POP：清除已離開層級的快照，並還原上一層詳情頁的滾動位置
      delete scrollPositionsRef.current[prevDepth];
      targetScroll = scrollPositionsRef.current[stackDepth] ?? 0;
    } else {
      // PUSH 或同層切換：清除目標層級殘留快照並強制置頂
      delete scrollPositionsRef.current[stackDepth];
      targetScroll = 0;
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = targetScroll;
    }

    prevDepthRef.current = stackDepth;
    prevKeyRef.current = detailKey;

    const rafId = requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = targetScroll;
      }
      isRestoringRef.current = false;
    });

    return () => cancelAnimationFrame(rafId);
  }, [stackDepth, detailKey]);

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
