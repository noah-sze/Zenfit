import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacroSquares } from '@/components/food/MacroSquares';
import type { FoodRecipe } from '@/types';
import { cn } from '@/lib/utils';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { calculateScaledNutrition } from '@/utils/nutritionMath';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';
import { useAppStore } from '@/store/useAppStore';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';

export interface RecipeListItemProps {
  recipe: FoodRecipe;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    totalWeightGrams: number;
  };
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  showActions?: boolean;
  onRestore?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const RecipeListItem = React.memo(function RecipeListItem({
  recipe,
  macros,
  onClick,
  disabled = false,
  selected = false,
  showActions = false,
  onRestore,
  onDelete,
  className,
}: RecipeListItemProps) {
  const { t } = useTranslation();
  const { nutritionDisplayMode } = useAppStore();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();

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
    onClick?.();
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
              <span className="opacity-40">·</span>
              <span
                className={cn(
                  isLowCalorie &&
                    'text-emerald-500 px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20',
                  isHighCalorie &&
                    'text-rose-500 px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20'
                )}
              >
                {formatEnergy(scaledRecipeMacros.calories, energyUnit).formatted}
              </span>
            </>
          ) : (
            <>
              <span>
                {t('diet.ingredientsCount', { count: recipe.ingredients.length })}
              </span>
              <span className="opacity-40">·</span>
              <span
                className={cn(
                  isLowCalorie &&
                    'text-emerald-500 px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20',
                  isHighCalorie &&
                    'text-rose-500 px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20'
                )}
              >
                {formatEnergy(macros.calories, energyUnit).formatted}
              </span>
            </>
          )}
        </div>
      </button>

      {/* 右側：P / C / F 三列方塊矩陣 */}
      <MacroSquares
        protein={scaledRecipeMacros.protein}
        carbs={scaledRecipeMacros.carbs}
        fat={scaledRecipeMacros.fat}
        highlights={evalRes.highlights}
      />

      {/* 僅在歸檔模式且啟用時顯示恢復/刪除按鈕 */}
      {showActions && (
        <div
          className="flex items-center gap-0.5 shrink-0 pl-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {onRestore && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary opacity-90 hover:opacity-100 cursor-pointer"
              onClick={onRestore}
              title={t('common.restore')}
              aria-label={t('common.restore')}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={onDelete}
              title={t('common.delete')}
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
