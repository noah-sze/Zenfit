import { useState } from 'react';
import type { SmoothedWeightPoint } from '@/utils/weightMath';
import { format, parseISO } from 'date-fns';

interface WeightTrendChartProps {
  data: SmoothedWeightPoint[];
  unit?: string;
}

export function WeightTrendChart({ data, unit = 'kg' }: WeightTrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<SmoothedWeightPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center border border-border/60 rounded-2xl text-xs text-muted-foreground font-mono">
        暫無足夠時序數據
      </div>
    );
  }

  // 排序並提取數值極值
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const rawValues = sorted.map((d) => d.rawWeight || d.trendWeight);
  const trendValues = sorted.map((d) => d.trendWeight);
  const allValues = [...rawValues, ...trendValues];

  const minVal = Math.floor(Math.min(...allValues) - 0.5);
  const maxVal = Math.ceil(Math.max(...allValues) + 0.5);
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
    if (sorted.length === 1) return paddingLeft + chartW / 2;
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
    <div className="relative w-full border border-border bg-card text-card-foreground rounded-lg p-4 select-none">
      {/* 頂部圖例與當前選中指標 */}
      <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-foreground" />
            <span className="text-xs font-mono text-muted-foreground">趨勢線</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full border border-foreground/50 bg-background" />
            <span className="text-xs font-mono text-muted-foreground">每日過磅</span>
          </div>
        </div>

        {hoveredPoint ? (
          <div className="text-xs font-mono">
            <span className="text-muted-foreground mr-1.5">{hoveredPoint.date}:</span>
            <span className="font-semibold text-foreground mr-2">
              {hoveredPoint.rawWeight} {unit}
            </span>
            <span className="text-muted-foreground">
              (趨勢 {hoveredPoint.trendWeight})
            </span>
          </div>
        ) : (
          <div className="text-xs font-mono text-muted-foreground">
            {sorted.length} 筆過磅記錄
          </div>
        )}
      </div>

      {/* SVG 折線圖主體 */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible font-mono"
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
            const isHovered = hoveredPoint?.date === p.date;

            return (
              <g
                key={p.date}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
                onTouchStart={() => setHoveredPoint(p)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4.5 : 2.5}
                  fill="var(--background)"
                  stroke="currentColor"
                  strokeWidth={isHovered ? 2 : 1.25}
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
    </div>
  );
}
