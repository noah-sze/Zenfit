import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import {
  type OverviewPeriod,
  type HeatmapDay,
  getHeatmapColorClass,
} from '@/utils/heatmapMath';

export { type OverviewPeriod, type HeatmapDay } from '@/utils/heatmapMath';

// ==========================================
// 週期切換選單（單一真理源，等寬極簡膠囊）
// ==========================================
export interface OverviewPeriodSelectorProps {
  value: OverviewPeriod;
  onChange: (value: OverviewPeriod) => void;
}

export function OverviewPeriodSelector({ value, onChange }: OverviewPeriodSelectorProps) {
  const { t } = useTranslation();

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val) {
          triggerHaptic('selection');
          onChange(val as OverviewPeriod);
        }
      }}
    >
      <SelectTrigger
        size="custom"
        iconClassName="size-2.5 opacity-60 text-muted-foreground"
        className="h-5 px-2 rounded-full border border-border/80 bg-muted/20 hover:bg-muted/60 text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer select-none active:scale-95"
      >
        <SelectValue className="flex-none tabular-nums font-normal">
          {value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="font-mono text-xs min-w-[130px] z-[80]">
        <SelectItem value="1w">{t('stats.period1w')}</SelectItem>
        <SelectItem value="30d">{t('stats.period30d')}</SelectItem>
        <SelectItem value="3m">{t('stats.period3m')}</SelectItem>
        <SelectItem value="6m">{t('stats.period6m')}</SelectItem>
        <SelectItem value="1y">{t('stats.period1y')}</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ==========================================
// 攝入足跡微型熱點圖元件
// ==========================================
export interface IntakeFootprintHeatmapProps {
  heatmapDays: HeatmapDay[];
  totalWeeks: number;
  isLoading?: boolean;
  onContainerWidthChange?: (width: number) => void;
  /** 自訂熱點圖標題 (預設為 diet.intakePattern "攝入足跡") */
  title?: string;
  /** 自訂選定日期的右側詳情呈現 */
  renderSelectedDetails?: (day: HeatmapDay) => React.ReactNode;
  /** 自訂方塊的 tooltip 提示文字生成器 */
  getTooltipText?: (day: HeatmapDay) => string;
}

export function IntakeFootprintHeatmap({
  heatmapDays,
  totalWeeks,
  isLoading = false,
  onContainerWidthChange,
  title,
  renderSelectedDetails,
  getTooltipText,
}: IntakeFootprintHeatmapProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // oxlint-disable-next-line react/purity
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const selectedCellData = useMemo(() => {
    return (
      heatmapDays.find((d) => d.date === selectedDate) || {
        date: selectedDate,
        count: 0,
        grams: 0,
        calories: 0,
        level: 0,
        isWithinPast30Days: false,
        isMonthMarker: false,
      }
    );
  }, [heatmapDays, selectedDate]);

  const handleSelectCell = (day: HeatmapDay) => {
    triggerHaptic('selection');
    setSelectedDate(day.date);
  };

  const scrollToLatest = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
  }, []);

  const matrixContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    scrollContainerRef.current = node;

    if (node) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0) {
        onContainerWidthChange?.(rect.width);
      }
      // 確保瀏覽器完成排版後滾動至最右端（今天）
      requestAnimationFrame(() => {
        if (node) {
          node.scrollLeft = node.scrollWidth;
        }
      });

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0) {
            onContainerWidthChange?.(width);
            requestAnimationFrame(() => {
              if (node) {
                node.scrollLeft = node.scrollWidth;
              }
            });
          }
        }
      });

      ro.observe(node);
      resizeObserverRef.current = ro;
    }
  }, [onContainerWidthChange]);

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, []);

  // 當資料載入完成或週數變更時，雙階容錯確保滾動至最右側
  useEffect(() => {
    if (!isLoading) {
      const rafId = requestAnimationFrame(() => {
        scrollToLatest();
        setTimeout(scrollToLatest, 50);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [isLoading, scrollToLatest, totalWeeks, heatmapDays.length]);

  // 桌面端滾輪支援水平滾動查看更早歷史
  const handleHeatmapWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && !e.shiftKey) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="p-4 space-y-3 bg-card">
      {/* 標題與圖例 */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-xs font-medium text-foreground">
          {title || t('diet.intakePattern')}
        </span>
        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <span>{t('diet.less')}</span>
          <div className="size-[7px] rounded-[1px] bg-muted/40 border border-border/40" />
          <div className="size-[7px] rounded-[1px] bg-emerald-500/25 border border-emerald-500/30" />
          <div className="size-[7px] rounded-[1px] bg-emerald-500/50 border border-emerald-500/60" />
          <div className="size-[7px] rounded-[1px] bg-emerald-500/80 border border-emerald-500/90" />
          <div className="size-[7px] rounded-[1px] bg-emerald-400 border border-emerald-300" />
          <span>{t('diet.more')}</span>
        </div>
      </div>

      {/* 水平可滾動熱點矩陣 (可左右滾動查看更早歷史，預設對齊今天) */}
      <div
        ref={matrixContainerRef}
        onWheel={handleHeatmapWheel}
        className="w-full overflow-x-auto no-scrollbar py-1 select-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="inline-flex gap-[2px] sm:gap-[2.5px] items-center pr-2 pl-0.5"
          style={{ minWidth: '100%' }}
        >
          {Array.from({ length: totalWeeks }).map((_, col) => (
            <div key={col} className="flex flex-col gap-[2px] sm:gap-[2.5px] shrink-0">
              {Array.from({ length: 7 }).map((_, row) => {
                const item = heatmapDays[col * 7 + row];
                if (!item) return null;
                if (item.isMonthMarker) {
                  return (
                    <div
                      key={item.date}
                      className="size-3.5 sm:size-3.5 rounded-[2px] bg-muted/70 border border-border/80 flex items-center justify-center font-mono font-medium text-[8px] leading-none text-muted-foreground select-none pointer-events-none tabular-nums overflow-hidden shrink-0"
                      title={item.date}
                    >
                      <span className="truncate leading-none select-none">
                        {item.month}
                      </span>
                    </div>
                  );
                }
                const isSelected = selectedCellData.date === item.date;
                return (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => handleSelectCell(item)}
                    className={cn(
                      "size-3.5 sm:size-3.5 rounded-[2px] transition-all cursor-pointer outline-none overflow-hidden shrink-0",
                      getHeatmapColorClass(item.level),
                      isSelected
                        ? "ring-1 ring-foreground z-10"
                        : "hover:opacity-80 hover:ring-1 hover:ring-muted-foreground/40 hover:z-10"
                    )}
                    title={
                      getTooltipText
                        ? getTooltipText(item)
                        : `${item.date}: ${item.count} ${t('common.times')} ${item.grams} g`
                    }
                    aria-label={
                      getTooltipText
                        ? getTooltipText(item)
                        : `${item.date}: ${item.count} ${t('common.times')} ${item.grams} g`
                    }
                  />
                );
              })}
            </div>
          ))}
          {/* 安全邊距 spacer：確保最右側方塊與選中環完整展示，絕不被容器右緣裁切 */}
          <div className="w-1.5 shrink-0" aria-hidden="true" />
        </div>
      </div>

      {/* 選定日期與數據檢測（純文字行，無 border-t，無獨立底色） */}
      <div className="pt-1 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-foreground">
          <span className="text-[11px] text-muted-foreground uppercase">
            {t('common.selectedDate')}
          </span>
          <span className="tabular-nums text-foreground">
            {selectedCellData.date}
          </span>
        </div>
        {renderSelectedDetails ? (
          renderSelectedDetails(selectedCellData)
        ) : (
          <div className="flex items-center tabular-nums text-xs font-mono">
            <span className={selectedCellData.count === 0 ? "text-muted-foreground" : "text-foreground"}>
              {selectedCellData.count} {t('common.times')}
            </span>
            <span className="text-border mx-1.5 select-none">·</span>
            <span className={selectedCellData.count === 0 ? "text-muted-foreground" : "text-foreground"}>
              {selectedCellData.grams} g
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
