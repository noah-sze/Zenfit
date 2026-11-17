import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useHoldToDelete } from '@/hooks/useHoldToDelete';
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
 * - 預設蓄力時長：0.5 秒 (500ms)
 * - 純粹極簡文案：「刪除」
 * - 輕點 3 次提示「長按 1s 刪除」，滿蓄力震動並確認執行
 */
export function HoldToDeleteButton({
  onConfirm,
  disabled = false,
  durationMs = 500, // 0.5 秒 (500ms) 全站統一契約
  className,
  text,
}: HoldToDeleteButtonProps) {
  const { t } = useTranslation();
  const displayText = text || t('common.delete', '刪除');

  const { progress, isHolding, isCompleted, handlers } = useHoldToDelete({
    onConfirm,
    disabled,
    durationMs,
  });

  return (
    <button
      type="button"
      {...handlers}
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
