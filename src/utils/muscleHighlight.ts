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
      return ['lats', 'upper_back_traps'];
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
        { slug: 'upper-back', view: 'posterior' },
      ];
    case 'lower_back':
      return [{ slug: 'lower-back', view: 'posterior' }];
    case 'quads':
      return [
        { slug: 'quadriceps', view: 'anterior' },
        { slug: 'adductors', view: 'anterior' },
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
  /** SVG 描邊線寬 (像素或比例) */
  strokeWidth: number;
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
  const { highlightColor, baseColor, isNonMuscle = false, isSelected = false } = options || {};

  // 1. 選中狀態 (isSelected)：解耦機能刺激角色與 UI 焦點態
  // 描邊全面升級為極致高對比、對齊 Vercel 聚焦環體系 (var(--foreground), strokeWidth: 1.5)
  // 填充忠實保留其生理機能底色，絕不將未受刺激部位偽裝為赤陶色
  if (isSelected) {
    const strokeColor = highlightColor || 'var(--foreground)';
    const strokeWidth = 1.5;
    const strokeOpacity = 1;

    // 1.1 顯式傳入 highlightColor 作為自訂覆蓋
    if (highlightColor) {
      return {
        fill: highlightColor,
        fillOpacity: 0.35,
        stroke: strokeColor,
        strokeOpacity,
        strokeWidth,
      };
    }

    // 1.2 依據生理刺激強度保留對應階梯微透底色
    if (!isNonMuscle && intensity > 0) {
      const tier = getMuscleIntensityTier(intensity);
      switch (tier) {
        case 'high':
          return {
            fill: 'var(--muscle-intensity-high-bg)',
            fillOpacity: 1,
            stroke: strokeColor,
            strokeOpacity,
            strokeWidth,
          };
        case 'med':
          return {
            fill: 'var(--muscle-intensity-med-bg)',
            fillOpacity: 1,
            stroke: strokeColor,
            strokeOpacity,
            strokeWidth,
          };
        case 'low':
        default:
          return {
            fill: 'var(--muscle-intensity-low-bg)',
            fillOpacity: 1,
            stroke: strokeColor,
            strokeOpacity,
            strokeWidth,
          };
      }
    }

    // 1.3 未受刺激部位或非肌肉組織選中時：維持純淨中性淡底 (opacity 0.16) + 高對比聚焦環
    return {
      fill: baseColor || 'currentColor',
      fillOpacity: 0.16,
      stroke: strokeColor,
      strokeOpacity,
      strokeWidth,
    };
  }

  // 2. 有刺激強度 (intensity > 0 且非非肌肉組織)
  if (!isNonMuscle && intensity > 0) {
    // 2.1 顯式傳入 highlightColor 作為自訂覆蓋
    if (highlightColor) {
      return {
        fill: highlightColor,
        fillOpacity: getIntensityAlpha(intensity),
        stroke: highlightColor,
        strokeOpacity: 0.4,
        strokeWidth: 1,
      };
    }

    // 2.2 預設赤陶磚紅 Design Tokens 體系 (高/中/低三級階梯，精密分層線寬與透明度)
    const tier = getMuscleIntensityTier(intensity);
    switch (tier) {
      case 'high':
        return {
          fill: 'var(--muscle-intensity-high-bg)',
          fillOpacity: 1,
          stroke: 'var(--muscle-intensity-high-text)',
          strokeOpacity: 1.0,
          strokeWidth: 1.0,
        };
      case 'med':
        return {
          fill: 'var(--muscle-intensity-med-bg)',
          fillOpacity: 1,
          stroke: 'var(--muscle-intensity-med-text)',
          strokeOpacity: 0.95,
          strokeWidth: 0.85,
        };
      case 'low':
      default:
        return {
          fill: 'var(--muscle-intensity-low-bg)',
          fillOpacity: 1,
          stroke: 'var(--muscle-intensity-low-text)',
          strokeOpacity: 0.85,
          strokeWidth: 0.75,
        };
    }
  }

  // 3. 非肌肉/不可訓練身體部位 (頭部、關節、手腳等：極淡背景定位骨架，明確不可點擊語意)
  if (isNonMuscle) {
    return {
      fill: baseColor || 'currentColor',
      fillOpacity: 0.03,
      stroke: 'currentColor',
      strokeOpacity: 0.08,
      strokeWidth: 0.5,
    };
  }

  // 4. 未激活肌肉部位 (intensity === 0：結構清晰可讀，線條舒適不發白)
  return {
    fill: baseColor || 'currentColor',
    fillOpacity: 0.09,
    stroke: 'currentColor',
    strokeOpacity: 0.22,
    strokeWidth: 0.75,
  };
}
