import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { DetailedMuscle, MuscleRole } from '@/types';
import {
  type BodyPartSlug,
  type BodyView,
  getDetailedMusclesForSlug,
  resolveMuscleForSlug,
  getMuscleIntensity,
  getMuscleHighlightStyle,
} from '@/utils/muscleHighlight';
import {
  getMuscleRoleBadgeClasses,
  getMuscleRoleLabel,
  normalizeMuscleRole,
} from '@/utils/muscleIntensity';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  MALE_OUTLINE_FRONT,
  MALE_OUTLINE_BACK,
  BODY_FRONT_PARTS,
  BODY_BACK_PARTS,
  type BodyPartPathGroup,
} from './bodyModelData';

export type BodyHighlighterView = 'anterior' | 'posterior' | 'both';
export type BodyHighlighterSize = 'sm' | 'md' | 'lg' | 'responsive';
export type BodyHighlighterHudPosition = 'top' | 'bottom';

export interface BodyHighlighterProps {
  /** 呈現視角：正面 / 背面 / 並排，預設 'both' */
  view?: BodyHighlighterView;
  /** 各肌群刺激角色或歷史強度 (0 ~ 100) */
  muscles?: Partial<Record<DetailedMuscle, MuscleRole | number>>;
  /** 當前選中的肌群列表 (多選支援) */
  selectedMuscles?: DetailedMuscle[];
  /** 單一選中肌群 (受控模式) */
  selectedMuscle?: DetailedMuscle | null;
  /** 是否允許點擊互動 */
  interactive?: boolean;
  /** 點擊肌群回調 */
  onMuscleClick?: (
    muscle: DetailedMuscle,
    slug: BodyPartSlug,
    view: BodyView,
    event?: React.MouseEvent<SVGPathElement>
  ) => void;
  /** 清除選中回調 */
  onClearSelection?: () => void;
  /** 高亮填充色 (預設遵循赤陶刺激強度體系，支援自訂覆蓋) */
  highlightColor?: string;
  /** 基準未刺激肌肉底色 (預設為 currentColor 帶低透明度) */
  baseColor?: string;
  /** 尺寸預設 'md' */
  size?: BodyHighlighterSize;
  /** 是否顯示底部的 ANTERIOR / POSTERIOR 極簡標籤 */
  showLabels?: boolean;
  /** 是否顯示外圍輪廓線 */
  showOutline?: boolean;
  /** 是否在互動時展示 HUD 狀態提示膠囊，預設為 true */
  showHud?: boolean;
  /** HUD 狀態提示膠囊位置：'top' (頭頂上方專屬安全區，預設) | 'bottom' (地圖下方) */
  hudPosition?: BodyHighlighterHudPosition;
  /** 自訂外層容器 class */
  className?: string;
}

