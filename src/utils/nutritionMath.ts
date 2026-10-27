import type { FoodWeightUnit, FoodVolumeUnit } from '@/types';
import { OZ_TO_G_RATIO, FL_OZ_TO_ML_RATIO } from './unitMath';

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

export interface ScaledNutritionOptions {
  foodWeightUnit?: FoodWeightUnit;
  foodVolumeUnit?: FoodVolumeUnit;
}

/**
 * 依據顯示模式（每份基準 vs 密度基準 100g / 1 oz），精確推算熱量與三大營養素
 * 純數學無副作用函數，100% 覆蓋邊界情況（除以零、無效數值、負數防護）
 * 
 * 方案 A 國際化密度標準 (SSOT)：
 * - 公制 (g / ml)：以「每 100g」（液體為「每 100ml」）為密度標準
 * - 英制 (oz / fl oz)：以「每 1 oz」（液體為「每 1 fl oz」）為密度標準
 */
export function calculateScaledNutrition(
  item: BaseNutritionInput | null | undefined,
  mode: NutritionDisplayMode = 'serving',
  options?: ScaledNutritionOptions
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

  // 「密度」模式 (per100g / per 1 oz)：
  const normalizedRawUnit = rawUnit.toLowerCase();
  const isLiquid = normalizedRawUnit.includes('ml') || normalizedRawUnit.includes('fl');
  const isImperial = options?.foodWeightUnit === 'oz';

  // 邊界防護：若份量無效或 <= 0，除以零防護，回退為原始數值或預設基準
  if (rawSize <= 0) {
    if (isImperial) {
      return {
        calories: Math.round(safeCalories),
        protein: Math.round(safeProtein * 10) / 10,
        carbs: Math.round(safeCarbs * 10) / 10,
        fat: Math.round(safeFat * 10) / 10,
        servingSize: 1,
        servingUnit: isLiquid ? 'fl oz' : 'oz',
      };
    }
    return {
      calories: Math.round(safeCalories),
      protein: Math.round(safeProtein * 10) / 10,
      carbs: Math.round(safeCarbs * 10) / 10,
      fat: Math.round(safeFat * 10) / 10,
      servingSize: 100,
      servingUnit: isLiquid ? 'ml' : 'g',
    };
  }

  if (isImperial) {
    // 方案 A 英制密度基準：固體為 1 oz，液體為 1 fl oz
    let factor = 1;
    if (isLiquid) {
      // 基準為 1 fl oz
      if (normalizedRawUnit.includes('fl')) {
        // 原始單位已是 fl oz
        factor = 1 / rawSize;
      } else {
        // 原始單位為 ml (1 fl oz = FL_OZ_TO_ML_RATIO ml)
        factor = FL_OZ_TO_ML_RATIO / rawSize;
      }
      return {
        calories: Math.round(safeCalories * factor),
        protein: Math.round(safeProtein * factor * 10) / 10,
        carbs: Math.round(safeCarbs * factor * 10) / 10,
        fat: Math.round(safeFat * factor * 10) / 10,
        servingSize: 1,
        servingUnit: 'fl oz',
      };
    } else {
      // 基準為 1 oz
      if (normalizedRawUnit.includes('oz')) {
        // 原始單位已是 oz
        factor = 1 / rawSize;
      } else {
        // 原始單位為 g (1 oz = OZ_TO_G_RATIO g)
        factor = OZ_TO_G_RATIO / rawSize;
      }
      return {
        calories: Math.round(safeCalories * factor),
        protein: Math.round(safeProtein * factor * 10) / 10,
        carbs: Math.round(safeCarbs * factor * 10) / 10,
        fat: Math.round(safeFat * factor * 10) / 10,
        servingSize: 1,
        servingUnit: 'oz',
      };
    }
  }

  // 公制密度基準：固體為 100g，液體為 100ml
  let factor = 1;
  if (isLiquid) {
    if (normalizedRawUnit.includes('fl')) {
      // 原始單位為 fl oz，100ml = 100 / FL_OZ_TO_ML_RATIO fl oz
      factor = (100 / FL_OZ_TO_ML_RATIO) / rawSize;
    } else {
      factor = 100 / rawSize;
    }
    return {
      calories: Math.round(safeCalories * factor),
      protein: Math.round(safeProtein * factor * 10) / 10,
      carbs: Math.round(safeCarbs * factor * 10) / 10,
      fat: Math.round(safeFat * factor * 10) / 10,
      servingSize: 100,
      servingUnit: 'ml',
    };
  } else {
    if (normalizedRawUnit.includes('oz')) {
      // 原始單位為 oz，100g = 100 / OZ_TO_G_RATIO oz
      factor = (100 / OZ_TO_G_RATIO) / rawSize;
    } else {
      factor = 100 / rawSize;
    }
    return {
      calories: Math.round(safeCalories * factor),
      protein: Math.round(safeProtein * factor * 10) / 10,
      carbs: Math.round(safeCarbs * factor * 10) / 10,
      fat: Math.round(safeFat * factor * 10) / 10,
      servingSize: 100,
      servingUnit: 'g',
    };
  }
}

