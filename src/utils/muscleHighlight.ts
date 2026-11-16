import type { DetailedMuscle, MuscleRole } from '@/types';
import { muscleRoleToNumericWeight, getMuscleIntensityTier } from '@/utils/muscleIntensity';

export type BodyPartSlug =
  | 'abs'
  | 'adductors'
  | 'ankles'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'deltoids'
  | 'feet'
  | 'forearm'
  | 'gluteal'
  | 'hamstring'
  | 'hands'
  | 'head'
  | 'hair'
  | 'knees'
  | 'lower-back'
  | 'neck'
  | 'obliques'
  | 'quadriceps'
  | 'tibialis'
  | 'trapezius'
  | 'triceps'
  | 'upper-back';

export type BodyView = 'anterior' | 'posterior';

/**
 * 根據身體區塊 Slug 與視角 (正面/背面)，獲取對應的 Zenfit DetailedMuscle 列表
 */
export function getDetailedMusclesForSlug(
  slug: BodyPartSlug,
  view: BodyView
): DetailedMuscle[] {
  switch (slug) {
    case 'chest':
      return ['mid_lower_chest', 'upper_chest'];
    case 'abs':
      return ['abs'];
    case 'obliques':
      return ['obliques'];
    case 'biceps':
      return ['biceps'];
    case 'triceps':
      return ['triceps'];
    case 'deltoids':
      return view === 'anterior' ? ['front_delts', 'side_delts'] : ['rear_delts', 'side_delts'];
    case 'quadriceps':
      return ['quads'];
    case 'adductors':
      return ['quads'];
    case 'tibialis':
    case 'calves':
      return ['calves'];
    case 'forearm':
      return ['forearms'];
    case 'trapezius':
      return ['upper_back_traps'];
    case 'upper-back':
      return ['lats'];
    case 'lower-back':
      return ['lower_back'];
    case 'gluteal':
      return ['glutes'];
    case 'hamstring':
      return ['hamstrings'];
    default:
      return [];
  }
}

/**
 * 根據身體部位 Slug、視角以及當前動作刺激的肌群對照表，
 * 精準解析出對應的 DetailedMuscle。
 *
 * 優先匹配當前動作刺激目標中包含的肌群（若有多個則依刺激權重最高者優先）；
 * 若皆未包含，則回傳該部位的首選主要肌群。
 */
export function resolveMuscleForSlug(
  slug: BodyPartSlug,
  view: BodyView,
  muscles?: Partial<Record<DetailedMuscle, MuscleRole | number>>
): DetailedMuscle | undefined {
  const targetMuscles = getDetailedMusclesForSlug(slug, view);
  if (targetMuscles.length === 0) return undefined;
  if (!muscles) return targetMuscles[0];

  const matched = targetMuscles.filter((m) => muscles[m] !== undefined);
  if (matched.length === 1) return matched[0];
  if (matched.length > 1) {
    matched.sort((a, b) => {
      const valA = muscles[a];
      const valB = muscles[b];
      const weightA = typeof valA === 'number' && !isNaN(valA) ? valA : muscleRoleToNumericWeight(valA);
      const weightB = typeof valB === 'number' && !isNaN(valB) ? valB : muscleRoleToNumericWeight(valB);
      return weightB - weightA;
    });
    return matched[0];
  }

  return targetMuscles[0];
}

/**
 * 給定 DetailedMuscle，反向獲取其在人體圖上的對應 Slug 及視角
 */
