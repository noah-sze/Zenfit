import { describe, it, expect } from 'vitest';
import {
  formatFoodDisplayName,
  resolveAsPlannedDisplayName,
  resolveFoodLogTitle,
} from './foodNaming';
import type { FoodItem } from '@/types';

describe('formatFoodDisplayName (食物名稱格式化)', () => {
  it('當無品牌時，應僅輸出食物原名', () => {
    expect(formatFoodDisplayName({ name: '牛板腱' })).toBe('牛板腱');
    expect(formatFoodDisplayName({ name: '白米飯', brand: '' })).toBe('白米飯');
    expect(formatFoodDisplayName({ name: '地瓜', brand: '   ' })).toBe('地瓜');
    expect(formatFoodDisplayName({ name: '雞蛋', brand: null })).toBe('雞蛋');
    expect(formatFoodDisplayName({ name: '鮭魚', brand: undefined })).toBe('鮭魚');
  });

  it('當有品牌時，應輸出「品牌 · 名稱」（使用 U+00B7 Middle Dot 與半形空格）', () => {
    expect(formatFoodDisplayName({ name: '全麥吐司', brand: '曼可頓' })).toBe('曼可頓 · 全麥吐司');
    expect(formatFoodDisplayName({ name: '燕麥奶', brand: 'Oatly' })).toBe('Oatly · 燕麥奶');
    expect(formatFoodDisplayName({ name: '希臘優格', brand: 'Chobani' })).toBe('Chobani · 希臘優格');
    expect(formatFoodDisplayName({ name: '分離乳清蛋白', brand: 'Myprotein' })).toBe('Myprotein · 分離乳清蛋白');
  });

  it('應自動去除首尾多餘空格', () => {
    expect(formatFoodDisplayName({ name: '  全麥吐司  ', brand: '  曼可頓  ' })).toBe('曼可頓 · 全麥吐司');
  });

  it('防呆：當名稱本身已包含該品牌前綴時，避免重複拼接', () => {
    expect(formatFoodDisplayName({ name: '曼可頓 · 全麥吐司', brand: '曼可頓' })).toBe('曼可頓 · 全麥吐司');
    expect(formatFoodDisplayName({ name: '曼可頓 • 全麥吐司', brand: '曼可頓' })).toBe('曼可頓 • 全麥吐司');
    expect(formatFoodDisplayName({ name: 'Oatly · 燕麥奶', brand: 'Oatly' })).toBe('Oatly · 燕麥奶');
  });

  it('邊界防護：處理空值或極端輸入', () => {
    expect(formatFoodDisplayName({ name: '', brand: '曼可頓' })).toBe('曼可頓 · ');
    expect(formatFoodDisplayName({ name: null, brand: null })).toBe('');
    expect(formatFoodDisplayName({})).toBe('');
  });
});

describe('resolveAsPlannedDisplayName (算我正常吃 / 歷史均值顯示名稱解析)', () => {
  it('歷史配額標題應自動正規化為精簡預設名稱（如「歷史均值」）', () => {
    expect(resolveAsPlannedDisplayName({ foodName: '午餐 配額' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '早餐 配額' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '晚餐 配額' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '加餐 配額' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '午餐 配额' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '正常飲食' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '正常饮食' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '算我正常吃' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '算我正常食' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '歷史均值' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '历史均值' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: 'Lunch Budget' }, 'Past Average')).toBe('Past Average');
  });

  it('空白或未設定 foodName 時應回退至預設名稱', () => {
    expect(resolveAsPlannedDisplayName({})).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: '   ' })).toBe('歷史均值');
    expect(resolveAsPlannedDisplayName({ foodName: null as any }, '歷史均值')).toBe('歷史均值');
  });

  it('若已有自訂具體備註，應完整保留原名稱', () => {
    expect(resolveAsPlannedDisplayName({ foodName: '公司便當' })).toBe('公司便當');
    expect(resolveAsPlannedDisplayName({ foodName: '媽媽煮的晚餐' })).toBe('媽媽煮的晚餐');
    expect(resolveAsPlannedDisplayName({ foodName: '商務宴請' })).toBe('商務宴請');
  });
});

