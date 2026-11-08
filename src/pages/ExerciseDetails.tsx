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
  Layers,
  ChevronRight,
} from 'lucide-react';
import { db } from '@/services/db/db';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { DetailedMuscle, MuscleRole } from '@/types';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { convertBodyWeight } from '@/utils/unitMath';
import { BodyHighlighter } from '@/components/workout/BodyHighlighter';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import {
  getMuscleRoleBadgeClasses,
  getMuscleRoleLabel,
  normalizeMuscleRole,
  sortMuscleEntries,
} from '@/utils/muscleIntensity';
import { cn } from '@/lib/utils';
import {
  ExerciseFormDialog,
  type ExerciseFormData,
} from '@/components/workout/ExerciseFormDialog';
import {
  type OverviewPeriod,
  calculateTotalWeeks,
  calculateExerciseFootprintData,
} from '@/utils/heatmapMath';
import {
  OverviewPeriodSelector,
  IntakeFootprintHeatmap,
} from '@/components/food/IntakeFootprintHeatmap';

export default function ExerciseDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  // 取得包含此動作的所有歷史日誌
  const workoutLogs = useLiveQuery(
    async () => {
      if (!id || !exercise) return [];
      const logs = await db.workout_logs.toArray();
      // 篩選出包含此動作的日誌（優先依據 exerciseId 純 ID 關聯，向下相容歷史快照）
      return logs.filter((log) =>
        log.exercises.some(
          (ex) =>
            ex.exerciseId === id ||
            (typeof (ex as any).exerciseName === 'string' &&
              (ex as any).exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase())
        )
      );
    },
    [id, exercise?.name]
  );

  // 刪除防護契約：有歷史記錄或被組合引用時不可刪除
  const hasWorkoutLogs = (workoutLogs?.length ?? 0) > 0;
  const hasRoutines = (relatedRoutines?.length ?? 0) > 0;
  const hasUsage = hasWorkoutLogs || hasRoutines;

  // 概覽週期與矩陣容器寬度狀態
  const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>('30d');
  const [matrixContainerWidth, setMatrixContainerWidth] = useState<number>(0);

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

  // 當前選中的肌群 (地圖點擊反饋與雙向聯動)
  const [selectedMuscle, setSelectedMuscle] = useState<DetailedMuscle | null>(null);

  const handleMuscleClick = (muscle: DetailedMuscle) => {
    triggerHaptic('selection');
    setSelectedMuscle((prev) => (prev === muscle ? null : muscle));
  };

  // 目標細分肌群機能學分組 (必須嚴格位於所有條件 return 之前，遵守 React Rules of Hooks)
  const muscleEntries = useMemo(() => {
    if (!exercise?.targetMuscles) return [];
    return Object.entries(exercise.targetMuscles) as [DetailedMuscle, MuscleRole | number][];
  }, [exercise]);

  const primaryEntries = useMemo(
    () => sortMuscleEntries(muscleEntries.filter(([, rawRole]) => normalizeMuscleRole(rawRole) === 'primary')),
    [muscleEntries]
  );

  const supportEntries = useMemo(
    () => sortMuscleEntries(muscleEntries.filter(([, rawRole]) => normalizeMuscleRole(rawRole) !== 'primary')),
    [muscleEntries]
  );

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
        navigate('/settings/exercises');
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
      navigate('/settings/exercises');
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

      {/* 核心一體化主卡片 (與食材詳情頁 1:1 一體化設計) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-none">
        {/* 大氣品名帶與特質微徽章 */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-card">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words min-w-0">
                {exercise.name}
              </h1>
              {exercise.isArchived && (
                <span className="text-[10px] font-mono text-destructive border border-destructive/30 px-1.5 py-0.5 rounded">
                  {t('common.archived')}
                </span>
              )}
            </div>
            {exercise.notes && (
              <p className="text-xs font-mono text-muted-foreground">
                {exercise.notes}
              </p>
            )}
          </div>
          <div className="flex items-center shrink-0">
            <EquipmentBadge
              name={getEquipmentDisplayName(exercise.equipment, t)}
              className="text-[11px] px-2 py-0.5 font-normal"
            />
          </div>
        </div>

        {/* 第 3 層：客觀指標三欄分割卡片 (支援 1w/30d/3m/6m/1y 切換) */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-card">
          {/* 1. 最佳 e1RM */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('workout.bestE1RM')}
              </span>
              <OverviewPeriodSelector
                value={overviewPeriod}
                onChange={setOverviewPeriod}
              />
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {convertBodyWeight(periodBestE1RM, 'kg', bodyWeightUnit, 1)}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {bodyWeightUnit}
              </span>
            </div>
          </div>

          {/* 2. 累計組數 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('workout.totalCompletedSets')}
              </span>
              <OverviewPeriodSelector
                value={overviewPeriod}
                onChange={setOverviewPeriod}
              />
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {periodSets.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {t('workout.set', '組')}
              </span>
            </div>
          </div>

          {/* 3. 累計容量 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('workout.totalLifetimeVolume')}
              </span>
              <OverviewPeriodSelector
                value={overviewPeriod}
                onChange={setOverviewPeriod}
              />
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {convertBodyWeight(periodVolume, 'kg', bodyWeightUnit, 1)}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {bodyWeightUnit}
              </span>
            </div>
          </div>
        </div>

        {/* 第 4 層：微型訓練足跡熱點矩陣 (可左右滾動查看更早歷史，預設對齊今天) */}
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
              <span className={day.count === 0 ? "text-muted-foreground" : "text-foreground"}>
                {day.count} {t('workout.set', '組')}
              </span>
              <span className="text-border mx-1.5 select-none">·</span>
              <span className={day.count === 0 ? "text-muted-foreground" : "text-foreground"}>
                {convertBodyWeight(day.grams, 'kg', bodyWeightUnit, 1)} {bodyWeightUnit}
              </span>
            </div>
          )}
        />
      </div>

      {/* 目標細分肌群機能學分析畫布 (保留現有肌肉刺激區塊) */}
      <div className="space-y-1.5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 font-mono">
          {t('workout.targetMuscles')}
        </div>
        <div className="border border-border rounded-lg bg-card p-4 space-y-5">
          {/* 一體化人體解剖地圖 (無盒中盒多餘灰底邊框，直接舒展於主卡片內) */}
          <div className="flex justify-center py-1">
            <BodyHighlighter
              muscles={exercise.targetMuscles}
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
              <Link
                key={routine.id}
                to={`/settings/routines/${routine.id}`}
                className="p-3.5 flex items-center justify-between hover:bg-hover transition-colors group cursor-pointer"
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
              </Link>
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
