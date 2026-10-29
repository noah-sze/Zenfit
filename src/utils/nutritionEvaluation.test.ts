import { describe, it, expect } from 'vitest';
import { calculateMacroPercentages, evaluateNutritionalHighlight } from './nutritionEvaluation';

describe('calculateMacroPercentages', () => {
  it('should correctly calculate macro percentages', () => {
    // 50g C (200 kcal), 25g P (100 kcal), 10g F (90 kcal), Total = 390 kcal
    const res = calculateMacroPercentages(50, 25, 10);
    expect(res.carbsPct).toBe(51);   // 200/390 = 51.2% -> 51%
    expect(res.proteinPct).toBe(26); // 100/390 = 25.6% -> 26%
    expect(res.fatPct).toBe(23);     // 90/390 = 23.0% -> 23%
  });

  it('should return 0 when all macros are zero', () => {
    const res = calculateMacroPercentages(0, 0, 0);
    expect(res).toEqual({ carbsPct: 0, proteinPct: 0, fatPct: 0 });
  });

  it('should handle negative values safely', () => {
    const res = calculateMacroPercentages(-5, -10, -2);
    expect(res).toEqual({ carbsPct: 0, proteinPct: 0, fatPct: 0 });
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

  it('食用植物油：應精確識別為脂質來源與高熱量，不應被誤判為高蛋白或高碳水', () => {
    const res = evaluateNutritionalHighlight({
      calories: 90,
      protein: 0,
      carbs: 0,
      fat: 10,
      servingSize: 10,
      servingUnit: 'g',
      category: 'oil',
    });

    expect(res.labels).toContain('fat-source');
    expect(res.labels).toContain('high-calorie');
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

  it('堅果 (花生/核桃/杏仁)：能量密度高達 567 kcal/100g，應精確識別為脂質來源與高熱量', () => {
    const res = evaluateNutritionalHighlight({
      calories: 567,
      protein: 25.8,
      carbs: 16.1,
      fat: 49.2,
      servingSize: 100,
      servingUnit: 'g',
      category: 'natural',
    });

    expect(res.labels).toContain('high-calorie');
    expect(res.labels).toContain('fat-source');
  });

  it('純乳清蛋白粉：乾粉能量達 400 kcal/100g，但蛋白供能比 80% 且極低脂，應受純蛋白防護，不歸為高熱量', () => {
    const res = evaluateNutritionalHighlight({
      calories: 120,
      protein: 24,
      carbs: 2,
      fat: 1.5,
      servingSize: 30,
      servingUnit: 'g',
      category: 'processed',
    });

    expect(res.labels).toContain('high-protein');
    expect(res.labels).not.toContain('high-calorie');
  });

  it('生燕麥片：每 100g 389 kcal，主要為碳水主食，不應被誤判為高熱量', () => {
    const res = evaluateNutritionalHighlight({
      calories: 389,
      protein: 16.9,
      carbs: 66.3,
      fat: 6.9,
      servingSize: 100,
      servingUnit: 'g',
      category: 'natural',
    });

    expect(res.labels).toContain('carb-source');
    expect(res.labels).not.toContain('high-calorie');
  });

  it('高能量液體 (重奶油/防彈生酮油飲)：每 100ml 達 345 kcal，應精確識別為高熱量', () => {
    const res = evaluateNutritionalHighlight({
      calories: 345,
      protein: 2,
      carbs: 3,
      fat: 37,
      servingSize: 100,
      servingUnit: 'ml',
      category: 'beverage',
    });

    expect(res.labels).toContain('high-calorie');
  });

  it('一般飲品 (可樂 42 kcal/100ml)：未達 100 kcal/100ml 閾值，不應識別為高熱量', () => {
    const res = evaluateNutritionalHighlight({
      calories: 42,
      protein: 0,
      carbs: 10.6,
      fat: 0,
      servingSize: 100,
      servingUnit: 'ml',
      category: 'beverage',
    });

    expect(res.labels).not.toContain('high-calorie');
  });

  it('複合高能餐食 (300g 漢堡套餐 650 kcal)：單份 >= 500 kcal 且密度 >= 200 kcal/100g，應識別為高熱量', () => {
    const res = evaluateNutritionalHighlight({
      calories: 650,
      protein: 30,
      carbs: 55,
      fat: 35,
      servingSize: 300,
      servingUnit: 'g',
    });

    expect(res.labels).toContain('high-calorie');
  });

  it('大份量低密度水分蔬果 (1500g 西瓜 450 kcal)：密度僅 30 kcal/100g，防誤判防線生效，不應被識別為高熱量', () => {
    const res = evaluateNutritionalHighlight({
      calories: 450,
      protein: 9,
      carbs: 112,
      fat: 2,
      servingSize: 1500,
      servingUnit: 'g',
      category: 'natural',
    });

    expect(res.labels).not.toContain('high-calorie');
  });
});
