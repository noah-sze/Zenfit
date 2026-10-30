import { useState } from 'react';
import type { FoodLog } from '@/types';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';
import { triggerHaptic } from '@/lib/haptics';
import { MacroSquares } from '@/components/food/MacroSquares';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { cn } from '@/lib/utils';

export interface MealBundleCardProps {
  bundleId: string;
  bundleName: string;
  logs: FoodLog[];
  onDeleteBundle?: (bundleId: string) => void;
  onDeleteSingle?: (log: FoodLog) => void;
  onEditSingle?: (log: FoodLog) => void;
  onEditBundle?: (bundleId: string, bundleName: string, logs: FoodLog[]) => void;
}

export function MealBundleCard({
  bundleId,
  bundleName,
  logs,
  onEditBundle,
}: MealBundleCardProps) {
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();
  const [isExpanded, setIsExpanded] = useState(false);

  // 累計 Bundle 總營養素與總克數
  const bundleTotals = logs.reduce(
    (acc, curr) => {
      const weightInG =
        curr.unit === 'g' || !curr.unit
          ? curr.quantity || 0
          : curr.unit === 'ml'
          ? curr.quantity || 0
          : curr.unit === 'oz'
          ? (curr.quantity || 0) * 28.3495
          : curr.unit === 'fl oz'
          ? (curr.quantity || 0) * 29.5735
          : curr.quantity || 0;

      return {
        calories: acc.calories + (curr.calories || 0),
        protein: acc.protein + (curr.protein || 0),
        carbs: acc.carbs + (curr.carbs || 0),
        fat: acc.fat + (curr.fat || 0),
        totalWeightGrams: acc.totalWeightGrams + weightInG,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, totalWeightGrams: 0 }
  );

  // 沿用食譜管理頁面同款營養評價函數，得出 highlights 與高/低熱量標籤
  const evalRes = evaluateNutritionalHighlight({
    calories: bundleTotals.calories,
    protein: bundleTotals.protein,
    carbs: bundleTotals.carbs,
    fat: bundleTotals.fat,
    servingSize: bundleTotals.totalWeightGrams > 0 ? bundleTotals.totalWeightGrams : 100,
    servingUnit: 'g',
  });
  const isLowCalorie = evalRes.labels.includes('low-calorie');
  const isHighCalorie = evalRes.labels.includes('high-calorie');

  const handleClick = () => {
    triggerHaptic('light');
    if (onEditBundle) {
      onEditBundle(bundleId, bundleName, logs);
    } else {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div className="bg-muted/10 border-b border-border last:border-b-0 transition-colors">
      {/* 摘要列 (點擊呼出編輯 Dialog) */}
      <div
        onClick={handleClick}
        className="min-h-16 py-2.5 px-3.5 sm:px-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer select-none"
      >
        <div className="flex-1 min-w-0 pr-3">
          {/* 標題 (刪除旁邊的膠囊) */}
          <div className="truncate text-foreground font-medium text-sm">
            {bundleName}
          </div>

          {/* 總重量與總熱量副標題 */}
          <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
            {bundleTotals.totalWeightGrams > 0 && (
              <>
                <span>
                  {formatFoodServing(bundleTotals.totalWeightGrams, 'g', foodWeightUnit, foodVolumeUnit).formatted}
                </span>
                <span className="text-border">·</span>
              </>
            )}
            <span
              className={cn(
                isLowCalorie &&
                  'text-emerald-500 px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20',
                isHighCalorie &&
                  'text-rose-500 px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20'
              )}
            >
              {formatEnergy(bundleTotals.calories, energyUnit).formatted}
            </span>
          </div>
        </div>

        {/* 右側：總 MacroSquares (首頁套餐卡片採用方案 A 柔和微光) */}
        <div className="flex items-center shrink-0">
          <MacroSquares
            protein={Math.round(bundleTotals.protein)}
            carbs={Math.round(bundleTotals.carbs)}
            fat={Math.round(bundleTotals.fat)}
            highlights={evalRes.highlights}
            variant="subtle"
          />
        </div>
      </div>

      {/* 展開後的原子食材清單 */}
      {isExpanded && (
        <div className="border-t border-border bg-background/50 divide-y divide-border/40 pl-6 sm:pl-7 pr-3.5 sm:pr-4 py-1">
          {logs.map((item) => {
            const itemEval = evaluateNutritionalHighlight({
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              servingSize: item.quantity,
              servingUnit: item.unit || 'g',
            });
            const isItemLowCal = itemEval.labels.includes('low-calorie');
            const isItemHighCal = itemEval.labels.includes('high-calorie');

            return (
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
                    <span
                      className={cn(
                        isItemLowCal &&
                          'text-emerald-600/90 dark:text-emerald-400/90 px-1 py-0.2 rounded bg-emerald-500/5',
                        isItemHighCal &&
                          'text-rose-600/90 dark:text-rose-400/90 px-1 py-0.2 rounded bg-rose-500/5'
                      )}
                    >
                      {formatEnergy(item.calories, energyUnit).formatted}
                    </span>
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <MacroSquares
                    protein={item.protein}
                    carbs={item.carbs}
                    fat={item.fat}
                    highlights={itemEval.highlights}
                    variant="subtle"
                    className="scale-[0.9] origin-right"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
