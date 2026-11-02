import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PREDEFINED_EQUIPMENT_DEFINITIONS } from '@/constants/muscles';
import { cn } from '@/lib/utils';
import type { EquipmentType } from '@/types';

export interface EquipmentBadgeProps {
  /** 器材 ID 或自訂器材標識 */
  equipment?: EquipmentType;
  /** 直接傳入顯示名稱（若已由父層或 hook 解析） */
  name?: string;
  /** 尺寸，預設為 'sm' (與 MuscleIntensityBadge 的 sm 規格完全一致) */
  size?: 'sm' | 'md';
  /** 擴展自訂 class */
  className?: string;
}

export const EquipmentBadge = memo(function EquipmentBadge({
  equipment,
  name,
  size = 'sm',
  className,
}: EquipmentBadgeProps) {
  const { t } = useTranslation();

  // 若外部未傳入 name，則嘗試從預設器械定義中查找多語系名稱
  const displayName =
    name ||
    (equipment
      ? PREDEFINED_EQUIPMENT_DEFINITIONS.find((p) => p.id === equipment)
        ? t(PREDEFINED_EQUIPMENT_DEFINITIONS.find((p) => p.id === equipment)!.nameKey)
        : equipment === 'machine'
        ? t('equipment.pin_loaded_machine')
        : equipment
      : '');

  if (!displayName) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-mono select-none whitespace-nowrap shrink-0 transition-colors',
        'bg-muted/60 text-muted-foreground border-border/70 hover:text-foreground',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px] leading-tight' : 'px-2 py-1 text-xs',
        className
      )}
    >
      {displayName}
    </span>
  );
});