const SIZE_CLASSES: Record<BodyHighlighterSize, string> = {
  sm: 'h-32 w-auto',
  md: 'h-76 sm:h-80 w-auto',
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
  selectedMuscle,
  interactive = false,
  onMuscleClick,
  onClearSelection,
  highlightColor,
  baseColor,
  size = 'md',
  showLabels = false,
  showOutline = true,
  showHud = true,
  hudPosition = 'top',
  className = '',
}: BodyHighlighterProps) {
  const { t } = useTranslation();

  // 內部選中狀態 (非受控模式)
  const [internalSelectedMuscle, setInternalSelectedMuscle] = useState<DetailedMuscle | null>(null);

  // 當前受控或非受控的鎖定肌群
  const currentSelected = selectedMuscle !== undefined ? selectedMuscle : internalSelectedMuscle;

  // 滑鼠懸停即時提示資訊 (桌面端 hover)
  const [hoveredInfo, setHoveredInfo] = useState<{
    muscle: DetailedMuscle;
    slug: BodyPartSlug;
  } | null>(null);

  // 當前在 HUD 膠囊呈現的目標肌群：優先顯示鎖定選中的肌群，其次為 hover 的肌群
  const activeMuscle = currentSelected ?? hoveredInfo?.muscle ?? null;

  const selectedSet = useMemo(() => {
    const set = new Set(selectedMuscles || []);
    if (currentSelected) {
      set.add(currentSelected);
    }
    return set;
  }, [selectedMuscles, currentSelected]);

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

  const handleClearSelection = () => {
    if (selectedMuscle === undefined) {
      setInternalSelectedMuscle(null);
    }
    onClearSelection?.();
  };

  const handleContainerClick = () => {
    if (!interactive) return;
    if (currentSelected) {
      handleClearSelection();
    }
  };

  const renderPartGroup = (group: BodyPartPathGroup, currentView: BodyView) => {
    const isNonMuscle = NON_MUSCLE_SLUGS.has(group.slug);
    const targetMuscles = getDetailedMusclesForSlug(group.slug, currentView);
    // 優先匹配此動作實際刺激或主要代表的 DetailedMuscle
    const primaryMuscle = resolveMuscleForSlug(group.slug, currentView, muscles) ?? targetMuscles[0];

    const intensity = isNonMuscle ? 0 : getMuscleIntensity(muscles, group.slug, currentView);
    const isSelected = targetMuscles.some((m) => selectedSet.has(m));

    const style = getMuscleHighlightStyle(intensity, {
      highlightColor,
      baseColor,
      isNonMuscle,
      isSelected,
    });

    const isClickable = interactive && !isNonMuscle && primaryMuscle !== undefined;

    const muscleLabel = primaryMuscle ? getMuscleTranslation(primaryMuscle) : undefined;
    const tooltipText = muscleLabel
      ? `${muscleLabel}${intensity > 0 ? ` · ${intensity}%` : ''}`
      : undefined;

    return group.paths.map((d, idx) => (
      <path
        key={`${group.slug}-${group.side || 'c'}-${idx}`}
        d={d}
        fill={style.fill}
        fillOpacity={style.fillOpacity}
        stroke={style.stroke}
        strokeOpacity={style.strokeOpacity}
        strokeWidth={style.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={
          isClickable
            ? cn(
                'cursor-pointer transition-all duration-150',
                intensity > 0
                  ? 'hover:stroke-foreground hover:stroke-opacity-70 hover:brightness-105'
                  : 'hover:fill-foreground hover:fill-opacity-10 hover:stroke-foreground hover:stroke-opacity-40'
              )
            : undefined
        }
        onClick={
          isClickable
            ? (e) => {
                e.stopPropagation();
                triggerHaptic('selection');
                if (selectedMuscle === undefined) {
                  setInternalSelectedMuscle((prev) => (prev === primaryMuscle ? null : primaryMuscle));
                }
                onMuscleClick?.(primaryMuscle, group.slug, currentView, e);
              }
            : undefined
        }
        onMouseEnter={
          isClickable && primaryMuscle
            ? () =>
                setHoveredInfo({
                  muscle: primaryMuscle,
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

  const renderHud = () => {
    if (!interactive || !showHud) return null;

    const muscleLabel = activeMuscle ? getMuscleTranslation(activeMuscle) : '';
    const rawRole = activeMuscle ? muscles?.[activeMuscle] : undefined;
    const hasTargetRole = rawRole !== undefined;
    const normalizedRole = hasTargetRole ? normalizeMuscleRole(rawRole) : undefined;
    const roleLabel = normalizedRole ? getMuscleRoleLabel(normalizedRole, t) : undefined;
    const roleBadgeClasses = normalizedRole ? getMuscleRoleBadgeClasses(normalizedRole) : undefined;
    const isLocked = activeMuscle !== null && currentSelected === activeMuscle;

    // 未選中時概覽統計
    const muscleCount = muscles ? Object.keys(muscles).length : 0;
    const primaryEntry = muscles
      ? (Object.entries(muscles) as [DetailedMuscle, MuscleRole | number][]).find(
          ([, r]) => normalizeMuscleRole(r) === 'primary'
        )
      : undefined;
    const primaryMuscleLabel = primaryEntry ? getMuscleTranslation(primaryEntry[0]) : null;

    return (
      <div
        className={cn(
          'w-full flex items-center justify-center px-2 pointer-events-none transition-all duration-150 h-7',
          hudPosition === 'top' ? 'mb-2' : 'mt-2'
        )}
      >
        {activeMuscle ? (
          <div className="inline-flex rounded-md bg-card shadow-none">
            <div
              className={cn(
                'pointer-events-auto inline-flex flex-row items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-xs select-none whitespace-nowrap transition-all duration-150',
                hasTargetRole && roleBadgeClasses
                  ? roleBadgeClasses.container
                  : 'border-border text-foreground'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-medium whitespace-nowrap">{muscleLabel}</span>
              {hasTargetRole && roleLabel && (
                <>
                  <span className="opacity-60 text-[10px]">·</span>
                  <span className="text-[11px] font-mono whitespace-nowrap">{roleLabel}</span>
                </>
              )}
              {isLocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearSelection();
                  }}
                  className="ml-1 -mr-0.5 rounded-sm p-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer inline-flex items-center justify-center"
                  aria-label={t('common.close', '關閉')}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground select-none">
            <span className="inline-block size-1.5 rounded-full bg-[var(--muscle-intensity-high-text)] opacity-70" />
            {primaryMuscleLabel ? (
              <span>
                {t('workout.primaryMover', '主要發力')} : <span className="text-foreground font-medium">{primaryMuscleLabel}</span>
                {muscleCount > 1 ? ` · +${muscleCount - 1}` : ''}
              </span>
            ) : (
              <span>{t('workout.interactiveAnatomyHint', '點擊部位查看詳情')}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn('relative flex flex-col items-center select-none w-full', className)}
      onClick={handleContainerClick}
    >
      {/* 頂部 HUD 狀態提示 (若顯式指定 hudPosition='top') */}
      {hudPosition === 'top' && renderHud()}

      <div className="relative inline-flex flex-col items-center">
        <svg
          viewBox={viewBox}
          className={`${SIZE_CLASSES[size]} max-h-full max-w-full text-foreground transition-all duration-200`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 外圍人體精確輪廓線 (清晰剪影輪廓，一眼識別完整人體結構) */}
          {showOutline && (
            <g
              stroke="currentColor"
              strokeOpacity={0.45}
              strokeWidth={1.0}
              strokeLinecap="round"
              strokeLinejoin="round"
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

        {/* 極簡底標 (完美對齊左右兩具人體足底中軸線) */}
        {showLabels && (
          <div className="mt-2.5 w-full font-mono text-[10px] tracking-widest text-muted-foreground uppercase select-none">
            {view === 'both' ? (
              <div className="grid grid-cols-2 w-full">
                <span className="text-center">ANTERIOR</span>
                <span className="text-center">POSTERIOR</span>
              </div>
            ) : (
              <div className="text-center w-full">
                <span>{view === 'anterior' ? 'ANTERIOR' : 'POSTERIOR'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部 HUD 狀態提示 (若顯式指定 hudPosition='bottom') */}
      {hudPosition === 'bottom' && renderHud()}
    </div>
  );
});
