import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { FoodItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 模組級食材記憶體注水快取 (In-Memory Hydration Cache)
 * 解決彈窗與組件掛載時等待 IndexedDB 異步查詢 (10ms~30ms) 造成的先空後滿視覺閃爍問題
 * 實現第 0 幀滿數據同步秒開
 */
let inMemoryFoodsCache: FoodItem[] | null = null;

export function getInMemoryFoodsCache(): FoodItem[] | null {
  return inMemoryFoodsCache;
}

export function setInMemoryFoodsCache(foods: FoodItem[]): void {
  inMemoryFoodsCache = foods;
}

export function clearFoodsCache(): void {
  inMemoryFoodsCache = null;
}

/**
 * 預熱食材記憶體快取 (非阻塞非同步預熱)
 */
export async function prewarmFoodsCache(): Promise<FoodItem[]> {
  if (inMemoryFoodsCache !== null) return inMemoryFoodsCache;
  try {
    if (typeof indexedDB === 'undefined') return [];
    const foods = await db.foods.toArray();
    inMemoryFoodsCache = foods;
    return foods;
  } catch {
    return [];
  }
}

export function useFoods(searchQuery = '') {
  const allFoodsList = useLiveQuery(
    async () => {
      const result = await db.foods.toArray();
      inMemoryFoodsCache = result;
      return result;
    },
    []
  );

  // 核心即時注水：若 useLiveQuery 仍在等待微任務/IPC 回調，直接同步採用記憶體快照
  const allFoods = allFoodsList ?? inMemoryFoodsCache ?? [];
  const activeFoods = allFoods.filter((item) => !item.isArchived);
  const archivedFoods = allFoods.filter((item) => item.isArchived);

  const customFoods = activeFoods.filter((item) => item.isCustom);
  const presetFoods = activeFoods.filter((item) => !item.isCustom);

  const archivedCustomFoods = archivedFoods.filter((item) => item.isCustom);
  const archivedPresetFoods = archivedFoods.filter((item) => !item.isCustom);

  // 支援搜尋關鍵字過濾之可用食物清單
  const filteredActiveFoods = searchQuery.trim()
    ? activeFoods.filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q))
        );
      })
    : activeFoods;

  const addFood = async (
    data: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt' | 'isCustom' | 'isArchived'> & {
      isCustom?: boolean;
    }
  ): Promise<FoodItem> => {
    const now = Date.now();
    const newFood: FoodItem = {
      ...data,
      id: uuidv4(),
      isCustom: data.isCustom ?? true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.foods.add(newFood);
    return newFood;
  };

  const updateFood = async (
    id: string,
    updates: Partial<Omit<FoodItem, 'id' | 'createdAt'>>
  ) => {
    await db.foods.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  };

  const archiveFood = async (id: string) => {
    await db.foods.update(id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  };

  const unarchiveFood = async (id: string) => {
    await db.foods.update(id, {
      isArchived: false,
      updatedAt: Date.now(),
    });
  };

  const deleteFood = async (
    id: string
  ): Promise<{ success: boolean; reason?: 'has_logs' | 'has_recipes' | 'not_found' }> => {
    const food = await db.foods.get(id);
    if (!food) {
      return { success: false, reason: 'not_found' };
    }

    // 檢查是否有關聯之飲食記錄（嚴格純 ID 關聯）
    const hasLogs = await db.daily_diet_logs
      .filter((daily) => daily.entries.some((entry) => entry.foodId === id))
      .count();

    if (hasLogs > 0) {
      return { success: false, reason: 'has_logs' };
    }

    // 檢查是否有關聯之菜餚組合（嚴格純 ID 關聯）
    const hasRecipes = await db.recipes
      .filter((r) => r.ingredients.some((ing) => ing.foodId === id))
      .count();

    if (hasRecipes > 0) {
      return { success: false, reason: 'has_recipes' };
    }

    await db.foods.delete(id);
    return { success: true };
  };

  return {
    foods: filteredActiveFoods,
    allFoods,
    activeFoods,
    archivedFoods,
    customFoods,
    presetFoods,
    archivedCustomFoods,
    archivedPresetFoods,
    isLoading: allFoodsList === undefined && inMemoryFoodsCache === null,
    addFood,
    updateFood,
    archiveFood,
    unarchiveFood,
    deleteFood,
  };
}

