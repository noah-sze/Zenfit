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
});

