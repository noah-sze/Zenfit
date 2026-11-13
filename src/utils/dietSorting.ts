/**
 * 飲食日誌條目排序機制 (Diet Log Sorting Engine)
 * 遵循 Precision Metric Testing 準則：純函數無副作用，100% 防護 NaN、負數、極端小數與非標準單位
 *
 * 核心業務規則：
 * 1. 條目預設按照客觀物理重量降序排列（最重在上），使餐別主食與主要蛋白質食材自然置頂，調味料與微量食材置底。
 * 2. 支援單一食物 (single) 與組合菜餚 (bundle)。組合菜餚以其所有食材之總重量參與整體排序，展開後其內部食材亦按重量降序排列。
 * 3. 若重量相同（或皆為無重量之估算條目），則依據熱量 (calories) 降序破平；若熱量仍相同，則依創建時間 (createdAt) 降序。
 */

import type { HydratedFoodLog } from '@/types';
import { OZ_TO_G_RATIO, FL_OZ_TO_ML_RATIO, LB_TO_KG_RATIO } from './unitMath';

export type GroupedMealEntry =
  | { type: 'single'; log: HydratedFoodLog }
  | { type: 'bundle'; bundleId: string; bundleTitle: string; logs: HydratedFoodLog[] };

/**
 * 將飲食條目份量換算為基準公克數 (g)
 */
export function getFoodLogWeightInGrams(log?: { quantity?: number; unit?: string } | null): number {
  if (!log) return 0;
  const q = log.quantity;
  if (typeof q !== 'number' || isNaN(q) || !isFinite(q) || q <= 0) {
    return 0;
  }

  const u = (log.unit || 'g').trim().toLowerCase();

  switch (u) {
    case 'g':
      return q;
    case 'kg':
      return q * 1000;
    case 'mg':
      return q * 0.001;
    case 'oz':
      return q * OZ_TO_G_RATIO;
    case 'lb':
    case 'lbs':
      return q * LB_TO_KG_RATIO * 1000;
    case 'ml':
      // 液體依據近似水密度 1ml ≈ 1g 歸一
      return q;
    case 'l':
    case 'liter':
    case 'liters':
      return q * 1000;
    case 'fl oz':
    case 'floz':
      return q * FL_OZ_TO_ML_RATIO;
    default:
      // 非質量/非容量單位（如：份、個、匙、包），無物理重量
      return 0;
  }
}

/**
 * 食物記錄陣列排序（最重在上）
 */
export function sortFoodLogsByWeightDesc<T extends { quantity?: number; unit?: string; calories?: number; createdAt?: number }>(
  logs: readonly T[]
): T[] {
  return [...logs].sort((a, b) => {
    const weightDiff = getFoodLogWeightInGrams(b) - getFoodLogWeightInGrams(a);
    if (Math.abs(weightDiff) > 1e-6) {
      return weightDiff;
    }

    // 破平規則 1：熱量降序
    const calDiff = (b.calories || 0) - (a.calories || 0);
    if (Math.abs(calDiff) > 1e-6) {
      return calDiff;
    }

    // 破平規則 2：建立時間降序
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

/**
 * 計算分組條目（單一食物或菜餚套裝）的總重量
 */
export function getGroupedMealEntryWeight(entry: GroupedMealEntry): number {
  if (entry.type === 'single') {
    return getFoodLogWeightInGrams(entry.log);
  }
  return entry.logs.reduce((sum, item) => sum + getFoodLogWeightInGrams(item), 0);
}

/**
 * 計算分組條目的總熱量
 */
export function getGroupedMealEntryCalories(entry: GroupedMealEntry): number {
  if (entry.type === 'single') {
    return entry.log.calories || 0;
  }
  return entry.logs.reduce((sum, item) => sum + (item.calories || 0), 0);
}

/**
 * 分組條目（單品與菜餚）排序機制：
 * 1. 依總重量降序（最重在上）
 * 2. 組合菜餚內部之食材清單亦同步執行重量降序
 */
export function sortGroupedMealEntriesByWeightDesc(
  entries: readonly GroupedMealEntry[]
): GroupedMealEntry[] {
  return entries
    .map((entry) => {
      if (entry.type === 'bundle') {
        return {
          ...entry,
          logs: sortFoodLogsByWeightDesc(entry.logs),
        };
      }
      return entry;
    })
    .sort((a, b) => {
      const weightDiff = getGroupedMealEntryWeight(b) - getGroupedMealEntryWeight(a);
      if (Math.abs(weightDiff) > 1e-6) {
        return weightDiff;
      }

      const calDiff = getGroupedMealEntryCalories(b) - getGroupedMealEntryCalories(a);
      if (Math.abs(calDiff) > 1e-6) {
        return calDiff;
      }

      return 0;
    });
}
