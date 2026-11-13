import { describe, it, expect } from 'vitest';
import {
  MACRO_SPLIT_TEMPLATES,
  findMatchingTemplate,
} from './dietTemplates';

describe('MACRO_SPLIT_TEMPLATES 核心契約與數學完整性', () => {
  it('每個預設供能比模板的碳、蛋、脂比例總和必須嚴格等於 100%', () => {
    for (const tpl of MACRO_SPLIT_TEMPLATES) {
      const sum = tpl.split.carbs + tpl.split.protein + tpl.split.fat;
      expect(sum).toBe(100);
    }
  });

  it('必須包含 9 種核心主流運動與健康營養方案', () => {
    const ids = MACRO_SPLIT_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual([
      'balance',
      'orientalHealthy',
      'mediterranean',
      'highProtein',
      'lowCarb',
      'keto',
      'endurance',
      'contestPrep',
      'refeed',
    ]);
  });

  it('findMatchingTemplate 能夠精確匹配各主流方案', () => {
    expect(findMatchingTemplate({ carbs: 40, protein: 30, fat: 30 })).toBe('balance');
    expect(findMatchingTemplate({ carbs: 55, protein: 15, fat: 30 })).toBe('orientalHealthy');
    expect(findMatchingTemplate({ carbs: 45, protein: 20, fat: 35 })).toBe('mediterranean');
    expect(findMatchingTemplate({ carbs: 40, protein: 35, fat: 25 })).toBe('highProtein');
    expect(findMatchingTemplate({ carbs: 25, protein: 40, fat: 35 })).toBe('lowCarb');
    expect(findMatchingTemplate({ carbs: 5, protein: 25, fat: 70 })).toBe('keto');
    expect(findMatchingTemplate({ carbs: 60, protein: 20, fat: 20 })).toBe('endurance');
    expect(findMatchingTemplate({ carbs: 25, protein: 50, fat: 25 })).toBe('contestPrep');
    expect(findMatchingTemplate({ carbs: 70, protein: 15, fat: 15 })).toBe('refeed');
  });

  it('未匹配到的特殊比例安全回退至 custom', () => {
    expect(findMatchingTemplate({ carbs: 33, protein: 33, fat: 34 })).toBe('custom');
    expect(findMatchingTemplate({ carbs: 50, protein: 25, fat: 25 })).toBe('custom');
  });
});
