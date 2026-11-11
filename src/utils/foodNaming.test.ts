import { describe, it, expect } from 'vitest';
import { formatFoodDisplayName, resolveAsPlannedDisplayName } from './foodNaming';

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