export function getSlugsForDetailedMuscle(
  muscle: DetailedMuscle
): { slug: BodyPartSlug; view: BodyView }[] {
  switch (muscle) {
    case 'upper_chest':
    case 'mid_lower_chest':
      return [{ slug: 'chest', view: 'anterior' }];
    case 'front_delts':
      return [{ slug: 'deltoids', view: 'anterior' }];
    case 'side_delts':
      return [
        { slug: 'deltoids', view: 'anterior' },
        { slug: 'deltoids', view: 'posterior' },
      ];
    case 'rear_delts':
      return [{ slug: 'deltoids', view: 'posterior' }];
    case 'biceps':
      return [{ slug: 'biceps', view: 'anterior' }];
    case 'triceps':
      return [
        { slug: 'triceps', view: 'anterior' },
        { slug: 'triceps', view: 'posterior' },
      ];
    case 'forearms':
      return [
        { slug: 'forearm', view: 'anterior' },
        { slug: 'forearm', view: 'posterior' },
      ];
    case 'abs':
      return [{ slug: 'abs', view: 'anterior' }];
    case 'obliques':
      return [{ slug: 'obliques', view: 'anterior' }];
    case 'lats':
      return [{ slug: 'upper-back', view: 'posterior' }];
    case 'upper_back_traps':
      return [
        { slug: 'trapezius', view: 'anterior' },
        { slug: 'trapezius', view: 'posterior' },
      ];
    case 'lower_back':
      return [{ slug: 'lower-back', view: 'posterior' }];
    case 'quads':
      return [
        { slug: 'quadriceps', view: 'anterior' },
        { slug: 'adductors', view: 'anterior' },
        { slug: 'adductors', view: 'posterior' },
      ];
    case 'hamstrings':
      return [{ slug: 'hamstring', view: 'posterior' }];
    case 'glutes':
      return [{ slug: 'gluteal', view: 'posterior' }];
    case 'calves':
      return [
        { slug: 'calves', view: 'anterior' },
        { slug: 'calves', view: 'posterior' },
        { slug: 'tibialis', view: 'anterior' },
      ];
    default:
      return [];
  }
}

/**
 * 計算指定身體部位的刺激強度 (0 ~ 100)
 */
export function getMuscleIntensity(
  muscles: Partial<Record<DetailedMuscle, MuscleRole | number>> | undefined,
  slug: BodyPartSlug,
  view: BodyView
): number {
  if (!muscles) return 0;
  const targetMuscles = getDetailedMusclesForSlug(slug, view);
  if (targetMuscles.length === 0) return 0;

  let maxVal = 0;
  for (const m of targetMuscles) {
    const rawVal = muscles[m];
    if (rawVal !== undefined) {
      const weight =
        typeof rawVal === 'number' && !isNaN(rawVal)
          ? Math.min(100, Math.max(0, rawVal))
          : muscleRoleToNumericWeight(rawVal);
      if (weight > maxVal) {
        maxVal = weight;
      }
    }
  }
  return Math.min(100, Math.max(0, maxVal));
}

/**
 * 根據強度 (0-100) 計算渲染透明度 (0.15 ~ 1.0)
 */
export function getIntensityAlpha(intensity: number): number {
  if (intensity <= 0) return 0.15;
  // 基礎高亮下限 0.35，上限 1.0
  const normalized = Math.min(100, Math.max(0, intensity)) / 100;
  return 0.35 + normalized * 0.65;
}

export interface MuscleHighlightStyle {
  /** SVG 填充色 */
  fill: string;
  /** SVG 填充不透明度 (0 ~ 1) */
  fillOpacity: number;
  /** SVG 描邊色 */
  stroke: string;
  /** SVG 描邊不透明度 (0 ~ 1) */
  strokeOpacity: number;
  /** SVG 描邊線寬 (像素或 CSS Token) */
  strokeWidth: number | string;
}

export interface MuscleHighlightOptions {
  /** 顯式自訂覆蓋色 */
  highlightColor?: string;
  /** 未刺激基礎色 (預設 currentColor) */
  baseColor?: string;
  /** 是否為非肌肉身體部位 (如手、腳、關節) */
  isNonMuscle?: boolean;
  /** 是否被手動選中 */
  isSelected?: boolean;
  /** 是否正被滑鼠懸停 (支援整組肌群同步高亮) */
  isHovered?: boolean;
}