export interface ScaleBasisParams {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number; // 食用單份數值 (如 20g 或 2 oz)
  servingUnit?: string; // 食用單份單位 (如 'g', 'oz', 'ml', 'fl oz')
  basisSize: number;   // 標籤依據數值 (如 100g 或 1 oz)
  basisUnit?: string;   // 標籤依據單位 (如 'g', 'oz', 'ml', 'fl oz')
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
 * 將數值依據單位歸一化為物理真理源基準 (固體為 g，液體為 ml)
 */
function normalizeToPhysicalBase(value: number, unit?: string): number {
  if (value <= 0 || isNaN(value) || !isFinite(value)) return 0;
  const normalizedUnit = (unit || 'g').trim().toLowerCase();

  if (normalizedUnit === 'oz') {
    return value * OZ_TO_G_RATIO;
  }
  if (normalizedUnit === 'fl oz') {
    return value * FL_OZ_TO_ML_RATIO;
  }
  // 預設為 g 或 ml
  return value;
}

/**
 * 依據自定義營養標籤依據（basisSize 與 basisUnit，如每 100g 或每 1 oz），
 * 精確等比折算出單份食用量（servingSize 與 servingUnit）的實際營養數值。
 * 遵循 Precision Metric 準則：純函數無副作用，100% 防護 NaN、負數、跨度量衡單位折算與除以零
 */
export function scaleNutritionFromBasis(params: ScaleBasisParams): ScaledServingNutrition {
  const safeCalories = Math.max(0, typeof params?.calories === 'number' && !isNaN(params.calories) ? params.calories : 0);
  const safeProtein = Math.max(0, typeof params?.protein === 'number' && !isNaN(params.protein) ? params.protein : 0);
  const safeCarbs = Math.max(0, typeof params?.carbs === 'number' && !isNaN(params.carbs) ? params.carbs : 0);
  const safeFat = Math.max(0, typeof params?.fat === 'number' && !isNaN(params.fat) ? params.fat : 0);

  const servingSize = Math.max(0, typeof params?.servingSize === 'number' && !isNaN(params.servingSize) ? params.servingSize : 100);
  const basisSize = typeof params?.basisSize === 'number' && !isNaN(params.basisSize) ? params.basisSize : 100;
  const rawServingUnit = (params?.servingUnit || 'g').trim() || 'g';
  const rawBasisUnit = (params?.basisUnit || rawServingUnit).trim() || rawServingUnit;

  const servingPhysical = normalizeToPhysicalBase(servingSize, rawServingUnit);
  const basisPhysical = normalizeToPhysicalBase(basisSize, rawBasisUnit);

  // 防護除以零或無效基準重量
  if (basisPhysical <= 0 || servingPhysical <= 0) {
    return {
      calories: Math.round(safeCalories),
      protein: Math.round(safeProtein * 10) / 10,
      carbs: Math.round(safeCarbs * 10) / 10,
      fat: Math.round(safeFat * 10) / 10,
      servingSize: servingSize > 0 ? servingSize : 100,
      servingUnit: rawServingUnit,
    };
  }

  const ratio = servingPhysical / basisPhysical;

  return {
    calories: Math.round(safeCalories * ratio),
    protein: Math.round(safeProtein * ratio * 10) / 10,
    carbs: Math.round(safeCarbs * ratio * 10) / 10,
    fat: Math.round(safeFat * ratio * 10) / 10,
    servingSize,
    servingUnit: rawServingUnit,
  };
}

