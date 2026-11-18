import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useInAppNavigation } from '@/store/useInAppNavigation';
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
import { getLocalizedExerciseName } from '@/utils/defaultLocalization';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import {
  getInMemoryWorkoutLogsCache,
  setInMemoryWorkoutLogsCache,
} from '@/hooks/useWorkoutLogs';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { useUserProfile } from '@/hooks/useUserProfile';
import { convertBodyWeight } from '@/utils/unitMath';
import { getRoutineFactSummary } from '@/utils/workoutMath';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { DetailedMuscle, Exercise } from '@/types';
import { TargetMusclesCard } from '@/components/workout/TargetMusclesCard';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import { AdaptiveMuscleBadgeGroup } from '@/components/workout/AdaptiveMuscleBadgeGroup';
import { muscleRoleToNumericWeight, sortMuscleEntries } from '@/utils/muscleIntensity';
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
  getInitialMatrixContainerWidth,
} from '@/utils/heatmapMath';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { IntakeFootprintHeatmap } from '@/components/food/IntakeFootprintHeatmap';

export interface RoutineDetailsProps {
  id?: string;
}

export default function RoutineDetails({ id: propId }: RoutineDetailsProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const { profile } = useUserProfile();
  const id = propId || routeId;
  const { t } = useTranslation();
  const { goBack } = useSafeNavigate();
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

  // 取得所有訓練日誌（具備記憶體快取第 0 幀同步注水）
  const liveWorkoutLogs = useLiveQuery(
    async () => {
      const result = await db.workout_logs.toArray();
      setInMemoryWorkoutLogsCache(result);
      return result;
    },
    []
  );
  const allWorkoutLogs = liveWorkoutLogs ?? getInMemoryWorkoutLogsCache();

  // 取得匹配此組合的所有歷史日誌
  const workoutLogs = useMemo(() => {
    if (!id || !routine || !allWorkoutLogs) return [];
    return allWorkoutLogs.filter((log) => log.routineId === id);
  }, [allWorkoutLogs, id, routine]);

  // 刪除防護契約：有歷史日誌時不可刪除
  const hasWorkoutLogs = workoutLogs.length > 0;
  const hasUsage = hasWorkoutLogs;

  // 概覽週期與矩陣容器寬度狀態
  const [overviewPeriod] = useState<OverviewPeriod>('30d');
  const [matrixContainerWidth, setMatrixContainerWidth] = useState<number>(
    getInitialMatrixContainerWidth
  );

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

  // 聚合目標細分肌群機能學映射 (必須嚴格位於所有條件 return 之前，遵守 React Rules of Hooks)
  const aggregatedTargetMuscles = useMemo(() => {
    const map: Partial<Record<DetailedMuscle, number>> = {};
    for (const item of summary.coveredMuscles) {
      map[item.muscle] =
        typeof item.maxIntensity === 'number'
          ? item.maxIntensity
          : muscleRoleToNumericWeight(item.maxIntensity);
    }
    return map;
  }, [summary.coveredMuscles]);

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
      { exerciseId: exercise.id },
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
        variant: 'archive',
        archiveSpec: {
          entityLabel: t('workout.routineEntityLabel', '組合'),
          itemName: routine.name,
        },
      });
      if (ok) {
        await archiveRoutine(routine.id);
        triggerHaptic('selection');
        toast.show(t('common.saved'));
        goBack();
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
      goBack();
    }
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
        {/* 品名帶 (高度 68px 與指標區塊等高) */}
        <div className="h-[68px] px-3.5 sm:px-4 border-b border-border flex items-center justify-between gap-2.5 bg-card overflow-hidden">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate min-w-0">
            {routine.name}
          </h1>
        </div>

        {/* 第 3 層：兩大客觀指標雙欄分割卡片 (高度 68px 與品名帶等高) */}
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border bg-card h-[68px]">
          {/* 1. 動作總數 */}
          <div className="h-[68px] px-3.5 sm:px-4 py-2.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('workout.totalExercises')}
              </span>
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-normal text-foreground tabular-nums">
                {summary.exerciseCount}
              </span>
              <span className="font-sans text-xs font-normal text-muted-foreground ml-0.5">
                {t('workout.exerciseUnit')}
              </span>
            </div>
          </div>

          {/* 2. 覆蓋肌群數 */}
          <div className="h-[68px] px-3.5 sm:px-4 py-2.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('workout.coveredMusclesShort', '覆蓋肌群')}
              </span>
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-normal text-foreground tabular-nums">
                {summary.coveredMuscles.length}
              </span>
              <span className="font-sans text-xs font-normal text-muted-foreground ml-0.5">
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
      <TargetMusclesCard
        gender={profile.gender}
        muscles={aggregatedTargetMuscles}
      />

      {/* 動作清單 (Usage List, 點擊可直達動作詳情) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            {t('workout.routineExerciseList', '動作清單')}
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
                <button
                  key={idx}
                  type="button"
                  disabled={!ex}
                  onClick={() => {
                    if (!ex) return;
                    triggerHaptic('light');
                    useInAppNavigation.getState().pushSubView({
                      type: 'exercises',
                      id: ex.id,
                      mode: 'exercises',
                    });
                  }}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-hover transition-colors cursor-pointer group text-left disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {ex ? getLocalizedExerciseName(ex) : t('workout.unknownExercise')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground min-w-0">
                      {ex && (
                        <EquipmentBadge name={getEquipmentDisplayName(ex.equipment, t)} />
                      )}
                      {muscles.length > 0 && (
                        <>
                          {ex && <span className="shrink-0 opacity-50">·</span>}
                          <AdaptiveMuscleBadgeGroup entries={sortMuscleEntries(muscles)} className="min-w-0 flex-1" />
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                </button>
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
