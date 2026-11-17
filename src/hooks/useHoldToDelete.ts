import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';

export interface UseHoldToDeleteOptions {
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  durationMs?: number;
}

/**
 * 長按蓄力刪除共用邏輯 Hook
 * - 支援 0~1 平滑蓄力進度與觸覺回饋
 * - 連續短按點擊 3 次未完成蓄力時，彈出「長按 1s 刪除」客觀提示 Toast
 */
export function useHoldToDelete({
  onConfirm,
  disabled = false,
  durationMs = 500,
}: UseHoldToDeleteOptions) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);
  const shortTapCountRef = useRef(0);
  const lastTapAtRef = useRef(0);
  const lastTouchAtRef = useRef(0);

  const stopHold = useCallback(() => {
    isHoldingRef.current = false;
    setIsHolding(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setProgress(0);
  }, []);

  const handleStart = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      if (disabled || isCompleted) return;

      const now = Date.now();
      if (e?.type === 'touchstart') {
        lastTouchAtRef.current = now;
      } else if (e?.type === 'mousedown' && now - lastTouchAtRef.current < 500) {
        return;
      }

      isHoldingRef.current = true;
      setIsHolding(true);
      startTimeRef.current = performance.now();
      triggerHaptic('light');

      const tick = (currentTime: number) => {
        if (!isHoldingRef.current) return;
        const elapsed = currentTime - (startTimeRef.current || currentTime);
        const currentProgress = Math.min(1, elapsed / durationMs);

        setProgress(currentProgress);

        if (currentProgress >= 1) {
          isHoldingRef.current = false;
          setIsHolding(false);
          setIsCompleted(true);
          shortTapCountRef.current = 0;
          triggerHaptic('success');
          onConfirm();
        } else {
          animFrameRef.current = requestAnimationFrame(tick);
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [disabled, isCompleted, durationMs, onConfirm]
  );

  const handleEnd = useCallback(() => {
    if (isCompleted) return;
    const wasHolding = isHoldingRef.current;
    stopHold();

    if (!wasHolding) return;

    const now = Date.now();
    if (now - lastTapAtRef.current > 3000) {
      shortTapCountRef.current = 0;
    }
    lastTapAtRef.current = now;
    shortTapCountRef.current += 1;

    if (shortTapCountRef.current >= 3) {
      shortTapCountRef.current = 0;
      toast.show(t('common.holdToDeleteHint', '長按 1s 刪除'));
    }
  }, [isCompleted, stopHold, t]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return {
    progress,
    isHolding,
    isCompleted,
    handlers: {
      onMouseDown: handleStart,
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
      onTouchStart: handleStart,
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
    },
  };
}
