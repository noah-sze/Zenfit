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

  const addFoodLogBundle = async (
    bundleId: string,
    bundleName: string,
    items: Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt' | 'bundleId' | 'bundleName'>>
  ) => {
    const now = Date.now();
    const newLogs: FoodLog[] = items.map((item) => ({
      ...item,
      id: uuidv4(),
      bundleId,
      bundleName,
      createdAt: now,
      updatedAt: now,
    }));
    await db.food_logs.bulkAdd(newLogs);
    return newLogs;
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

  const deleteFoodLogBundle = async (bundleId: string) => {
    await db.food_logs.where('bundleId').equals(bundleId).delete();
  };

  const updateFoodLogBundle = async (
    bundleId: string,
    items: Array<{
      id?: string;
      foodId?: string;
      foodName: string;
      quantity: number;
      unit: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    }>
  ) => {
    const existingLogs = await db.food_logs.where('bundleId').equals(bundleId).toArray();
    if (existingLogs.length === 0) return;
    const baseInfo = existingLogs[0];
    const now = Date.now();

    await db.transaction('rw', db.food_logs, async () => {
      await db.food_logs.where('bundleId').equals(bundleId).delete();

      const newLogs: FoodLog[] = items.map((item) => ({
        id: item.id || uuidv4(),
        date: baseInfo.date,
        mealType: baseInfo.mealType,
        bundleId,
        bundleName: baseInfo.bundleName,
        foodId: item.foodId,
        foodName: item.foodName,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        carbs: item.carbs,
        protein: item.protein,
        fat: item.fat,
        createdAt: baseInfo.createdAt,
        updatedAt: now,
      }));

      await db.food_logs.bulkAdd(newLogs);
    });
  };

  return {
    logs,
    totals,
    mealGroups,
    isLoading: foodLogs === undefined,
    addFoodLog,
    addFoodLogBundle,
    updateFoodLog,
    updateFoodLogBundle,
    deleteFoodLog,
    deleteFoodLogBundle,
  };
}
