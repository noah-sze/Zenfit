import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SmoothedWeightPoint } from '@/utils/weightMath';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { triggerHaptic } from '@/lib/haptics';

interface WeightTrendChartProps {
  data: SmoothedWeightPoint[];
  unit?: string;
}

export function WeightTrendChart({ data, unit = 'kg' }: WeightTrendChartProps) {
  const { t } = useTranslation();
  const [range, setRange] = useState<'30d' | '90d' | 'all'>('30d');
  const [activePoint, setActivePoint] = useState<SmoothedWeightPoint | null>(null);
  const [pointAnchorEl, setPointAnchorEl] = useState<Element | null>(null);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (range === 'all') return data;
    const days = range === '30d' ? 30 : 90;
    return data.slice(-days);
  }, [data, range]);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center border border-border bg-card rounded-lg text-xs text-muted-foreground font-mono">
        {t('body.noSufficientData', '暫無足夠時序數據')}
      </div>
    );
  }

  // 排序並提取數值極值
  const sorted = [...filteredData].sort((a, b) => a.date.localeCompare(b.date));
  const rawValues = sorted.map((d) => d.rawWeight || d.trendWeight);
  const trendValues = sorted.map((d) => d.trendWeight);
  const allValues = [...rawValues, ...trendValues];
  const latestTrend = sorted.length > 0 ? sorted[sorted.length - 1].trendWeight : null;

  const minVal = allValues.length > 0 ? Math.floor(Math.min(...allValues) - 0.5) : 0;
  const maxVal = allValues.length > 0 ? Math.ceil(Math.max(...allValues) + 0.5) : 100;
  const valRange = Math.max(1, maxVal - minVal);

  // SVG 畫布尺寸
  const width = 500;
  const height = 180;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 24;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (sorted.length <= 1) return paddingLeft + chartW / 2;
    return paddingLeft + (index / (sorted.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    return paddingTop + chartH - ((val - minVal) / valRange) * chartH;
  };

  // 生成平滑趨勢線路徑
  const trendPath = sorted.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.trendWeight);
    if (idx === 0) return `M ${x} ${y}`;
    return `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="relative w-full border border-border bg-card text-card-foreground rounded-lg p-4 select-none font-mono">
      {/* 頂部列：標題、圖例與時間範圍切換膠囊 */}
      <div className="flex items-center justify-between text-xs mb-3 pb-2.5 border-b border-border">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger
              className="flex items-center gap-1.5 px-2 py-0.5 -ml-1 rounded-full text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-hover active:scale-[0.98] transition-all cursor-pointer select-none focus:outline-hidden"
              aria-label={t('body.trendWeight', '平滑體重')}
            >
              <span className="size-2 rounded-full bg-foreground" />
              <span>{t('body.trendWeight', '平滑體重')}</span>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={8}
              className="w-80 sm:w-88 max-w-[calc(100vw-24px)] p-3.5 bg-popover text-popover-foreground border border-border shadow-none rounded-lg select-none font-mono focus:outline-hidden"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="text-xs font-semibold text-foreground">
                    {t('body.trendWeight', '平滑體重')}
                  </div>
                  {latestTrend !== null && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {latestTrend} {unit}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground font-mono flex flex-wrap items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded leading-relaxed">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 shrink-0">
                    {t('body.metricExplanations.formula', '計算公式')}:
                  </span>
                  <span className="text-foreground whitespace-normal break-words">
                    {t('body.metricExplanations.trendWeight.formula', '7 天生理平滑 (今日 15% + 歷史 85%)')}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground font-sans leading-relaxed pt-0.5 break-words">
                  {t('body.metricExplanations.trendWeight.desc')}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full border border-foreground/50 bg-background" />
            <span className="text-xs font-mono text-muted-foreground">
              {t('body.dailyWeight', '每日記錄')}
            </span>
          </div>
        </div>

        {/* 區間切換下拉選單膠囊 */}
        <Select
          value={range}
          onValueChange={(val) => {
            if (val) {
              triggerHaptic('selection');
              setRange(val as '30d' | '90d' | 'all');
            }
          }}
        >
          <SelectTrigger
            size="custom"
            iconClassName="size-3 opacity-60 text-muted-foreground"
            className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 hover:bg-hover text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer select-none active:scale-95 focus:outline-hidden"
          >
            <SelectValue className="flex-none font-normal text-foreground">
              {range === '30d' ? '30D' : range === '90d' ? '90D' : t('common.all', '全部')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end" className="font-mono text-xs min-w-28 z-[80]">
            <SelectItem value="30d">30D</SelectItem>
            <SelectItem value="90d">90D</SelectItem>
            <SelectItem value="all">{t('common.all', '全部')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-[11px] font-mono text-muted-foreground mb-2 text-right">
        {t('body.recordsCount', { count: sorted.length, defaultValue: `${sorted.length} 筆記錄` })}
      </div>

      {/* SVG 折線圖主體 */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible font-mono"
          onMouseLeave={() => {
            setActivePoint(null);
            setPointAnchorEl(null);
          }}
        >
          {/* Y 軸水平網格輔助線與刻度 */}
          {[0, 0.5, 1].map((ratio) => {
            const val = Math.round((minVal + ratio * valRange) * 10) / 10;
            const y = getY(val);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="2 2"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  fontSize="9"
                  fill="currentColor"
                  fillOpacity="0.4"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* EWMA 平滑實線 */}
          <path
            d={trendPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 每日原始過磅散點 (Raw dots) */}
          {sorted.map((p, idx) => {
            if (p.rawWeight === undefined) return null;
            const cx = getX(idx);
            const cy = getY(p.rawWeight);
            const isSelected = activePoint?.date === p.date;

            return (
              <g
                key={p.date}
                className="cursor-pointer"
                onClick={(e) => {
                  triggerHaptic('selection');
                  setActivePoint(p);
                  setPointAnchorEl(e.currentTarget);
                }}
                onMouseEnter={(e) => {
                  setActivePoint(p);
                  setPointAnchorEl(e.currentTarget);
                }}
              >
                {/* 擴大命中與觸控半徑 (24px 隱形熱區) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={12}
                  fill="transparent"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 4.5 : 2.5}
                  fill="var(--background)"
                  stroke="currentColor"
                  strokeWidth={isSelected ? 2 : 1.25}
                  className="transition-all"
                />
              </g>
            );
          })}

          {/* X 軸日期標籤 */}
          {sorted.length > 0 && (
            <>
              <text
                x={paddingLeft}
                y={height - 6}
                fontSize="9"
                fill="currentColor"
                fillOpacity="0.4"
                textAnchor="start"
              >
                {format(parseISO(sorted[0].date), 'MM/dd')}
              </text>
              <text
                x={width - paddingRight}
                y={height - 6}
                fontSize="9"
                fill="currentColor"
                fillOpacity="0.4"
                textAnchor="end"
              >
                {format(parseISO(sorted[sorted.length - 1].date), 'MM/dd')}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* 數據散點詳情 Popover 浮層 */}
      <Popover
        open={Boolean(activePoint && pointAnchorEl)}
        onOpenChange={(open) => {
          if (!open) {
            setActivePoint(null);
            setPointAnchorEl(null);
          }
        }}
      >
        {pointAnchorEl && activePoint && (
          <PopoverContent
            anchor={pointAnchorEl}
            side="top"
            sideOffset={8}
            align="center"
            className="w-auto min-w-[148px] p-2.5 bg-popover text-popover-foreground border border-border shadow-none rounded-lg select-none font-mono focus:outline-hidden z-[90]"
          >
            <div className="space-y-1.5">
              <div className="text-[11px] font-normal text-muted-foreground pb-1 border-b border-border">
                {activePoint.date}
              </div>
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground whitespace-nowrap">
                  {t('body.recordedWeight', '記錄體重')}：
                </span>
                <span className="font-mono text-foreground font-normal whitespace-nowrap text-right">
                  {activePoint.rawWeight !== undefined ? `${activePoint.rawWeight} ${unit}` : '-'}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {t('body.trendWeight', '平滑體重')}：
                </span>
                <span className="font-mono text-foreground font-normal whitespace-nowrap text-right">
                  {activePoint.trendWeight} {unit}
                </span>
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
