import { useState, useMemo, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Edit2, Archive, RefreshCcw, Trash2 } from 'lucide-react';
import { useFoods } from '@/hooks/useFoods';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { useAppStore } from '@/store/useAppStore';
import { calculateScaledNutrition } from '@/utils/nutritionMath';
import { NutritionBasisToggle } from '@/components/food/NutritionBasisToggle';
import { FoodFormDialog, type FoodFormData } from '@/components/food/FoodFormDialog';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';
import type { NutritionTag } from '@/types';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import {
  type OverviewPeriod,
  calculateTotalWeeks,
  calculateFootprintData,
} from '@/utils/heatmapMath';
import {
  OverviewPeriodSelector,
  IntakeFootprintHeatmap,
} from '@/components/food/IntakeFootprintHeatmap';

export default function CategoryDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { allFoods, isLoading, updateFood, archiveFood, unarchiveFood, deleteFood } = useFoods();
  const { nutritionDisplayMode } = useAppStore();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();
  const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>('30d');

  const food = useMemo(() => {
    return allFoods.find((f) => f.id === id);
  }, [allFoods, id]);

  const scaledNutrition = useMemo(() => {
    if (!food) return null;
    return calculateScaledNutrition(food, nutritionDisplayMode, {
      foodWeightUnit,
      foodVolumeUnit,
    });
  }, [food, nutritionDisplayMode, foodWeightUnit, foodVolumeUnit]);

  const evalRes = useMemo(() => {
    if (!food) return null;
    return evaluateNutritionalHighlight(food);
  }, [food]);

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



  const [isEditOpen, setIsEditOpen] = useState(false);

  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? document.getElementById('subpage-header-action') : null
  );

  useEffect(() => {
    if (!headerActionEl) {
      // oxlint-disable-next-line react/set-state-in-effect
      setHeaderActionEl(document.getElementById('subpage-header-action'));
    }
  }, [headerActionEl]);

  const handleEditSubmit = async (formData: FoodFormData) => {
    if (!food) return;

    await updateFood(food.id, formData);

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditOpen(false);
  };

  // 取得此食物所有的歷史飲食記錄
  const foodLogs = useLiveQuery(
    async () => {
      if (!id || !food) return [];
      const displayName = formatFoodDisplayName(food).trim().toLowerCase();
      const rawName = food.name.trim().toLowerCase();
      const logs = await db.food_logs
        .filter((log) => {
          if (log.foodId === id) return true;
          const logName = log.foodName.trim().toLowerCase();
          return logName === rawName || logName === displayName;
        })
        .toArray();
      return logs.sort((a, b) => b.date.localeCompare(a.date));
    },
    [id, food?.name]
  );

  // 檢查此食材是否被菜餚組合引用
  const referencingRecipesCount = useLiveQuery(
    async () => {
      if (!id || !food) return 0;
      const displayName = formatFoodDisplayName(food).trim().toLowerCase();
      const rawName = food.name.trim().toLowerCase();
      return await db.recipes
        .filter((r) =>
          r.ingredients.some((ing) => {
            if (ing.foodId === id) return true;
            const ingName = ing.foodName.trim().toLowerCase();
            return ingName === rawName || ingName === displayName;
          })
        )
        .count();
    },
    [id, food?.name]
  );

  const hasUsage = (foodLogs?.length ?? 0) > 0 || (referencingRecipesCount ?? 0) > 0;

  const handleToggleArchive = async () => {
    if (!food) return;
    if (food.isArchived) {
      const ok = await confirm({
        title: t('common.restore'),
        description: t('common.confirmRestoreItem', { name: formatFoodDisplayName(food) }),
      });
      if (ok) {
        await unarchiveFood(food.id);
        triggerHaptic('success');
        toast.show(t('common.saved'));
      }
    } else {
      const ok = await confirm({
        title: t('common.archive'),
        description: t('common.confirmArchiveItem', { name: formatFoodDisplayName(food) }),
      });
      if (ok) {
        await archiveFood(food.id);
        triggerHaptic('selection');
        toast.show(t('common.saved'));
        navigate('/settings/foods');
      }
    }
  };

  const handleDelete = async () => {
    if (!food || hasUsage) return;
    const ok = await confirm({
      title: t('common.delete'),
      description: t('common.confirmDeleteItem', { name: formatFoodDisplayName(food) }),
      variant: 'destructive',
    });
    if (ok) {
      const res = await deleteFood(food.id);
      if (!res.success) {
        if (res.reason === 'has_logs') {
          toast.show(t('settings.foodHasLogsCannotDelete'));
        } else if (res.reason === 'has_recipes') {
          toast.show(t('diet.foodHasRecipes', '已被菜餚引用'));
        } else {
          toast.show(t('common.error'));
        }
        return;
      }
      triggerHaptic('warning');
      toast.show(t('common.deleted'));
      navigate('/settings/foods');
    }
  };

  const [matrixContainerWidth, setMatrixContainerWidth] = useState<number>(0);

  const totalWeeks = useMemo(() => {
    return calculateTotalWeeks({
      logs: foodLogs,
      matrixContainerWidth,
    });
  }, [foodLogs, matrixContainerWidth]);

  const { heatmapDays, periodCalories, periodCount, periodMaxGrams } = useMemo(() => {
    return calculateFootprintData({
      logs: foodLogs,
      overviewPeriod,
      totalWeeks,
    });
  }, [foodLogs, overviewPeriod, totalWeeks]);

  if (!id) return <Navigate to="/settings/foods" />;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-mono text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (!food) {
    return <Navigate to="/settings/foods" />;
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
              title={hasUsage ? t('diet.foodHasUsageCannotDelete') : t('common.delete')}
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
              title={food.isArchived ? t('common.restore') : t('common.archive')}
              aria-label={food.isArchived ? t('common.restore') : t('common.archive')}
            >
              {food.isArchived ? (
                <RefreshCcw className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsEditOpen(true)}
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title={t('common.edit')}
              aria-label={t('common.edit')}
            >
              <Edit2 className="size-4" />
            </Button>
          </div>,
          headerActionEl
        )}

      {/* 方案 B-1 + 10px 熱點圖全一體化卡片 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-none">
        {/* 第 1 層：B-1 極簡 HUD 規格條 (h-8) */}
        <div className="h-8 px-4 border-b border-border bg-muted/40 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-widest text-[10px] text-muted-foreground font-semibold">
              {t(`diet.foodCategory.${food.category || 'natural'}`)}
            </span>
            {food.brand && (
              <>
                <span className="text-border select-none">·</span>
                <span className="text-muted-foreground text-[11px]">{food.brand}</span>
              </>
            )}
          </div>
          <div>
            {food.isArchived ? (
              <span className="text-[10px] font-mono text-destructive tracking-wide">
                {t('common.archived')}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-500 tracking-wide">
                {t('common.active')}
              </span>
            )}
          </div>
        </div>

        {/* 第 2 層：B-1 大氣品名帶與特質微徽章 */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-card">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words min-w-0">
            {food.name}
          </h1>
          {evalRes?.labels && evalRes.labels.length > 0 && (
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
          isLoading={isLoading}
          onContainerWidthChange={setMatrixContainerWidth}
        />
      </div>

      {/* 每份營養素標籤基準卡片 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t('diet.servingNutrients', '基準營養素')}
          </div>
          <NutritionBasisToggle />
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-muted-foreground">{t('diet.serving')}</span>
            <span className="font-mono text-foreground">
              {formatFoodServing(scaledNutrition?.servingSize ?? food.servingSize, scaledNutrition?.servingUnit ?? food.servingUnit, foodWeightUnit, foodVolumeUnit).formatted}
            </span>
          </div>
          <div className={cn(
            "h-10 px-4 flex items-center justify-between transition-colors",
            evalRes?.highlights.calories && "bg-calories-subtle-bg"
          )}>
            <span className="text-calories font-medium">{t('diet.calories')}</span>
            <span className="font-mono text-calories font-medium">
              {formatEnergy(scaledNutrition?.calories ?? food.calories, energyUnit).formatted}
            </span>
          </div>
          <div className={cn(
            "h-10 px-4 flex items-center justify-between transition-colors",
            evalRes?.highlights.carbs && "bg-carbs-subtle-bg"
          )}>
            <span className="text-carbs font-medium">{t('diet.carbs')}</span>
            <span className="font-mono text-carbs font-medium">
              {scaledNutrition?.carbs ?? food.carbs} g
            </span>
          </div>
          <div className={cn(
            "h-10 px-4 flex items-center justify-between transition-colors",
            evalRes?.highlights.protein && "bg-protein-subtle-bg"
          )}>
            <span className="text-protein font-medium">{t('diet.protein')}</span>
            <span className="font-mono text-protein font-medium">
              {scaledNutrition?.protein ?? food.protein} g
            </span>
          </div>
          <div className={cn(
            "h-10 px-4 flex items-center justify-between transition-colors",
            evalRes?.highlights.fat && "bg-fat-subtle-bg"
          )}>
            <span className="text-fat font-medium">{t('diet.fat')}</span>
            <span className="font-mono text-fat font-medium">
              {scaledNutrition?.fat ?? food.fat} g
            </span>
          </div>
        </div>
      </div>

      {/* 編輯食材 Dialog (FoodFormDialog 共用組件) */}
      <FoodFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={food}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
