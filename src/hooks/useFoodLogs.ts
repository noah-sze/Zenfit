import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { DailyDietLog, FoodLog, FoodLogEntryType, HydratedFoodLog, MealType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { calculateFoodLogNutrients } from '@/utils/nutritionMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { ensureDailyDietMeta } from './useDietPlan';
import { setInMemoryFoodsCache } from './useFoods';
import { sortFoodLogsByWeightDesc } from '@/utils/dietSorting';

/**
 * 模組級每日飲食日誌記憶體注水快取 (In-Memory Hydration Cache)
 * 解決從 /diet 跳轉至食材/菜餚詳情頁時等待 db.daily_diet_logs.toArray() 異步查詢造成的熱點圖與統計數據二次跳動問題
 */
let inMemoryDailyDietLogsCache: DailyDietLog[] | null = null;

export function getInMemoryDailyDietLogsCache(): DailyDietLog[] | null {
  return inMemoryDailyDietLogsCache;
}

export function setInMemoryDailyDietLogsCache(logs: DailyDietLog[]): void {
  inMemoryDailyDietLogsCache = logs;
}

export function clearDailyDietLogsCache(): void {
  inMemoryDailyDietLogsCache = null;
}

function upsertInMemoryDailyDietLog(log: DailyDietLog): void {
  if (!inMemoryDailyDietLogsCache) return;
  const idx = inMemoryDailyDietLogsCache.findIndex((d) => d.id === log.id || d.date === log.date);
  if (idx !== -1) {
    const next = [...inMemoryDailyDietLogsCache];
    next[idx] = log;
    inMemoryDailyDietLogsCache = next;
  } else {
    inMemoryDailyDietLogsCache = [...inMemoryDailyDietLogsCache, log];
  }
}

export async function prewarmDailyDietLogsCache(): Promise<DailyDietLog[]> {
  if (inMemoryDailyDietLogsCache !== null) return inMemoryDailyDietLogsCache;
  try {
    if (typeof indexedDB === 'undefined') return [];
    const logs = await db.daily_diet_logs.toArray();
    inMemoryDailyDietLogsCache = logs;
    return logs;
  } catch {
    return [];
  }
}

export function useFoodLogs(date: string) {
  const queryResult = useLiveQuery(
    async () => {
      const dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
      const rawEntries = dailyLog?.entries || [];
      const allFoods = await db.foods.toArray();
      setInMemoryFoodsCache(allFoods);
      if (inMemoryDailyDietLogsCache === null) {
        void prewarmDailyDietLogsCache();
      } else if (dailyLog) {
        upsertInMemoryDailyDietLog(dailyLog);
      }
      const foodMap = new Map(allFoods.map((f) => [f.id, f]));

      const hydratedLogs: HydratedFoodLog[] = rawEntries.map((log) => {
        const isSystemEntry =
          log.entryType === 'estimate' ||
          log.entryType === 'as_planned' ||
          log.isPlaceholder ||
          log.isAsPlanned;
        const food = (!isSystemEntry && log.foodId) ? foodMap.get(log.foodId) : undefined;
        // 若有對應食材實體，依據真理源動態推算營養素；無實體時回退粗估/配額快照或保底 0
        const computedNutrients = food
          ? calculateFoodLogNutrients(food, log.quantity || 0, log.unit || 'g')
          : {
              calories: log.calories || 0,
              protein: log.protein || 0,
              carbs: log.carbs || 0,
              fat: log.fat || 0,
            };

        const displayName = food
          ? formatFoodDisplayName(food)
          : (log.customTitle || log.foodName || '未知食材');

        const entryType: FoodLogEntryType =
          log.entryType ||
          (log.isAsPlanned ? 'as_planned' : log.isPlaceholder ? 'estimate' : 'item');

        return {
          ...log,
          entryType,
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
    breakfast: sortFoodLogsByWeightDesc(logs.filter((l) => l.mealType === 'breakfast')),
    lunch: sortFoodLogsByWeightDesc(logs.filter((l) => l.mealType === 'lunch')),
    dinner: sortFoodLogsByWeightDesc(logs.filter((l) => l.mealType === 'dinner')),
    snack: sortFoodLogsByWeightDesc(logs.filter((l) => l.mealType === 'snack')),
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
    const entryType: FoodLogEntryType =
      data.entryType ||
      (data.isAsPlanned ? 'as_planned' : data.isPlaceholder ? 'estimate' : 'item');
    const newEntry: FoodLog = {
      id: newLogId,
      date: targetDate,
      mealType: data.mealType,
      entryType,
      foodId: data.foodId,
      ...(entryType === 'item'
        ? {
            quantity: data.quantity ?? 100,
            unit: data.unit ?? 'g',
            ...(data.bundleId ? { bundleId: data.bundleId } : {}),
          }
        : {
            ...(data.scenario ? { scenario: data.scenario } : {}),
            ...(data.customTitle ? { customTitle: data.customTitle } : {}),
          }),
      foodName: data.foodName,
      calories: data.calories,
      carbs: data.carbs,
      protein: data.protein,
      fat: data.fat,
      isPlaceholder: data.isPlaceholder ?? (entryType === 'estimate'),
      isAsPlanned: data.isAsPlanned ?? (entryType === 'as_planned'),
      createdAt: now,
      updatedAt: now,
    };
    dailyLog.entries.push(newEntry);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
    upsertInMemoryDailyDietLog(dailyLog);
    return newLogId;
  };

  const addQuickPlaceholder = async (data: {
    mealType: MealType;
    scenario?: string;
    customTitle?: string;
    foodName?: string;
    calories: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    date?: string;
  }) => {
    const targetDate = data.date || date;
    const dailyLog = await getOrCreateDailyLog(targetDate);
    const now = Date.now();
    const newLogId = uuidv4();
    const customTitle =
      data.customTitle?.trim() ||
      (data.foodName &&
      !['快速估算', '快速粗估', 'Quick Estimate', '常規'].includes(data.foodName.trim())
        ? data.foodName.trim()
        : undefined);
    const newEntry: FoodLog = {
      id: newLogId,
      date: targetDate,
      mealType: data.mealType,
      entryType: 'estimate',
      scenario: data.scenario || 'balanced',
      ...(customTitle ? { customTitle } : {}),
      calories: Math.round(data.calories),
      carbs: data.carbs !== undefined ? Math.round(data.carbs * 10) / 10 : undefined,
      protein: data.protein !== undefined ? Math.round(data.protein * 10) / 10 : undefined,
      fat: data.fat !== undefined ? Math.round(data.fat * 10) / 10 : undefined,
      isPlaceholder: true,
      createdAt: now,
      updatedAt: now,
    };
    dailyLog.entries.push(newEntry);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
    upsertInMemoryDailyDietLog(dailyLog);
    return newLogId;
  };

  const addAsPlannedMeal = async (
    mealType: MealType,
    budget: { calories: number; carbs: number; protein: number; fat: number },
    options?: { date?: string; foodName?: string; customTitle?: string }
  ) => {
    const targetDate = options?.date || date;
    const dailyLog = await getOrCreateDailyLog(targetDate);
    const now = Date.now();
    const newLogId = uuidv4();
    const customTitle = options?.customTitle?.trim() || options?.foodName?.trim();
    const isGeneric =
      !customTitle ||
      customTitle.endsWith('配額') ||
      customTitle.endsWith('配额') ||
      customTitle.endsWith('Budget') ||
      customTitle === '正常飲食' ||
      customTitle === '正常饮食' ||
      customTitle === 'Regular Diet' ||
      customTitle === '算我正常吃' ||
      customTitle === '算我正常食' ||
      customTitle === '歷史均值' ||
      customTitle === '历史均值' ||
      customTitle === 'Past Average' ||
      customTitle === 'Historical Average';
    const finalCustomTitle = isGeneric ? undefined : customTitle;

    const newEntry: FoodLog = {
      id: newLogId,
      date: targetDate,
      mealType,
      entryType: 'as_planned',
      ...(finalCustomTitle ? { customTitle: finalCustomTitle } : {}),
      calories: Math.round(budget.calories),
      carbs: Math.round(budget.carbs * 10) / 10,
      protein: Math.round(budget.protein * 10) / 10,
      fat: Math.round(budget.fat * 10) / 10,
      isAsPlanned: true,
      createdAt: now,
      updatedAt: now,
    };
    dailyLog.entries.push(newEntry);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
    upsertInMemoryDailyDietLog(dailyLog);
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
    upsertInMemoryDailyDietLog(dailyLog);
    return newEntries;
  };

  const updateFoodLog = async (id: string, updates: Partial<Omit<FoodLog, 'id' | 'createdAt'>>) => {
    let dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
    let idx = dailyLog ? dailyLog.entries.findIndex((e) => e.id === id) : -1;
    if (idx === -1) {
      const allDailyLogs = await db.daily_diet_logs.toArray();
      for (const dLog of allDailyLogs) {
        const foundIdx = dLog.entries.findIndex((e) => e.id === id);
        if (foundIdx !== -1) {
          dailyLog = dLog;
          idx = foundIdx;
          break;
        }
      }
    }
    if (!dailyLog || idx === -1) return;
    const now = Date.now();
    dailyLog.entries[idx] = {
      ...dailyLog.entries[idx],
      ...updates,
      updatedAt: now,
    };
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
    upsertInMemoryDailyDietLog(dailyLog);
  };

  const deleteFoodLog = async (id: string) => {
    let dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
    let idx = dailyLog ? dailyLog.entries.findIndex((e) => e.id === id) : -1;
    if (idx === -1) {
      const allDailyLogs = await db.daily_diet_logs.toArray();
      for (const dLog of allDailyLogs) {
        const foundIdx = dLog.entries.findIndex((e) => e.id === id);
        if (foundIdx !== -1) {
          dailyLog = dLog;
          idx = foundIdx;
          break;
        }
      }
    }
    if (!dailyLog || idx === -1) return;
    const now = Date.now();
    dailyLog.entries = dailyLog.entries.filter((e) => e.id !== id);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
    upsertInMemoryDailyDietLog(dailyLog);
  };

  const deleteFoodLogBundle = async (bundleId: string) => {
    const dailyLog = await db.daily_diet_logs.where('date').equals(date).first();
    if (!dailyLog) return;
    const now = Date.now();
    dailyLog.entries = dailyLog.entries.filter((e) => e.bundleId !== bundleId);
    dailyLog.updatedAt = now;
    await db.daily_diet_logs.put(dailyLog);
    upsertInMemoryDailyDietLog(dailyLog);
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
    upsertInMemoryDailyDietLog(dailyLog);
  };

  return {
    logs,
    totals,
    mealGroups,
    isLoading: queryResult === undefined,
    addFoodLog,
    addQuickPlaceholder,
    addAsPlannedMeal,
    addFoodLogBundle,
    updateFoodLog,
    updateFoodLogBundle,
    deleteFoodLog,
    deleteFoodLogBundle,
  };
}