/**
 * 依據肌群刺激強度、角色階梯與自訂選項，計算人體地圖 SVG path 的填充與描邊樣式。
 *
 * 整合 Zenfit 赤陶磚紅 Design Tokens 體系：
 * - high (主動肌 / primary / >= 80):
 *     fill: var(--muscle-intensity-high-bg), stroke: var(--muscle-intensity-high-text)
 * - med (協同肌 / secondary / >= 50):
 *     fill: var(--muscle-intensity-med-bg), stroke: var(--muscle-intensity-med-text)
 * - low (穩定肌 / stabilizer / < 50):
 *     fill: var(--muscle-intensity-low-bg), stroke: var(--muscle-intensity-low-text)
 *
 * 若 highlightColor 顯式傳入則優先作為自訂覆蓋，維持最大相容性與可擴展性。
 */
export function getMuscleHighlightStyle(
  intensity: number,
  options?: MuscleHighlightOptions
): MuscleHighlightStyle {
  const {
    highlightColor,
    baseColor,
    isNonMuscle = false,
    isSelected = false,
    isHovered = false,
  } = options || {};

  // 互動焦點態 (選中與懸停採用完全一致的高雅視覺反饋)
  const isActive = isSelected || isHovered;

  // 1. 非肌肉/不可訓練身體部位 (頭部、關節、手腳等：引用全域骨架 Token，明確不可點擊語意)
  if (isNonMuscle) {
    return {
      fill: baseColor || 'var(--muscle-non-bg)',
      fillOpacity: baseColor ? 0.03 : 1,
      stroke: 'var(--muscle-non-stroke)',
      strokeOpacity: 1,
      strokeWidth: 'var(--muscle-non-stroke-width)',
    };
  }

  // 2. 有刺激強度 (intensity > 0)
  if (intensity > 0) {
    // 2.1 顯式傳入 highlightColor 作為自訂覆蓋
    if (highlightColor) {
      return {
        fill: highlightColor,
        fillOpacity: isActive ? Math.max(0.35, getIntensityAlpha(intensity)) : getIntensityAlpha(intensity),
        stroke: highlightColor,
        strokeOpacity: isActive ? 0.75 : 0.4,
        strokeWidth: 1,
      };
    }

    // 2.2 全域 Design Tokens 體系 (支援淺深雙模式獨立線寬與描邊 Token)
    const tier = getMuscleIntensityTier(intensity);
    const activeStrokeOverride = isActive ? 'var(--foreground)' : undefined;
    switch (tier) {
      case 'high':
        return {
          fill: 'var(--muscle-intensity-high-bg)',
          fillOpacity: 1,
          stroke: activeStrokeOverride || 'var(--muscle-intensity-high-stroke)',
          strokeOpacity: isActive ? 0.75 : 1,
          strokeWidth: isActive ? 1 : 'var(--muscle-intensity-high-stroke-width)',
        };
      case 'med':
        return {
          fill: 'var(--muscle-intensity-med-bg)',
          fillOpacity: 1,
          stroke: activeStrokeOverride || 'var(--muscle-intensity-med-stroke)',
          strokeOpacity: isActive ? 0.75 : 1,
          strokeWidth: isActive ? 1 : 'var(--muscle-intensity-med-stroke-width)',
        };
      case 'low':
      default:
        return {
          fill: 'var(--muscle-intensity-low-bg)',
          fillOpacity: 1,
          stroke: activeStrokeOverride || 'var(--muscle-intensity-low-stroke)',
          strokeOpacity: isActive ? 0.75 : 1,
          strokeWidth: isActive ? 1 : 'var(--muscle-intensity-low-stroke-width)',
        };
    }
  }

  // 3. 未激活肌肉部位 (intensity === 0：引用全域 Token，選中與 Hover 皆同步微幅亮起)
  return {
    fill: baseColor || (isActive ? 'currentColor' : 'var(--muscle-unselected-bg)'),
    fillOpacity: baseColor ? (isActive ? 0.14 : 0.09) : isActive ? 0.14 : 1,
    stroke: isActive ? 'currentColor' : 'var(--muscle-unselected-stroke)',
    strokeOpacity: isActive ? 0.45 : 1,
    strokeWidth: isActive ? 1 : 'var(--muscle-unselected-stroke-width)',
  };
}
