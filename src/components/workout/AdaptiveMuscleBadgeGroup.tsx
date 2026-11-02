import { memo, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { DetailedMuscle, MuscleRole } from '@/types';
import { MuscleIntensityBadge } from './MuscleIntensityBadge';
import { calculateVisibleBadgeCount } from '@/utils/badgeLayout';
import { cn } from '@/lib/utils';

export interface AdaptiveMuscleBadgeGroupProps {
  entries: [DetailedMuscle, MuscleRole | number][];
  className?: string;
}

export const AdaptiveMuscleBadgeGroup = memo(function AdaptiveMuscleBadgeGroup({
  entries,
  className,
}: AdaptiveMuscleBadgeGroupProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const moreMeasureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(entries.length);

  const getMuscleLabel = (muscle: DetailedMuscle): string => {
    const key = `workout.muscle${muscle
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')}`;
    return t(key);
  };

  const measureAndLayout = useCallback(() => {
    const container = containerRef.current;
    const measureContainer = measureContainerRef.current;
    if (!container || !measureContainer || entries.length === 0) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    // 透過影子容器直接獲取所有項目的實際渲染寬度
    const badgeNodes = measureContainer.querySelectorAll<HTMLElement>('[data-measure-badge]');
    if (badgeNodes.length === 0) return;

    const widths: number[] = [];
    badgeNodes.forEach((node) => {
      widths.push(node.offsetWidth);
    });

    const gap = 4; // gap-1 (0.25rem = 4px)
    const moreBadgeWidth = moreMeasureRef.current?.offsetWidth || 28;

    const count = calculateVisibleBadgeCount({
      availableWidth,
      itemWidths: widths,
      gap,
      moreBadgeWidth,
      minVisibleCount: 1,
    });

    setVisibleCount(count);
  }, [entries]);

  useLayoutEffect(() => {
    measureAndLayout();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      measureAndLayout();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [measureAndLayout]);

  if (entries.length === 0) return null;

  const hiddenCount = entries.length - visibleCount;

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center gap-1 min-w-0 overflow-hidden flex-nowrap', className)}
    >
      {/* 影子測量容器：常駐渲染所有項目以獲取真實寬度，不干擾視覺排版 */}
      <div
        ref={measureContainerRef}
        className="absolute left-0 top-0 invisible pointer-events-none -z-50 flex items-center gap-1 flex-nowrap"
        aria-hidden="true"
      >
        {entries.map(([m, intensity]) => (
          <span key={m} data-measure-badge className="shrink-0">
            <MuscleIntensityBadge
              muscle={m}
              intensity={intensity}
              showIntensity={false}
              size="sm"
            />
          </span>
        ))}
        <span
          ref={moreMeasureRef}
          className="text-[10px] font-mono shrink-0 px-1 py-0.5 rounded select-none"
        >
          +{entries.length}
        </span>
      </div>

      {/* 實際渲染之可見項目 */}
      {entries.slice(0, visibleCount).map(([m, intensity]) => (
        <span key={m} className="shrink-0">
          <MuscleIntensityBadge
            muscle={m}
            intensity={intensity}
            showIntensity={false}
            size="sm"
          />
        </span>
      ))}

      {hiddenCount > 0 && (
        <span
          className="text-[10px] font-mono text-muted-foreground/70 shrink-0 px-1 py-0.5 rounded bg-muted/60 border border-border/40 select-none"
          title={entries
            .slice(visibleCount)
            .map(([m]) => getMuscleLabel(m))
            .join(', ')}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
});

