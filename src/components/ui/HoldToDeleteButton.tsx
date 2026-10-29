import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface HoldToDeleteButtonProps {
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  durationMs?: number;
  className?: string;
  text?: string;
}

/**
 * 防誤觸長按刪除按鈕 (Hold to Delete Button)
 * - 方案 1：全背景蓄力充能 (Full Fill Gauge)
 * - 預設蓄力時長：1 秒 (1000ms)
 * - 純粹極簡文案：「刪除」
 * - 輕點安全無效，隨時鬆開平滑撤銷，滿 1 秒震動並確認執行
 */
export function HoldToDeleteButton({
  onConfirm,
  disabled = false,
  durationMs = 1000, // 1 秒 (1s)
  className,
  text,
}: HoldToDeleteButtonProps) {
  const { t } = useTranslation();
  const displayText = text || t('common.delete', '刪除');

  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);

  // 停止長按並回退進度
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
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || isCompleted) return;

      // 防止行動端預設長按呼出菜單
      if (e.type === 'touchstart') {
        // 保留觸控響應
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
          // 滿 1 秒蓄力確認！
          isHoldingRef.current = false;
          setIsHolding(false);
          setIsCompleted(true);
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
    if (!isCompleted) {
      stopHold();
    }
  }, [isCompleted, stopHold]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      disabled={disabled || isCompleted}
      className={cn(
        'w-full h-9 rounded-md font-mono text-xs font-semibold cursor-pointer select-none relative overflow-hidden flex items-center justify-center outline-none active:scale-[0.985] transition-transform',
        'bg-destructive-subtle text-destructive border border-destructive/30 hover:border-destructive/50',
        disabled && 'opacity-30 cursor-not-allowed pointer-events-none',
        className
      )}
      aria-label={displayText}
    >
      {/* 方案 1：全背景蓄力充能進度層 (0% ~ 100%) */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 bg-destructive pointer-events-none',
          isHolding ? 'transition-none' : 'transition-[width] duration-150 ease-out'
        )}
        style={{ width: `${progress * 100}%` }}
      />

      {/* 按鈕內容 (Trash 圖標 + 純文字「刪除」) */}
      <span
        className={cn(
          'relative z-10 flex items-center justify-center gap-1.5 transition-colors duration-150',
          progress > 0.35 ? 'text-destructive-foreground font-bold' : 'text-destructive'
        )}
      >
        <Trash2 className="size-3.5 shrink-0" />
        <span>{displayText}</span>
      </span>
    </button>
  );
}
