import type { MacroSplit } from '@/types';

export type TemplateId =
  | 'balance'
  | 'orientalHealthy'
  | 'mediterranean'
  | 'highProtein'
  | 'lowCarb'
  | 'keto'
  | 'endurance'
  | 'contestPrep'
  | 'refeed'
  | 'custom';

export interface MacroSplitTemplate {
  id: Exclude<TemplateId, 'custom'>;
  labelKey: string;
  shortLabelKey: string;
  descKey: string;
  split: MacroSplit;
}

export const MACRO_SPLIT_TEMPLATES: MacroSplitTemplate[] = [
  {
    id: 'balance',
    labelKey: 'dietPlan.balanceTemplate',
    shortLabelKey: 'dietPlan.balance',
    descKey: 'dietPlan.balanceDesc',
    split: { carbs: 40, protein: 30, fat: 30 },
  },
  {
    id: 'orientalHealthy',
    labelKey: 'dietPlan.orientalHealthyTemplate',
    shortLabelKey: 'dietPlan.orientalHealthy',
    descKey: 'dietPlan.orientalHealthyDesc',
    split: { carbs: 55, protein: 15, fat: 30 },
  },
  {
    id: 'mediterranean',
    labelKey: 'dietPlan.mediterraneanTemplate',
    shortLabelKey: 'dietPlan.mediterranean',
    descKey: 'dietPlan.mediterraneanDesc',
    split: { carbs: 45, protein: 20, fat: 35 },
  },
  {
    id: 'highProtein',
    labelKey: 'dietPlan.highProteinTemplate',
    shortLabelKey: 'dietPlan.highProtein',
    descKey: 'dietPlan.highProteinDesc',
    split: { carbs: 40, protein: 35, fat: 25 },
  },
  {
    id: 'lowCarb',
    labelKey: 'dietPlan.lowCarbTemplate',
    shortLabelKey: 'dietPlan.lowCarb',
    descKey: 'dietPlan.lowCarbDesc',
    split: { carbs: 25, protein: 40, fat: 35 },
  },
  {
    id: 'keto',
    labelKey: 'dietPlan.ketoTemplate',
    shortLabelKey: 'dietPlan.keto',
    descKey: 'dietPlan.ketoDesc',
    split: { carbs: 5, protein: 25, fat: 70 },
  },
  {
    id: 'endurance',
    labelKey: 'dietPlan.enduranceTemplate',
    shortLabelKey: 'dietPlan.endurance',
    descKey: 'dietPlan.enduranceDesc',
    split: { carbs: 60, protein: 20, fat: 20 },
  },
  {
    id: 'contestPrep',
    labelKey: 'dietPlan.contestPrepTemplate',
    shortLabelKey: 'dietPlan.contestPrep',
    descKey: 'dietPlan.contestPrepDesc',
    split: { carbs: 25, protein: 50, fat: 25 },
  },
  {
    id: 'refeed',
    labelKey: 'dietPlan.refeedTemplate',
    shortLabelKey: 'dietPlan.refeed',
    descKey: 'dietPlan.refeedDesc',
    split: { carbs: 70, protein: 15, fat: 15 },
  },
];

/**
 * 依據給定的供能比配比，檢索是否完全匹配預設模板，無匹配時回傳 'custom'
 */
export function findMatchingTemplate(split: MacroSplit): TemplateId {
  const found = MACRO_SPLIT_TEMPLATES.find(
    (t) =>
      t.split.carbs === split.carbs &&
      t.split.protein === split.protein &&
      t.split.fat === split.fat
  );
  return found ? found.id : 'custom';
}

/**
 * 依據模板 ID 取得對應之方案說明 i18n 鍵值，若為 'custom' 則回傳 'dietPlan.customDesc'
 */
export function getTemplateDescKey(id: TemplateId): string {
  if (id === 'custom') {
    return 'dietPlan.customDesc';
  }
  const found = MACRO_SPLIT_TEMPLATES.find((t) => t.id === id);
  return found ? found.descKey : 'dietPlan.customDesc';
}
