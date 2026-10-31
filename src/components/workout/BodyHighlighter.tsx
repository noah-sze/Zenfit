import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DetailedMuscle } from '@/types';
import {
  type BodyPartSlug,
  type BodyView,
  getDetailedMusclesForSlug,
  getMuscleIntensity,
  getIntensityAlpha,
} from '@/utils/muscleHighlight';
import {
  MALE_OUTLINE_FRONT,
  MALE_OUTLINE_BACK,
  BODY_FRONT_PARTS,
  BODY_BACK_PARTS,
  type BodyPartPathGroup,
} from './bodyModelData';

export type BodyHighlighterView = 'anterior' | 'posterior' | 'both';
export type BodyHighlighterSize = 'sm' | 'md' | 'lg' | 'responsive';

export interface BodyHighlighterProps {
  /** 呈現視角：正面 / 背面 / 並排，預設 'both' */
  view?: BodyHighlighterView;
  /** 各肌群刺激強度或頻率 (0 ~ 100) */
  muscles?: Partial<Record<DetailedMuscle, number>>;
  /** 當前選中的肌群列表 */
  selectedMuscles?: DetailedMuscle[];
  /** 是否允許點擊互動 */
  interactive?: boolean;
  /** 點擊肌群回調 */
  onMuscleClick?: (muscle: DetailedMuscle, slug: BodyPartSlug, view: BodyView) => void;
  /** 高亮填充色 (預設為 currentColor) */
  highlightColor?: string;
  /** 基準未刺激肌肉底色 (預設為 currentColor 帶低透明度) */
  baseColor?: string;
  /** 尺寸預設 'md' */
  size?: BodyHighlighterSize;
  /** 是否顯示底部的 ANTERIOR / POSTERIOR 極簡標籤 */
  showLabels?: boolean;
  /** 是否顯示外圍輪廓線 */
  showOutline?: boolean;
  /** 自訂外層容器 class */
  className?: string;
}

const SIZE_CLASSES: Record<BodyHighlighterSize, string> = {
  sm: 'h-28 w-auto',
  md: 'h-60 w-auto',
  lg: 'h-96 w-auto',
  responsive: 'w-full h-auto',
};

const NON_MUSCLE_SLUGS: Set<BodyPartSlug> = new Set([
  'head',
  'hair',
  'neck',
  'knees',
  'ankles',
  'feet',
  'hands',
]);

export const BodyHighlighter = memo(function BodyHighlighter({
  view = 'both',
  muscles,
  selectedMuscles,
  interactive = false,
  onMuscleClick,
  highlightColor,
  baseColor,
  size = 'md',
  showLabels = false,
  showOutline = true,
  className = '',
}: BodyHighlighterProps) {
  const { t } = useTranslation();
  const [hoveredInfo, setHoveredInfo] = useState<{
    muscle?: DetailedMuscle;
    intensity?: number;
    slug: BodyPartSlug;
  } | null>(null);

  const selectedSet = useMemo(() => new Set(selectedMuscles || []), [selectedMuscles]);

  const viewBox = useMemo(() => {
    switch (view) {
      case 'anterior':
        return '0 0 724 1448';
      case 'posterior':
        return '724 0 724 1448';
      case 'both':
      default:
        return '0 0 1448 1448';
    }
  }, [view]);

  const getMuscleTranslation = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')}`;
    return t(key);
  };

  const renderPartGroup = (group: BodyPartPathGroup, currentView: BodyView) => {
    const isNonMuscle = NON_MUSCLE_SLUGS.has(group.slug);
    const targetMuscles = getDetailedMusclesForSlug(group.slug, currentView);
    const primaryMuscle = targetMuscles[0];

    const intensity = isNonMuscle ? 0 : getMuscleIntensity(muscles, group.slug, currentView);
    const isSelected = targetMuscles.some((m) => selectedSet.has(m));

    let fill = baseColor || 'currentColor';
    let fillOpacity = 0.12;

    if (isSelected) {
      fill = highlightColor || 'currentColor';
      fillOpacity = 0.95;
    } else if (intensity > 0) {
      fill = highlightColor || 'currentColor';
      fillOpacity = getIntensityAlpha(intensity);
    } else if (isNonMuscle) {
      fillOpacity = 0.08;
    }

    const isClickable = interactive && !isNonMuscle && primaryMuscle !== undefined;

    const muscleLabel = primaryMuscle ? getMuscleTranslation(primaryMuscle) : undefined;
    const tooltipText = muscleLabel
      ? `${muscleLabel}${intensity > 0 ? ` · ${intensity}%` : ''}`
      : undefined;

    return group.paths.map((d, idx) => (
      <path
        key={`${group.slug}-${group.side || 'c'}-${idx}`}
        d={d}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className={
          isClickable
            ? 'cursor-pointer transition-opacity duration-150 hover:fill-foreground hover:fill-opacity-40'
            : undefined
        }
        onClick={
          isClickable
            ? () => onMuscleClick?.(primaryMuscle, group.slug, currentView)
            : undefined
        }
        onMouseEnter={
          isClickable
            ? () =>
                setHoveredInfo({
                  muscle: primaryMuscle,
                  intensity,
                  slug: group.slug,
                })
            : undefined
        }
        onMouseLeave={isClickable ? () => setHoveredInfo(null) : undefined}
      >
        {tooltipText && <title>{tooltipText}</title>}
      </path>
    ));
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={viewBox}
        className={`${SIZE_CLASSES[size]} max-h-full max-w-full text-foreground transition-all duration-200`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 外圍人體精確輪廓線 */}
        {showOutline && (
          <g
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeWidth={1.5}
            fill="none"
            vectorEffect="non-scaling-stroke"
          >
            {(view === 'anterior' || view === 'both') && <path d={MALE_OUTLINE_FRONT} />}
            {(view === 'posterior' || view === 'both') && <path d={MALE_OUTLINE_BACK} />}
          </g>
        )}

        {/* 正面肌肉與部位 */}
        {(view === 'anterior' || view === 'both') && (
          <g id="body-anterior">
            {BODY_FRONT_PARTS.map((group) => renderPartGroup(group, 'anterior'))}
          </g>
        )}

        {/* 背面肌肉與部位 */}
        {(view === 'posterior' || view === 'both') && (
          <g id="body-posterior">
            {BODY_BACK_PARTS.map((group) => renderPartGroup(group, 'posterior'))}
          </g>
        )}
      </svg>

      {/* 極簡底標 */}
      {showLabels && (
        <div className="mt-2 flex w-full items-center justify-around font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          {(view === 'anterior' || view === 'both') && <span>ANTERIOR</span>}
          {(view === 'posterior' || view === 'both') && <span>POSTERIOR</span>}
        </div>
      )}

      {/* 互動時的極簡懸浮狀態條 (客觀測量儀風格) */}
      {interactive && hoveredInfo?.muscle && (
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded border border-border bg-card/90 px-2 py-0.5 font-mono text-[11px] text-foreground backdrop-blur-sm">
          <span>{getMuscleTranslation(hoveredInfo.muscle)}</span>
          {typeof hoveredInfo.intensity === 'number' && hoveredInfo.intensity > 0 && (
            <span className="ml-1.5 text-muted-foreground">{hoveredInfo.intensity}%</span>
          )}
        </div>
      )}
    </div>
  );
});
