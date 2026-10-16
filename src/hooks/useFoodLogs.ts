import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { FoodLog, MealType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function useFoodLogs(date: string) {
  const foodLogs = useLiveQuery(
    async () => {
      return await db.food_logs.where('date').equals(date).sortBy('createdAt');
    },
    [date]
  );

  const logs = foodLogs || [];

  // 當日巨量營養素統計
  const totals = logs.reduce(
    (acc, item) => {
      acc.calories += item.calories || 0;
      acc.protein += item.protein || 0;
      acc.carbs += item.carbs || 0;
      acc.fat += item.fat || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // 按餐別分組
  const mealGroups: Record<MealType, FoodLog[]> = {
    breakfast: logs.filter((l) => l.mealType === 'breakfast'),
    lunch: logs.filter((l) => l.mealType === 'lunch'),
    dinner: logs.filter((l) => l.mealType === 'dinner'),
    snack: logs.filter((l) => l.mealType === 'snack'),
  };

  const addFoodLog = async (data: Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newLog: FoodLog = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.food_logs.add(newLog);
    return newLog.id;
  };

  const updateFoodLog = async (id: string, updates: Partial<Omit<FoodLog, 'id' | 'createdAt'>>) => {
    const now = Date.now();
    await db.food_logs.update(id, {
      ...updates,
      updatedAt: now,
    });
  };

  const deleteFoodLog = async (id: string) => {
    await db.food_logs.delete(id);
  };

  return {
    logs,
    totals,
    mealGroups,
    isLoading: foodLogs === undefined,
    addFoodLog,
    updateFoodLog,
    deleteFoodLog,
  };
}
