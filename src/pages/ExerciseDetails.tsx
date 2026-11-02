import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { calculateE1RM } from '@/utils/workoutMath';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { DetailedMuscle, MuscleRole } from '@/types';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { convertBodyWeight } from '@/utils/unitMath';
import { BodyHighlighter } from '@/components/workout/BodyHighlighter';
import {
  getMuscleRoleBadgeClasses,
  getMuscleRoleLabel,
  normalizeMuscleRole,
} from '@/utils/muscleIntensity';
import { cn } from '@/lib/utils';
import {
  ExerciseFormDialog,
  type ExerciseFormData,
} from '@/components/workout/ExerciseFormDialog';

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
      // 篩選出包含此動作的日誌
      return logs.filter((log) =>
        log.exercises.some(
          (ex) =>
            ex.exerciseId === id ||
            ex.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
        )
      );
    },
    [id, exercise?.name]
  );

  // 計算客觀指標：歷史最佳 e1RM、累計完成組數、累計容量
  const stats = useMemo(() => {
    if (!workoutLogs || workoutLogs.length === 0 || !exercise) {
      return { bestE1RM: 0, totalVolume: 0, totalCompletedSets: 0 };
    }

    let bestE1RM = 0;
    let totalVolume = 0;
    let totalCompletedSets = 0;

    for (const log of workoutLogs) {
      const targetGroup = log.exercises.filter(
        (ex) =>
          ex.exerciseId === id ||
          ex.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
      );
      for (const group of targetGroup) {
        for (const set of group.sets) {
          if (set.isCompleted) {
            totalCompletedSets += 1;
            const w = set.weight || 0;
            const r = set.reps || 0;
            totalVolume += w * r;

            const e1rm = calculateE1RM(w, r);
            if (e1rm > bestE1RM) {
              bestE1RM = e1rm;
            }
          }
        }
      }
    }

    return {
      bestE1RM,
      totalVolume: Math.round(totalVolume * 10) / 10,
      totalCompletedSets,
    };
  }, [workoutLogs, exercise, id]);

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
    () => muscleEntries.filter(([, rawRole]) => normalizeMuscleRole(rawRole) === 'primary'),
    [muscleEntries]
  );

  const supportEntries = useMemo(
    () => muscleEntries.filter(([, rawRole]) => normalizeMuscleRole(rawRole) !== 'primary'),
    [muscleEntries]
  );

  // 編輯動作彈窗狀態
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleOpenEdit = () => {
    if (!exercise) return;
    setIsEditOpen(true);
  };

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
      await unarchiveExercise(exercise.id);
      triggerHaptic('success');
      toast.show(t('common.saved'));
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
    if (!exercise) return;
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

  if (!exercise) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center text-sm font-mono text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-20">
      {/* 動作頂部標題卡片 */}
      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {exercise.name}
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <EquipmentBadge name={getEquipmentDisplayName(exercise.equipment, t)} />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEdit}
            className="h-8 text-xs font-mono px-2.5 cursor-pointer"
          >
            <Edit2 className="size-3.5 mr-1" />
            {t('common.edit')}
          </Button>
        </div>

        {exercise.notes && (
          <p className="text-xs font-mono text-muted-foreground bg-muted/30 p-2 rounded">
            {exercise.notes}
          </p>
        )}
      </div>

      {/* 目標細分肌群機能學分析畫布 (打破盒中盒，一體化舒展) */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2 font-mono">
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

      {/* 客觀指標三並列卡片 (Grid Cards, 無陰影, 等寬數字) */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2 font-mono">
          {t('workout.objectiveMetrics', '客觀指標')}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-border rounded-lg p-3 bg-card text-center space-y-1">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">
              {t('workout.bestE1RM')}
            </div>
            <div className="text-lg font-mono font-bold text-foreground">
              {convertBodyWeight(stats.bestE1RM, 'kg', bodyWeightUnit, 1)}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">{bodyWeightUnit}</span>
            </div>
          </div>

          <div className="border border-border rounded-lg p-3 bg-card text-center space-y-1">
            <div className="text-[10px] uppercase font-mono text-muted-foreground truncate">
              {t('workout.totalLifetimeVolume')}
            </div>
            <div className="text-lg font-mono font-bold text-foreground truncate">
              {convertBodyWeight(stats.totalVolume, 'kg', bodyWeightUnit, 1)}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">{bodyWeightUnit}</span>
            </div>
          </div>

          <div className="border border-border rounded-lg p-3 bg-card text-center space-y-1">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">
              {t('workout.totalCompletedSets')}
            </div>
            <div className="text-lg font-mono font-bold text-foreground">
              {stats.totalCompletedSets}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">{t('workout.set', '組')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 包含此動作的訓練組合 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2 font-mono">
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
                className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors group cursor-pointer"
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

      {/* 操作區塊 */}
      <div className="pt-2 space-y-2">
        <Button
          variant="outline"
          onClick={handleToggleArchive}
          className="w-full text-xs font-mono h-10 border-border hover:bg-muted/40 cursor-pointer"
        >
          {exercise.isArchived ? (
            <>
              <RefreshCcw className="size-3.5 mr-1.5" />
              {t('common.unarchive')}
            </>
          ) : (
            <>
              <Archive className="size-3.5 mr-1.5" />
              {t('common.archive')}
            </>
          )}
        </Button>

        <Button
          variant="destructive"
          onClick={handleDelete}
          className="w-full text-xs font-mono h-10 bg-destructive text-destructive-foreground hover:opacity-90 cursor-pointer"
        >
          <Trash2 className="size-3.5 mr-1.5" />
          {t('common.delete')}
        </Button>
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
