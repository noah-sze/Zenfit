import { describe, it, expect } from 'vitest';
import { extractRecentFoodAndRecipeIds } from './useRecentFoods';
import type { DailyDietLog } from '@/types';

describe('extractRecentFoodAndRecipeIds', () => {
  it('應該在空日誌陣列時回傳空陣列', () => {
    const result = extractRecentFoodAndRecipeIds([]);
    expect(result.recentFoodIds).toEqual([]);
    expect(result.recentRecipeIds).toEqual([]);
  });

  it('應該按最後使用時間倒序去重排列食材 ID', () => {
    const mockLogs: DailyDietLog[] = [
      {
        id: 'day-1',
        date: '2026-11-01',
        meta: { activityLevel: 1.55, macroSplit: { carbs: 50, protein: 30, fat: 20 } },
        entries: [
          {
            id: 'e1',
            date: '2026-11-01',
            mealType: 'breakfast',
            foodId: 'food-oats',
            quantity: 50,
            unit: 'g',
            createdAt: 1000,
            updatedAt: 1000,
          },
          {
            id: 'e2',
            date: '2026-11-01',
            mealType: 'lunch',
            foodId: 'food-chicken',
            quantity: 150,
            unit: 'g',
            createdAt: 2000,
            updatedAt: 2000,
          },
        ],
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: 'day-2',
        date: '2026-11-02',
        meta: { activityLevel: 1.55, macroSplit: { carbs: 50, protein: 30, fat: 20 } },
        entries: [
          {
            id: 'e3',
            date: '2026-11-02',
            mealType: 'breakfast',
            foodId: 'food-egg',
            quantity: 100,
            unit: 'g',
            createdAt: 3000,
            updatedAt: 3000,
          },
          {
            id: 'e4',
            date: '2026-11-02',
            mealType: 'lunch',
            foodId: 'food-oats', // 重新使用燕麥，時間為 4000
            quantity: 60,
            unit: 'g',
            createdAt: 4000,
            updatedAt: 4000,
          },
        ],
        createdAt: 3000,
        updatedAt: 4000,
      },
    ];

    const result = extractRecentFoodAndRecipeIds(mockLogs);
    // 時間順序：food-oats (4000) > food-egg (3000) > food-chicken (2000)
    expect(result.recentFoodIds).toEqual(['food-oats', 'food-egg', 'food-chicken']);
    expect(result.recentRecipeIds).toEqual([]);
  });

  it('應該正確提取食譜配方 (bundleId) 並按時間排序', () => {
    const mockLogs: DailyDietLog[] = [
      {
        id: 'day-1',
        date: '2026-11-01',
        meta: { activityLevel: 1.55, macroSplit: { carbs: 50, protein: 30, fat: 20 } },
        entries: [
          {
            id: 'e1',
            date: '2026-11-01',
            mealType: 'lunch',
            foodId: 'food-rice',
            bundleId: 'recipe-fried-rice',
            quantity: 150,
            unit: 'g',
            createdAt: 1500,
            updatedAt: 1500,
          },
          {
            id: 'e2',
            date: '2026-11-01',
            mealType: 'dinner',
            foodId: 'food-beef',
            bundleId: 'recipe-beef-stew',
            quantity: 200,
            unit: 'g',
            createdAt: 2500,
            updatedAt: 2500,
          },
        ],
        createdAt: 1000,
        updatedAt: 2500,
      },
    ];

    const result = extractRecentFoodAndRecipeIds(mockLogs);
    expect(result.recentRecipeIds).toEqual(['recipe-beef-stew', 'recipe-fried-rice']);
    expect(result.recentFoodIds).toEqual(['food-beef', 'food-rice']);
  });

  it('應該優雅處理缺失 createdAt/updatedAt 的情況（以日誌日期為保底）', () => {
    const mockLogs: DailyDietLog[] = [
      {
        id: 'day-1',
        date: '2026-11-01',
        meta: { activityLevel: 1.55, macroSplit: { carbs: 50, protein: 30, fat: 20 } },
        entries: [
          {
            id: 'e1',
            date: '2026-11-01',
            mealType: 'breakfast',
            foodId: 'food-banana',
            quantity: 100,
            unit: 'g',
            createdAt: 0,
            updatedAt: 0,
          },
        ],
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'day-2',
        date: '2026-11-03',
        meta: { activityLevel: 1.55, macroSplit: { carbs: 50, protein: 30, fat: 20 } },
        entries: [
          {
            id: 'e2',
            date: '2026-11-03',
            mealType: 'breakfast',
            foodId: 'food-apple',
            quantity: 150,
            unit: 'g',
            createdAt: 0,
            updatedAt: 0,
          },
        ],
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const result = extractRecentFoodAndRecipeIds(mockLogs);
    // 2026-11-03 比 2026-11-01 新
    expect(result.recentFoodIds).toEqual(['food-apple', 'food-banana']);
  });
});
