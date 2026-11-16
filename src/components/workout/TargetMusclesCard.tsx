import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DetailedMuscle, MuscleRole } from '@/types';
import type { BodyHighlighterGender } from './BodyHighlighter';
import { BodyHighlighter } from './BodyHighlighter';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { triggerHaptic } from '@/lib/haptics';
import {
  getMuscleRoleBadgeClasses,
  getMuscleRoleLabel,
  normalizeMuscleRole,
  sortMuscleEntries,
} from '@/utils/muscleIntensity';
import { cn } from '@/lib/utils';

export interface TargetMusclesCardProps {
  /** 模型性別：'male' | 'female' */
  gender: BodyHighlighterGender;
  /** 目標肌群與角色/強度映射 */
  muscles: Partial<Record<DetailedMuscle, MuscleRole | number>>;
}

/**
 * 目標細分肌群機能學分析卡片 (與首頁肌群恢復地圖一致，採用 Popover 形式瀏覽肌群)
 */
export const TargetMusclesCard = memo(function TargetMusclesCard({
  gender,
  muscles,
}: TargetMusclesCardProps) {
  const { t } = useTranslation();
  const [selectedMuscle, setSelectedMuscle] = useState<DetailedMuscle | null>(null);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const getMuscleLabel = (m: DetailedMuscle) => {
    const key = `workout.muscle${m
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')}`;
    return t(key, m);
  };

  const muscleEntries = useMemo(() => {
    return Object.entries(muscles) as [DetailedMuscle, MuscleRole | number][];
  }, [muscles]);

  const primaryEntries = useMemo(
    () =>
      sortMuscleEntries(
        muscleEntries.filter(([, rawRole]) => normalizeMuscleRole(rawRole) === 'primary')
      ),
    [muscleEntries]
  );

  const supportEntries = useMemo(
    () =>
      sortMuscleEntries(
        muscleEntries.filter(([, rawRole]) => normalizeMuscleRole(rawRole) !== 'primary')
      ),
    [muscleEntries]
  );

  const handleMapMuscleClick = (
    muscle: DetailedMuscle,
    _slug: unknown,
    _view: unknown,
    event?: React.MouseEvent<SVGPathElement>
  ) => {
    triggerHaptic('selection');
    if (selectedMuscle === muscle) {
      setSelectedMuscle(null);
      setAnchorEl(null);
    } else {
      setSelectedMuscle(muscle);
      setAnchorEl(event?.currentTarget ?? null);
    }
  };

  const handleBadgeClick = (muscle: DetailedMuscle) => {
    triggerHaptic('selection');
    setAnchorEl(null);
    setSelectedMuscle((prev) => (prev === muscle ? null : muscle));
  };

  const handleClearSelection = () => {
    setSelectedMuscle(null);
    setAnchorEl(null);
  };

  const selectedRawRole = selectedMuscle ? muscles[selectedMuscle] : undefined;
  const selectedRole: MuscleRole | null =
    selectedRawRole !== undefined ? normalizeMuscleRole(selectedRawRole) : null;

  return (
    <>
      <div className="border border-border rounded-lg bg-card p-3.5 sm:p-5 space-y-4">
        {/* 一體化人體解剖地圖 (與首頁一致：關閉頂部 HUD，改以點擊 Popover 瀏覽) */}
          <div className="flex justify-center py-1">
            <BodyHighlighter
              gender={gender}
              muscles={muscles}
              selectedMuscle={selectedMuscle}
              onMuscleClick={handleMapMuscleClick}
              onClearSelection={handleClearSelection}
              view="both"
              size="md"
              interactive
              showLabels
              showOutline
              showHud={false}
            />
          </div>

          {/* 精密機能學量表 (Functional Hierarchy) */}
          {muscleEntries.length === 0 ? (
            <div className="text-xs font-mono text-muted-foreground text-center py-2">
              {t('workout.noTargetMuscles', '無肌群')}
            </div>
          ) : (
            <div className="space-y-3.5 pt-2 border-t border-border/60">
              {/* 1. 核心發力層 (Hero / Prime Mover) */}
              {primaryEntries.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                    {t('workout.primaryMover', '主要發力')}
                  </div>
                  <div className="flex flex-col gap-2">
                    {primaryEntries.map(([m, rawRole]) => {
                      const role = normalizeMuscleRole(rawRole);
                      const badgeStyle = getMuscleRoleBadgeClasses(role);
                      const roleLabel = getMuscleRoleLabel(role, t);
                      const isSelected = selectedMuscle === m;

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleBadgeClick(m)}
                          className={cn(
                            'w-full p-3 rounded-lg border font-mono transition-all flex items-center justify-between text-left cursor-pointer group shadow-none',
                            badgeStyle.container,
                            isSelected && 'ring-1 ring-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[var(--muscle-badge-high-text)] opacity-90" />
                            <span className="text-sm font-semibold tracking-tight">
                              {getMuscleLabel(m)}
                            </span>
                          </div>
                          <span className="text-xs font-mono px-2 py-0.5 rounded border border-[var(--muscle-badge-high-border)] bg-card text-[var(--muscle-badge-high-text)] shrink-0 font-medium">
                            {roleLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. 協同與穩定層 (Synergists & Stabilizers - 通透機能學膠囊群) */}
              {supportEntries.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                    {t('workout.synergistsAndStabilizers', '協同與穩定')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {supportEntries.map(([m, rawRole]) => {
                      const role = normalizeMuscleRole(rawRole);
                      const badgeStyle = getMuscleRoleBadgeClasses(role);
                      const roleLabel = getMuscleRoleLabel(role, t);
                      const isSelected = selectedMuscle === m;

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleBadgeClick(m)}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border font-mono text-xs transition-all text-left cursor-pointer shadow-none',
                            badgeStyle.container,
                            isSelected && 'ring-1 ring-foreground'
                          )}
                        >
                          <span className="font-medium whitespace-nowrap">
                            {getMuscleLabel(m)}
                          </span>
                          <span className="opacity-40 text-[10px]">·</span>
                          <span className="text-[11px] opacity-90 whitespace-nowrap">
                            {roleLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* 肌群詳情 Popover 浮層提示 (平級兄弟節點宣告) */}
      <Popover
        open={Boolean(selectedMuscle && anchorEl)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMuscle(null);
            setAnchorEl(null);
          }
        }}
      >
        {anchorEl && selectedMuscle && (
          <PopoverContent
            anchor={anchorEl}
            side="top"
            sideOffset={8}
            align="center"
            className="p-0 border-none bg-transparent shadow-none flex flex-col items-center animate-none w-auto z-[90]"
          >
            <div className="w-[176px] rounded-lg border border-border bg-popover text-popover-foreground shadow-none font-mono select-none overflow-hidden">
              <div className="px-2.5 py-1.5 border-b border-border bg-muted flex items-center justify-between">
                <span className="font-bold text-foreground text-[13px] sm:text-sm leading-tight truncate">
                  {getMuscleLabel(selectedMuscle)}
                </span>
              </div>
              <div className="p-2.5 bg-card flex flex-col items-start gap-0.5 overflow-hidden">
                <span className="text-[10px] text-muted-foreground font-normal leading-none truncate">
                  {t('workout.muscleRole', '發力角色')}
                </span>
                <span
                  className={cn(
                    'text-xs leading-tight truncate mt-0.5',
                    selectedRole
                      ? cn('font-bold', getMuscleRoleBadgeClasses(selectedRole).text)
                      : 'font-normal text-muted-foreground'
                  )}
                >
                  {selectedRole
                    ? getMuscleRoleLabel(selectedRole, t)
                    : t('workout.none', '無')}
                </span>
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </>
  );
});
