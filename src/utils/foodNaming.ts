import type { TFunction } from 'i18next';
import type { FoodLog, FoodItem } from '@/types';

export interface FoodNamingInput {
  name?: string | null;
  brand?: string | null;
}

/**
 * 格式化食材呈現名稱。
 * 遵循 Zenfit 食物數據規範：
 * - 若有品牌，格式為「品牌 · 名稱」 (使用 U+00B7 Middle Dot)
 * - 若無品牌，格式為「名稱」
 * - 具備防呆機制：若名稱已包含品牌前綴，避免重複拼接
 */
export function formatFoodDisplayName(food: FoodNamingInput): string {
  const name = food.name?.trim() || '';
  const brand = food.brand?.trim() || '';

  if (!brand) {
    return name;
  }

  // 防呆：如果名稱已經以該品牌開頭，直接返回 name（避免重複如 "曼可頓 · 曼可頓 · 全麥吐司"）
  if (
    name.startsWith(`${brand} ·`) ||
    name.startsWith(`${brand} •`) ||
    name.startsWith(`${brand}·`) ||
    name.startsWith(`${brand}•`)
  ) {
    return name;
  }

  return `${brand} · ${name}`;
}

/**
 * 解析「算我正常吃 / 歷史均值」（asPlanned）條目的標題顯示名稱：
 * 針對歷史資料中的「{{meal}} 配額」（如「午餐 配額」）、「正常飲食」、「算我正常食」或空白名稱，
 * 自動正規化顯示為精簡的「歷史均值」（或自訂的 defaultName）。
 * 若使用者曾手動自訂為其他具體備註（如「媽媽煮的便當」），則保留其原名稱。
 */
export function resolveAsPlannedDisplayName(
  item: { foodName?: string | null },
  defaultName: string = '歷史均值'
): string {
  const rawName = item.foodName?.trim() || '';
  if (
    !rawName ||
    rawName.endsWith('配額') ||
    rawName.endsWith('配额') ||
    rawName.endsWith('Budget') ||
    rawName === '正常飲食' ||
    rawName === '正常饮食' ||
    rawName === 'Regular Diet' ||
    rawName === '算我正常吃' ||
    rawName === '算我正常食' ||
    rawName === '歷史均值' ||
    rawName === '历史均值' ||
    rawName === 'Past Average' ||
    rawName === 'Historical Average'
  ) {
    return defaultName;
  }
  return rawName;
}

export type DiningScenarioId =
  | 'balanced'
  | 'bento'
  | 'fastfood'
  | 'hotpot'
  | 'bbq'
  | 'sushi'
  | 'pizza'
  | 'salad'
  | 'party'
  | 'dessert';

export interface DiningScenario {
  id: DiningScenarioId;
  nameKey: string;
  defaultName: string;
  ratios: {
    carbs: number;   // 4 kcal/g
    protein: number; // 4 kcal/g
    fat: number;     // 9 kcal/g
  };
}

export const DINING_SCENARIOS: Record<DiningScenarioId, DiningScenario> = {
  balanced: {
    id: 'balanced',
    nameKey: 'diet.placeholder.scenarioBalanced',
    defaultName: '常規',
    ratios: { carbs: 0.45, protein: 0.25, fat: 0.30 },
  },
  bento: {
    id: 'bento',
    nameKey: 'diet.placeholder.scenarioBento',
    defaultName: '便當',
    ratios: { carbs: 0.55, protein: 0.15, fat: 0.30 },
  },
  fastfood: {
    id: 'fastfood',
    nameKey: 'diet.placeholder.scenarioFastfood',
    defaultName: '快餐',
    ratios: { carbs: 0.40, protein: 0.15, fat: 0.45 },
  },
  hotpot: {
    id: 'hotpot',
    nameKey: 'diet.placeholder.scenarioHotpot',
    defaultName: '火鍋',
    ratios: { carbs: 0.10, protein: 0.25, fat: 0.65 },
  },
  bbq: {
    id: 'bbq',
    nameKey: 'diet.placeholder.scenarioBbq',
    defaultName: '燒肉',
    ratios: { carbs: 0.10, protein: 0.35, fat: 0.55 },
  },
  sushi: {
    id: 'sushi',
    nameKey: 'diet.placeholder.scenarioSushi',
    defaultName: '壽司',
    ratios: { carbs: 0.60, protein: 0.25, fat: 0.15 },
  },
  pizza: {
    id: 'pizza',
    nameKey: 'diet.placeholder.scenarioPizza',
    defaultName: '披薩',
    ratios: { carbs: 0.50, protein: 0.15, fat: 0.35 },
  },
  salad: {
    id: 'salad',
    nameKey: 'diet.placeholder.scenarioSalad',
    defaultName: '輕食',
    ratios: { carbs: 0.45, protein: 0.40, fat: 0.15 },
  },
  party: {
    id: 'party',
    nameKey: 'diet.placeholder.scenarioParty',
    defaultName: '酒局',
    ratios: { carbs: 0.50, protein: 0.10, fat: 0.40 },
  },
  dessert: {
    id: 'dessert',
    nameKey: 'diet.placeholder.scenarioDessert',
    defaultName: '甜點',
    ratios: { carbs: 0.65, protein: 0.05, fat: 0.30 },
  },
};

