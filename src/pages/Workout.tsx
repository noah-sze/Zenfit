import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useBodyRecovery } from '@/hooks/useBodyRecovery';
import { useExercises } from '@/hooks/useExercises';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { kgToLbs, lbsToKg } from '@/utils/unitMath';
import { findLastExerciseSet } from '@/utils/workoutMath';
import { db } from '@/services/db/db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Dumbbell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkoutRecoveryDashboard } from '@/components/workout/WorkoutRecoveryDashboard';
import { ExerciseSelectDialog } from '@/components/workout/ExerciseSelectDialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import type { WorkoutLog, WorkoutSet, WorkoutExerciseGroup, WorkoutRoutine, Exercise } from '@/types';

interface KeypadConfig {
  workoutId: string;
  exerciseIndex: number;
  setIndex: number;
  field: 'weight' | 'reps';
  title: string;
  value: number;
  unit: string;
  allowDecimals: boolean;
  anchorEl?: HTMLElement | null;
}

export default function Workout() {
  const { t } = useTranslation();
  const { selectedDate } = useAppStore();
  const { bodyWeightUnit } = useUnitPreferences();
  const confirm = useConfirm();

  const { workouts, addWorkout, updateWorkout, deleteWorkout } = useWorkoutLogs(selectedDate);
  const { recoverySummary } = useBodyRecovery(selectedDate);
  const { allExercises } = useExercises();

  // 動作快取 Map
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((ex) => map.set(ex.id, ex));
    return map;
  }, [allExercises]);

  // 彈窗狀態
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [activeWorkoutIdForAdd, setActiveWorkoutIdForAdd] = useState<string | null>(null);

  // 統計當前訓練記錄中已存在的動作與組合 (不可重複選取)
  const disabledExerciseIds = useMemo(() => {
    const set = new Set<string>();
    workouts.forEach((w) => {
      w.exercises?.forEach((ex) => {
        if (ex.exerciseId) set.add(ex.exerciseId);
      });
    });
    return set;
  }, [workouts]);

  const disabledRoutineIds = useMemo(() => {
    const set = new Set<string>();
    workouts.forEach((w) => {
      if (w.routineId) set.add(w.routineId);
    });
    return set;
  }, [workouts]);

  const disabledIds = useMemo(() => {
    const ids: string[] = [];
    workouts.forEach((w) => {
      if (w.routineId) ids.push(w.routineId);
      w.exercises?.forEach((ex) => {
        if (ex.exerciseId) ids.push(ex.exerciseId);
      });
    });
    return ids;
  }, [workouts]);

  const isItemDisabled = useCallback(
    (item: Exercise | WorkoutRoutine, type: 'exercise' | 'routine') => {
      if (type === 'exercise') {
        const ex = item as Exercise;
        return (
          disabledExerciseIds.has(ex.id) ||
          workouts.some((w) =>
            w.exercises?.some(
              (e) => e.exerciseId === ex.id || e.exerciseName === ex.name
            )
          )
        );
      }
      if (type === 'routine') {
        const r = item as WorkoutRoutine;
        return (
          disabledRoutineIds.has(r.id) ||
          workouts.some((w) => w.routineId === r.id || w.title === r.name)
        );
      }
      return false;
    },
    [disabledExerciseIds, disabledRoutineIds, workouts]
  );

  // 數字鍵盤狀態
  const [keypadConfig, setKeypadConfig] = useState<KeypadConfig | null>(null);

  // 當日客觀統計匯總 (動作數、組數、容量)
  const stats = useMemo(() => {
    let exerciseCount = 0;
    let setCount = 0;
    let totalVolumeKg = 0;

    for (const w of workouts) {
      exerciseCount += (w.exercises || []).length;
      for (const ex of w.exercises || []) {
        for (const s of ex.sets || []) {
          setCount += 1;
          const weight = s.weight || 0;
          const reps = s.reps || 0;
          totalVolumeKg += weight * reps;
        }
      }
    }

    const displayVolume =
      bodyWeightUnit === 'lbs' ? kgToLbs(totalVolumeKg, 0) : totalVolumeKg;

    return {
      exerciseCount,
      setCount,
      totalVolume: displayVolume,
    };
  }, [workouts, bodyWeightUnit]);

  // ==========================================
  // 套用訓練組合
  // ==========================================
  const handleSelectRoutine = async (routine: WorkoutRoutine) => {
    try {
      const allLogs = await db.workout_logs.toArray();
      const exerciseGroups = routine.exercises.map((item) => {
        const ex = exerciseMap.get(item.exerciseId);
        const lastSet = findLastExerciseSet(allLogs, item.exerciseId, ex?.name);
        const defaultWeight = lastSet ? lastSet.weight : 20;
        const defaultReps = lastSet ? lastSet.reps : 10;
        const count = item.defaultSets || 3;
        const sets: WorkoutSet[] = Array.from({ length: count }, (_, i) => ({
          id: uuidv4(),
          setNumber: i + 1,
          weight: defaultWeight,
          reps: defaultReps,
          isCompleted: true,
        }));

        return {
          exerciseId: item.exerciseId,
          exerciseName: ex ? ex.name : t('workout.unknownExercise'),
          category: ex ? ex.category : 'free_weight',
          sets,
          notes: item.notes,
        };
      });

      await addWorkout({
        date: selectedDate,
        title: routine.name,
        routineId: routine.id,
        exercises: exerciseGroups,
        notes: routine.notes,
      });

      triggerHaptic('success');
      toast.show(t('workout.routineApplied'));
    } catch {
      toast.show(t('common.error'));
    }
  };

  // ==========================================
  // 新增空白訓練或為指定訓練新增動作
  // ==========================================
  const handleOpenAddExercise = (workoutId?: string) => {
    triggerHaptic('selection');
    if (workoutId) {
      setActiveWorkoutIdForAdd(workoutId);
    } else {
      setActiveWorkoutIdForAdd(null);
    }
    setIsExercisePickerOpen(true);
  };

  const handleSelectExercise = async (exercise: Exercise) => {
    try {
      const allLogs = await db.workout_logs.toArray();
      const lastSet = findLastExerciseSet(allLogs, exercise.id, exercise.name);
      const defaultWeight = lastSet ? lastSet.weight : 20;
      const defaultReps = lastSet ? lastSet.reps : 10;

      const newGroup = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category,
        sets: [
          { id: uuidv4(), setNumber: 1, weight: defaultWeight, reps: defaultReps, isCompleted: true },
          { id: uuidv4(), setNumber: 2, weight: defaultWeight, reps: defaultReps, isCompleted: true },
          { id: uuidv4(), setNumber: 3, weight: defaultWeight, reps: defaultReps, isCompleted: true },
        ],
      };

      const targetId = activeWorkoutIdForAdd;

      // 若未指定目標訓練，建立一筆新訓練 (以 exercise.name 作為初始 title)
      if (!targetId) {
        await addWorkout({
          date: selectedDate,
          title: exercise.name,
          exercises: [newGroup],
        });
        triggerHaptic('success');
        setIsExercisePickerOpen(false);
        return;
      }

      const targetWorkout = workouts.find((w) => w.id === targetId);
      const currentExercises = targetWorkout ? [...targetWorkout.exercises] : [];

      await updateWorkout(targetId, {
        exercises: [...currentExercises, newGroup],
      });

      triggerHaptic('success');
      setIsExercisePickerOpen(false);
    } catch {
      toast.show(t('common.error'));
    }
  };

  const handleItemSelect = async (
    item: Exercise | WorkoutRoutine,
    type: 'exercise' | 'routine'
  ) => {
    if (type === 'routine') {
      await handleSelectRoutine(item as WorkoutRoutine);
      setIsExercisePickerOpen(false);
    } else {
      await handleSelectExercise(item as Exercise);
    }
  };

  // ==========================================
  // 增加一組 / 刪除組數
  // ==========================================
  const handleAddSet = async (workout: WorkoutLog, exerciseIndex: number) => {
    const exGroup = workout.exercises[exerciseIndex];
    if (!exGroup) return;

    const prevSet = exGroup.sets[exGroup.sets.length - 1];
    const newSet: WorkoutSet = {
      id: uuidv4(),
      setNumber: exGroup.sets.length + 1,
      weight: prevSet ? prevSet.weight : 20,
      reps: prevSet ? prevSet.reps : 10,
      isCompleted: true,
    };

    const nextExercises = [...workout.exercises];
    nextExercises[exerciseIndex] = {
      ...exGroup,
      sets: [...exGroup.sets, newSet],
    };

    triggerHaptic('selection');
    await updateWorkout(workout.id, { exercises: nextExercises });
  };

  const handleDeleteSet = async (
    workout: WorkoutLog,
    exerciseIndex: number,
    setIndex: number
  ) => {
    const exGroup = workout.exercises[exerciseIndex];
    if (!exGroup) return;

    // 若該動作只剩 1 組，刪除整個動作
    if (exGroup.sets.length <= 1) {
      await handleDeleteExercise(workout, exerciseIndex);
      return;
    }

    const nextSets = exGroup.sets
      .filter((_, i) => i !== setIndex)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    const nextExercises = [...workout.exercises];
    nextExercises[exerciseIndex] = {
      ...exGroup,
      sets: nextSets,
    };

    triggerHaptic('warning');
    await updateWorkout(workout.id, { exercises: nextExercises });
  };

  const handleDeleteExercise = async (workout: WorkoutLog, exerciseIndex: number) => {
    const exGroup = workout.exercises[exerciseIndex];
    if (!exGroup) return;

    const ok = await confirm({
      title: t('common.delete'),
      description: t('common.confirmDeleteItem', { name: exGroup.exerciseName }),
      variant: 'destructive',
    });
    if (!ok) return;

    // 若該動作為該訓練中最後一項，直接刪除整筆訓練
    if (workout.exercises.length <= 1) {
      triggerHaptic('warning');
      await deleteWorkout(workout.id);
      toast.show(t('common.deleted'));
      return;
    }

    const nextExercises = workout.exercises.filter((_, i) => i !== exerciseIndex);
    triggerHaptic('warning');
    await updateWorkout(workout.id, { exercises: nextExercises });
    toast.show(t('common.deleted'));
  };

  const handleDeleteWorkout = async (workout: WorkoutLog) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: t('common.confirmDeleteItem', { name: workout.title }),
      variant: 'destructive',
    });
    if (!ok) return;

    triggerHaptic('warning');
    await deleteWorkout(workout.id);
    toast.show(t('common.deleted'));
  };

  // ==========================================
  // 數字微調鍵盤互動
  // ==========================================
  const handleOpenKeypad = (
    workoutId: string,
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    currentVal: number,
    exName: string,
    anchorEl?: HTMLElement
  ) => {
    triggerHaptic('light');
    const displayVal =
      field === 'weight' && bodyWeightUnit === 'lbs'
        ? kgToLbs(currentVal, 1)
        : currentVal;

    setKeypadConfig({
      workoutId,
      exerciseIndex,
      setIndex,
      field,
      title: `${exName} · ${t('workout.set')} ${setIndex + 1}`,
      value: displayVal,
      unit: field === 'weight' ? bodyWeightUnit : t('common.times', '次'),
      allowDecimals: field === 'weight',
      anchorEl,
    });
  };

  const handleKeypadConfirm = async (val: number) => {
    if (!keypadConfig) return;
    const { workoutId, exerciseIndex, setIndex, field } = keypadConfig;

    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout) return;

    const targetEx = targetWorkout.exercises[exerciseIndex];
    if (!targetEx) return;

    const targetSet = targetEx.sets[setIndex];
    if (!targetSet) return;

    let finalValue = val;
    if (field === 'weight' && bodyWeightUnit === 'lbs') {
      finalValue = lbsToKg(val, 2);
    }

    const nextSets = [...targetEx.sets];
    nextSets[setIndex] = {
      ...targetSet,
      [field]: finalValue,
    };

    const nextExercises = [...targetWorkout.exercises];
    nextExercises[exerciseIndex] = {
      ...targetEx,
      sets: nextSets,
    };

    await updateWorkout(workoutId, { exercises: nextExercises });
    setKeypadConfig(null);
  };

  // ==========================================
  // 共用動作表渲染函數 (單一真理源，設計 100% 保持一致)
  // ==========================================
  const renderExerciseTable = (
    workout: WorkoutLog,
    group: WorkoutExerciseGroup,
    exIdx: number
  ) => {
    const groupVolumeKg = group.sets.reduce(
      (sum, s) => sum + (s.weight || 0) * (s.reps || 0),
      0
    );
    const displayGroupVolume =
      bodyWeightUnit === 'lbs'
        ? kgToLbs(groupVolumeKg, 0)
        : groupVolumeKg;

    return (
      <div
        key={`${workout.id}-${group.exerciseId}-${exIdx}`}
        className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden"
      >
        {/* 灰底表頭橫欄 (單行 40px 高度：動作名稱 · 組數 · 容量) */}
        <div className="h-10 px-3.5 sm:px-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3 text-xs font-mono text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {group.exerciseId ? (
              <Link
                to={`/settings/exercises/${group.exerciseId}`}
                className="font-semibold text-sm tracking-tight text-foreground truncate px-1.5 py-0.5 -mx-1.5 rounded-full border border-transparent hover:border-border/80 hover:bg-muted/80 transition-all cursor-pointer select-none shrink-0"
              >{group.exerciseName}</Link>
            ) : (
              <span className="font-semibold text-sm tracking-tight text-foreground truncate shrink-0">{group.exerciseName}</span>
            )}
            <span className="text-border select-none shrink-0">·</span>
            <span className="shrink-0">
              {group.sets.length} {t('workout.set', '組')}
            </span>
            {displayGroupVolume > 0 && (
              <>
                <span className="text-border select-none shrink-0">·</span>
                <span className="text-muted-foreground shrink-0 truncate">
                  {Math.round(displayGroupVolume).toLocaleString()} {bodyWeightUnit}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleDeleteExercise(workout, exIdx)}
              className="size-7 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title={t('common.delete', '刪除')}
              aria-label={t('common.delete', '刪除')}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* 每組數值微調列表 (點擊膠囊即刻呼出數字鍵盤) */}
        <div className="divide-y divide-border/40 bg-muted/10">
          {group.sets.map((set, setIdx) => {
            const displayWeight =
              bodyWeightUnit === 'lbs'
                ? kgToLbs(set.weight || 0, 1)
                : set.weight || 0;

            return (
              <div
                key={set.id || setIdx}
                className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3 text-xs font-mono"
              >
                <span className="text-muted-foreground text-xs w-14 shrink-0">
                  {t('workout.set')} {setIdx + 1}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {/* 重量膠囊 */}
                  <button
                    type="button"
                    onClick={(e) =>
                      handleOpenKeypad(
                        workout.id,
                        exIdx,
                        setIdx,
                        'weight',
                        set.weight || 0,
                        group.exerciseName,
                        e.currentTarget
                      )
                    }
                    className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95 select-none"
                  >
                    <span className="font-bold text-foreground">
                      {displayWeight}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {bodyWeightUnit}
                    </span>
                    <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                  </button>

                  <span className="text-muted-foreground text-xs select-none">
                    ×
                  </span>

                  {/* 次數膠囊 */}
                  <button
                    type="button"
                    onClick={(e) =>
                      handleOpenKeypad(
                        workout.id,
                        exIdx,
                        setIdx,
                        'reps',
                        set.reps || 0,
                        group.exerciseName,
                        e.currentTarget
                      )
                    }
                    className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95 select-none"
                  >
                    <span className="font-bold text-foreground">
                      {set.reps || 0}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {t('common.times', '次')}
                    </span>
                    <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                  </button>

                  {/* 刪除組 */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSet(workout, exIdx, setIdx)}
                    className="size-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors cursor-pointer ml-1"
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* 動作底部快速增加一組按鈕 */}
          <div className="py-1.5 px-3.5 sm:px-4 flex justify-center bg-card/60">
            <button
              type="button"
              onClick={() => handleAddSet(workout, exIdx)}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer select-none py-0.5"
            >
              <Plus className="size-3" />
              <span>{t('workout.addSet', '增加一組')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* 頂部客觀看板：人體肌群恢復熱圖 + 3 欄客觀指標 (全面對標飲食頁面的熱量大卡片) */}
      <WorkoutRecoveryDashboard
        recoverySummary={recoverySummary}
        exerciseCount={stats.exerciseCount}
        setCount={stats.setCount}
        totalVolume={stats.totalVolume}
        weightUnit={bodyWeightUnit}
      />

      {/* 頂部快捷操作列 (對齊飲食頁面極簡風格) */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-semibold tracking-tight font-mono">
          {t('workout.recentLogs', '訓練記錄')}
        </h2>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenAddExercise()}
            className="text-xs h-8 px-3 rounded-full bg-foreground text-background font-mono cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="size-3.5 mr-1" />
            <span>{t('workout.addExercise', '新增動作')}</span>
          </Button>
        </div>
      </div>

      {/* 訓練記錄列表：支援組合動作收納大卡片與單一動作獨立展示 */}
      {workouts.some((w) => w.exercises && w.exercises.length > 0) ? (
        workouts
          .filter((w) => w.exercises && w.exercises.length > 0)
          .map((workout) => {
            const isRoutine =
              Boolean(workout.routineId) || workout.exercises.length > 1;

            if (isRoutine) {
              const workoutTotalSets = workout.exercises.reduce(
                (sum, ex) => sum + ex.sets.length,
                0
              );
              const workoutVolumeKg = workout.exercises.reduce(
                (sum, ex) =>
                  sum +
                  ex.sets.reduce((sSum, s) => sSum + (s.weight || 0) * (s.reps || 0), 0),
                0
              );
              const displayWorkoutVolume =
                bodyWeightUnit === 'lbs'
                  ? kgToLbs(workoutVolumeKg, 0)
                  : workoutVolumeKg;

              return (
                <div
                  key={workout.id}
                  className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden"
                >
                  {/* 組合專屬大卡片表頭 (40px 高度) */}
                  <div className="h-10 px-3.5 sm:px-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3 text-xs font-mono text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {workout.routineId ? (
                        <Link
                          to={`/settings/routines/${workout.routineId}`}
                          className="font-semibold text-sm tracking-tight text-foreground truncate px-1.5 py-0.5 -mx-1.5 rounded-full border border-transparent hover:border-border/80 hover:bg-muted/80 transition-all cursor-pointer select-none shrink-0"
                        >{workout.title}</Link>
                      ) : (
                        <span className="font-semibold text-sm tracking-tight text-foreground truncate shrink-0">{workout.title}</span>
                      )}
                      <span className="text-border select-none shrink-0">·</span>
                      <span className="truncate">
                        {workout.exercises.length} {t('common.items', '項')}
                      </span>
                      <span className="text-border select-none shrink-0">·</span>
                      <span className="shrink-0">
                        {workoutTotalSets} {t('workout.set', '組')}
                      </span>
                      {displayWorkoutVolume > 0 && (
                        <>
                          <span className="text-border select-none shrink-0">·</span>
                          <span className="text-muted-foreground shrink-0 truncate">
                            {Math.round(displayWorkoutVolume).toLocaleString()} {bodyWeightUnit}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenAddExercise(workout.id)}
                        className="size-7 flex items-center justify-center rounded-full hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                        title={t('workout.addExercise', '新增動作')}
                        aria-label={t('workout.addExercise', '新增動作')}
                      >
                        <Plus className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteWorkout(workout)}
                        className="size-7 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title={t('common.delete', '刪除')}
                        aria-label={t('common.delete', '刪除')}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 較大卡片內部容器：收納組合內的所有動作表 */}
                  <div className="p-3 sm:p-4 space-y-3 bg-muted/10">
                    {workout.exercises.map((group, exIdx) =>
                      renderExerciseTable(workout, group, exIdx)
                    )}
                  </div>
                </div>
              );
            }

            // 單一自選動作：直接調用 renderExerciseTable 呈現，不包裹外層多餘的組合大卡片
            return renderExerciseTable(workout, workout.exercises[0], 0);
          })
      ) : (
        /* 當日無訓練記錄時的客觀極簡空狀態 (對標客觀測量儀哲學) */
        <div className="border border-border bg-card text-card-foreground shadow-none rounded-lg p-8 text-center space-y-4">
          <div className="size-10 rounded-full border border-border bg-muted/40 mx-auto flex items-center justify-center text-muted-foreground">
            <Dumbbell className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium font-mono text-foreground">
              {t('workout.noWorkoutLogs', '無訓練記錄')}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {t('workout.selectDateHint', '可套用現有組合或直接新增動作進行練後記錄')}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => handleOpenAddExercise()}
              className="text-xs h-8 px-3 rounded-full bg-foreground text-background font-mono cursor-pointer"
            >
              <Plus className="size-3.5 mr-1" />
              <span>{t('workout.addExercise', '新增動作')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 次級彈窗區域：平鋪兄弟節點 (Flat Sibling Portals, Instant Pop) */}
      {/* ========================================================================= */}

      {/* 1. 動作/組合挑選器 */}
      <ExerciseSelectDialog
        open={isExercisePickerOpen}
        onOpenChange={setIsExercisePickerOpen}
        mode={activeWorkoutIdForAdd ? 'exercises' : 'all'}
        disabledIds={disabledIds}
        isItemDisabled={isItemDisabled}
        onSelect={handleItemSelect}
        zIndex={70}
      />

      {/* 2. 數字鍵盤微調彈窗 (微調組數重量與次數) */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={!!keypadConfig}
          onOpenChange={(kOpen) => {
            if (!kOpen) setKeypadConfig(null);
          }}
          title={keypadConfig.title}
          value={keypadConfig.value}
          unit={keypadConfig.unit}
          allowDecimals={keypadConfig.allowDecimals}
          maxDecimals={keypadConfig.allowDecimals ? 1 : 0}
          anchorEl={keypadConfig.anchorEl}
          onConfirm={handleKeypadConfirm}
          onCancel={() => setKeypadConfig(null)}
        />
      )}
    </div>
  );
}
