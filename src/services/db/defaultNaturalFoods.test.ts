import { describe, it, expect } from 'vitest';
import { DEFAULT_NATURAL_FOODS, NATURAL_FOOD_IDS } from './defaultNaturalFoods';

describe('DEFAULT_NATURAL_FOODS 精密客觀測量儀審計', () => {
  it('必須包含全部 409 項雙權威驗證的天然原型食材', () => {
    expect(DEFAULT_NATURAL_FOODS.length).toBe(409);
    expect(Object.keys(NATURAL_FOOD_IDS).length).toBe(409);
  });

  it('每一項食材 ID 均需符合確定性 UUID 格式且無重複', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const seenIds = new Set<string>();

    for (const food of DEFAULT_NATURAL_FOODS) {
      expect(food.id).toMatch(uuidRegex);
      expect(seenIds.has(food.id)).toBe(false);
      seenIds.add(food.id);
    }
  });

  it('所有天然食材 100% 嚴格以未烹調生重為唯一常數，嚴禁包含「生」前綴、「乾重」後綴、純麵條泛稱與熟重副本', () => {
    const forbiddenPrefixes = ['水煮', '香煎', '清蒸', '油炸', '生白米', '生糙米', '生義大利麵', '生核桃', '生杏仁', '生鮮', '純麵條', '純米粉'];
    const forbiddenCookedVariants = ['糙米飯', '熟白米', '熟義大利麵', '水煮蛋', '煎蛋'];
    const forbiddenSuffixes = ['乾重', '生重'];

    for (const food of DEFAULT_NATURAL_FOODS) {
      for (const prefix of forbiddenPrefixes) {
        expect(food.name.startsWith(prefix)).toBe(false);
      }
      for (const suffix of forbiddenSuffixes) {
        expect(food.name.endsWith(suffix)).toBe(false);
      }
      for (const variant of forbiddenCookedVariants) {
        expect(food.name.includes(variant)).toBe(false);
      }
    }
  });

  it('所有天然食材必須通過生物物理 Atwater 能量平衡公式校驗 (|calories - (4C + 4P + 9F)| <= 容許值)', () => {
    for (const food of DEFAULT_NATURAL_FOODS) {
      const theoreticalKcal = 4.0 * food.carbs + 4.0 * food.protein + 9.0 * food.fat;
      const diff = Math.abs(food.calories - theoreticalKcal);
      const maxAllowed = Math.max(15.0, theoreticalKcal * 0.12);
      expect(diff).toBeLessThanOrEqual(maxAllowed);
    }
  });

  it('所有食材計量單位均為公制 g 或 ml，且 servingSize 為 100', () => {
    for (const food of DEFAULT_NATURAL_FOODS) {
      expect(['g', 'ml']).toContain(food.servingUnit);
      expect(food.servingSize).toBe(100);
      expect(food.calories).toBeGreaterThan(0);
      expect(food.protein).toBeGreaterThanOrEqual(0);
      expect(food.carbs).toBeGreaterThanOrEqual(0);
      expect(food.fat).toBeGreaterThanOrEqual(0);
    }
  });
});
