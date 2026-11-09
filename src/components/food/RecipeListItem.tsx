import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacroSquares } from '@/components/food/MacroSquares';
import type { FoodRecipe, FoodWeightUnit, FoodVolumeUnit, EnergyUnit } from '@/types';
import type { NutritionDisplayMode } from '@/utils/nutritionMath';
import { cn } from '@/lib/utils';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { calculateScaledNutrition } from '@/utils/nutritionMath';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';

export interface RecipeListItemProps {
  recipe: FoodRecipe;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    totalWeightGrams: number;
  };
  onClick?: (recipe: FoodRecipe) => void;
  onSelect?: (recipe: FoodRecipe) => void;
  disabled?: boolean;
  selected?: boolean;
  showActions?: boolean;
  onRestore?: () => void;
  onDelete?: () => void;
  className?: string;
  nutritionDisplayMode?: NutritionDisplayMode;
  foodWeightUnit?: FoodWeightUnit;
  foodVolumeUnit?: FoodVolumeUnit;
  energyUnit?: EnergyUnit;
}

export const RecipeListItem = React.memo(function RecipeListItem({
  recipe,
  macros,
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
}: RecipeListItemProps) {
  const { t } = useTranslation();

  const evalRes = evaluateNutritionalHighlight({
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    servingSize: macros.totalWeightGrams || 100,
    servingUnit: 'g',
  });
  const isLowCalorie = evalRes.labels.includes('low-calorie');
  const isHighCalorie = evalRes.labels.includes('high-calorie');

  const scaledRecipeMacros = calculateScaledNutrition(
    {
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      servingSize: macros.totalWeightGrams || 100,
      servingUnit: 'g',
    },
    nutritionDisplayMode,
    {
      foodWeightUnit,
      foodVolumeUnit,
    }
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onSelect) {
      onSelect(recipe);
    } else if (onClick) {
      onClick(recipe);
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
          : 'group hover:bg-muted/30 cursor-pointer',
        className
      )}
    >
      {/* 左側：食譜名稱與食材數/熱量副標題 */}
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'flex-1 text-left min-w-0 pr-3 select-none outline-none',
          disabled ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'
        )}
        onClick={handleClick}
      >
        <div className="truncate text-foreground font-medium text-sm">
          {recipe.name}
        </div>

        <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
          {nutritionDisplayMode === 'per100g' ? (
            <>
              <span>
                {
                  formatFoodServing(
                    scaledRecipeMacros.servingSize,
                    scaledRecipeMacros.servingUnit,
                    foodWeightUnit,
                    foodVolumeUnit
                  ).formatted
                }
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span
                className={cn(
                  'tabular-nums px-1.5 py-0.5 rounded text-[11px] font-mono',
                  isLowCalorie && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium',
                  isHighCalorie && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium',
                  !isLowCalorie && !isHighCalorie && 'text-muted-foreground'
                )}
              >
                {formatEnergy(scaledRecipeMacros.calories, energyUnit).formatted}
              </span>
            </>
          ) : (
            <>
              <span>
                {t('diet.itemsCount', {
                  count: recipe.ingredients ? recipe.ingredients.length : 0,
                })}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span
                className={cn(
                  'tabular-nums px-1.5 py-0.5 rounded text-[11px] font-mono',
                  isLowCalorie && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium',
                  isHighCalorie && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium',
                  !isLowCalorie && !isHighCalorie && 'text-muted-foreground'
                )}
              >
                {formatEnergy(scaledRecipeMacros.calories, energyUnit).formatted}
              </span>
            </>
          )}
        </div>
      </button>

      {/* 右側：營養素方塊矩陣與管理按鈕 */}
      <div className="flex items-center gap-3 shrink-0">
        <MacroSquares
          carbs={scaledRecipeMacros.carbs}
          protein={scaledRecipeMacros.protein}
          fat={scaledRecipeMacros.fat}
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
