import { describe, it, expect } from 'vitest';
import {
  getFoodLogWeightInGrams,
  sortFoodLogsByWeightDesc,
  sortGroupedMealEntriesByWeightDesc,
  type GroupedMealEntry,
} from './dietSorting';

describe('dietSorting (飲食記錄按重量排序機制)', () => {
  describe('getFoodLogWeightInGrams (單位歸一化重量計算)', () => {
    it('應正確解析標準公克 (g)', () => {
      expect(getFoodLogWeightInGrams({ quantity: 150, unit: 'g' })).toBe(150);
      expect(getFoodLogWeightInGrams({ quantity: 50 })).toBe(50); // 預設 g
    });

    it('應正確解析公斤 (kg) 與毫克 (mg)', () => {
      expect(getFoodLogWeightInGrams({ quantity: 1.5, unit: 'kg' })).toBe(1500);
      expect(getFoodLogWeightInGrams({ quantity: 500, unit: 'mg' })).toBe(0.5);
    });

    it('應正確解析盎司 (oz) 與磅 (lb / lbs)', () => {
      const ozWeight = getFoodLogWeightInGrams({ quantity: 2, unit: 'oz' });
      expect(ozWeight).toBeCloseTo(2 * 28.3495, 2);

      const lbWeight = getFoodLogWeightInGrams({ quantity: 1, unit: 'lb' });
      expect(lbWeight).toBeCloseTo(453.59, 1);

      const lbsWeight = getFoodLogWeightInGrams({ quantity: 2, unit: 'lbs' });
      expect(lbsWeight).toBeCloseTo(907.18, 1);
    });

    it('應正確解析容量單位 (ml, l, fl oz)', () => {
      expect(getFoodLogWeightInGrams({ quantity: 250, unit: 'ml' })).toBe(250);
      expect(getFoodLogWeightInGrams({ quantity: 1, unit: 'l' })).toBe(1000);
      expect(getFoodLogWeightInGrams({ quantity: 1, unit: 'liter' })).toBe(1000);

      const flOzWeight = getFoodLogWeightInGrams({ quantity: 8, unit: 'fl oz' });
      expect(flOzWeight).toBeCloseTo(8 * 29.5735, 2);
    });

    it('遇非物理質量單位（如份、個、包）應安全回傳 0', () => {
      expect(getFoodLogWeightInGrams({ quantity: 1, unit: '份' })).toBe(0);
      expect(getFoodLogWeightInGrams({ quantity: 2, unit: '個' })).toBe(0);
    });

    it('邊界異常防護：0、負數、NaN、undefined、null', () => {
      expect(getFoodLogWeightInGrams(null)).toBe(0);
      expect(getFoodLogWeightInGrams(undefined)).toBe(0);
      expect(getFoodLogWeightInGrams({ quantity: 0, unit: 'g' })).toBe(0);
      expect(getFoodLogWeightInGrams({ quantity: -10, unit: 'g' })).toBe(0);
      expect(getFoodLogWeightInGrams({ quantity: NaN, unit: 'g' })).toBe(0);
    });
  });

  describe('sortFoodLogsByWeightDesc (食物記錄陣列降序排序)', () => {
    it('應依重量最重在上降序排列，完美重現使用者範例', () => {
      const rawLogs = [
        { id: '1', foodName: '北大荒 · 純豆漿粉', quantity: 20, unit: 'g', calories: 88 },
        { id: '2', foodName: '雞蛋', quantity: 50, unit: 'g', calories: 72 },
        { id: '3', foodName: '穗格氏 · 燕麥片', quantity: 60, unit: 'g', calories: 233 },
        { id: '4', foodName: '香蕉', quantity: 100, unit: 'g', calories: 89 },
      ];

      const sorted = sortFoodLogsByWeightDesc(rawLogs);

      expect(sorted.map((item) => item.foodName)).toEqual([
        '香蕉', // 100g
        '穗格氏 · 燕麥片', // 60g
        '雞蛋', // 50g
        '北大荒 · 純豆漿粉', // 20g
      ]);
    });

    it('跨單位時應依折算後的公克數精確排序', () => {
      const rawLogs = [
        { id: '1', foodName: '堅果 (1 oz ≈ 28.35g)', quantity: 1, unit: 'oz', calories: 160 },
        { id: '2', foodName: '燕麥奶 (200 ml ≈ 200g)', quantity: 200, unit: 'ml', calories: 120 },
        { id: '3', foodName: '雞胸肉 (50 g)', quantity: 50, unit: 'g', calories: 65 },
      ];

      const sorted = sortFoodLogsByWeightDesc(rawLogs);

      expect(sorted.map((item) => item.foodName)).toEqual([
        '燕麥奶 (200 ml ≈ 200g)', // ~200g
        '雞胸肉 (50 g)', // 50g
        '堅果 (1 oz ≈ 28.35g)', // ~28.35g
      ]);
    });

    it('重量相同時，應依熱量降序破平；熱量仍相同時依建立時間降序', () => {
      const rawLogs = [
        { id: '1', foodName: '低卡蒟蒻', quantity: 100, unit: 'g', calories: 15, createdAt: 100 },
        { id: '2', foodName: '白米飯', quantity: 100, unit: 'g', calories: 130, createdAt: 200 },
        { id: '3', foodName: '米粉 (較早)', quantity: 100, unit: 'g', calories: 130, createdAt: 150 },
      ];

      const sorted = sortFoodLogsByWeightDesc(rawLogs);

      expect(sorted.map((item) => item.foodName)).toEqual([
        '白米飯', // 100g, 130 kcal, createdAt 200
        '米粉 (較早)', // 100g, 130 kcal, createdAt 150
        '低卡蒟蒻', // 100g, 15 kcal
      ]);
    });
  });

  describe('sortGroupedMealEntriesByWeightDesc (單品與菜餚分組排序)', () => {
    it('組合菜餚應以食材總重量參與排序，且內部食材亦自動重量降序', () => {
      const entries: GroupedMealEntry[] = [
        {
          type: 'single',
          log: {
            id: 's1',
            date: '2026-11-13',
            mealType: 'lunch',
            foodName: '水煮蛋 (50g)',
            quantity: 50,
            unit: 'g',
            calories: 72,
            protein: 6.3,
            carbs: 0.4,
            fat: 4.8,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        {
          type: 'bundle',
          bundleId: 'b1',
          bundleTitle: '自製炒飯 (總計 220g)',
          logs: [
            {
              id: 'b1-1',
              date: '2026-11-13',
              mealType: 'lunch',
              foodName: '食用油',
              quantity: 10,
              unit: 'g',
              calories: 90,
              protein: 0,
              carbs: 0,
              fat: 10,
              createdAt: 1,
              updatedAt: 1,
            },
            {
              id: 'b1-2',
              date: '2026-11-13',
              mealType: 'lunch',
              foodName: '白飯',
              quantity: 150,
              unit: 'g',
              calories: 195,
              protein: 3.5,
              carbs: 42,
              fat: 0.5,
              createdAt: 2,
              updatedAt: 2,
            },
            {
              id: 'b1-3',
              date: '2026-11-13',
              mealType: 'lunch',
              foodName: '雞蛋',
              quantity: 60,
              unit: 'g',
              calories: 85,
              protein: 7,
              carbs: 0.5,
              fat: 5.5,
              createdAt: 3,
              updatedAt: 3,
            },
          ],
        },
        {
          type: 'single',
          log: {
            id: 's2',
            date: '2026-11-13',
            mealType: 'lunch',
            foodName: '蘋果 (150g)',
            quantity: 150,
            unit: 'g',
            calories: 78,
            protein: 0.3,
            carbs: 20,
            fat: 0.2,
            createdAt: 4,
            updatedAt: 4,
          },
        },
      ];

      const sorted = sortGroupedMealEntriesByWeightDesc(entries);

      // 總重量比較：炒飯 (220g) > 蘋果 (150g) > 水煮蛋 (50g)
      expect(sorted[0].type).toBe('bundle');
      expect((sorted[0] as any).bundleTitle).toBe('自製炒飯 (總計 220g)');
      expect(sorted[1].type).toBe('single');
      expect((sorted[1] as any).log.foodName).toBe('蘋果 (150g)');
      expect(sorted[2].type).toBe('single');
      expect((sorted[2] as any).log.foodName).toBe('水煮蛋 (50g)');

      // 檢查 bundle 內部的食材是否也按重量降序排好：白飯 (150g) > 雞蛋 (60g) > 食用油 (10g)
      const bundleLogs = (sorted[0] as any).logs;
      expect(bundleLogs.map((l: any) => l.foodName)).toEqual(['白飯', '雞蛋', '食用油']);
    });
  });
});
