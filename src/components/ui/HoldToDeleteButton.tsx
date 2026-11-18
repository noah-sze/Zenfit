import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useHoldToDelete } from '@/hooks/useHoldToDelete';
import { cn } from '@/lib/utils';

export interface HoldToDeleteButtonProps {
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  durationMs?: number;
  className?: string;
  text?: string;
  /** 視覺色系變體：destructive（紅色刪除，預設）| primary（純黑單色歸檔/確認） */
  variant?: 'destructive' | 'primary';
  /** 自訂圖示（未提供時預設顯示 Trash2） */
  icon?: ReactNode;
  /** 連續短按 3 次時的提示文案 */
  hintText?: string;
}

/**
 * 防誤觸長按蓄力確認按鈕 (Hold to Confirm / Delete Button)
 * - 方案 1：全背景蓄力充能 (Full Fill Gauge)
 * - 預設蓄力時長：0.5 秒 (500ms)
 * - 輕點 3 次顯示客觀長按提示，滿蓄力震動並確認執行
 */
export function HoldToDeleteButton({
  onConfirm,
  disabled = false,
  durationMs = 500, // 0.5 秒 (500ms) 全站統一契約
  className,
  text,
  variant = 'destructive',
  icon,
  hintText,
}: HoldToDeleteButtonProps) {
  const { t } = useTranslation();
  const displayText = text || t('common.delete', '刪除');
  const isPrimary = variant === 'primary';

  const { progress, isHolding, isCompleted, handlers } = useHoldToDelete({
    onConfirm,
    disabled,
    durationMs,
    hintText,
  });

  return (
    <button
      type="button"
      {...handlers}
      disabled={disabled || isCompleted}
      className={cn(
        'w-full h-9 rounded-md font-mono text-xs font-semibold cursor-pointer select-none relative overflow-hidden flex items-center justify-center outline-none active:scale-[0.985] transition-transform',
        isPrimary
          ? 'bg-primary-subtle text-foreground border border-primary-subtle-border hover:border-foreground'
          : 'bg-destructive-subtle text-destructive border border-destructive/30 hover:border-destructive/50',
        disabled && 'opacity-30 cursor-not-allowed pointer-events-none',
        className
      )}
      aria-label={displayText}
    >
      {/* 方案 1：全背景蓄力充能進度層 (0% ~ 100%) */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 pointer-events-none',
          isPrimary ? 'bg-foreground' : 'bg-destructive',
          isHolding ? 'transition-none' : 'transition-[width] duration-150 ease-out'
        )}
        style={{ width: `${progress * 100}%` }}
      />

      {/* 按鈕內容 (圖示 + 極簡動詞) */}
      <span
        className={cn(
          'relative z-10 flex items-center justify-center gap-1.5 transition-colors duration-150',
          isPrimary
            ? progress > 0.35
              ? 'text-background font-bold'
              : 'text-foreground'
            : progress > 0.35
              ? 'text-destructive-foreground font-bold'
              : 'text-destructive'
        )}
      >
        {icon !== undefined ? icon : <Trash2 className="size-3.5 shrink-0" />}
        <span>{displayText}</span>
      </span>
    </button>
  );
}
