import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Edit2,
  Archive,
  RefreshCcw,
  Trash2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { db } from '@/services/db/db';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { convertBodyWeight } from '@/utils/unitMath';
import { getRoutineFactSummary } from '@/utils/workoutMath';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { DetailedMuscle, MuscleRole, Exercise } from '@/types';
import { BodyHighlighter } from '@/components/workout/BodyHighlighter';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import { AdaptiveMuscleBadgeGroup } from '@/components/workout/AdaptiveMuscleBadgeGroup';
import {
  getMuscleRoleBadgeClasses,
  getMuscleRoleLabel,
  normalizeMuscleRole,
  muscleRoleToNumericWeight,
} from '@/utils/muscleIntensity';
import { cn } from '@/lib/utils';
import {
  RoutineFormDialog,
  type RoutineFormData,
} from '@/components/workout/RoutineFormDialog';
import { ExerciseSelectDialog } from '@/components/workout/ExerciseSelectDialog';
import {
  type OverviewPeriod,
  calculateTotalWeeks,
  calculateExerciseFootprintData,
} from '@/utils/heatmapMath';
import { IntakeFootprintHeatmap } from '@/components/food/IntakeFootprintHeatmap';

export default function RoutineDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { bodyWeightUnit } = useUnitPreferences();

  const {
    allRoutines,
    exerciseMap,
    updateRoutine,
    archiveRoutine,
    unarchiveRoutine,
    deleteRoutine,
  } = useRoutines();
  const { getEquipmentDisplayName } = useEquipments();

  const routine = useMemo(() => {
    return allRoutines.find((r) => r.id === id);
  }, [allRoutines, id]);

  const summary = useMemo(() => {
    return getRoutineFactSummary(routine, exerciseMap);
  }, [routine, exerciseMap]);

  // 取得匹配此組合的所有歷史日誌 (以名稱或筆記標籤關聯)
  const workoutLogs = useLiveQuery(
    async () => {
      if (!id || !routine) return [];
      const logs = await db.workout_logs.toArray();
      const rName = routine.name.trim().toLowerCase();
      return logs.filter((log) => {
        const titleMatch = log.title?.trim().toLowerCase() === rName;
        const notesMatch = log.notes && log.notes.toLowerCase().includes(`[${rName}]`);
        return titleMatch || notesMatch;
      });
    },
    [id, routine?.name]
  );

  // 刪除防護契約：有歷史日誌時不可刪除
  const hasWorkoutLogs = (workoutLogs?.length ?? 0) > 0;
  const hasUsage = hasWorkoutLogs;

  // 概覽週期與矩陣容器寬度狀態
  const [overviewPeriod] = useState<OverviewPeriod>('30d');
  const [matrixContainerWidth, setMatrixContainerWidth] = useState<number>(0);

  // 提取此組合在各日誌中的所有組數與數據
  const routineDayLogs = useMemo(() => {
    if (!workoutLogs || !routine) return [];
    return workoutLogs.map((log) => {
      const allSets = log.exercises.flatMap((g) => g.sets || []);
      return {
        date: log.date,
        sets: allSets,
      };
    });
  }, [workoutLogs, routine]);

  const totalWeeks = useMemo(() => {
    return calculateTotalWeeks({
      logs: routineDayLogs,
      matrixContainerWidth,
    });
  }, [routineDayLogs, matrixContainerWidth]);

  const { heatmapDays } = useMemo(() => {
    return calculateExerciseFootprintData({
      logs: routineDayLogs,
      overviewPeriod,
      totalWeeks,
    });
  }, [routineDayLogs, overviewPeriod, totalWeeks]);

  // 當前選中的肌群 (地圖點擊反饋與雙向聯動)
  const [selectedMuscle, setSelectedMuscle] = useState<DetailedMuscle | null>(null);

  const handleMuscleClick = (muscle: DetailedMuscle) => {
    triggerHaptic('selection');
    setSelectedMuscle((prev) => (prev === muscle ? null : muscle));
  };

  // 聚合目標細分肌群機能學分組 (必須嚴格位於所有條件 return 之前，遵守 React Rules of Hooks)
  const muscleEntries = useMemo(() => {
    return summary.coveredMuscles.map(
      (item) => [item.muscle, item.maxIntensity] as [DetailedMuscle, MuscleRole | number]
    );
  }, [summary.coveredMuscles]);

  const primaryEntries = useMemo(
    () => muscleEntries.filter(([, rawRole]) => normalizeMuscleRole(rawRole) === 'primary'),
    [muscleEntries]
  );

  const supportEntries = useMemo(
    () => muscleEntries.filter(([, rawRole]) => normalizeMuscleRole(rawRole) !== 'primary'),
    [muscleEntries]
  );

  const aggregatedTargetMuscles = useMemo(() => {
    const map: Partial<Record<DetailedMuscle, number>> = {};
    for (const [m, intensity] of muscleEntries) {
      map[m] = typeof intensity === 'number' ? intensity : muscleRoleToNumericWeight(intensity);
    }
    return map;
  }, [muscleEntries]);

  // 編輯組合彈窗狀態
  const [isEditOpen, setIsEditOpen] = useState(false);
  // 動作挑選器彈窗狀態
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSelectExercise = async (exercise: Exercise) => {
    if (!routine) return;

    const alreadyExists = routine.exercises.some((e) => e.exerciseId === exercise.id);
    if (alreadyExists) {
      toast.show(t('workout.exerciseAlreadyInRoutine'));
      return;
    }

    const updatedExercises = [
      ...routine.exercises,
      { exerciseId: exercise.id, defaultSets: 3 },
    ];

    await updateRoutine(routine.id, {
      name: routine.name,
      exercises: updatedExercises,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsPickerOpen(false);
  };

  const handleEditSubmit = async (data: RoutineFormData) => {
    if (!routine) return;
    await updateRoutine(routine.id, data);
    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditOpen(false);
  };

  const handleToggleArchive = async () => {
    if (!routine) return;
    if (routine.isArchived) {
      const ok = await confirm({
        title: t('common.restore'),
        description: t('common.confirmRestoreItem', { name: routine.name }),
      });
      if (ok) {
        await unarchiveRoutine(routine.id);
        triggerHaptic('success');
        toast.show(t('common.saved'));
      }
    } else {
      const ok = await confirm({
        title: t('common.archive'),
        description: t('common.confirmArchiveItem', { name: routine.name }),
      });
      if (ok) {
        await archiveRoutine(routine.id);
        triggerHaptic('selection');
        toast.show(t('common.saved'));
        navigate('/settings/routines');
      }
    }
  };

  const handleDelete = async () => {
    if (!routine || hasUsage) return;
    const ok = await confirm({
      title: t('common.delete'),
      description: t('common.confirmDeleteItem', { name: routine.name }),
      variant: 'destructive',
    });
    if (ok) {
      await deleteRoutine(routine.id);
      triggerHaptic('warning');
      toast.show(t('common.deleted'));
      navigate('/settings/routines');
    }
  };

  const getMuscleLabel = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    return t(key);
  };

  // 頂部 Header Action Portal 元素掛載
  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? document.getElementById('subpage-header-action') : null
  );

  useEffect(() => {
    if (!headerActionEl) {
      // oxlint-disable-next-line react/set-state-in-effect
      setHeaderActionEl(document.getElementById('subpage-header-action'));
    }
  }, [headerActionEl]);

  if (!routine) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center text-sm font-mono text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-20">
      {/* 頂部 Header Action Portal (標準三操作：刪除 / 歸檔或還原 / 編輯) */}
      {headerActionEl &&
        createPortal(
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={hasUsage}
              className={cn(
                'size-8 text-muted-foreground transition-colors',
                hasUsage
                  ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground'
                  : 'hover:text-destructive hover:bg-destructive-subtle cursor-pointer'
              )}
              title={
                hasUsage
                  ? t('workout.routineHasLogs')
                  : t('common.delete')
              }
              aria-label={t('common.delete')}
            >
              <Trash2 className="size-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleToggleArchive}
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
              title={routine.isArchived ? t('common.restore') : t('common.archive')}
              aria-label={routine.isArchived ? t('common.restore') : t('common.archive')}
            >
              {routine.isArchived ? (
                <RefreshCcw className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsEditOpen(true)}
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
              title={t('common.edit')}
              aria-label={t('common.edit')}
            >
              <Edit2 className="size-4" />
            </Button>
          </div>,
          headerActionEl
        )}

      {/* 核心一體化主卡片 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-none">
        {/* 品名帶 */}
        <div className="p-4 border-b border-border bg-card">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words min-w-0">
            {routine.name}
          </h1>
        </div>

        {/* 第 3 層：三大指標三欄分割卡片 (動作總數、計劃總組數、覆蓋肌群數) */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-card">
          {/* 1. 動作總數 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('workout.totalExercises')}
              </span>
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {summary.exerciseCount}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {t('workout.exerciseUnit')}
              </span>
            </div>
          </div>

          {/* 2. 計劃總組數 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('workout.totalPlannedSets')}
              </span>
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {summary.totalPlannedSets}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {t('workout.set', '組')}
              </span>
            </div>
          </div>

          {/* 3. 覆蓋肌群數 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('workout.coveredMusclesShort', '覆蓋肌群')}
              </span>
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {summary.coveredMuscles.length}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {t('workout.muscleUnit')}
              </span>
            </div>
          </div>
        </div>

        {/* 第 4 層：微型訓練足跡熱點矩陣 (可左右滾動查看歷史，預設對齊今天) */}
        <IntakeFootprintHeatmap
          title={t('workout.footprint', '訓練足跡')}
          heatmapDays={heatmapDays}
          totalWeeks={totalWeeks}
          onContainerWidthChange={setMatrixContainerWidth}
          getTooltipText={(day) =>
            `${day.date}: ${day.count} ${t('workout.set', '組')} · ${convertBodyWeight(day.grams, 'kg', bodyWeightUnit, 1)} ${bodyWeightUnit}`
          }
          renderSelectedDetails={(day) => (
            <div className="flex items-center tabular-nums text-xs font-mono">
              <span className={day.count === 0 ? 'text-muted-foreground' : 'text-foreground'}>
                {day.count} {t('workout.set', '組')}
              </span>
              <span className="text-border mx-1.5 select-none">·</span>
              <span className={day.count === 0 ? 'text-muted-foreground' : 'text-foreground'}>
                {convertBodyWeight(day.grams, 'kg', bodyWeightUnit, 1)} {bodyWeightUnit}
              </span>
            </div>
          )}
        />
      </div>

      {/* 目標細分肌群機能學分析畫布 */}
      <div className="space-y-1.5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 font-mono">
          {t('workout.targetMuscles')}
        </div>
        <div className="border border-border rounded-lg bg-card p-4 space-y-5">
          {/* 一體化人體解剖地圖 (無盒中盒多餘灰底邊框，直接舒展於主卡片內) */}
          <div className="flex justify-center py-1">
            <BodyHighlighter
              muscles={aggregatedTargetMuscles}
              selectedMuscle={selectedMuscle}
              onMuscleClick={handleMuscleClick}
              onClearSelection={() => setSelectedMuscle(null)}
              view="both"
              size="md"
              interactive
              showLabels
              showOutline
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
                          onClick={() => handleMuscleClick(m)}
                          className={cn(
                            'w-full p-3 rounded-lg border font-mono transition-all flex items-center justify-between text-left cursor-pointer group shadow-none',
                            badgeStyle.container,
                            isSelected && 'ring-1 ring-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[var(--muscle-intensity-high-text)] opacity-90" />
                            <span className="text-sm font-semibold tracking-tight text-foreground">
                              {getMuscleLabel(m)}
                            </span>
                          </div>
                          <span className="text-xs font-mono px-2 py-0.5 rounded border border-[var(--muscle-intensity-high-border)] bg-card text-[var(--muscle-intensity-high-text)] shrink-0 font-medium">
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
                          onClick={() => handleMuscleClick(m)}
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
      </div>

      {/* 動作構成清單 (Usage List, 點擊可直達動作詳情) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            {t('workout.routineExerciseList')} ({routine.exercises.length})
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setIsPickerOpen(true);
            }}
            className="h-6 px-2.5 rounded-full border border-border/80 bg-card hover:bg-hover font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer text-muted-foreground hover:text-foreground active:scale-95 select-none"
          >
            <Plus className="size-3 text-muted-foreground" />
            <span>{t('workout.addExercise')}</span>
          </button>
        </div>
        <div className="border border-border rounded-lg bg-card divide-y divide-border overflow-hidden">
          {routine.exercises.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-muted-foreground">
              {t('workout.noExercises')}
            </div>
          ) : (
            routine.exercises.map((item, idx) => {
              const ex = exerciseMap.get(item.exerciseId);
              const muscles = Object.entries(ex?.targetMuscles || {}) as [
                DetailedMuscle,
                number,
              ][];

              return (
                <Link
                  key={idx}
                  to={ex ? `/settings/exercises/${ex.id}` : '#'}
                  className="p-3.5 flex items-center justify-between hover:bg-hover transition-colors cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {ex ? ex.name : t('workout.unknownExercise')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground min-w-0">
                      <span className="font-bold text-foreground shrink-0">
                        {item.defaultSets} {t('workout.set', '組')}
                      </span>
                      {ex && (
                        <>
                          <span className="shrink-0 opacity-50">·</span>
                          <EquipmentBadge name={getEquipmentDisplayName(ex.equipment, t)} />
                        </>
                      )}
                      {muscles.length > 0 && (
                        <>
                          <span className="shrink-0 opacity-50">·</span>
                          <AdaptiveMuscleBadgeGroup entries={muscles} className="min-w-0 flex-1" />
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* 編輯組合彈窗 (單一真理源 RoutineFormDialog) */}
      <RoutineFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={routine}
        onSubmit={handleEditSubmit}
      />

      {/* 動作挑選器彈窗 (平級兄弟節點) */}
      <ExerciseSelectDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        mode="exercises"
        disabledIds={routine.exercises.map((e) => e.exerciseId)}
        onSelect={(item) => handleSelectExercise(item as Exercise)}
      />
    </div>
  );
}
