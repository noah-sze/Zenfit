import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface NutritionBasisToggleProps {
  className?: string;
  size?: 'sm' | 'default';
}

/**
 * 領域共用模式：營養數據基準切換微型膠囊（每份 vs 每 100g）
 * 遵循 Design Standards 規範：
 * - 0 陰影純邊框扁平設計
 * - 等寬字體 font-mono
 * - 純全域 Zustand SSOT 連動
 */
export function NutritionBasisToggle({ className }: NutritionBasisToggleProps) {
  const { t } = useTranslation();
  const { nutritionDisplayMode, setNutritionDisplayMode } = useAppStore();
  const { foodWeightUnit } = useUnitPreferences();

  const densityLabel = foodWeightUnit === 'oz'
    ? t('diet.per1oz')
    : t('diet.per100g');

  return (
    <div
      role="group"
      aria-label={t('diet.nutritionBenchmark')}
      className={cn(
        "h-7 inline-flex items-center p-0.5 rounded-full border border-border bg-background font-mono select-none shrink-0",
        className
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (nutritionDisplayMode !== 'serving') {
            triggerHaptic('selection');
            setNutritionDisplayMode('serving');
          }
        }}
        className={cn(
          "h-full px-3 rounded-full transition-all cursor-pointer font-mono text-xs flex items-center justify-center whitespace-nowrap",
          nutritionDisplayMode === 'serving'
            ? "bg-foreground text-background font-medium shadow-none"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {t('diet.perServing')}
      </button>

      <button
        type="button"
        onClick={() => {
          if (nutritionDisplayMode !== 'per100g') {
            triggerHaptic('selection');
            setNutritionDisplayMode('per100g');
          }
        }}
        className={cn(
          "h-full px-3 rounded-full transition-all cursor-pointer font-mono text-xs flex items-center justify-center whitespace-nowrap",
          nutritionDisplayMode === 'per100g'
            ? "bg-foreground text-background font-medium shadow-none"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {densityLabel}
      </button>
    </div>
  );
}
