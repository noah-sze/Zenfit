import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { Exercise, MuscleCategory } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function useExercises(category?: MuscleCategory, searchQuery = '') {
  const exercises = useLiveQuery(
    async () => {
      let items = await db.exercises.toArray();
      items = items.filter((ex) => !ex.isArchived);

      if (category) {
        items = items.filter((ex) => ex.category === category);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        items = items.filter((ex) => ex.name.toLowerCase().includes(q));
      }

      return items;
    },
    [category, searchQuery]
  );

  const addExercise = async (data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'>) => {
    const now = Date.now();
    const newEx: Exercise = {
      ...data,
      id: uuidv4(),
      isCustom: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.exercises.add(newEx);
    return newEx.id;
  };

  return {
    exercises: exercises || [],
    isLoading: exercises === undefined,
    addExercise,
  };
}
