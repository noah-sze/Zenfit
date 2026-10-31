import type { DetailedMuscle } from '@/types';

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
  muscles: Partial<Record<DetailedMuscle, number>> | undefined,
  slug: BodyPartSlug,
  view: BodyView
): number {
  if (!muscles) return 0;
  const targetMuscles = getDetailedMusclesForSlug(slug, view);
  if (targetMuscles.length === 0) return 0;

  let maxVal = 0;
  for (const m of targetMuscles) {
    const val = muscles[m];
    if (typeof val === 'number' && val > maxVal) {
      maxVal = val;
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
