export type NutritionDisplayMode = 'serving' | 'per100g';

export interface BaseNutritionInput {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: number;
  servingUnit?: string;
}

export interface ScaledNutritionResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

/**
 * 依據顯示模式（每份基準 vs 每 100g 密度基準），精確推算熱量與三大營養素
 * 純數學無副作用函數，100% 覆蓋邊界情況（除以零、無效數值、負數防護）
 */
export function calculateScaledNutrition(
  item: BaseNutritionInput | null | undefined,
  mode: NutritionDisplayMode = 'serving'
): ScaledNutritionResult {
  const safeCalories = Math.max(0, typeof item?.calories === 'number' && !isNaN(item.calories) ? item.calories : 0);
  const safeProtein = Math.max(0, typeof item?.protein === 'number' && !isNaN(item.protein) ? item.protein : 0);
  const safeCarbs = Math.max(0, typeof item?.carbs === 'number' && !isNaN(item.carbs) ? item.carbs : 0);
  const safeFat = Math.max(0, typeof item?.fat === 'number' && !isNaN(item.fat) ? item.fat : 0);
  const rawSize = typeof item?.servingSize === 'number' && !isNaN(item.servingSize) ? item.servingSize : 100;
  const rawUnit = (item?.servingUnit || 'g').trim() || 'g';

  // 「每份」模式：直接輸出原始物理標籤數值
  if (mode === 'serving') {
    return {
      calories: Math.round(safeCalories),
      protein: Math.round(safeProtein * 10) / 10,
      carbs: Math.round(safeCarbs * 10) / 10,
      fat: Math.round(safeFat * 10) / 10,
      servingSize: rawSize,
      servingUnit: rawUnit,
    };
  }

  // 「每 100g」模式：
  // 邊界防護：若份量無效或 <= 0，除以零防護，回退為原始數值或預設 100
  if (rawSize <= 0) {
    return {
      calories: Math.round(safeCalories),
      protein: Math.round(safeProtein * 10) / 10,
      carbs: Math.round(safeCarbs * 10) / 10,
      fat: Math.round(safeFat * 10) / 10,
      servingSize: 100,
      servingUnit: rawUnit.toLowerCase().includes('ml') ? 'ml' : 'g',
    };
  }

  const factor = 100 / rawSize;
  const isLiquid = rawUnit.toLowerCase().includes('ml');

  return {
    calories: Math.round(safeCalories * factor),
    protein: Math.round(safeProtein * factor * 10) / 10,
    carbs: Math.round(safeCarbs * factor * 10) / 10,
    fat: Math.round(safeFat * factor * 10) / 10,
    servingSize: 100,
    servingUnit: isLiquid ? 'ml' : 'g',
  };
}

export interface ScaleBasisParams {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number; // 食用單份克數 (如 20g)
  basisSize: number;   // 標籤依據克數 (如 100g 或 30g)
  servingUnit?: string;
}

export interface ScaledServingNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

/**
 * 依據自定義營養標籤依據（basisSize，如每 100g 或每 30g），精確等比折算出單份食用量（servingSize，如 20g）的實際營養數值
 * 遵循 Precision Metric 準則：純函數無副作用，100% 防護 NaN、負數、除以零
 */
export function scaleNutritionFromBasis(params: ScaleBasisParams): ScaledServingNutrition {
  const safeCalories = Math.max(0, typeof params?.calories === 'number' && !isNaN(params.calories) ? params.calories : 0);
  const safeProtein = Math.max(0, typeof params?.protein === 'number' && !isNaN(params.protein) ? params.protein : 0);
  const safeCarbs = Math.max(0, typeof params?.carbs === 'number' && !isNaN(params.carbs) ? params.carbs : 0);
  const safeFat = Math.max(0, typeof params?.fat === 'number' && !isNaN(params.fat) ? params.fat : 0);

  const servingSize = Math.max(0, typeof params?.servingSize === 'number' && !isNaN(params.servingSize) ? params.servingSize : 100);
  const basisSize = typeof params?.basisSize === 'number' && !isNaN(params.basisSize) ? params.basisSize : 100;
  const servingUnit = (params?.servingUnit || 'g').trim() || 'g';

  // 防護除以零或無效基準重量
  if (basisSize <= 0 || servingSize <= 0) {
    return {
      calories: Math.round(safeCalories),
      protein: Math.round(safeProtein * 10) / 10,
      carbs: Math.round(safeCarbs * 10) / 10,
      fat: Math.round(safeFat * 10) / 10,
      servingSize: servingSize > 0 ? servingSize : 100,
      servingUnit,
    };
  }

  const ratio = servingSize / basisSize;

  return {
    calories: Math.round(safeCalories * ratio),
    protein: Math.round(safeProtein * ratio * 10) / 10,
    carbs: Math.round(safeCarbs * ratio * 10) / 10,
    fat: Math.round(safeFat * ratio * 10) / 10,
    servingSize,
    servingUnit,
  };
}