/**
 * 依據宏量供能比推斷最接近的外食情境
 */
export function inferDiningScenario(
  _calories?: number,
  carbs?: number,
  protein?: number,
  fat?: number
): DiningScenario {
  const cKcal = (carbs || 0) * 4;
  const pKcal = (protein || 0) * 4;
  const fKcal = (fat || 0) * 9;
  const total = cKcal + pKcal + fKcal;

  if (total <= 0) {
    return DINING_SCENARIOS.balanced;
  }

  const cRatio = cKcal / total;
  const pRatio = pKcal / total;
  const fRatio = fKcal / total;

  let bestScenario = DINING_SCENARIOS.balanced;
  let minDiff = Infinity;

  for (const sc of Object.values(DINING_SCENARIOS)) {
    const diff =
      Math.pow(cRatio - sc.ratios.carbs, 2) +
      Math.pow(pRatio - sc.ratios.protein, 2) +
      Math.pow(fRatio - sc.ratios.fat, 2);
    if (diff < minDiff) {
      minDiff = diff;
      bestScenario = sc;
    }
  }

  return bestScenario;
}

/**
 * 解析飲食佔位條目的標題顯示名稱：
 * 針對「快速估算」或「快速粗估」舊條目自動推斷情境（如「火鍋」），若為自訂備註（如「海底撈」）則保留原名稱
 */
export function resolvePlaceholderDisplayName(
  item: {
    foodName?: string;
    scenario?: string;
    customTitle?: string;
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  },
  t: TFunction
): string {
  if (item.customTitle?.trim()) {
    return item.customTitle.trim();
  }

  if (item.scenario && DINING_SCENARIOS[item.scenario as DiningScenarioId]) {
    const sc = DINING_SCENARIOS[item.scenario as DiningScenarioId];
    return t(sc.nameKey, sc.defaultName);
  }

  const rawName = item.foodName?.trim() || '';
  const isLegacy =
    !rawName ||
    rawName === '快速估算' ||
    rawName === '快速粗估' ||
    rawName === 'Quick Estimate' ||
    rawName === t('diet.placeholder.title', '快速估算') ||
    rawName === t('diet.placeholder.defaultName', '快速估算');

  if (isLegacy) {
    const scenario = inferDiningScenario(
      item.calories || 0,
      item.carbs,
      item.protein,
      item.fat
    );
    return t(scenario.nameKey, scenario.defaultName);
  }

  const matchingScenario = Object.values(DINING_SCENARIOS).find(
    (sc) =>
      sc.id === rawName ||
      sc.defaultName === rawName ||
      t(sc.nameKey, sc.defaultName) === rawName
  );
  if (matchingScenario) {
    return t(matchingScenario.nameKey, matchingScenario.defaultName);
  }

  return rawName;
}

/**
 * 統一的飲食日誌條目標題動態解析函式 (SSOT Dynamic Food Title Resolver)
 * 1. 若 log.customTitle?.trim() 存在，優先返回自訂標題。
 * 2. 若 log.entryType === 'as_planned' 或 log.isAsPlanned：
 *    - 若帶有歷史 foodName 且不為預設通用名，保留該自訂名；
 *    - 否則返回多語系 t('diet.asPlanned.defaultName', '歷史均值')。
 * 3. 若 log.entryType === 'estimate' 或 log.isPlaceholder：
 *    - 若 log.scenario 匹配 DINING_SCENARIOS[log.scenario]，返回 t(scenario.nameKey, scenario.defaultName)。
 *    - 若為舊版資料帶有 foodName，調用 resolvePlaceholderDisplayName 進行場景推斷與解析。
 *    - 否則使用 inferDiningScenario 推斷宏量比例並返回多語系名稱。
 * 4. 若為實體食材 (entryType === 'item')：
 *    - 返回格式化後的品名 (log.foodName) 或未知食材多語系提示。
 */
export function resolveFoodLogTitle(
  log: FoodLog,
  t: TFunction,
  baseFood?: FoodItem | null
): string {
  if (log.customTitle?.trim()) {
    return log.customTitle.trim();
  }

  if (log.entryType === 'as_planned' || log.isAsPlanned) {
    if (log.foodName) {
      return resolveAsPlannedDisplayName(log, t('diet.asPlanned.defaultName', '歷史均值'));
    }
    return t('diet.asPlanned.defaultName', '歷史均值');
  }

  if (log.entryType === 'estimate' || log.isPlaceholder) {
    if (log.scenario && DINING_SCENARIOS[log.scenario as DiningScenarioId]) {
      const scenario = DINING_SCENARIOS[log.scenario as DiningScenarioId];
      return t(scenario.nameKey, scenario.defaultName);
    }
    if (log.foodName) {
      return resolvePlaceholderDisplayName(log, t);
    }
    const scenario = inferDiningScenario(log.calories, log.carbs, log.protein, log.fat);
    return t(scenario.nameKey, scenario.defaultName);
  }

  // 若提供食材實體，優先格式化展示名稱
  if (baseFood) {
    return formatFoodDisplayName(baseFood);
  }

  return log.foodName?.trim() || t('diet.unknownFood', '未知食材');
}



