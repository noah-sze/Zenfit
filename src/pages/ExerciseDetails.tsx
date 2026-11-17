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
  Layers,
  ChevronRight,
} from 'lucide-react';
import { db } from '@/services/db/db';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import {
  getInMemoryWorkoutLogsCache,
  setInMemoryWorkoutLogsCache,
} from '@/hooks/useWorkoutLogs';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { getLocalizedExerciseName } from '@/utils/defaultLocalization';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ExerciseOverviewCard, TargetMusclesCard } from '@/components/workout';
import { cn } from '@/lib/utils';
import {
  ExerciseFormDialog,
  type ExerciseFormData,
} from '@/components/workout/ExerciseFormDialog';
import {
  type OverviewPeriod,
  calculateTotalWeeks,
  calculateExerciseFootprintData,
  getInitialMatrixContainerWidth,
} from '@/utils/heatmapMath';

import { useSafeNavigate } from '@/hooks/useSafeNavigate';

export interface ExerciseDetailsProps {
  id?: string;
}

export default function ExerciseDetails({ id: propId }: ExerciseDetailsProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const { profile } = useUserProfile();
  const id = propId || routeId;
  const { t } = useTranslation();
  const { goBack } = useSafeNavigate();
  const confirm = useConfirm();
  const { bodyWeightUnit } = useUnitPreferences();

  const { allExercises, updateExercise, archiveExercise, unarchiveExercise, deleteExercise } = useExercises();
  const { allRoutines } = useRoutines();
  const { getEquipmentDisplayName } = useEquipments();

  const exercise = useMemo(() => {
    return allExercises.find((e) => e.id === id);
  }, [allExercises, id]);

  // 取得包含此動作的訓練組合
  const relatedRoutines = useMemo(() => {
    if (!id) return [];
    return allRoutines.filter((r) => r.exercises.some((item) => item.exerciseId === id));
  }, [allRoutines, id]);

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

  // 取得包含此動作的所有歷史日誌
  const workoutLogs = useMemo(() => {
    if (!id || !exercise || !allWorkoutLogs) return [];
    return allWorkoutLogs.filter((log) =>
      log.exercises.some(
        (ex) =>
          ex.exerciseId === id ||
          (typeof (ex as any).exerciseName === 'string' &&
            (ex as any).exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase())
      )
    );
  }, [allWorkoutLogs, id, exercise]);

  // 刪除防護契約：有歷史記錄或被組合引用時不可刪除
  const hasWorkoutLogs = workoutLogs.length > 0;
  const hasRoutines = (relatedRoutines?.length ?? 0) > 0;
  const hasUsage = hasWorkoutLogs || hasRoutines;

  // 概覽週期與矩陣容器寬度狀態
  const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>('30d');
  const [matrixContainerWidth, setMatrixContainerWidth] = useState<number>(
    getInitialMatrixContainerWidth
  );

  // 提取動作在各日誌中的已記錄組數與數據
  const exerciseDayLogs = useMemo(() => {
    if (!workoutLogs || !exercise) return [];
    return workoutLogs.map((log) => {
      const targetGroup = log.exercises.filter(
        (ex) =>
          ex.exerciseId === id ||
          (typeof (ex as any).exerciseName === 'string' &&
            (ex as any).exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase())
      );
      const allSets = targetGroup.flatMap((g) => g.sets || []);
      return {
        date: log.date,
        sets: allSets,
      };
    });
  }, [workoutLogs, exercise, id]);

  const totalWeeks = useMemo(() => {
    return calculateTotalWeeks({
      logs: exerciseDayLogs,
      matrixContainerWidth,
    });
  }, [exerciseDayLogs, matrixContainerWidth]);

  const {
    heatmapDays,
    periodBestE1RM,
    periodSets,
    periodVolume,
  } = useMemo(() => {
    return calculateExerciseFootprintData({
      logs: exerciseDayLogs,
      overviewPeriod,
      totalWeeks,
    });
  }, [exerciseDayLogs, overviewPeriod, totalWeeks]);

  // 編輯動作彈窗狀態
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEditSubmit = async (formData: ExerciseFormData) => {
    if (!exercise) return;

    await updateExercise(exercise.id, {
      name: formData.name,
      equipment: formData.equipment,
      targetMuscles: formData.targetMuscles,
      notes: formData.notes,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditOpen(false);
  };

  const handleToggleArchive = async () => {
    if (!exercise) return;
    if (exercise.isArchived) {
      const ok = await confirm({
        title: t('common.restore'),
        description: t('common.confirmRestoreItem', { name: exercise.name }),
      });
      if (ok) {
        await unarchiveExercise(exercise.id);
        triggerHaptic('success');
        toast.show(t('common.saved'));
      }
    } else {
      const ok = await confirm({
        title: t('common.archive'),
        description: t('common.confirmArchiveItem', { name: exercise.name }),
      });
      if (ok) {
        await archiveExercise(exercise.id);
        triggerHaptic('selection');
        toast.show(t('common.saved'));
        goBack();
      }
    }
  };

  const handleDelete = async () => {
    if (!exercise || hasUsage) return;
    const ok = await confirm({
      title: t('common.delete'),
      description: t('common.confirmDeleteItem', { name: exercise.name }),
      variant: 'destructive',
    });
    if (ok) {
      const res = await deleteExercise(exercise.id);
      if (!res.success) {
        if (res.reason === 'has_logs') {
          toast.show(t('workout.exerciseHasLogs'));
        } else if (res.reason === 'has_routines') {
          toast.show(t('workout.exerciseHasRoutines'));
        }
        return;
      }
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

  if (!exercise) {
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
                "size-8 text-muted-foreground transition-colors",
                hasUsage
                  ? "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                  : "hover:text-destructive hover:bg-destructive-subtle cursor-pointer"
              )}
              title={
                hasWorkoutLogs
                  ? t('workout.exerciseHasLogs')
                  : hasRoutines
                  ? t('workout.exerciseHasRoutines')
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
              title={exercise.isArchived ? t('common.restore') : t('common.archive')}
              aria-label={exercise.isArchived ? t('common.restore') : t('common.archive')}
            >
              {exercise.isArchived ? (
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

      {/* 核心一體化主卡片 (單一真理源，與落地頁 100% 共同複用) */}
      <ExerciseOverviewCard
        exerciseName={getLocalizedExerciseName(exercise)}
        equipmentName={getEquipmentDisplayName(exercise.equipment, t)}
        isArchived={exercise.isArchived}
        bestE1RM={periodBestE1RM}
        totalSets={periodSets}
        totalVolume={periodVolume}
        bodyWeightUnit={bodyWeightUnit}
        heatmapDays={heatmapDays}
        totalWeeks={totalWeeks}
        overviewPeriod={overviewPeriod}
        onPeriodChange={setOverviewPeriod}
        onContainerWidthChange={setMatrixContainerWidth}
        interactive={true}
      />

      {/* 目標細分肌群機能學分析畫布 */}
      <TargetMusclesCard
        gender={profile.gender}
        muscles={exercise.targetMuscles ?? {}}
      />

      {/* 包含此動作的訓練組合 */}
      <div className="space-y-1.5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 font-mono">
          {t('workout.relatedRoutines')}
        </div>
        <div className="border border-border rounded-lg bg-card divide-y divide-border overflow-hidden">
          {relatedRoutines.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-muted-foreground">
              {t('workout.noRelatedRoutines')}
            </div>
          ) : (
            relatedRoutines.map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  useInAppNavigation.getState().pushSubView({
                    type: 'exercises',
                    id: routine.id,
                    mode: 'routines',
                  });
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-hover transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {routine.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground group-hover:text-foreground">
                  <span>{t('workout.exerciseCount', { count: routine.exercises.length })}</span>
                  <ChevronRight className="size-4 opacity-50 group-hover:opacity-100" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 編輯動作彈窗 (複用標準 ExerciseFormDialog) */}
      <ExerciseFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={exercise}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
