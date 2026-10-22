import type { FoodItem, RecipeIngredient } from '@/types';

export interface NutrientBreakdown {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeTotals extends NutrientBreakdown {
  totalWeightGrams: number;
  ingredientCount: number;
}

/**
 * 依據食材份量與基礎營養素，精準推算單項食材的熱量與三大營養素
 * 純函數無副作用，處理異常與邊界輸入
 */
export function calculateIngredientMacros(
  food: Pick<FoodItem, 'servingSize' | 'calories' | 'protein' | 'carbs' | 'fat'> | undefined | null,
  quantity: number
): NutrientBreakdown {
  if (
    !food ||
    typeof quantity !== 'number' ||
    isNaN(quantity) ||
    quantity <= 0 ||
    typeof food.servingSize !== 'number' ||
    isNaN(food.servingSize) ||
    food.servingSize <= 0
  ) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const ratio = quantity / food.servingSize;
  const safeCalories = typeof food.calories === 'number' && !isNaN(food.calories) ? food.calories : 0;
  const safeProtein = typeof food.protein === 'number' && !isNaN(food.protein) ? food.protein : 0;
  const safeCarbs = typeof food.carbs === 'number' && !isNaN(food.carbs) ? food.carbs : 0;
  const safeFat = typeof food.fat === 'number' && !isNaN(food.fat) ? food.fat : 0;

  return {
    calories: Math.round(safeCalories * ratio),
    protein: Math.round(safeProtein * ratio * 10) / 10,
    carbs: Math.round(safeCarbs * ratio * 10) / 10,
    fat: Math.round(safeFat * ratio * 10) / 10,
  };
}

/**
 * 依據菜餚組合的食材清單，動態加權求和計算總營養素與重量
 * 支援透過 excludedIndices 排除特定項（例如取消勾選可選油脂或調味）
 */
export function calculateRecipeTotals(
  recipe: { ingredients: RecipeIngredient[] },
  foodMap: Record<string, FoodItem> | Map<string, FoodItem>,
  options?: {
    excludedIndices?: number[];
    excludeAllOptional?: boolean;
  }
): RecipeTotals {
  const excludedSet = new Set(options?.excludedIndices || []);
  let totalCal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalWeight = 0;
  let effectiveCount = 0;

  const getFood = (id: string): FoodItem | undefined => {
    if (foodMap instanceof Map) return foodMap.get(id);
    return foodMap[id];
  };

  const ingredients = recipe.ingredients || [];
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    if (excludedSet.has(i)) continue;
    if (options?.excludeAllOptional && ing.isOptional) continue;

    const food = getFood(ing.foodId);
    const macros = calculateIngredientMacros(food, ing.quantity);

    totalCal += macros.calories;
    totalProtein += macros.protein;
    totalCarbs += macros.carbs;
    totalFat += macros.fat;

    if (ing.unit === 'g' || ing.unit === 'ml') {
      totalWeight += ing.quantity;
    }
    effectiveCount++;
  }

  return {
    calories: Math.round(totalCal),
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    totalWeightGrams: Math.round(totalWeight),
    ingredientCount: effectiveCount,
  };
}
