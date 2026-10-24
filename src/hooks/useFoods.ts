import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { FoodItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { formatFoodDisplayName } from '@/utils/foodNaming';

export function useFoods(searchQuery = '') {
  const allFoodsList = useLiveQuery(
    async () => {
      return await db.foods.toArray();
    },
    []
  );

  const allFoods = allFoodsList || [];
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

    const displayName = formatFoodDisplayName(food).trim().toLowerCase();
    const rawName = food.name.trim().toLowerCase();

    // 檢查是否有關聯之飲食記錄
    const hasLogs = await db.food_logs
      .filter((log) => {
        if (log.foodId === id) return true;
        const logName = log.foodName.trim().toLowerCase();
        return logName === rawName || logName === displayName;
      })
      .count();

    if (hasLogs > 0) {
      return { success: false, reason: 'has_logs' };
    }

    // 檢查是否有關聯之菜餚組合
    const hasRecipes = await db.recipes
      .filter((r) =>
        r.ingredients.some((ing) => {
          if (ing.foodId === id) return true;
          const ingName = ing.foodName.trim().toLowerCase();
          return ingName === rawName || ingName === displayName;
        })
      )
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
    isLoading: allFoodsList === undefined,
    addFood,
    updateFood,
    archiveFood,
    unarchiveFood,
    deleteFood,
  };
}

