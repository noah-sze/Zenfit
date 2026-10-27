import { describe, it, expect } from 'vitest';
import { calculateScaledNutrition, scaleNutritionFromBasis } from './nutritionMath';

describe('nutritionMath - calculateScaledNutrition', () => {
  it('正確返回「每份」模式之原始數值', () => {
    const item = {
      calories: 88,
      protein: 4.2,
      carbs: 15.4,
      fat: 1.1,
      servingSize: 35,
      servingUnit: 'g',
    };

    const res = calculateScaledNutrition(item, 'serving');
    expect(res).toEqual({
      calories: 88,
      protein: 4.2,
      carbs: 15.4,
      fat: 1.1,
      servingSize: 35,
      servingUnit: 'g',
    });
  });

  it('正確推算「每 100g」模式之數值 (小於 100g 份量放大)', () => {
    // 35g 吐司: factor = 100 / 35 = 2.85714...
    // cal: 88 * factor = 251.428 -> 251
    // p: 4.2 * factor = 12.0
    // c: 15.4 * factor = 44.0
    // f: 1.1 * factor = 3.1428 -> 3.1
    const item = {
      calories: 88,
      protein: 4.2,
      carbs: 15.4,
      fat: 1.1,
      servingSize: 35,
      servingUnit: 'g',
    };

    const res = calculateScaledNutrition(item, 'per100g');
    expect(res.servingSize).toBe(100);
    expect(res.servingUnit).toBe('g');
    expect(res.calories).toBe(251);
    expect(res.protein).toBe(12.0);
    expect(res.carbs).toBe(44.0);
    expect(res.fat).toBe(3.1);
  });

  it('正確推算「每 100g」模式之數值 (大於 100g 份量縮小)', () => {
    // 120g 雞胸肉: factor = 100 / 120 = 0.8333...
    // cal: 138 * (100 / 120) = 115
    // p: 27.6 * (100 / 120) = 23.0
    // c: 0
    // f: 3.0 * (100 / 120) = 2.5
    const item = {
      calories: 138,
      protein: 27.6,
      carbs: 0,
      fat: 3.0,
      servingSize: 120,
      servingUnit: 'g',
    };

    const res = calculateScaledNutrition(item, 'per100g');
    expect(res.servingSize).toBe(100);
    expect(res.servingUnit).toBe('g');
    expect(res.calories).toBe(115);
    expect(res.protein).toBe(23.0);
    expect(res.carbs).toBe(0.0);
    expect(res.fat).toBe(2.5);
  });

  it('當份量本為 100g 時，推算結果應維持原值', () => {
    const item = {
      calories: 200,
      protein: 10,
      carbs: 30,
      fat: 5,
      servingSize: 100,
      servingUnit: 'g',
    };

    const res = calculateScaledNutrition(item, 'per100g');
    expect(res).toEqual({
      calories: 200,
      protein: 10,
      carbs: 30,
      fat: 5,
      servingSize: 100,
      servingUnit: 'g',
    });
  });

  it('液體單位 ml 應於每 100g 模式下正規化為 ml', () => {
    const item = {
      calories: 45,
      protein: 1.5,
      carbs: 6.0,
      fat: 1.5,
      servingSize: 200,
      servingUnit: 'ml',
    };

    const res = calculateScaledNutrition(item, 'per100g');
    expect(res.servingSize).toBe(100);
    expect(res.servingUnit).toBe('ml');
    expect(res.calories).toBe(23); // 45 * 0.5 = 22.5 -> 23
    expect(res.protein).toBe(0.8); // 1.5 * 0.5 = 0.75 -> 0.8
  });

  it('邊界條件防護：份量為 0 或負數時安全處理除以零', () => {
    const item = {
      calories: 100,
      protein: 5,
      carbs: 10,
      fat: 2,
      servingSize: 0,
      servingUnit: 'g',
    };

    const res = calculateScaledNutrition(item, 'per100g');
    expect(res.servingSize).toBe(100);
    expect(res.calories).toBe(100);
    expect(res.protein).toBe(5);
  });

  it('邊界條件防護：輸入為 null 或 undefined 時不拋出異常並回傳預設安全值', () => {
    const resNull = calculateScaledNutrition(null, 'per100g');
    expect(resNull).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: 100,
      servingUnit: 'g',
    });

    const resUndef = calculateScaledNutrition(undefined, 'serving');
    expect(resUndef).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: 100,
      servingUnit: 'g',
    });
  });

  it('負數營養素與 NaN 輸入應被過濾為 0', () => {
    const item = {
      calories: -50,
      protein: NaN,
      carbs: -10,
      fat: -2,
      servingSize: 50,
      servingUnit: 'g',
    };

    const res = calculateScaledNutrition(item, 'per100g');
    expect(res.calories).toBe(0);
    expect(res.protein).toBe(0);
    expect(res.carbs).toBe(0);
    expect(res.fat).toBe(0);
  });

  describe('方案 A：英制單位每 1 oz / 1 fl oz 密度基準', () => {
    it('固體食材 (以 g 為單位)：正確折算為「每 1 oz」基準', () => {
      // 100g 雞胸肉: 110 kcal, 24g p, 0g c, 1.5g f
      // 1 oz = 28.349523125 g
      // factor = 28.349523125 / 100 = 0.283495
      // cal: 110 * 0.283495 = 31.18 -> 31
      // p: 24 * 0.283495 = 6.80 -> 6.8
      // f: 1.5 * 0.283495 = 0.425 -> 0.4
      const item = {
        calories: 110,
        protein: 24,
        carbs: 0,
        fat: 1.5,
        servingSize: 100,
        servingUnit: 'g',
      };

      const res = calculateScaledNutrition(item, 'per100g', { foodWeightUnit: 'oz' });
      expect(res.servingSize).toBe(1);
      expect(res.servingUnit).toBe('oz');
      expect(res.calories).toBe(31);
      expect(res.protein).toBe(6.8);
      expect(res.carbs).toBe(0);
      expect(res.fat).toBe(0.4);
    });

    it('液體食材 (以 ml 為單位)：正確折算為「每 1 fl oz」基準', () => {
      // 240ml 牛奶: 120 kcal, 8g p, 12g c, 5g f
      // 1 fl oz = 29.5735295625 ml
      // factor = 29.5735295625 / 240 = 0.123223...
      // cal: 120 * 0.123223 = 14.78 -> 15
      // p: 8 * 0.123223 = 0.985 -> 1.0
      // c: 12 * 0.123223 = 1.478 -> 1.5
      // f: 5 * 0.123223 = 0.616 -> 0.6
      const item = {
        calories: 120,
        protein: 8,
        carbs: 12,
        fat: 5,
        servingSize: 240,
        servingUnit: 'ml',
      };

      const res = calculateScaledNutrition(item, 'per100g', { foodWeightUnit: 'oz', foodVolumeUnit: 'fl oz' });
      expect(res.servingSize).toBe(1);
      expect(res.servingUnit).toBe('fl oz');
      expect(res.calories).toBe(15);
      expect(res.protein).toBe(1.0);
      expect(res.carbs).toBe(1.5);
      expect(res.fat).toBe(0.6);
    });

    it('原始單位已為 oz 的食品在英制模式下正確折算為每 1 oz', () => {
      // 4 oz 牛排: 240 kcal, 24g p, 0g c, 16g f
      // factor = 1 / 4 = 0.25
      const item = {
        calories: 240,
        protein: 24,
        carbs: 0,
        fat: 16,
        servingSize: 4,
        servingUnit: 'oz',
      };

      const res = calculateScaledNutrition(item, 'per100g', { foodWeightUnit: 'oz' });
      expect(res.servingSize).toBe(1);
      expect(res.servingUnit).toBe('oz');
      expect(res.calories).toBe(60);
      expect(res.protein).toBe(6.0);
      expect(res.carbs).toBe(0);
      expect(res.fat).toBe(4.0);
    });

    it('邊界防護：英制模式下份量為 0 或負數時安全防護除以零', () => {
      const item = {
        calories: 100,
        protein: 10,
        carbs: 20,
        fat: 5,
        servingSize: 0,
        servingUnit: 'g',
      };

      const res = calculateScaledNutrition(item, 'per100g', { foodWeightUnit: 'oz' });
      expect(res.servingSize).toBe(1);
      expect(res.servingUnit).toBe('oz');
      expect(res.calories).toBe(100);
      expect(res.protein).toBe(10);
    });
  });
});

