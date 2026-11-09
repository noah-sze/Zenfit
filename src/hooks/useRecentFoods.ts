import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { DailyDietLog } from '@/types';

let inMemoryRecentFoodIds: string[] | null = null;
let inMemoryRecentRecipeIds: string[] | null = null;

/**
 * 從歷史飲食日誌中提取去重、按最後使用時間倒序排列的食材與食譜 ID 列表 (Pure Function)
 */
export function extractRecentFoodAndRecipeIds(dailyLogs: DailyDietLog[]): {
  recentFoodIds: string[];
  recentRecipeIds: string[];
} {
  const foodLastUsedMap = new Map<string, number>();
  const recipeLastUsedMap = new Map<string, number>();

  for (const dayLog of dailyLogs) {
    const entries = dayLog.entries || [];
    for (const entry of entries) {
      const time = entry.createdAt || entry.updatedAt || new Date(dayLog.date).getTime() || 0;

      if (entry.bundleId) {
        const existing = recipeLastUsedMap.get(entry.bundleId) || 0;
        if (time > existing) {
          recipeLastUsedMap.set(entry.bundleId, time);
        }
      }

      if (entry.foodId) {
        const existing = foodLastUsedMap.get(entry.foodId) || 0;
        if (time > existing) {
          foodLastUsedMap.set(entry.foodId, time);
        }
      }
    }
  }

  const recentFoodIds = Array.from(foodLastUsedMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const recentRecipeIds = Array.from(recipeLastUsedMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  return { recentFoodIds, recentRecipeIds };
}

export function useRecentFoods() {
  const result = useLiveQuery(
    async () => {
      if (typeof indexedDB === 'undefined') {
        return { recentFoodIds: [], recentRecipeIds: [] };
      }

      // 倒序獲取最近 60 個有記錄的日誌
      const dailyLogs = await db.daily_diet_logs.orderBy('date').reverse().limit(60).toArray();
      const extracted = extractRecentFoodAndRecipeIds(dailyLogs);

      inMemoryRecentFoodIds = extracted.recentFoodIds;
      inMemoryRecentRecipeIds = extracted.recentRecipeIds;

      return extracted;
    },
    []
  );

  const recentFoodIds = result?.recentFoodIds ?? inMemoryRecentFoodIds ?? [];
  const recentRecipeIds = result?.recentRecipeIds ?? inMemoryRecentRecipeIds ?? [];

  return {
    recentFoodIds,
    recentRecipeIds,
    isLoading: result === undefined && inMemoryRecentFoodIds === null,
  };
}

// 模組載入時主動發起一次非同步預熱，在使用者點擊開啟彈窗前完成內存常駐
if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
  db.daily_diet_logs.orderBy('date').reverse().limit(60).toArray()
    .then((dailyLogs) => {
      const extracted = extractRecentFoodAndRecipeIds(dailyLogs);
      inMemoryRecentFoodIds = extracted.recentFoodIds;
      inMemoryRecentRecipeIds = extracted.recentRecipeIds;
    })
    .catch(() => {});
}
