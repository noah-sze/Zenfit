import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { Dialog, PrecisionDialogContent } from '@/components/ui/dialog';
import { MonthCalendar } from '@/components/ui/month-calendar';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

export interface MonthPickerProps {
  value?: string; // "YYYY-MM"
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  children?: React.ReactNode;
}

/**
 * e2Cal 精密出生年月選擇器 (Precision Month Picker)
 * 100% 遵循標準精密彈窗規範 (Standard Precision Modal Architecture)：
 * 1. 寬度唯一真理源：300px 緊湊網格，內邊距恆定 16px (p-4 sm:p-4)，0 陰影
 * 2. 標頭唯一真理源：左側取消圖標圓鈕 (✕)、中間客觀純名詞「出生年月」、右側確認圓鈕 (✓)
 * 3. 遮罩與層級防護：次級彈窗標準 z-[70] 與 bg-overlay backdrop-blur-[2px]
 */
export function MonthPicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  id,
  children,
}: MonthPickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState<string>(value || '');

  const handleOpen = () => {
    if (!disabled) {
      setTempValue(value || '');
      setIsOpen(true);
      triggerHaptic('light');
    }
  };

  const handleConfirm = () => {
    if (tempValue) {
      onChange(tempValue);
      triggerHaptic('selection');
    }
    setIsOpen(false);
  };

  return (
    <>
      {children ? (
        <div
          id={id}
          onClick={handleOpen}
          className={cn("cursor-pointer select-none", className)}
        >
          {children}
        </div>
      ) : (
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={handleOpen}
          className={cn(
            "h-10 w-full px-3 rounded-lg border border-border bg-card hover:bg-hover text-foreground transition-colors cursor-pointer text-sm font-mono flex items-center justify-between gap-2 shadow-none disabled:opacity-50 disabled:cursor-not-allowed select-none",
            className
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder || "YYYY-MM"}
          </span>
          <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
        </button>
      )}

      {/* 標準精密彈窗：平鋪兄弟節點，Portal 至 document.body */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <PrecisionDialogContent
          overlayClassName="z-[70] bg-overlay backdrop-blur-[2px]"
          className="z-[70]"
          initialFocus={false}
          title={t('profileSettings.birthDate', '出生年月')}
          onClose={() => setIsOpen(false)}
          onSubmit={handleConfirm}
          submitAriaLabel={t('common.confirm', '確認')}
          cancelAriaLabel={t('common.cancel', '取消')}
        >
          <MonthCalendar
            value={tempValue || value}
            onChange={setTempValue}
          />
        </PrecisionDialogContent>
      </Dialog>
    </>
  );
}
