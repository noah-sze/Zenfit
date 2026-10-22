import { describe, it, expect } from 'vitest';
import { calculateIngredientMacros, calculateRecipeTotals } from './recipeMath';
import type { FoodItem, RecipeIngredient } from '@/types';

describe('recipeMath 核心純函數測試', () => {
  const mockTomato: FoodItem = {
    id: 'food_tomato',
    name: '牛番茄',
    servingSize: 100,
    servingUnit: 'g',
    calories: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    isCustom: false,
    createdAt: 0,
    updatedAt: 0,
  };

  const mockEgg: FoodItem = {
    id: 'food_egg',
    name: '雞蛋',
    servingSize: 50,
    servingUnit: 'g',
    calories: 72,
    protein: 6.3,
    carbs: 0.4,
    fat: 4.8,
    isCustom: false,
    createdAt: 0,
    updatedAt: 0,
  };

  const mockOil: FoodItem = {
    id: 'food_oil',
    name: '食用植物油',
    servingSize: 10,
    servingUnit: 'g',
    calories: 90,
    protein: 0,
    carbs: 0,
    fat: 10,
    isCustom: false,
    createdAt: 0,
    updatedAt: 0,
  };

  describe('calculateIngredientMacros 單項食材計算', () => {
    it('正常比例換算正確（150g 番茄）', () => {
      const res = calculateIngredientMacros(mockTomato, 150);
      expect(res.calories).toBe(27); // 18 * 1.5 = 27
      expect(res.protein).toBe(1.4); // 0.9 * 1.5 = 1.35 -> 1.4
      expect(res.carbs).toBe(5.9); // 3.9 * 1.5 = 5.85 -> 5.9
      expect(res.fat).toBe(0.3); // 0.2 * 1.5 = 0.3
    });

    it('邊界情況：數量為 0 或負數應回傳全 0', () => {
      expect(calculateIngredientMacros(mockTomato, 0)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      expect(calculateIngredientMacros(mockTomato, -50)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      expect(calculateIngredientMacros(mockTomato, NaN)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('邊界情況：食材為 undefined 或 servingSize 為 0', () => {
      expect(calculateIngredientMacros(undefined, 100)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      const badServingFood = { ...mockTomato, servingSize: 0 };
      expect(calculateIngredientMacros(badServingFood, 100)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });
  });

  describe('calculateRecipeTotals 菜餚組合加權統計', () => {
    const foodMap = new Map<string, FoodItem>([
      [mockTomato.id, mockTomato],
      [mockEgg.id, mockEgg],
      [mockOil.id, mockOil],
    ]);

    const ingredients: RecipeIngredient[] = [
      { foodId: mockTomato.id, foodName: '牛番茄', quantity: 150, unit: 'g', isOptional: false },
      { foodId: mockEgg.id, foodName: '全蛋', quantity: 100, unit: 'g', isOptional: false }, // 2 顆 = 144 kcal, 12.6p, 0.8c, 9.6f
      { foodId: mockOil.id, foodName: '食用植物油', quantity: 10, unit: 'g', isOptional: true }, // 10g = 90 kcal, 0p, 0c, 10f
    ];

    it('完整勾選包含油量：精準計算番茄炒蛋', () => {
      const totals = calculateRecipeTotals({ ingredients }, foodMap);
      // 熱量：27 + 144 + 90 = 261 kcal
      expect(totals.calories).toBe(261);
      // 蛋白質：1.4 + 12.6 + 0 = 14.0 g
      expect(totals.protein).toBe(14);
      // 碳水：5.9 + 0.8 + 0 = 6.7 g
      expect(totals.carbs).toBe(6.7);
      // 脂肪：0.3 + 9.6 + 10 = 19.9 g
      expect(totals.fat).toBe(19.9);
      expect(totals.totalWeightGrams).toBe(260); // 150 + 100 + 10
      expect(totals.ingredientCount).toBe(3);
    });

    it('剔除食用油（如無油烹飪或外食瀝油）', () => {
      // 排除 index = 2 的食用油
      const totals = calculateRecipeTotals({ ingredients }, foodMap, {
        excludedIndices: [2],
      });
      // 熱量扣除 90 kcal：261 - 90 = 171 kcal
      expect(totals.calories).toBe(171);
      // 脂肪扣除 10g：19.9 - 10 = 9.9 g
      expect(totals.fat).toBe(9.9);
      expect(totals.totalWeightGrams).toBe(250);
      expect(totals.ingredientCount).toBe(2);
    });

    it('透過 excludeAllOptional 一鍵剔除所有可選調料', () => {
      const totals = calculateRecipeTotals({ ingredients }, foodMap, {
        excludeAllOptional: true,
      });
      expect(totals.calories).toBe(171);
      expect(totals.fat).toBe(9.9);
      expect(totals.ingredientCount).toBe(2);
    });

    it('異常輸入防護：空菜餚食材清單', () => {
      const emptyTotals = calculateRecipeTotals({ ingredients: [] }, foodMap);
      expect(emptyTotals).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        totalWeightGrams: 0,
        ingredientCount: 0,
      });
    });
  });
});
