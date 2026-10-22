import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { FoodRecipe, FoodItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { calculateRecipeTotals, type RecipeTotals } from '@/utils/recipeMath';

export function useRecipes(searchQuery = '') {
  const allRecipesList = useLiveQuery(
    async () => {
      return await db.recipes.toArray();
    },
    []
  );

  const allFoodsList = useLiveQuery(
    async () => {
      return await db.foods.toArray();
    },
    []
  );

  const allRecipes = allRecipesList || [];
  const allFoods = allFoodsList || [];

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
          (r.description && r.description.toLowerCase().includes(q)) ||
          r.ingredients.some((ing) => ing.foodName.toLowerCase().includes(q))
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
    customRecipes,
    presetRecipes,
    archivedCustomRecipes,
    archivedPresetRecipes,
    isLoading: allRecipesList === undefined,
    addRecipe,
    updateRecipe,
    archiveRecipe,
    unarchiveRecipe,
    deleteRecipe,
    getRecipeMacros,
    foodMap,
  };
}