describe('nutritionMath - scaleNutritionFromBasis', () => {
  it('正確將每 100g 標籤數值折算為 20g 單份食用數值', () => {
    const res = scaleNutritionFromBasis({
      calories: 480,
      protein: 30,
      carbs: 40,
      fat: 20,
      servingSize: 20,
      basisSize: 100,
      servingUnit: 'g',
    });

    expect(res).toEqual({
      calories: 96,
      protein: 6.0,
      carbs: 8.0,
      fat: 4.0,
      servingSize: 20,
      servingUnit: 'g',
    });
  });

  it('正確將非百克自定義基準（如每 30g）折算為 20g 單份數值', () => {
    const res = scaleNutritionFromBasis({
      calories: 150,
      protein: 12,
      carbs: 10,
      fat: 5,
      servingSize: 20,
      basisSize: 30,
      servingUnit: 'g',
    });

    // 20 / 30 = 2/3
    // cal: 150 * (2/3) = 100
    // p: 12 * (2/3) = 8.0
    // c: 10 * (2/3) = 6.666 -> 6.7
    // f: 5 * (2/3) = 3.333 -> 3.3
    expect(res).toEqual({
      calories: 100,
      protein: 8.0,
      carbs: 6.7,
      fat: 3.3,
      servingSize: 20,
      servingUnit: 'g',
    });
  });

  it('當標籤基準與食用份量相同時，應保持原值', () => {
    const res = scaleNutritionFromBasis({
      calories: 72,
      protein: 6.3,
      carbs: 0.4,
      fat: 4.8,
      servingSize: 50,
      basisSize: 50,
      servingUnit: 'g',
    });

    expect(res).toEqual({
      calories: 72,
      protein: 6.3,
      carbs: 0.4,
      fat: 4.8,
      servingSize: 50,
      servingUnit: 'g',
    });
  });

  it('防護除以零與無效數值（basisSize <= 0 或負數）', () => {
    const resZero = scaleNutritionFromBasis({
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 5,
      servingSize: 20,
      basisSize: 0,
      servingUnit: 'g',
    });

    expect(resZero.calories).toBe(100);
    expect(resZero.servingSize).toBe(20);

    const resNaN = scaleNutritionFromBasis({
      calories: NaN,
      protein: -5,
      carbs: 10,
      fat: 2,
      servingSize: -10,
      basisSize: -50,
      servingUnit: 'g',
    });

    expect(resNaN.calories).toBe(0);
    expect(resNaN.protein).toBe(0);
    expect(resNaN.servingSize).toBe(100);
  });

  it('支援跨度量衡折算：英制標籤基準 (1 oz) 精確折算為公制食用份量 (30g)', () => {
    const res = scaleNutritionFromBasis({
      calories: 100,
      protein: 10,
      carbs: 5,
      fat: 2,
      servingSize: 30,
      servingUnit: 'g',
      basisSize: 1,
      basisUnit: 'oz',
    });

    // 1 oz = 28.349523125g; 30 / 28.349523125 ≈ 1.058219
    expect(res.calories).toBe(106); // 100 * 1.058219 ≈ 105.82 -> 106
    expect(res.protein).toBe(10.6); // 10 * 1.058219 ≈ 10.58 -> 10.6
    expect(res.carbs).toBe(5.3); // 5 * 1.058219 ≈ 5.29 -> 5.3
    expect(res.fat).toBe(2.1); // 2 * 1.058219 ≈ 2.12 -> 2.1
    expect(res.servingSize).toBe(30);
    expect(res.servingUnit).toBe('g');
  });

  it('支援跨度量衡折算：公制標籤基準 (100g) 精確折算為英制食用份量 (2 oz)', () => {
    const res = scaleNutritionFromBasis({
      calories: 200,
      protein: 20,
      carbs: 10,
      fat: 5,
      servingSize: 2,
      servingUnit: 'oz',
      basisSize: 100,
      basisUnit: 'g',
    });

    // 2 oz = 56.69904625g; ratio = 0.56699
    expect(res.calories).toBe(113); // 200 * 0.56699 = 113.398 -> 113
    expect(res.protein).toBe(11.3); // 20 * 0.56699 = 11.3398 -> 11.3
    expect(res.carbs).toBe(5.7); // 10 * 0.56699 = 5.6699 -> 5.7
    expect(res.fat).toBe(2.8); // 5 * 0.56699 = 2.83495 -> 2.8
    expect(res.servingSize).toBe(2);
    expect(res.servingUnit).toBe('oz');
  });

  it('支援液體跨度量衡折算：英制液體標籤基準 (8 fl oz) 精確折算為公制食用容量 (250ml)', () => {
    const res = scaleNutritionFromBasis({
      calories: 120,
      protein: 2,
      carbs: 28,
      fat: 0,
      servingSize: 250,
      servingUnit: 'ml',
      basisSize: 8,
      basisUnit: 'fl oz',
    });

    // 8 fl oz = 8 * 29.5735295625 = 236.5882365 ml; 250 / 236.5882365 ≈ 1.056688
    expect(res.calories).toBe(127); // 120 * 1.056688 ≈ 126.8 -> 127
    expect(res.protein).toBe(2.1); // 2 * 1.056688 ≈ 2.11 -> 2.1
    expect(res.carbs).toBe(29.6); // 28 * 1.056688 ≈ 29.587 -> 29.6
    expect(res.fat).toBe(0);
    expect(res.servingSize).toBe(250);
    expect(res.servingUnit).toBe('ml');
  });
});

