import type { FoodCategory, NutritionTag } from '@/types';

export interface NutritionEvaluationInput {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: number;
  servingUnit?: string;
  category?: FoodCategory;
}

export interface NutritionEvaluationResult {
  labels: NutritionTag[];
  highlights: {
    protein: boolean;
    carbs: boolean;
    fat: boolean;
    calories: boolean;
  };
  macroPercentages: {
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
  };
}

/**
 * 計算三大營養素供能比百分比 (Macro Percentages by calories)
 */
export function calculateMacroPercentages(protein: number, carbs: number, fat: number) {
  const pCal = Math.max(0, protein) * 4;
  const cCal = Math.max(0, carbs) * 4;
  const fCal = Math.max(0, fat) * 9;
  const total = pCal + cCal + fCal;

  if (total === 0) {
    return { proteinPct: 0, carbsPct: 0, fatPct: 0 };
  }

  return {
    proteinPct: Math.round((pCal / total) * 100),
    carbsPct: Math.round((cCal / total) * 100),
    fatPct: Math.round((fCal / total) * 100),
  };
}

/**
 * 客觀營養角色多標籤與數值點亮評估函數 (純函數，無副作用)
 */
export function evaluateNutritionalHighlight(food: NutritionEvaluationInput): NutritionEvaluationResult {
  const calories = Math.max(0, food.calories || 0);
  const protein = Math.max(0, food.protein || 0);
  const carbs = Math.max(0, food.carbs || 0);
  const fat = Math.max(0, food.fat || 0);

  const { proteinPct, carbsPct, fatPct } = calculateMacroPercentages(protein, carbs, fat);

  const highlights = {
    protein: false,
    carbs: false,
    fat: false,
    calories: false,
  };

  const isLiquid = (food.servingUnit || 'g').toLowerCase().includes('ml') || food.category === 'beverage';
  const servingAmount = food.servingSize && food.servingSize > 0 ? food.servingSize : 100;
  const factor = 100 / servingAmount;

  const calPer100 = calories * factor;
  const pPer100 = protein * factor;
  const cPer100 = carbs * factor;
  const fPer100 = fat * factor;

  // 調味品截斷防護：調味品分類或微量調味品（<=10g 且 <=30 kcal）不強掛標籤，留白維持清爽
  if (food.category === 'condiment' || (servingAmount <= 10 && calories <= 30)) {
    return {
      labels: [],
      highlights,
      macroPercentages: { proteinPct, carbsPct, fatPct },
    };
  }

  const labels: NutritionTag[] = [];

  // P:E 蛋白質能量純度 (每 100 kcal 所含之蛋白克數)
  const proteinDensityPer100kcal = calories > 0 ? (protein / calories) * 100 : 0;

  // 物理低熱量基準：固體 <= 40 kcal/100g，液體 <= 20 kcal/100ml
  const isLowCal = isLiquid ? calPer100 <= 20 : calPer100 <= 40;

  // ① 蛋白質 P 判定 (防範極低熱量下 P:E 分母趨近於零的奇異點誤判)
  let isPQualified = false;
  if (food.category !== 'oil') {
    if (isLiquid) {
      // 液體：每 100ml >= 3.5g，或單份 >= 8g 且供能比 >= 30% 且濃度 >= 3g/100ml
      isPQualified = pPer100 >= 3.5 || (protein >= 8 && proteinPct >= 30 && pPer100 >= 3);
    } else {
      // 固體：
      if (isLowCal) {
        // 極低熱量下（<= 40 kcal/100g），防範分母奇異點，必須達到實質絕對蛋白濃度 (>= 8g/100g)
        isPQualified = pPer100 >= 8;
      } else {
        // 常規熱量下：高絕對濃度(>=10g/100g)，或達基礎濃度(>=6g/100g)且供能比充沛，或單份充足
        isPQualified =
          pPer100 >= 10 ||
          (pPer100 >= 6 && (proteinPct >= 40 || proteinDensityPer100kcal >= 12)) ||
          (protein >= 8 && proteinPct >= 30 && pPer100 >= 5);
      }
    }
  }

  if (isPQualified) {
    labels.push('high-protein');
    highlights.protein = true;
  }

  // ② 碳水化合物 C 判定 (兼顧絕對重量與供能比，避免低卡蔬果誤判)
  const isCQualified =
    food.category !== 'oil' &&
    (isLiquid
      ? cPer100 >= 10 && carbsPct >= 40
      : cPer100 >= 18 && carbsPct >= 35);

  if (isCQualified) {
    labels.push('carb-source');
    highlights.carbs = true;
  }

  // ③ 脂肪 F 判定
  const isFQualified = food.category === 'oil' || (fPer100 >= 10 && fatPct >= 35);
  if (isFQualified) {
    labels.push('fat-source');
    highlights.fat = true;
  }

  // ④ 低熱量判定 (客觀物理能量密度，排除食用油)
  const isLowCalQualified = isLowCal && food.category !== 'oil';
  if (isLowCalQualified) {
    labels.push('low-calorie');
    highlights.calories = true;
  }

  return {
    labels,
    highlights,
    macroPercentages: { proteinPct, carbsPct, fatPct },
  };
}
