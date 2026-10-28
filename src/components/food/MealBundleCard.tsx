import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { FoodLog } from '@/types';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

export interface MealBundleCardProps {
  bundleId: string;
  bundleName: string;
  logs: FoodLog[];
  onDeleteBundle: (bundleId: string) => void;
  onDeleteSingle: (log: FoodLog) => void;
  onEditSingle?: (log: FoodLog) => void;
}

export function MealBundleCard({
  bundleId,
  bundleName,
  logs,
  onDeleteBundle,
  onDeleteSingle,
}: MealBundleCardProps) {
  const { t } = useTranslation();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();
  const [isExpanded, setIsExpanded] = useState(false);

  // 累計 Bundle 總營養素
  const bundleTotals = logs.reduce(
    (acc, curr) => ({
      calories: acc.calories + (curr.calories || 0),
      protein: acc.protein + (curr.protein || 0),
      carbs: acc.carbs + (curr.carbs || 0),
      fat: acc.fat + (curr.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const toggleExpand = () => {
    triggerHaptic('light');
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="bg-muted/20 border-b border-border/40 last:border-b-0 transition-colors">
      {/* 折疊摘要列 (點擊整行展開/收起) */}
      <div
        onClick={toggleExpand}
        className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer select-none"
      >
        <div className="space-y-1 min-w-0 pr-2">
          {/* 標題與展開圖標 */}
          <div className="flex items-center gap-1.5 min-w-0">
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                isExpanded && "rotate-90 text-foreground"
              )}
            />
            <span className="text-sm font-semibold tracking-tight text-foreground truncate">
              {bundleName}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
              {logs.length}
            </span>
          </div>

          {/* 總營養素宏量膠囊標籤 */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs font-mono text-muted-foreground pl-5">
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-carbs shrink-0" />
              <span>C: {Math.round(bundleTotals.carbs)}g</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-protein shrink-0" />
              <span>P: {Math.round(bundleTotals.protein)}g</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-fat shrink-0" />
              <span>F: {Math.round(bundleTotals.fat)}g</span>
            </span>
          </div>
        </div>

        {/* 右側總熱量與整組刪除按鈕 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-base font-semibold text-foreground">
            {formatEnergy(bundleTotals.calories, energyUnit).value.toLocaleString()}{' '}
            <span className="text-xs text-muted-foreground font-normal">{energyUnit}</span>
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteBundle(bundleId);
            }}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title={t('common.delete')}
            aria-label={t('common.delete')}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* 展開後的原子食材清單 */}
      {isExpanded && (
        <div className="border-t border-border/40 bg-background/50 divide-y divide-border/20 pl-7 pr-3.5 py-1">
          {logs.map((item) => (
            <div
              key={item.id}
              className="py-2.5 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors"
            >
              <div className="space-y-0.5 min-w-0 pr-2">
                <div className="font-medium text-foreground truncate">
                  {item.foodName}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-muted-foreground text-[11px]">
                  <span>
                    {formatFoodServing(item.quantity, item.unit, foodWeightUnit, foodVolumeUnit).formatted}
                  </span>
                  <span>·</span>
                  <span>C: {item.carbs}g</span>
                  <span>·</span>
                  <span>P: {item.protein}g</span>
                  <span>·</span>
                  <span>F: {item.fat}g</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-muted-foreground text-xs">
                  {formatEnergy(item.calories, energyUnit).value.toLocaleString()}{' '}
                  <span className="text-[10px]">{energyUnit}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteSingle(item)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title={t('common.delete')}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