describe('resolveFoodLogTitle (系統分類條目動態解析)', () => {
  const mockT = (key: string, defaultValue?: string) => {
    const dict: Record<string, string> = {
      'diet.asPlanned.defaultName': '歷史均值',
      'diet.placeholder.scenarioBalanced': '常規',
      'diet.placeholder.scenarioHotpot': '火鍋',
      'diet.placeholder.scenarioBento': '便當',
      'diet.placeholder.scenarioFastfood': '快餐',
      'diet.placeholder.scenarioBbq': '燒肉',
      'diet.placeholder.scenarioSushi': '壽司',
      'diet.placeholder.scenarioPizza': '披薩',
      'diet.placeholder.scenarioSalad': '輕食',
      'diet.placeholder.scenarioParty': '酒局',
      'diet.placeholder.scenarioDessert': '甜點',
      'diet.unknownFood': '未知食材',
    };
    return dict[key] || defaultValue || key;
  };

  it('若 customTitle 存在，應優先返回自訂標題', () => {
    expect(
      resolveFoodLogTitle(
        {
          id: '1',
          date: '2026-11-11',
          mealType: 'lunch',
          entryType: 'estimate',
          scenario: 'hotpot',
          customTitle: '海底撈聚餐',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any
      )
    ).toBe('海底撈聚餐');

    expect(
      resolveFoodLogTitle(
        {
          id: '2',
          date: '2026-11-11',
          mealType: 'dinner',
          entryType: 'as_planned',
          customTitle: '媽媽煮的愛心便當',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any
      )
    ).toBe('媽媽煮的愛心便當');
  });

  it('as_planned 條目無自訂標題時，應返回多語系歷史均值', () => {
    expect(
      resolveFoodLogTitle(
        {
          id: '3',
          date: '2026-11-11',
          mealType: 'breakfast',
          entryType: 'as_planned',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any
      )
    ).toBe('歷史均值');

    // 支援英文 i18n
    const mockEnT = (key: string, defaultValue?: string) => {
      if (key === 'diet.asPlanned.defaultName') return 'Past Average';
      return defaultValue || key;
    };
    expect(
      resolveFoodLogTitle(
        {
          id: '4',
          date: '2026-11-11',
          mealType: 'breakfast',
          entryType: 'as_planned',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockEnT as any
      )
    ).toBe('Past Average');
  });

  it('estimate 條目應依據 scenario 返回對應多語系場景名稱', () => {
    expect(
      resolveFoodLogTitle(
        {
          id: '5',
          date: '2026-11-11',
          mealType: 'dinner',
          entryType: 'estimate',
          scenario: 'hotpot',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any
      )
    ).toBe('火鍋');

    expect(
      resolveFoodLogTitle(
        {
          id: '6',
          date: '2026-11-11',
          mealType: 'lunch',
          entryType: 'estimate',
          scenario: 'bento',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any
      )
    ).toBe('便當');
  });

  it('舊版 isPlaceholder 資料若無 scenario，應依宏量比例動態推斷', () => {
    // 高脂高蛋白火鍋比例 (C: 10g, P: 30g, F: 50g)
    expect(
      resolveFoodLogTitle(
        {
          id: '7',
          date: '2026-11-11',
          mealType: 'dinner',
          isPlaceholder: true,
          calories: 610,
          carbs: 10,
          protein: 30,
          fat: 50,
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any
      )
    ).toBe('火鍋');
  });

  it('實體食材 (entryType === item 或無 entryType) 應返回食材名稱', () => {
    expect(
      resolveFoodLogTitle(
        {
          id: '8',
          date: '2026-11-11',
          mealType: 'lunch',
          entryType: 'item',
          foodName: '雞胸肉',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any
      )
    ).toBe('雞胸肉');
  });

  it('當傳入實體食材且 log.foodName 為空時，應正確返回實體食材名稱（含品牌前綴）', () => {
    const mockFoodWithBrand: FoodItem = {
      id: 'food-1',
      name: '全麥吐司',
      brand: '曼可頓',
      calories: 250,
      protein: 8,
      carbs: 45,
      fat: 3,
      servingSize: 100,
      servingUnit: 'g',
    } as FoodItem;

    expect(
      resolveFoodLogTitle(
        {
          id: '9',
          date: '2026-11-11',
          mealType: 'breakfast',
          entryType: 'item',
          foodId: 'food-1',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any,
        mockFoodWithBrand
      )
    ).toBe('曼可頓 · 全麥吐司');

    const mockFoodWithoutBrand: FoodItem = {
      id: 'food-2',
      name: '水煮蛋',
      calories: 70,
      protein: 6,
      carbs: 1,
      fat: 5,
      servingSize: 50,
      servingUnit: 'g',
    } as FoodItem;

    expect(
      resolveFoodLogTitle(
        {
          id: '10',
          date: '2026-11-11',
          mealType: 'breakfast',
          entryType: 'item',
          foodId: 'food-2',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any,
        mockFoodWithoutBrand
      )
    ).toBe('水煮蛋');
  });

  it('若無實體食材且 log.foodName 為空，應退回未知食材多語系提示', () => {
    expect(
      resolveFoodLogTitle(
        {
          id: '11',
          date: '2026-11-11',
          mealType: 'lunch',
          entryType: 'item',
          createdAt: 1000,
          updatedAt: 1000,
        },
        mockT as any
      )
    ).toBe('未知食材');
  });
});


