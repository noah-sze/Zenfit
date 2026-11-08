import { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface HoldToDeleteIconButtonProps {
  /** 長按蓄力完成後執行的確認回呼 */
  onConfirm: () => void | Promise<void>;
  /** 是否禁用 */
  disabled?: boolean;
  /** 長按時長（毫秒），全站嚴格統一為 500ms (0.5s) */
  durationMs?: number;
  /** 按鈕本體 className */
  className?: string;
  /** 外層容器 className */
  wrapperClassName?: string;
  /** 內部圖標 className */
  iconClassName?: string;
  /** 自訂圖標（預設為 Trash2） */
  children?: React.ReactNode;
  /** 懸停提示與無障礙標籤 */
  title?: string;
  'aria-label'?: string;
}

/**
 * 方案 1C：雙向對稱卡鉗合圍弧 (Bi-directional Dual Arc Caliper Hold to Delete Icon Button)
 * - 左右對稱雙半圓卡鉗從 12 點鐘方向同時合圍至 6 點鐘方向咬合閉合
 * - 52px 超大軌道環徹底突破 36px 指腹物理遮擋
 * - 嚴格遵循全站統一 0.5s (500ms) 防誤觸蓄力契約
 * - 純幾何 SVG Path 構造，全平台原生 WebKit / Blink 極速渲染
 */
export function HoldToDeleteIconButton({
  onConfirm,
  disabled = false,
  durationMs = 500, // 0.5s (500ms) 全站統一契約
  className,
  wrapperClassName,
  iconClassName,
  children,
  title = '刪除',
  'aria-label': ariaLabel = '刪除',
}: HoldToDeleteIconButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);

  // 停止長按並回退進度
  const stopHold = useCallback(() => {
    isHoldingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setProgress(0);
  }, []);

  const handleStart = useCallback(
    () => {
      if (disabled || isCompleted) return;

      isHoldingRef.current = true;
      startTimeRef.current = performance.now();
      triggerHaptic('light');

      const tick = (currentTime: number) => {
        if (!isHoldingRef.current) return;
        const elapsed = currentTime - (startTimeRef.current || currentTime);
        const currentProgress = Math.min(1, elapsed / durationMs);

        setProgress(currentProgress);

        if (currentProgress >= 1) {
          isHoldingRef.current = false;
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

  // 左右卡鉗半周長為 75.4 (π * 24 ≈ 75.398)
  const arcLength = 75.4;
  const strokeOffset = arcLength * (1 - progress);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center size-7 shrink-0 select-none overflow-visible',
        wrapperClassName
      )}
    >
      {/* 52px 雙向對稱卡鉗軌道環 (突破按鈕邊界，突破手指遮擋) */}
      <div
        className={cn(
          'absolute -inset-3 rounded-full pointer-events-none z-20 flex items-center justify-center transition-opacity duration-150',
          progress > 0 ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      >
        {/* 背景微光光暈 */}
        <div className="absolute inset-0 rounded-full bg-destructive/15 blur-[2px]" />

        {/* 雙向咬合卡鉗 SVG (viewBox 52x52，圓心 26,26，半徑 24) */}
        <svg className="absolute inset-0 size-full" viewBox="0 0 52 52">
          {/* 底軌圓環 (直徑 48px, r=24) */}
          <circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="rgba(239, 68, 68, 0.25)"
            strokeWidth="2.5"
          />

          {/* 左半弧 (12 點鐘頂部沿左側逆時針向下至 6 點鐘底部) */}
          <path
            d="M 26 2 A 24 24 0 0 0 26 50"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeOffset}
          />

          {/* 右半弧 (12 點鐘頂部沿右側順時針向下至 6 點鐘底部) */}
          <path
            d="M 26 2 A 24 24 0 0 1 26 50"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeOffset}
          />
        </svg>
      </div>

      {/* 按鈕本體 */}
      <button
        type="button"
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        disabled={disabled || isCompleted}
        title={title}
        aria-label={ariaLabel}
        className={cn(
          'relative size-7 rounded-full flex items-center justify-center cursor-pointer outline-none transition-all z-10',
          'text-muted-foreground hover:bg-hover hover:text-destructive',
          progress > 0 && 'text-destructive bg-destructive/10 scale-95',
          disabled && 'opacity-30 cursor-not-allowed pointer-events-none',
          className
        )}
      >
        {children || <Trash2 className={cn('size-3.5', iconClassName)} />}
      </button>
    </div>
  );
}
