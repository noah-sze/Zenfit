import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  Edit2,
  Archive,
  RefreshCcw,
  Trash2,
  Plus,
} from 'lucide-react';
import { useFoods } from '@/hooks/useFoods';
import { useRecipes } from '@/hooks/useRecipes';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { calculateIngredientMacros, calculateRecipeTotals } from '@/utils/recipeMath';
import { useAppStore } from '@/store/useAppStore';
import { calculateScaledNutrition } from '@/utils/nutritionMath';
import { NutritionBasisToggle } from '@/components/food/NutritionBasisToggle';
import { RecipeFormDialog, type RecipeFormData } from '@/components/food/RecipeFormDialog';
import { FoodRecipeSelectDialog } from '@/components/food/FoodRecipeSelectDialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import {
  formatEnergy,
  formatFoodServing,
  ozToG,
  gToOz,
  flOzToMl,
  mlToFlOz,
} from '@/utils/unitMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import type { FoodItem, FoodRecipe, RecipeIngredient, NutritionTag } from '@/types';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { MacroSquares } from '@/components/food/MacroSquares';
import {
  type OverviewPeriod,
  calculateTotalWeeks,
  calculateFootprintData,
} from '@/utils/heatmapMath';
import {
  OverviewPeriodSelector,
  IntakeFootprintHeatmap,
} from '@/components/food/IntakeFootprintHeatmap';

