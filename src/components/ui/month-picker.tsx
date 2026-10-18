import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays } from 'lucide-react';
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

export function MonthPicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  id,
  children,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(true);
      triggerHaptic('light');
    }
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
            "h-10 w-full px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer text-sm font-mono flex items-center justify-between gap-2 shadow-none disabled:opacity-50 disabled:cursor-not-allowed select-none",
            className
          )}

        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder || "YYYY-MM"}
          </span>
          <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
        </button>
      )}

      {isOpen && typeof document !== 'undefined' && (
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            {/* Full-screen Backdrop */}
            <div
              className="fixed inset-0 bg-overlay backdrop-blur-[2px] pointer-events-auto"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* MonthCalendar Popup */}
            <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center justify-center pointer-events-auto">
              <MonthCalendar
                selected={value}
                onSelect={(ym: string) => {
                  onChange(ym);
                  triggerHaptic('selection');
                }}
                onClose={() => setIsOpen(false)}
              />
            </div>
          </div>,
          document.body
        )
      )}
    </>
  );
}
