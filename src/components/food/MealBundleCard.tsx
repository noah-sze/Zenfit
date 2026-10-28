import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { FoodLog } from '@/types';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { MacroSquares } from '@/components/food/MacroSquares';

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
    <div className="bg-muted/10 border-b border-border last:border-b-0 transition-colors">
      {/* 折疊摘要列 (點擊整行展開/收起) */}
      <div
        onClick={toggleExpand}
        className="min-h-16 py-2.5 px-3.5 sm:px-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer select-none"
      >
        <div className="flex-1 min-w-0 pr-3">
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
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground shrink-0">
              {t('diet.recipes', '菜餚')} · {logs.length}
            </span>
          </div>

          {/* 總熱量副標題 */}
          <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 pl-5 flex items-center gap-1.5">
            <span className="font-medium text-foreground">
              {formatEnergy(bundleTotals.calories, energyUnit).formatted}
            </span>
          </div>
        </div>

        {/* 右側：總 MacroSquares 與整組刪除按鈕 */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <MacroSquares
            protein={Math.round(bundleTotals.protein)}
            carbs={Math.round(bundleTotals.carbs)}
            fat={Math.round(bundleTotals.fat)}
          />

          <button
            type="button"
            onClick={() => onDeleteBundle(bundleId)}
            className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            title={t('common.delete')}
            aria-label={t('common.delete')}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 展開後的原子食材清單 */}
      {isExpanded && (
        <div className="border-t border-border bg-background/50 divide-y divide-border/40 pl-6 sm:pl-7 pr-3.5 sm:pr-4 py-1">
          {logs.map((item) => (
            <div
              key={item.id}
              className="py-2.5 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="font-medium text-foreground truncate text-xs">
                  {item.foodName}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span>
                    {formatFoodServing(item.quantity, item.unit, foodWeightUnit, foodVolumeUnit).formatted}
                  </span>
                  <span className="text-border">·</span>
                  <span className="font-medium text-foreground">
                    {formatEnergy(item.calories, energyUnit).formatted}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <MacroSquares
                  protein={item.protein}
                  carbs={item.carbs}
                  fat={item.fat}
                  className="scale-[0.9] origin-right"
                />
                <button
                  type="button"
                  onClick={() => onDeleteSingle(item)}
                  className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