export default function RecipeDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const { allFoods, isLoading: isFoodsLoading } = useFoods();
  const { updateRecipe, archiveRecipe, unarchiveRecipe, deleteRecipe } = useRecipes();
  const { nutritionDisplayMode } = useAppStore();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();
  const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>('30d');
  const [matrixContainerWidth, setMatrixContainerWidth] = useState<number>(0);

  // 響應式取得特定菜餚資料
  const recipe = useLiveQuery(
    async () => {
      if (!id) return null;
      return (await db.recipes.get(id)) || null;
    },
    [id]
  );

  // 構建 foodMap 供純函數計算引用
  const foodMap = useMemo(() => {
    const map = new Map<string, (typeof allFoods)[0]>();
    allFoods.forEach((f) => map.set(f.id, f));
    return map;
  }, [allFoods]);

  // 取得此菜餚的所有歷史飲食記錄 (透過 bundleName 或 notes 包含 [菜餚名稱])
  const relatedFoodLogs = useLiveQuery(
    async () => {
      if (!recipe) return [];
      const logs = await db.food_logs
        .filter(
          (log) =>
            log.bundleName === recipe.name ||
            (!!log.notes && log.notes.includes(`[${recipe.name}]`))
        )
        .toArray();

      return logs.sort((a, b) => b.date.localeCompare(a.date));
    },
    [recipe?.name]
  );

  // 刪除防護契約：有歷史記錄時不可刪除
  const hasUsage = (relatedFoodLogs?.length ?? 0) > 0;

  // 菜餚標準營養素
  const standardTotals = useMemo(() => {
    if (!recipe) return null;
    return calculateRecipeTotals(recipe, foodMap);
  }, [recipe, foodMap]);

  // 客觀營養特質標籤評估
  const evalRes = useMemo(() => {
    if (!standardTotals) return null;
    return evaluateNutritionalHighlight({
      calories: standardTotals.calories,
      protein: standardTotals.protein,
      carbs: standardTotals.carbs,
      fat: standardTotals.fat,
      servingSize: standardTotals.totalWeightGrams || 100,
      servingUnit: 'g',
    });
  }, [standardTotals]);

  const getNutritionTagBadgeClass = (tag: NutritionTag) => {
    switch (tag) {
      case 'high-protein':
        return 'text-protein border-protein-subtle-border bg-protein-subtle';
      case 'carb-source':
        return 'text-carbs border-carbs-subtle-border bg-carbs-subtle';
      case 'fat-source':
        return 'text-fat border-fat-subtle-border bg-fat-subtle';
      case 'low-calorie':
        return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      case 'high-calorie':
        return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
      default:
        return 'text-muted-foreground border-border bg-muted/30';
    }
  };

  // 熱點圖總週數與週期累計數據
  const totalWeeks = useMemo(() => {
    return calculateTotalWeeks({
      logs: relatedFoodLogs,
      matrixContainerWidth,
    });
  }, [relatedFoodLogs, matrixContainerWidth]);

  const { heatmapDays, periodCalories, periodCount, periodMaxGrams } = useMemo(() => {
    return calculateFootprintData({
      logs: relatedFoodLogs,
      overviewPeriod,
      totalWeeks,
    });
  }, [relatedFoodLogs, overviewPeriod, totalWeeks]);

  // 依據顯示模式推算顯示數值（全配方每份 vs 每 100g / 1 oz 密度）
  const scaledRecipeTotals = useMemo(() => {
    if (!standardTotals) return null;
    return calculateScaledNutrition(
      {
        calories: standardTotals.calories,
        protein: standardTotals.protein,
        carbs: standardTotals.carbs,
        fat: standardTotals.fat,
        servingSize: standardTotals.totalWeightGrams || 100,
        servingUnit: 'g',
      },
      nutritionDisplayMode,
      {
        foodWeightUnit,
        foodVolumeUnit,
      }
    );
  }, [standardTotals, nutritionDisplayMode, foodWeightUnit, foodVolumeUnit]);

  // 供能比配比推導
  const macroRatio = useMemo(() => {
    if (!standardTotals || standardTotals.calories === 0) {
      return { p: 0, c: 0, f: 0 };
    }
    const pCal = standardTotals.protein * 4;
    const cCal = standardTotals.carbs * 4;
    const fCal = standardTotals.fat * 9;
    const totalCal = pCal + cCal + fCal;
    if (totalCal === 0) return { p: 0, c: 0, f: 0 };

    return {
      p: Math.round((pCal / totalCal) * 100),
      c: Math.round((cCal / totalCal) * 100),
      f: Math.round((fCal / totalCal) * 100),
    };
  }, [standardTotals]);

  // 編輯 Dialog 狀態
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 獨立快速添加食材流程狀態
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [pendingFood, setPendingFood] = useState<FoodItem | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState<number>(100);
  const [pendingUnit, setPendingUnit] = useState<string>('g');

  const existingFoodIds = useMemo(() => {
    return recipe?.ingredients.map((ing) => ing.foodId).filter(Boolean) || [];
  }, [recipe?.ingredients]);

  const handleOpenAddIngredient = () => {
    triggerHaptic('selection');
    setIsAddPickerOpen(true);
  };

  const handleSelectFood = (item: FoodItem | FoodRecipe) => {
    const food = item as FoodItem;
    const isLiquid =
      (food.servingUnit || 'g').toLowerCase().includes('ml') ||
      food.category === 'beverage';

    let displayQty = food.servingSize || 100;
    let displayUnit = isLiquid ? 'ml' : 'g';

    if (isLiquid && foodVolumeUnit === 'fl oz') {
      displayQty = mlToFlOz(displayQty, 2);
      displayUnit = 'fl oz';
    } else if (!isLiquid && foodWeightUnit === 'oz') {
      displayQty = gToOz(displayQty, 2);
      displayUnit = 'oz';
    }

    setPendingFood(food);
    setPendingQuantity(displayQty);
    setPendingUnit(displayUnit);
  };

  const handleConfirmAddIngredient = async (quantity: number, unit: string) => {
    if (!recipe || !pendingFood) return;

    const isLiquid =
      (pendingFood.servingUnit || 'g').toLowerCase().includes('ml') ||
      pendingFood.category === 'beverage';

    let finalQty = quantity;
    let finalUnit = isLiquid ? 'ml' : 'g';

    if (unit === 'oz') {
      finalQty = ozToG(quantity, 2);
      finalUnit = 'g';
    } else if (unit === 'fl oz') {
      finalQty = flOzToMl(quantity, 2);
      finalUnit = 'ml';
    }

    const newIng: RecipeIngredient = {
      foodId: pendingFood.id,
      foodName: formatFoodDisplayName(pendingFood),
      quantity: finalQty > 0 ? finalQty : 100,
      unit: finalUnit,
    };

    await updateRecipe(recipe.id, {
      name: recipe.name,
      ingredients: [...recipe.ingredients, newIng],
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setPendingFood(null);
    setIsAddPickerOpen(false);
  };

  const handleEditSubmit = async (formData: RecipeFormData) => {
    if (!recipe) return;
    await updateRecipe(recipe.id, formData);
    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditDialogOpen(false);
  };

  const handleToggleArchive = async () => {
    if (!recipe) return;
    if (recipe.isArchived) {
      const ok = await confirm({
        title: t('common.restore'),
        description: t('common.confirmRestoreItem', { name: recipe.name }),
      });
      if (ok) {
        await unarchiveRecipe(recipe.id);
        triggerHaptic('success');
        toast.show(t('common.saved'));
      }
    } else {
      const ok = await confirm({
        title: t('common.archive'),
        description: t('common.confirmArchiveItem', { name: recipe.name }),
      });
      if (ok) {
        await archiveRecipe(recipe.id);
        triggerHaptic('selection');
        toast.show(t('common.saved'));
        navigate('/settings/recipes');
      }
    }
  };

  const handleDelete = async () => {
    if (!recipe || hasUsage) return;
    const ok = await confirm({
      title: t('common.delete'),
      description: t('common.confirmDeleteItem', { name: recipe.name }),
      variant: 'destructive',
    });
    if (ok) {
      await deleteRecipe(recipe.id);
      triggerHaptic('warning');
      toast.show(t('common.deleted'));
      navigate('/settings/recipes');
    }
  };

  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? document.getElementById('subpage-header-action') : null
  );

  useEffect(() => {
    if (!headerActionEl) {
      // oxlint-disable-next-line react/set-state-in-effect
      setHeaderActionEl(document.getElementById('subpage-header-action'));
    }
  }, [headerActionEl]);

  if (recipe === null) {
    return <Navigate to="/settings/recipes" replace />;
  }

  if (!recipe || !standardTotals) {
    return (
      <div className="p-8 text-center text-sm font-mono text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* 頂部操作按鈕 (Portal 映射至 AppLayout 頂部標頭右側) */}
      {headerActionEl &&
        createPortal(
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={hasUsage}
              className={cn(
                "size-8 text-muted-foreground transition-colors",
                hasUsage
                  ? "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                  : "hover:text-destructive hover:bg-destructive-subtle cursor-pointer"
              )}
              title={hasUsage ? t('settings.foodHasLogsCannotDelete', '已有飲食記錄無法刪除') : t('common.delete')}
              aria-label={t('common.delete')}
            >
              <Trash2 className="size-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleToggleArchive}
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title={recipe.isArchived ? t('common.restore') : t('common.archive')}
              aria-label={recipe.isArchived ? t('common.restore') : t('common.archive')}
            >
              {recipe.isArchived ? (
                <RefreshCcw className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsEditDialogOpen(true)}
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title={t('common.edit')}
              aria-label={t('common.edit')}
            >
              <Edit2 className="size-4" />
            </Button>
          </div>,
          headerActionEl
        )}

      {/* 核心一體化卡片 (與食材詳情頁 1:1 一體化設計) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-none">
        {/* 第 1 層：B-1 極簡 HUD 規格條 (h-8) */}
        <div className="h-8 px-4 border-b border-border bg-muted/40 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-widest text-[10px] text-muted-foreground font-semibold">
              {t('diet.recipesTab', '食譜')}
            </span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground text-[11px]">
              {t('diet.ingredientsCount', { count: recipe.ingredients.length })}
            </span>
          </div>
          <div>
            {recipe.isArchived ? (
              <span className="text-[10px] font-mono text-destructive tracking-wide">
                {t('common.archived')}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-500 tracking-wide">
                {t('common.active', '使用中')}
              </span>
            )}
          </div>
        </div>

        {/* 第 2 層：B-1 大氣品名帶與特質微徽章 */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-card">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words min-w-0">
            {recipe.name}
          </h1>
          {evalRes && evalRes.labels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {evalRes.labels.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "text-[11px] font-mono border px-1.5 py-0.5 rounded font-medium",
                    getNutritionTagBadgeClass(tag)
                  )}
                >
                  {t(`diet.nutritionTags.${tag}`)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 第 3 層：三大指標三欄分割卡片 (圖 2 標準風格，支援 1w/30d/3m/6m/1y 切換) */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-card">
          {/* 1. 總攝入 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('stats.totalIntake')}
              </span>
              <OverviewPeriodSelector
                value={overviewPeriod}
                onChange={setOverviewPeriod}
              />
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {formatEnergy(periodCalories, energyUnit).value.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {energyUnit}
              </span>
            </div>
          </div>

          {/* 2. 次數 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('stats.frequency')}
              </span>
              <OverviewPeriodSelector
                value={overviewPeriod}
                onChange={setOverviewPeriod}
              />
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {periodCount.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {t('common.times')}
              </span>
            </div>
          </div>

          {/* 3. 最大量 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate">
                {t('stats.maxDaily')}
              </span>
              <OverviewPeriodSelector
                value={overviewPeriod}
                onChange={setOverviewPeriod}
              />
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {formatFoodServing(periodMaxGrams, 'g', foodWeightUnit, foodVolumeUnit).size.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {formatFoodServing(periodMaxGrams, 'g', foodWeightUnit, foodVolumeUnit).unit}
              </span>
            </div>
          </div>
        </div>

        {/* 第 4 層：微型 GitHub 熱點矩陣 (可左右滾動查看更早歷史，預設對齊今天) + 選定日期數據檢測 */}
        <IntakeFootprintHeatmap
          heatmapDays={heatmapDays}
          totalWeeks={totalWeeks}
          isLoading={isFoodsLoading}
          onContainerWidthChange={setMatrixContainerWidth}
        />
      </div>

      {/* 配方營養素總計卡片 (三大營養素 C -> P -> F 順序) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t('diet.recipeNutrients', '配方營養素總計')}
          </div>
          <NutritionBasisToggle />
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-muted-foreground">
              {nutritionDisplayMode === 'per100g'
                ? (foodWeightUnit === 'oz' ? t('diet.per1ozDensity', '1 oz 密度') : t('diet.per100gDensity', '100g 密度'))
                : t('diet.unit')}
            </span>
            <span className="font-mono text-foreground font-medium">
              {formatFoodServing(scaledRecipeTotals?.servingSize ?? standardTotals.totalWeightGrams, scaledRecipeTotals?.servingUnit ?? 'g', foodWeightUnit, foodVolumeUnit).formatted}
            </span>
          </div>
          <div className={cn(
            "h-10 px-4 flex items-center justify-between transition-colors",
            evalRes?.highlights.calories && "bg-calories-subtle-bg"
          )}>
            <span className="text-calories font-medium">{t('diet.calories')}</span>
            <span className="font-mono text-calories font-medium">
              {formatEnergy(scaledRecipeTotals?.calories ?? standardTotals.calories, energyUnit).formatted}
            </span>
          </div>
          <div className={cn(
            "h-10 px-4 flex items-center justify-between transition-colors",
            evalRes?.highlights.carbs && "bg-carbs-subtle-bg"
          )}>
            <span className="text-carbs font-medium">{t('diet.carbs')}</span>
            <span className="font-mono text-carbs font-medium">
              {scaledRecipeTotals?.carbs ?? standardTotals.carbs} g ({macroRatio.c}%)
            </span>
          </div>
          <div className={cn(
            "h-10 px-4 flex items-center justify-between transition-colors",
            evalRes?.highlights.protein && "bg-protein-subtle-bg"
          )}>
            <span className="text-protein font-medium">{t('diet.protein')}</span>
            <span className="font-mono text-protein font-medium">
              {scaledRecipeTotals?.protein ?? standardTotals.protein} g ({macroRatio.p}%)
            </span>
          </div>
          <div className={cn(
            "h-10 px-4 flex items-center justify-between transition-colors",
            evalRes?.highlights.fat && "bg-fat-subtle-bg"
          )}>
            <span className="text-fat font-medium">{t('diet.fat')}</span>
            <span className="font-mono text-fat font-medium">
              {scaledRecipeTotals?.fat ?? standardTotals.fat} g ({macroRatio.f}%)
            </span>
          </div>
        </div>
      </div>

      {/* 食材解構清單 (Ingredient Breakdown List) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {t('diet.recipeIngredients')}
          </span>
          <button
            type="button"
            onClick={handleOpenAddIngredient}
            className="h-6 px-2.5 rounded-full border border-border/80 bg-card hover:bg-muted/60 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer text-muted-foreground hover:text-foreground active:scale-95 select-none"
          >
            <Plus className="size-3 text-muted-foreground" />
            <span>{t('diet.addIngredient')}</span>
          </button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
          {recipe.ingredients.map((ing, idx) => {
            const food = foodMap.get(ing.foodId);
            const macros = calculateIngredientMacros(food, ing.quantity);
            const ingEvalRes = evaluateNutritionalHighlight({
              calories: macros.calories,
              protein: macros.protein,
              carbs: macros.carbs,
              fat: macros.fat,
              servingSize: ing.quantity,
              servingUnit: ing.unit || 'g',
              category: food?.category,
            });
            const isLowCalorie = ingEvalRes.labels.includes('low-calorie');
            const isHighCalorie = ingEvalRes.labels.includes('high-calorie');

            return (
              <div
                key={idx}
                onClick={() => {
                  if (food) {
                    triggerHaptic('selection');
                    navigate(`/settings/foods/${food.id}`);
                  }
                }}
                className="min-h-16 py-2.5 px-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0 pr-3 select-none">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate text-foreground font-medium text-sm">
                      {ing.foodName}
                    </span>
                    {ing.isOptional && (
                      <span className="text-[10px] font-mono border border-dashed border-border px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                        {t('diet.optionalBadge')}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                    <span>
                      {formatFoodServing(ing.quantity, ing.unit, foodWeightUnit, foodVolumeUnit).formatted}
                    </span>
                    <span className="opacity-40">·</span>
                    <span
                      className={cn(
                        isLowCalorie &&
                          'text-emerald-500 px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20',
                        isHighCalorie &&
                          'text-rose-500 px-1 py-0.5 rounded bg-rose-500/10 border border-rose-500/20'
                      )}
                    >
                      {formatEnergy(macros.calories, energyUnit).formatted}
                    </span>
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <MacroSquares
                    protein={macros.protein}
                    carbs={macros.carbs}
                    fat={macros.fat}
                    highlights={ingEvalRes?.highlights}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 編輯菜餚 Dialog */}
      <RecipeFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={recipe}
        onSubmit={handleEditSubmit}
      />

      {/* 獨立添加食材選擇器 */}
      <FoodRecipeSelectDialog
        open={isAddPickerOpen}
        onOpenChange={(open) => {
          setIsAddPickerOpen(open);
          if (!open) setPendingFood(null);
        }}
        mode="foods"
        autoCloseOnSelect={false}
        disabledIds={existingFoodIds}
        onSelect={handleSelectFood}
      />

      {/* 獨立添加食材份量鍵盤 */}
      {pendingFood && (
        <NumericKeypadDialog
          open={!!pendingFood}
          onOpenChange={(open) => {
            if (!open) setPendingFood(null);
          }}
          title={formatFoodDisplayName(pendingFood)}
          value={pendingQuantity}
          unit={pendingUnit}
          allowDecimals={true}
          maxDecimals={2}
          onConfirm={handleConfirmAddIngredient}
          onCancel={() => setPendingFood(null)}
        />
      )}
    </div>
  );
}
