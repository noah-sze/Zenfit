import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { WorkoutLog, WorkoutSet } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { triggerHaptic } from '@/lib/haptics';

export function useWorkoutLogs(date?: string) {
  const workouts = useLiveQuery(
    async () => {
      if (date) {
        return await db.workout_logs.where('date').equals(date).sortBy('createdAt');
      }
      return await db.workout_logs.orderBy('date').reverse().limit(30).toArray();
    },
    [date]
  );

  const addWorkout = async (data: Omit<WorkoutLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newWorkout: WorkoutLog = {
      ...data,
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
    await db.workout_logs.update(id, {
      ...updates,
      updatedAt: now,
    });
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
