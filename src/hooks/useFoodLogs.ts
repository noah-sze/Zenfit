import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { DailyDietLog, FoodLog, HydratedFoodLog, MealType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { calculateFoodLogNutrients } from '@/utils/nutritionMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { ensureDailyDietMeta } from './useDietPlan';

export function useFoodLogs(date: string) {
  const queryResult = useLiveQuery(
    async () => {
      const dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
      const rawEntries = dailyLog?.entries || [];
      const allFoods = await db.foods.toArray();
      const foodMap = new Map(allFoods.map((f) => [f.id, f]));

      const hydratedLogs: HydratedFoodLog[] = rawEntries.map((log) => {
        const food = log.foodId ? foodMap.get(log.foodId) : undefined;
        const raw = log as any;
        // 若有對應食材實體，依據真理源動態推算營養素；無實體時回退歷史快照或保底 0
        const computedNutrients = food
          ? calculateFoodLogNutrients(food, log.quantity, log.unit)
          : {
              calories: raw.calories || 0,
              protein: raw.protein || 0,
              carbs: raw.carbs || 0,
              fat: raw.fat || 0,
            };

        const displayName = food
          ? formatFoodDisplayName(food)
          : (raw.foodName || '未知食材');

        return {
          ...log,
          date,
          foodName: displayName,
          calories: computedNutrients.calories,
          protein: computedNutrients.protein,
          carbs: computedNutrients.carbs,
          fat: computedNutrients.fat,
        };
      });

      return {
        dailyLog,
        hydratedLogs,
      };
    },
    [date]
  );

  const logs: HydratedFoodLog[] = queryResult?.hydratedLogs || [];

  // 當日巨量營養素統計（動態計算值）
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
  const mealGroups: Record<MealType, HydratedFoodLog[]> = {
    breakfast: logs.filter((l) => l.mealType === 'breakfast'),
    lunch: logs.filter((l) => l.mealType === 'lunch'),
    dinner: logs.filter((l) => l.mealType === 'dinner'),
    snack: logs.filter((l) => l.mealType === 'snack'),
  };

  const getOrCreateDailyLog = async (targetDate: string): Promise<DailyDietLog> => {
    const existing = await db.daily_diet_logs.where('date').equals(targetDate).first();
    if (existing) {
      return existing;
    }
    const meta = await ensureDailyDietMeta(targetDate);
    const now = Date.now();
    const newLog: DailyDietLog = {
      id: uuidv4(),
      date: targetDate,
      meta: {
        activityLevel: meta.activityLevel ?? 1.55,
        macroSplit: meta.macroSplit ?? { carbs: 40, protein: 30, fat: 30 },
      },
      entries: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.daily_diet_logs.put(newLog);
    return newLog;
  };

  const addFoodLog = async (data: Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const targetDate = data.date || date;
    const dailyLog = await getOrCreateDailyLog(targetDate);
    const now = Date.now();
    const newLogId = uuidv4();
    const newEntry: FoodLog = {
      id: newLogId,
      date: targetDate,
      mealType: data.mealType,
      foodId: data.foodId,
      quantity: data.quantity,
      unit: data.unit,
      bundleId: data.bundleId,
      createdAt: now,
      updatedAt: now,
    };
    dailyLog.entries.push(newEntry);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
    return newLogId;
  };

  const addFoodLogBundle = async (
    bundleId: string,
    items: Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt' | 'bundleId'>>
  ) => {
    if (items.length === 0) return [];
    const targetDate = items[0].date || date;
    const dailyLog = await getOrCreateDailyLog(targetDate);
    const now = Date.now();
    const newEntries: FoodLog[] = items.map((item) => ({
      id: uuidv4(),
      date: targetDate,
      mealType: item.mealType,
      foodId: item.foodId,
      quantity: item.quantity,
      unit: item.unit,
      bundleId,
      createdAt: now,
      updatedAt: now,
    }));
    dailyLog.entries.push(...newEntries);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
    return newEntries;
  };

  const updateFoodLog = async (id: string, updates: Partial<Omit<FoodLog, 'id' | 'createdAt'>>) => {
    const dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
    if (!dailyLog) return;
    const now = Date.now();
    const idx = dailyLog.entries.findIndex((e) => e.id === id);
    if (idx !== -1) {
      dailyLog.entries[idx] = {
        ...dailyLog.entries[idx],
        ...updates,
        updatedAt: now,
      };
      dailyLog.updatedAt = now;
      await db.daily_diet_logs.put(dailyLog);
    }
  };

  const deleteFoodLog = async (id: string) => {
    const dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
    if (!dailyLog) return;
    const now = Date.now();
    dailyLog.entries = dailyLog.entries.filter((e) => e.id !== id);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
  };

  const deleteFoodLogBundle = async (bundleId: string) => {
    const dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
    if (!dailyLog) return;
    const now = Date.now();
    dailyLog.entries = dailyLog.entries.filter((e) => e.bundleId !== bundleId);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
  };

  const updateFoodLogBundle = async (
    bundleId: string,
    items: Array<{
      id?: string;
      foodId?: string;
      quantity: number;
      unit: string;
    }>
  ) => {
    const dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
    if (!dailyLog) return;
    const existing = dailyLog.entries.find((e) => e.bundleId === bundleId);
    if (!existing) return;
    const now = Date.now();
    const otherEntries = dailyLog.entries.filter((e) => e.bundleId !== bundleId);
    const updatedEntries: FoodLog[] = items.map((item) => ({
      id: item.id || uuidv4(),
      date,
      mealType: existing.mealType,
      bundleId,
      foodId: item.foodId,
      quantity: item.quantity,
      unit: item.unit,
      createdAt: existing.createdAt,
      updatedAt: now,
    }));
    dailyLog.entries = [...otherEntries, ...updatedEntries];
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
  };

  return {
    logs,
    totals,
    mealGroups,
    isLoading: queryResult === undefined,
    addFoodLog,
    addFoodLogBundle,
    updateFoodLog,
    updateFoodLogBundle,
    deleteFoodLog,
    deleteFoodLogBundle,
  };
}
