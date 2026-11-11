import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isBefore,
  addMonths,
  subMonths,
  addDays,
  format,
  parseISO,
  isValid,
} from 'date-fns';
import { zhTW, zhCN, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogPrecisionHeader } from '@/components/ui/dialog';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface CopyWorkoutDatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDate: string;
  selectedDate: string | null;
  recordedDates: string[];
  onSelectDate: (date: string) => void;
}

function getDateFnsLocale(lang: string) {
  if (lang.startsWith('zh-TW') || lang.startsWith('zh-HK')) return zhTW;
  if (lang.startsWith('zh')) return zhCN;
  return enUS;
}

/**
 * 複製訓練二級日期選擇 Dialog (Precision Modal)
 * - 寬度約 320px，shadow-none，border border-border，p-4
 * - 左上角 ✕ 關閉，中間標題「選擇日期」
 * - 僅在當前目標日期前且有訓練記錄的日期可選；無記錄日期不可選 (disabled / pointer-events-none / opacity-20)
 * - Flat Sibling Portal 宣告，更高 zIndex (z-[70])
 */
export function CopyWorkoutDatePickerDialog({
  open,
  onOpenChange,
  targetDate,
  selectedDate,
  recordedDates,
  onSelectDate,
}: CopyWorkoutDatePickerDialogProps) {
  const { t, i18n } = useTranslation();
  const currentLocale = getDateFnsLocale(i18n.language);

  // 有記錄的日期集合
  const recordedDateSet = useMemo(() => new Set(recordedDates), [recordedDates]);

  // 目標日期物件
  const targetDateObj = useMemo(() => {
    if (!targetDate) return new Date();
    const parsed = parseISO(targetDate);
    return isValid(parsed) ? parsed : new Date();
  }, [targetDate]);

  // 當前瀏覽的月份
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (selectedDate) {
      const parsed = parseISO(selectedDate);
      if (isValid(parsed)) return parsed;
    }
    if (recordedDates.length > 0) {
      const parsed = parseISO(recordedDates[0]);
      if (isValid(parsed)) return parsed;
    }
    return targetDateObj;
  });

  // 每次打開彈窗時同步定位至合適月份
  useEffect(() => {
    if (open) {
      if (selectedDate) {
        const parsed = parseISO(selectedDate);
        if (isValid(parsed)) {
          setCurrentMonth(parsed);
          return;
        }
      }
      if (recordedDates.length > 0) {
        const parsed = parseISO(recordedDates[0]);
        if (isValid(parsed)) {
          setCurrentMonth(parsed);
          return;
        }
      }
      setCurrentMonth(targetDateObj);
    }
  }, [open, selectedDate, recordedDates, targetDateObj]);

  const handlePreviousMonth = () => {
    triggerHaptic('selection');
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    triggerHaptic('selection');
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  // 不能瀏覽晚於目標日期所在月份之未來月份
  const isNextMonthDisabled = useMemo(() => {
    const targetMonthStart = startOfMonth(targetDateObj);
    const currentMonthStart = startOfMonth(currentMonth);
    return !isBefore(currentMonthStart, targetMonthStart);
  }, [currentMonth, targetDateObj]);

  // 產生恆定 42 格日曆網格 (Anti-Jitter)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(() => {
    let gridDays = eachDayOfInterval({ start: startDate, end: endDate });
    if (gridDays.length < 42) {
      const extraNeeded = 42 - gridDays.length;
      const nextDays = eachDayOfInterval({
        start: addDays(endDate, 1),
        end: addDays(endDate, extraNeeded),
      });
      gridDays = [...gridDays, ...nextDays];
    }
    return gridDays;
  }, [startDate, endDate]);

  const weekdays = [
    t('calendar.weekdays.sun', '日'),
    t('calendar.weekdays.mon', '一'),
    t('calendar.weekdays.tue', '二'),
    t('calendar.weekdays.wed', '三'),
    t('calendar.weekdays.thu', '四'),
    t('calendar.weekdays.fri', '五'),
    t('calendar.weekdays.sat', '六'),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="standard"
        showCloseButton={false}
        initialFocus={false}
        overlayClassName="z-[70]"
        className="z-[70] w-[320px] max-w-[calc(100vw-24px)] p-4 sm:p-4 bg-card text-card-foreground border border-border shadow-none font-mono text-xs select-none flex flex-col overflow-hidden"
      >
        {/* 標準精密標頭：左上角 ✕ 關閉，中間標題「選擇日期」 */}
        <DialogPrecisionHeader
          title={t('workout.copyWorkout.selectDateTitle', '選擇日期')}
          onClose={() => onOpenChange(false)}
          cancelAriaLabel={t('common.cancel', '取消')}
        />

        {/* 月份切換控制器 */}
        <div className="flex items-center justify-between px-1 py-2 mt-2 border-b border-border text-foreground font-mono">
          <span className="text-xs font-semibold">
            {format(currentMonth, t('calendar.monthYearFormat', 'yyyy 年 M 月'), {
              locale: currentLocale,
            })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePreviousMonth}
              className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-hover transition-colors cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* 星期表頭 */}
        <div className="grid grid-cols-7 gap-1 pt-2">
          {weekdays.map((w, idx) => (
            <div
              key={idx}
              className="text-center text-2xs font-medium text-muted-foreground select-none"
            >
              {w}
            </div>
          ))}
        </div>

        {/* 月曆 42 格網格 */}
        <div className="grid grid-cols-7 gap-1 pt-1.5 pb-1 justify-items-center">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = selectedDate === dateStr;
            const hasRecord =
              isCurrentMonth && recordedDateSet.has(dateStr) && dateStr < targetDate;

            return (
              <button
                key={idx}
                type="button"
                disabled={!hasRecord}
                onClick={() => {
                  if (hasRecord) {
                    triggerHaptic('selection');
                    onSelectDate(dateStr);
                    onOpenChange(false);
                  }
                }}
                className={cn(
                  'relative size-8 flex flex-col items-center justify-center text-xs font-mono rounded-lg transition-all',
                  hasRecord
                    ? isSelected
                      ? 'bg-foreground text-background font-semibold cursor-pointer hover:bg-foreground/90 active:scale-92'
                      : 'text-foreground font-medium cursor-pointer hover:bg-hover active:scale-92'
                    : 'text-muted-foreground opacity-20 pointer-events-none cursor-not-allowed select-none'
                )}
              >
                <span>{format(day, 'd')}</span>
                {hasRecord && (
                  <span
                    className={cn(
                      'size-1 rounded-full absolute bottom-1',
                      isSelected ? 'bg-background' : 'bg-foreground'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
