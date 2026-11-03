import type { TFunction } from 'i18next';
import type { MuscleRole } from '@/types';

export type { MuscleRole };

/**
 * 肌群刺激強度階梯定義 (Terracotta / Burnt Sienna Tier)
 * - high / primary:   主動肌 (Agonist / Prime Mover，飽滿赤陶微透膠囊核心發力點)
 * - med / secondary:  協同肌 (Synergist / Secondary Mover，清爽磚紅透光輔助發力)
 * - low / stabilizer: 穩定肌 (Stabilizer / Fixator，淡雅薄焦土微底色背景支撐)
 */
export type MuscleIntensityTier = 'high' | 'med' | 'low';

/**
 * 將數值或任意值安全歸一化為經典 3 級 MuscleRole
 * 支援平滑相容歷史資料 (數字 100, 60, 30 等)
 */
export function normalizeMuscleRole(val: unknown): MuscleRole {
  if (val === 'primary' || val === 'secondary' || val === 'stabilizer') {
    return val;
  }
  if (typeof val === 'number' && !isNaN(val)) {
    if (val >= 80) return 'primary';
    if (val >= 50) return 'secondary';
    return 'stabilizer';
  }
  if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
    const num = Number(val);
    if (num >= 80) return 'primary';
    if (num >= 50) return 'secondary';
    return 'stabilizer';
  }
  return 'primary';
}

/**
 * 依據刺激強度數值 (0 ~ 100) 獲取對應的強度階梯 (向後相容)
 */
export function getMuscleIntensityTier(intensity: number): MuscleIntensityTier {
  if (intensity >= 80) return 'high';
  if (intensity >= 50) return 'med';
  return 'low';
}

/**
 * 將 MuscleRole 轉為數值權重 (供熱力圖渲染與覆蓋統計計算使用)
 * - primary:    100 (直接訓練組數權重 1.0)
 * - secondary:  60  (間接訓練組數權重 0.6)
 * - stabilizer: 30  (穩定支撐組數權重 0.3)
 */
export function muscleRoleToNumericWeight(role: MuscleRole | unknown): number {
  const normalized = normalizeMuscleRole(role);
  switch (normalized) {
    case 'primary':
      return 100;
    case 'secondary':
      return 60;
    case 'stabilizer':
      return 30;
  }
}

/**
 * 獲取 MuscleRole 對應的赤陶磚紅 Design Tokens 樣式類名
 */
export function getMuscleRoleBadgeClasses(role: MuscleRole): {
  container: string;
  text: string;
} {
  switch (role) {
    case 'primary':
      return {
        container:
          'bg-[var(--muscle-intensity-high-bg)] border-[var(--muscle-intensity-high-border)] text-[var(--muscle-intensity-high-text)]',
        text: 'text-[var(--muscle-intensity-high-text)]',
      };
    case 'secondary':
      return {
        container:
          'bg-[var(--muscle-intensity-med-bg)] border-[var(--muscle-intensity-med-border)] text-[var(--muscle-intensity-med-text)]',
        text: 'text-[var(--muscle-intensity-med-text)]',
      };
    case 'stabilizer':
    default:
      return {
        container:
          'bg-[var(--muscle-intensity-low-bg)] border-[var(--muscle-intensity-low-border)] text-[var(--muscle-intensity-low-text)]',
        text: 'text-[var(--muscle-intensity-low-text)]',
      };
  }
}

/**
 * 獲取樣式類名 (通用多型入口，同時支援傳入 MuscleRole 或歷史數字)
 */
export function getMuscleIntensityBadgeClasses(roleOrIntensity: MuscleRole | number): {
  container: string;
  text: string;
} {
  const role = normalizeMuscleRole(roleOrIntensity);
  return getMuscleRoleBadgeClasses(role);
}

/**
 * 獲取 MuscleRole 的多語系顯示標籤
 */
export function getMuscleRoleLabel(role: MuscleRole, t: TFunction): string {
  switch (role) {
    case 'primary':
      return t('workout.muscleRolePrimary', '主動肌');
    case 'secondary':
      return t('workout.muscleRoleSecondary', '協同肌');
    case 'stabilizer':
      return t('workout.muscleRoleStabilizer', '穩定肌');
  }
}
