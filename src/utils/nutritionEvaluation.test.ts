import { describe, it, expect } from 'vitest';
import { calculateMacroPercentages, evaluateNutritionalHighlight } from './nutritionEvaluation';

describe('calculateMacroPercentages', () => {
  it('should correctly calculate macro percentages', () => {
    // 25g P (100 kcal), 50g C (200 kcal), 10g F (90 kcal), Total = 390 kcal
    const res = calculateMacroPercentages(25, 50, 10);
    expect(res.proteinPct).toBe(26); // 100/390 = 25.6% -> 26%
    expect(res.carbsPct).toBe(51);   // 200/390 = 51.2% -> 51%
    expect(res.fatPct).toBe(23);     // 90/390 = 23.0% -> 23%
  });

  it('should return 0 when all macros are zero', () => {
    const res = calculateMacroPercentages(0, 0, 0);
    expect(res).toEqual({ proteinPct: 0, carbsPct: 0, fatPct: 0 });
  });

  it('should handle negative values safely', () => {
    const res = calculateMacroPercentages(-10, -5, -2);
    expect(res).toEqual({ proteinPct: 0, carbsPct: 0, fatPct: 0 });
  });
});

describe('evaluateNutritionalHighlight', () => {
  it('曼可頓全麥吐司：應同時識別為高蛋白與碳水主食 (多標籤並行，P/C 雙點亮)', () => {
    const res = evaluateNutritionalHighlight({
      calories: 246,
      protein: 10.2,
      carbs: 44.8,
      fat: 2.5,
      servingSize: 100,
      servingUnit: 'g',
      category: 'processed',
    });

    expect(res.labels).toContain('high-protein');
    expect(res.labels).toContain('carb-source');
    expect(res.highlights.protein).toBe(true);
    expect(res.highlights.carbs).toBe(true);
    expect(res.highlights.fat).toBe(false);
  });

  it('鮭魚：應同時識別為高蛋白與脂質來源 (P/F 雙點亮)', () => {
    const res = evaluateNutritionalHighlight({
      calories: 208,
      protein: 20,
      carbs: 0,
      fat: 13,
      servingSize: 100,
      servingUnit: 'g',
      category: 'natural',
    });

    expect(res.labels).toContain('high-protein');
    expect(res.labels).toContain('fat-source');
    expect(res.highlights.protein).toBe(true);
    expect(res.highlights.fat).toBe(true);
    expect(res.highlights.carbs).toBe(false);
  });

  it('牛番茄：熱量極低且無單項絕對含量超標，應精確識別為低熱量 (熱量點亮)', () => {
    const res = evaluateNutritionalHighlight({
      calories: 18,
      protein: 0.9,
      carbs: 3.9,
      fat: 0.2,
      servingSize: 100,
      servingUnit: 'g',
      category: 'natural',
    });

    expect(res.labels).toEqual(['low-calorie']);
    expect(res.highlights.calories).toBe(true);
    expect(res.highlights.carbs).toBe(false);
    expect(res.highlights.protein).toBe(false);
    expect(res.highlights.fat).toBe(false);
  });

  it('雞胸肉：純粹高蛋白', () => {
    const res = evaluateNutritionalHighlight({
      calories: 110,
      protein: 23,
      carbs: 0,
      fat: 1.2,
      servingSize: 100,
      servingUnit: 'g',
      category: 'natural',
    });

    expect(res.labels).toEqual(['high-protein']);
    expect(res.highlights.protein).toBe(true);
    expect(res.highlights.carbs).toBe(false);
    expect(res.highlights.fat).toBe(false);
  });

  it('黑胡椒粒 (調味品)：應觸發調味品截斷，無標籤完全留白', () => {
    const res = evaluateNutritionalHighlight({
      calories: 13,
      protein: 0.5,
      carbs: 3.2,
      fat: 0.2,
      servingSize: 5,
      servingUnit: 'g',
      category: 'condiment',
    });

    expect(res.labels).toEqual([]);
    expect(res.highlights.protein).toBe(false);
    expect(res.highlights.carbs).toBe(false);
    expect(res.highlights.fat).toBe(false);
    expect(res.highlights.calories).toBe(false);
  });

  it('食用植物油：應精確識別為脂質來源，不應被誤判為高蛋白或高碳水', () => {
    const res = evaluateNutritionalHighlight({
      calories: 90,
      protein: 0,
      carbs: 0,
      fat: 10,
      servingSize: 10,
      servingUnit: 'g',
      category: 'oil',
    });

    expect(res.labels).toEqual(['fat-source']);
    expect(res.highlights.fat).toBe(true);
    expect(res.highlights.protein).toBe(false);
    expect(res.highlights.carbs).toBe(false);
  });

  it('無糖豆漿 (飲品 beverage 分類，液體 ml 單位)：蛋白質達到液體高門檻，應識別為高蛋白', () => {
    const res = evaluateNutritionalHighlight({
      calories: 85,
      protein: 8.5,
      carbs: 4.5,
      fat: 3.5,
      servingSize: 250,
      servingUnit: 'ml',
      category: 'beverage',
    });

    expect(res.labels).toContain('high-protein');
    expect(res.highlights.protein).toBe(true);
  });

  it('冷萃黑咖啡 (飲品 beverage 分類，液體 250ml 僅 2 kcal)：應精確識別為低熱量，熱量點亮', () => {
    const res = evaluateNutritionalHighlight({
      calories: 2,
      protein: 0.3,
      carbs: 0.2,
      fat: 0,
      servingSize: 250,
      servingUnit: 'ml',
      category: 'beverage',
    });

    expect(res.labels).toEqual(['low-calorie']);
    expect(res.highlights.calories).toBe(true);
    expect(res.highlights.protein).toBe(false);
  });

  it('極低熱量測試食物 (1 kcal，假設數據)：應精確識別為低熱量，防範分母奇異點誤判高蛋白', () => {
    const res = evaluateNutritionalHighlight({
      calories: 1,
      protein: 1,
      carbs: 1,
      fat: 1,
      servingSize: 100,
      servingUnit: 'g',
      category: 'processed',
    });

    expect(res.labels).toEqual(['low-calorie']);
    expect(res.highlights.calories).toBe(true);
    expect(res.highlights.protein).toBe(false);
    expect(res.highlights.carbs).toBe(false);
    expect(res.highlights.fat).toBe(false);
  });

  it('菠菜等低卡高纖蔬菜：熱量極低且蛋白微量，應純粹識別為低熱量', () => {
    const res = evaluateNutritionalHighlight({
      calories: 23,
      protein: 2.9,
      carbs: 3.6,
      fat: 0.4,
      servingSize: 100,
      servingUnit: 'g',
      category: 'natural',
    });

    expect(res.labels).toEqual(['low-calorie']);
    expect(res.highlights.calories).toBe(true);
    expect(res.highlights.protein).toBe(false);
    expect(res.highlights.carbs).toBe(false);
    expect(res.highlights.fat).toBe(false);
  });
});
