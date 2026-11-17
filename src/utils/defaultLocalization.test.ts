import { describe, it, expect } from 'vitest';
import {
  getLocalizedFoodName,
  getLocalizedExerciseName,
} from './defaultLocalization';
import { DEFAULT_FOOD_IDS, DEFAULT_FOODS } from '@/services/db/defaultData';
import { DEFAULT_EXERCISE_IDS, DEFAULT_EXERCISES } from '@/services/db/defaultExercises';

describe('defaultLocalization', () => {
  it('能為系統預設食材依語系返回對應翻譯（繁中 / 簡中 / 英文）', () => {
    const potato = { id: DEFAULT_FOOD_IDS.potato_raw, name: '馬鈴薯', isCustom: false };
    expect(getLocalizedFoodName(potato, 'zh-TW')).toBe('馬鈴薯');
    expect(getLocalizedFoodName(potato, 'zh-CN')).toBe('土豆');
    expect(getLocalizedFoodName(potato, 'en')).toBe('Potato');

    const chicken = { id: DEFAULT_FOOD_IDS.chicken_breast, name: '雞胸肉', isCustom: false };
    expect(getLocalizedFoodName(chicken, 'zh-TW')).toBe('雞胸肉');
    expect(getLocalizedFoodName(chicken, 'zh-CN')).toBe('鸡胸肉');
    expect(getLocalizedFoodName(chicken, 'en')).toBe('Chicken Breast');
  });

  it('能為系統預設動作依語系返回對應翻譯（繁中 / 簡中 / 英文）', () => {
    const bench = { id: DEFAULT_EXERCISE_IDS.bench_press, name: '槓鈴臥推', isCustom: false };
    expect(getLocalizedExerciseName(bench, 'zh-TW')).toBe('槓鈴臥推');
    expect(getLocalizedExerciseName(bench, 'zh-CN')).toBe('杠铃卧推');
    expect(getLocalizedExerciseName(bench, 'en')).toBe('Barbell Bench Press');
  });

  it('自定義項目（isCustom: true）或手動改名項目應保留原名稱不被覆蓋', () => {
    const customFood = { id: DEFAULT_FOOD_IDS.chicken_breast, name: '私房雞胸', isCustom: true };
    expect(getLocalizedFoodName(customFood, 'en')).toBe('私房雞胸');

    const renamedDefault = { id: DEFAULT_FOOD_IDS.chicken_breast, name: '水煮雞胸A', isCustom: false };
    expect(getLocalizedFoodName(renamedDefault, 'en')).toBe('水煮雞胸A');
  });

  it('應完整覆蓋所有預設食材與預設動作 ID', () => {
    for (const food of DEFAULT_FOODS) {
      expect(getLocalizedFoodName(food, 'en')).not.toBe(food.name);
      expect(getLocalizedFoodName(food, 'zh-CN').length).toBeGreaterThan(0);
    }
    for (const ex of DEFAULT_EXERCISES) {
      expect(getLocalizedExerciseName(ex, 'en')).not.toBe(ex.name);
      expect(getLocalizedExerciseName(ex, 'zh-CN').length).toBeGreaterThan(0);
    }
  });
});
