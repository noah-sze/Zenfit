import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DetailedMuscle, MuscleRole } from '@/types';
import {
  getMuscleIntensityBadgeClasses,
  getMuscleRoleLabel,
  normalizeMuscleRole,
} from '@/utils/muscleIntensity';
import { cn } from '@/lib/utils';

export interface MuscleIntensityBadgeProps {
  /** 目標肌群 ID */
  muscle: DetailedMuscle;
  /** 刺激強度角色或歷史數值 (primary | secondary | stabilizer 或 0 ~ 100) */
  role?: MuscleRole | number;
  /** 向後相容 intensity prop */
  intensity?: number | MuscleRole;
  /** 是否顯示角色或強度標籤，預設為 false (純色標籤更極簡) */
  showRole?: boolean;
  /** 兼容舊命名 showIntensity */
  showIntensity?: boolean;
  /** 標籤尺寸，預設 'sm' (微型列表膠囊) */
  size?: 'sm' | 'md';
  /** 擴展自訂 class */
  className?: string;
}

export const MuscleIntensityBadge = memo(function MuscleIntensityBadge({
  muscle,
  role,
  intensity,
  showRole = false,
  showIntensity = false,
  size = 'sm',
  className,
}: MuscleIntensityBadgeProps) {
  const { t } = useTranslation();

  // 取得肌群翻譯名稱
  const key = `workout.muscle${muscle
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')}`;
  const label = t(key);

  const rawRole = role ?? intensity;
  const hasRole = rawRole !== undefined;
  const badgeClasses = hasRole
    ? getMuscleIntensityBadgeClasses(rawRole)
    : {
        container: 'bg-muted/60 border-border text-foreground/80',
        text: 'text-foreground/80',
      };

  const shouldShowRole = showRole || showIntensity;
  const normalizedRole = hasRole ? normalizeMuscleRole(rawRole) : undefined;
  const roleLabel = normalizedRole ? getMuscleRoleLabel(normalizedRole, t) : '';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-mono select-none whitespace-nowrap transition-colors',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px] leading-tight' : 'px-2 py-1 text-xs',
        badgeClasses.container,
        className
      )}
    >
      <span>{label}</span>
      {shouldShowRole && normalizedRole && (
        <span className="font-mono text-[9px] opacity-90">{roleLabel}</span>
      )}
    </span>
  );
});
