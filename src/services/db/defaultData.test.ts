import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EQUIPMENTS,
  DEFAULT_EXERCISES,
  DEFAULT_FOODS,
  DEFAULT_RECIPES,
} from './defaultData';

describe('系統預設數據完整性與原子計量規範測試', () => {
  it('所有默認器械應具備唯一 ID 與非空名稱', () => {
    const ids = new Set<string>();
    for (const eq of DEFAULT_EQUIPMENTS) {
      expect(eq.id).toBeTruthy();
      expect(eq.name.trim()).toBeTruthy();
      expect(ids.has(eq.id)).toBe(false);
      ids.add(eq.id);
    }
  });

  it('所有默認單品食材應符合物理克數/毫升標準且熱量宏量素非負', () => {
    const foodIds = new Set<string>();
    for (const food of DEFAULT_FOODS) {
      expect(foodIds.has(food.id)).toBe(false);
      foodIds.add(food.id);

      expect(food.servingSize).toBeGreaterThan(0);
      expect(['g', 'ml']).toContain(food.servingUnit);
      expect(food.calories).toBeGreaterThanOrEqual(0);
      expect(food.protein).toBeGreaterThanOrEqual(0);
      expect(food.carbs).toBeGreaterThanOrEqual(0);
      expect(food.fat).toBeGreaterThanOrEqual(0);
      expect(['natural', 'processed', 'beverage', 'oil', 'condiment']).toContain(food.category);
      // 確保單品名稱不包含主觀修飾形容詞或烹飪手法
      expect(food.name).not.toMatch(/^(香煎|水煮|清炒|油炸|烤|炸)/);
    }

    const soyMilk = DEFAULT_FOODS.find((f) => f.id === 'food_soy_milk');
    expect(soyMilk?.category).toBe('beverage');
    expect(soyMilk?.servingUnit).toBe('ml');
  });

  it('所有默認動作之刺激肌群強度應介於 0 至 100 之間', () => {
    for (const ex of DEFAULT_EXERCISES) {
      expect(ex.name.trim()).toBeTruthy();
      expect(['free_weight', 'machine', 'bodyweight', 'cardio']).toContain(ex.category);

      const muscleEntries = Object.entries(ex.targetMuscles || {});
      expect(muscleEntries.length).toBeGreaterThan(0);
      for (const [, intensity] of muscleEntries) {
        expect(intensity).toBeGreaterThanOrEqual(0);
        expect(intensity).toBeLessThanOrEqual(100);
      }
    }
  });

  it('所有默認菜餚配方中所引用的食材 ID 必須客觀存在於單品食材庫中', () => {
    const defaultFoodIdSet = new Set(DEFAULT_FOODS.map((f) => f.id));
    for (const recipe of DEFAULT_RECIPES) {
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      for (const ing of recipe.ingredients) {
        expect(defaultFoodIdSet.has(ing.foodId)).toBe(true);
        expect(ing.quantity).toBeGreaterThan(0);
        expect(ing.unit).toBe('g');
      }
    }
  });
});
