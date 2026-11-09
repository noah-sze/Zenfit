import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacroSquares } from '@/components/food/MacroSquares';
import type { FoodItem, FoodWeightUnit, FoodVolumeUnit, EnergyUnit } from '@/types';
import type { NutritionDisplayMode } from '@/utils/nutritionMath';
import { cn } from '@/lib/utils';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { calculateScaledNutrition } from '@/utils/nutritionMath';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';

export interface FoodListItemProps {
  food: FoodItem;
  onClick?: (food: FoodItem) => void;
  onSelect?: (food: FoodItem) => void;
  disabled?: boolean;
  selected?: boolean;
  showActions?: boolean;
  onRestore?: () => void;
  onDelete?: () => void;
  className?: string;
  /** 單位與數值偏好注入（由父層統一傳遞，避免 40+ 個清單實例重複調用 Hook 訂閱） */
  nutritionDisplayMode?: NutritionDisplayMode;
  foodWeightUnit?: FoodWeightUnit;
  foodVolumeUnit?: FoodVolumeUnit;
  energyUnit?: EnergyUnit;
}

export const FoodListItem = React.memo(function FoodListItem({
  food,
  onClick,
  onSelect,
  disabled = false,
  selected = false,
  showActions = false,
  onRestore,
  onDelete,
  className,
  nutritionDisplayMode = 'serving',
  foodWeightUnit = 'g',
  foodVolumeUnit = 'ml',
  energyUnit = 'kcal',
}: FoodListItemProps) {
  const { t } = useTranslation();

  const evalRes = evaluateNutritionalHighlight(food);
  const isLowCalorie = evalRes.labels.includes('low-calorie');
  const isHighCalorie = evalRes.labels.includes('high-calorie');

  const scaledNutrition = calculateScaledNutrition(food, nutritionDisplayMode, {
    foodWeightUnit,
    foodVolumeUnit,
  });

  const displayServing = formatFoodServing(
    scaledNutrition.servingSize,
    scaledNutrition.servingUnit,
    foodWeightUnit,
    foodVolumeUnit
  );

  const displayCal = formatEnergy(scaledNutrition.calories, energyUnit);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onSelect) {
      onSelect(food);
    } else if (onClick) {
      onClick(food);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'min-h-16 py-2.5 flex items-center justify-between px-4 transition-colors',
        disabled
          ? 'opacity-40 select-none bg-muted/10 cursor-not-allowed'
          : selected
          ? 'bg-muted/70 ring-1 ring-inset ring-foreground/25 cursor-pointer'
          : 'hover:bg-hover active:bg-muted/50 cursor-pointer',
        className
      )}
    >
      {/* 左側：食物資訊 */}
      <div className="space-y-1 pr-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground text-sm tracking-tight truncate">
            {formatFoodDisplayName(food)}
          </span>
          {food.brand && (
            <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded shrink-0">
              {food.brand}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <span>{displayServing.formatted}</span>
          <span className="text-muted-foreground/40">·</span>
          <span
            className={cn(
              'tabular-nums px-1.5 py-0.5 rounded text-[11px] font-mono',
              isLowCalorie && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium',
              isHighCalorie && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium',
              !isLowCalorie && !isHighCalorie && 'text-muted-foreground'
            )}
          >
            {displayCal.formatted}
          </span>
        </div>
      </div>

      {/* 右側：營養素方塊矩陣與操作 */}
      <div className="flex items-center gap-3 shrink-0">
        <MacroSquares
          carbs={scaledNutrition.carbs}
          protein={scaledNutrition.protein}
          fat={scaledNutrition.fat}
          highlights={evalRes.highlights}
        />

        {showActions && (
          <div className="flex items-center gap-1 border-l border-border pl-3">
            {onRestore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore();
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title={t('settings.unarchive')}
              >
                <RefreshCcw className="size-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                title={t('common.delete')}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
