import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { FoodRecipe, FoodItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { calculateRecipeTotals, type RecipeTotals } from '@/utils/recipeMath';
import { getInMemoryFoodsCache, setInMemoryFoodsCache } from '@/hooks/useFoods';

/**
 * 模組級菜餚記憶體注水快取 (In-Memory Hydration Cache)
 * 解決彈窗與組件掛載時等待 IndexedDB 異步查詢造成的加載微閃爍問題
 * 實現第 0 幀滿數據同步秒開
 */
let inMemoryRecipesCache: FoodRecipe[] | null = null;

export function getInMemoryRecipesCache(): FoodRecipe[] | null {
  return inMemoryRecipesCache;
}

export function setInMemoryRecipesCache(recipes: FoodRecipe[]): void {
  inMemoryRecipesCache = recipes;
}

export function clearRecipesCache(): void {
  inMemoryRecipesCache = null;
}

/**
 * 預熱菜餚記憶體快取 (非阻塞非同步預熱)
 */
export async function prewarmRecipesCache(): Promise<FoodRecipe[]> {
  if (inMemoryRecipesCache !== null) return inMemoryRecipesCache;
  try {
    if (typeof indexedDB === 'undefined') return [];
    const recipes = await db.recipes.toArray();
    inMemoryRecipesCache = recipes;
    return recipes;
  } catch {
    return [];
  }
}

export function useRecipes(searchQuery = '') {
  const allRecipesList = useLiveQuery(
    async () => {
      const result = await db.recipes.toArray();
      inMemoryRecipesCache = result;
      return result;
    },
    []
  );

  const allFoodsList = useLiveQuery(
    async () => {
      const result = await db.foods.toArray();
      setInMemoryFoodsCache(result);
      return result;
    },
    []
  );

  // 核心即時注水：若 useLiveQuery 仍在等待微任務/IPC 回調，直接同步採用記憶體快照
  const allRecipes = allRecipesList ?? inMemoryRecipesCache ?? [];
  const allFoods = allFoodsList ?? getInMemoryFoodsCache() ?? [];

  // 構建 foodMap 供純函數計算引用
  const foodMap = new Map<string, FoodItem>();
  allFoods.forEach((f) => {
    foodMap.set(f.id, f);
  });

  const activeRecipes = allRecipes.filter((r) => !r.isArchived);
  const archivedRecipes = allRecipes.filter((r) => r.isArchived);

  const customRecipes = activeRecipes.filter((r) => r.isCustom);
  const presetRecipes = activeRecipes.filter((r) => !r.isCustom);

  const archivedCustomRecipes = archivedRecipes.filter((r) => r.isCustom);
  const archivedPresetRecipes = archivedRecipes.filter((r) => !r.isCustom);

  const filteredActiveRecipes = searchQuery.trim()
    ? activeRecipes.filter((r) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          r.name.toLowerCase().includes(q) ||
          r.ingredients.some((ing) => {
            const food = foodMap.get(ing.foodId);
            return food?.name.toLowerCase().includes(q);
          })
        );
      })
    : activeRecipes;

  const addRecipe = async (
    data: Omit<FoodRecipe, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'> & {
      isCustom?: boolean;
    }
  ): Promise<FoodRecipe> => {
    const now = Date.now();
    const newRecipe: FoodRecipe = {
      ...data,
      id: uuidv4(),
      isCustom: data.isCustom ?? true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.recipes.add(newRecipe);
    return newRecipe;
  };

  const updateRecipe = async (
    id: string,
    updates: Partial<Omit<FoodRecipe, 'id' | 'createdAt'>>
  ) => {
    await db.recipes.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  };

  const archiveRecipe = async (id: string) => {
    await db.recipes.update(id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  };

  const unarchiveRecipe = async (id: string) => {
    await db.recipes.update(id, {
      isArchived: false,
      updatedAt: Date.now(),
    });
  };

  const deleteRecipe = async (id: string): Promise<{ success: boolean }> => {
    await db.recipes.delete(id);
    return { success: true };
  };

  /**
   * 計算特定菜餚當前的精準總營養素
   */
  const getRecipeMacros = (
    recipe: FoodRecipe,
    options?: { excludedIndices?: number[]; excludeAllOptional?: boolean }
  ): RecipeTotals => {
    return calculateRecipeTotals(recipe, foodMap, options);
  };

  return {
    allRecipes,
    activeRecipes: filteredActiveRecipes,
    archivedRecipes,
    customRecipes,
    presetRecipes,
    archivedCustomRecipes,
    archivedPresetRecipes,
    isLoading: allRecipesList === undefined && inMemoryRecipesCache === null,
    addRecipe,
    updateRecipe,
    archiveRecipe,
    unarchiveRecipe,
    deleteRecipe,
    getRecipeMacros,
    foodMap,
  };
}
