import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Copy } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface WorkoutAddActionPopoverProps {
  trigger?: React.ReactNode;
  triggerClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
  onOpenAddExercise: () => void;
  onOpenCopyWorkout?: () => void;
}

/**
 * 訓練分流選單 Popover：
 * 點擊「新增動作或組合」按鈕時，彈出緊湊的分流選單。
 * 1. 記錄動作 / 組合（打開 ExerciseSelectDialog，mode="all"）。
 * 2. 複製訓練（套用昨日或歷史訓練，點擊提示即將推出）。
 * 3. 嚴格禁絕陰影，由 border 與 bg-popover 界定範圍。
 */
export function WorkoutAddActionPopover({
  trigger,
  triggerClassName,
  side = 'bottom',
  align = 'center',
  className,
  onOpenAddExercise,
  onOpenCopyWorkout,
}: WorkoutAddActionPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      triggerHaptic('light');
    }
  };

  const handleSelectSearch = () => {
    setOpen(false);
    triggerHaptic('light');
    onOpenAddExercise();
  };

  const handleSelectCopy = () => {
    setOpen(false);
    triggerHaptic('light');
    onOpenCopyWorkout?.();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {React.isValidElement(trigger) ? (
        <PopoverTrigger render={trigger} />
      ) : (
        <PopoverTrigger
          type="button"
          className={cn(
            'w-full h-10 rounded-lg border border-border bg-card hover:bg-hover text-foreground font-mono text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none active:bg-hover shadow-none',
            triggerClassName
          )}
        >
          {trigger ?? (
            <>
              <Plus className="size-3.5 text-muted-foreground" />
              <span>{t('workout.addExerciseOrRoutine', '新增動作或組合')}</span>
            </>
          )}
        </PopoverTrigger>
      )}

      <PopoverContent
        side={side}
        align={align}
        sideOffset={4}
        className={cn(
          'w-64 sm:w-72 p-1.5 bg-popover text-popover-foreground border border-border shadow-none rounded-lg select-none gap-1',
          className
        )}
      >
        {/* 表頭 */}
        <div className="px-2 py-1 text-2xs font-mono font-medium text-muted-foreground border-b border-border">
          {t('workout.actionMenu.header', '訓練記錄')}
        </div>

        {/* 選項一：記錄動作 / 組合 */}
        <button
          type="button"
          onClick={handleSelectSearch}
          className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-hover active:bg-muted/50 transition-colors text-left cursor-pointer group"
        >
          <div className="size-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors mt-0.5">
            <Search className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0 select-none">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xs font-medium text-foreground tracking-tight">
                {t('workout.actionMenu.searchTitle', '記錄動作 / 組合')}
              </span>
            </div>
            <div className="text-2xs text-muted-foreground leading-normal mt-0.5 truncate">
              {t('workout.actionMenu.searchDesc', '搜尋單個動作或訓練組合')}
            </div>
          </div>
        </button>

        {/* 選項二：複製訓練 */}
        <button
          type="button"
          onClick={handleSelectCopy}
          className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-hover active:bg-muted/50 transition-colors text-left cursor-pointer group"
        >
          <div className="size-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors mt-0.5">
            <Copy className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0 select-none">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xs font-medium text-foreground tracking-tight">
                {t('workout.actionMenu.copyTitle', '複製訓練')}
              </span>
              <span className="px-1 py-0.5 rounded text-[10px] font-mono font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 leading-none">
                {t('workout.actionMenu.copyTag', '省時')}
              </span>
            </div>
            <div className="text-2xs text-muted-foreground leading-normal mt-0.5 truncate">
              {t('workout.actionMenu.copyDesc', '套用昨日或歷史訓練')}
            </div>
          </div>
        </button>
      </PopoverContent>
    </Popover>
  );
}
