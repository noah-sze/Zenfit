import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { HydratedWorkoutLog, WorkoutExerciseGroup, WorkoutLog, WorkoutSet } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { triggerHaptic } from '@/lib/haptics';
import { setInMemoryExercisesCache } from './useExercises';
import { setInMemoryRoutinesCache } from './useRoutines';

let inMemoryWorkoutLogsCache: WorkoutLog[] | null = null;

export function getInMemoryWorkoutLogsCache(): WorkoutLog[] | null {
  return inMemoryWorkoutLogsCache;
}

export function setInMemoryWorkoutLogsCache(logs: WorkoutLog[]): void {
  inMemoryWorkoutLogsCache = logs;
}

export function clearWorkoutLogsCache(): void {
  inMemoryWorkoutLogsCache = null;
}

export async function prewarmWorkoutLogsCache(): Promise<WorkoutLog[]> {
  if (inMemoryWorkoutLogsCache !== null) return inMemoryWorkoutLogsCache;
  try {
    if (typeof indexedDB === 'undefined') return [];
    const logs = await db.workout_logs.toArray();
    inMemoryWorkoutLogsCache = logs;
    return logs;
  } catch {
    return [];
  }
}

export function useWorkoutLogs(date?: string) {
  const workouts = useLiveQuery(
    async () => {
      const rawWorkouts = date
        ? await db.workout_logs.where('date').equals(date).sortBy('createdAt')
        : await db.workout_logs.orderBy('date').reverse().limit(30).toArray();

      const allExercises = await db.exercises.toArray();
      setInMemoryExercisesCache(allExercises);
      const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));
      const allRoutines = await db.routines.toArray();
      setInMemoryRoutinesCache(allRoutines);
      const routineMap = new Map(allRoutines.map((r) => [r.id, r]));
      if (inMemoryWorkoutLogsCache === null) {
        void prewarmWorkoutLogsCache();
      }

      const hydrated: HydratedWorkoutLog[] = rawWorkouts.map((w) => {
        const routine = w.routineId ? routineMap.get(w.routineId) : undefined;
        const firstEx = w.exercises?.[0] ? exerciseMap.get(w.exercises[0].exerciseId) : undefined;
        const title = routine?.name || firstEx?.name || '訓練';

        return {
          ...w,
          title,
          routineName: routine?.name,
          exercises: (w.exercises || []).map((group) => {
            const ex = exerciseMap.get(group.exerciseId);
            return {
              ...group,
              exerciseName: ex ? ex.name : '未知動作',
              category: ex ? ex.category : undefined,
            };
          }),
        };
      });

      return hydrated;
    },
    [date]
  );

  const addWorkout = async (data: Omit<WorkoutLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    // 嚴格落實 SSOT：日誌中動作組只記錄 exerciseId 與 sets，嚴禁存在 notes、動作名稱或分類
    const cleanExercises: WorkoutExerciseGroup[] = (data.exercises || []).map((group) => ({
      exerciseId: group.exerciseId,
      sets: group.sets || [],
    }));

    const newWorkout: WorkoutLog = {
      date: data.date,
      routineId: data.routineId,
      startTime: data.startTime,
      endTime: data.endTime,
      durationMinutes: data.durationMinutes,
      exercises: cleanExercises,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.workout_logs.add(newWorkout);
    triggerHaptic('success');
    return newWorkout.id;
  };

  const updateWorkout = async (id: string, updates: Partial<Omit<WorkoutLog, 'id' | 'createdAt'>>) => {
    const now = Date.now();
    // 若有更新 exercises，同樣確保清理冗餘屬性
    const finalUpdates = { ...updates, updatedAt: now };
    if (finalUpdates.exercises) {
      finalUpdates.exercises = finalUpdates.exercises.map((group) => ({
        exerciseId: group.exerciseId,
        sets: group.sets || [],
      }));
    }
    await db.workout_logs.update(id, finalUpdates);
  };

  const deleteWorkout = async (id: string) => {
    await db.workout_logs.delete(id);
    triggerHaptic('selection');
  };

  const toggleSetCompleted = async (workoutId: string, exerciseIndex: number, setIndex: number) => {
    const workout = await db.workout_logs.get(workoutId);
    if (!workout) return;

    const newExercises = [...workout.exercises];
    const targetExercise = newExercises[exerciseIndex];
    if (!targetExercise) return;

    const newSets = [...targetExercise.sets];
    const targetSet = newSets[setIndex];
    if (!targetSet) return;

    const willBeCompleted = !targetSet.isCompleted;
    newSets[setIndex] = {
      ...targetSet,
      isCompleted: willBeCompleted,
    };
    newExercises[exerciseIndex] = {
      ...targetExercise,
      sets: newSets,
    };

    await updateWorkout(workoutId, { exercises: newExercises });
    triggerHaptic(willBeCompleted ? 'success' : 'light');
  };

  const addSetToExercise = async (workoutId: string, exerciseIndex: number) => {
    const workout = await db.workout_logs.get(workoutId);
    if (!workout) return;

    const newExercises = [...workout.exercises];
    const targetExercise = newExercises[exerciseIndex];
    if (!targetExercise) return;

    const prevSet = targetExercise.sets[targetExercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: uuidv4(),
      setNumber: targetExercise.sets.length + 1,
      weight: prevSet ? prevSet.weight : 20,
      reps: prevSet ? prevSet.reps : 10,
      isCompleted: false,
    };

    newExercises[exerciseIndex] = {
      ...targetExercise,
      sets: [...targetExercise.sets, newSet],
    };

    await updateWorkout(workoutId, { exercises: newExercises });
    triggerHaptic('light');
  };

  const updateSetValues = async (
    workoutId: string,
    exerciseIndex: number,
    setIndex: number,
    weight: number,
    reps: number
  ) => {
    const workout = await db.workout_logs.get(workoutId);
    if (!workout) return;

    const newExercises = [...workout.exercises];
    const targetExercise = newExercises[exerciseIndex];
    if (!targetExercise) return;

    const newSets = [...targetExercise.sets];
    if (!newSets[setIndex]) return;

    newSets[setIndex] = {
      ...newSets[setIndex],
      weight,
      reps,
    };
    newExercises[exerciseIndex] = {
      ...targetExercise,
      sets: newSets,
    };

    await updateWorkout(workoutId, { exercises: newExercises });
  };

  return {
    workouts: workouts || [],
    isLoading: workouts === undefined,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    toggleSetCompleted,
    addSetToExercise,
    updateSetValues,
  };
}
