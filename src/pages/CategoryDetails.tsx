import { useState, useMemo, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Utensils, Edit2, Archive, RefreshCcw, Trash2 } from 'lucide-react';
import { useFoods } from '@/hooks/useFoods';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import { subDays, subYears, format } from 'date-fns';
import { AutoMarquee } from '@/components/ui/AutoMarquee';
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
import type { NutritionTag, FoodLog } from '@/types';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { MacroSquares } from '@/components/food/MacroSquares';
import { EditFoodLogDialog } from '@/components/diet/EditFoodLogDialog';

export default function CategoryDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { allFoods, isLoading, updateFood, archiveFood, unarchiveFood, deleteFood } = useFoods();
  const { nutritionDisplayMode } = useAppStore();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();

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
  const [editingFoodLog, setEditingFoodLog] = useState<FoodLog | null>(null);

  const handleSaveFoodLog = async (
    logId: string,
    updates: { quantity: number; calories: number; carbs: number; protein: number; fat: number }
  ) => {
    await db.food_logs.update(logId, updates);
    triggerHaptic('success');
    toast.show(t('common.saved'));
    setEditingFoodLog(null);
  };

  const handleDeleteFoodLog = async (logId: string) => {
    await db.food_logs.delete(logId);
    triggerHaptic('warning');
    toast.show(t('common.deleted'));
    setEditingFoodLog(null);
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
      // 依日期與建立時間降序排序
      return logs.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt - a.createdAt;
      });
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

  // 計算全部、近一月、近一年之攝入數據 (1:1 復刻 Zenance 統計邏輯)
  const {
    allTimeCount,
    allTimeCalories,
    pastMonthCount,
    pastMonthCalories,
    pastYearCount,
    pastYearCalories,
  } = useMemo(() => {
    if (!foodLogs || foodLogs.length === 0) {
      return {
        allTimeCount: 0,
        allTimeCalories: 0,
        pastMonthCount: 0,
        pastMonthCalories: 0,
        pastYearCount: 0,
        pastYearCalories: 0,
      };
    }

    // oxlint-disable-next-line react/purity
    const now = new Date();
    const oneMonthAgoStr = format(subDays(now, 30), 'yyyy-MM-dd');
    const oneYearAgoStr = format(subYears(now, 1), 'yyyy-MM-dd');

    let allCalories = 0;
    let monthCount = 0;
    let monthCalories = 0;
    let yearCount = 0;
    let yearCalories = 0;

    foodLogs.forEach((log) => {
      const cal = log.calories || 0;
      allCalories += cal;

      if (log.date >= oneMonthAgoStr) {
        monthCount += 1;
        monthCalories += cal;
      }
      if (log.date >= oneYearAgoStr) {
        yearCount += 1;
        yearCalories += cal;
      }
    });

    return {
      allTimeCount: foodLogs.length,
      allTimeCalories: Math.round(allCalories),
      pastMonthCount: monthCount,
      pastMonthCalories: Math.round(monthCalories),
      pastYearCount: yearCount,
      pastYearCalories: Math.round(yearCalories),
    };
  }, [foodLogs]);

  // 按日期分組歷史飲食記錄
  const groupedLogs = useMemo(() => {
    if (!foodLogs || foodLogs.length === 0) return [];
    const groups: { date: string; items: typeof foodLogs; groupCalories: number }[] = [];
    foodLogs.forEach((log) => {
      let g = groups.find((grp) => grp.date === log.date);
      if (!g) {
        g = { date: log.date, items: [], groupCalories: 0 };
        groups.push(g);
      }
      g.items.push(log);
      g.groupCalories += log.calories || 0;
    });
    return groups;
  }, [foodLogs]);

  const getMealTypeLabel = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return t('diet.breakfast');
      case 'lunch':
        return t('diet.lunch');
      case 'dinner':
        return t('diet.dinner');
      case 'snack':
        return t('diet.snack');
      default:
        return mealType;
    }
  };

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

      {/* 食物名稱與分類標籤 (分類膠囊在上，標題在下，居中對齊) */}
      <div className="flex flex-col items-center justify-center text-center">
        {/* 1. 分類膠囊與營養特質標籤在上 */}
        <div className="flex items-center justify-center gap-1.5 mb-1.5 flex-wrap px-2">
          <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">
            {t(`diet.foodCategory.${food.category || 'natural'}`)}
          </span>
          {evalRes?.labels.map((tag) => (
            <span
              key={tag}
              className={cn(
                "text-xs font-mono border px-1.5 py-0.5 rounded font-medium",
                getNutritionTagBadgeClass(tag)
              )}
            >
              {t(`diet.nutritionTags.${tag}`)}
            </span>
          ))}
          {food.isArchived && (
            <span className="text-xs font-mono text-destructive border border-destructive/30 bg-destructive-subtle px-1.5 py-0.5 rounded">
              {t('common.archived')}
            </span>
          )}
        </div>
        {/* 標題在下 */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground px-4 break-words">
          {formatFoodDisplayName(food)}
        </h1>
      </div>

      {/* 1:1 復刻 Zenance 統計卡片 (Hero Metric Card) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-none">
        {/* 上半部：全部 (All Time) */}
        <div className="py-5 px-4 border-b border-border flex flex-col items-center justify-center text-center">
          <div className="relative flex items-center justify-center h-5 mb-1.5 w-full">
            <p className="text-xs uppercase tracking-widest text-muted-foreground leading-none">
              {t('stats.allTime', '全部')}
            </p>
            <div className="absolute right-0 flex items-center">
              <span className="text-[11px] font-mono text-muted-foreground leading-none">
                {t('diet.loggedCount', { count: allTimeCount })}
              </span>
            </div>
          </div>
          <AutoMarquee align="center" className="text-4xl sm:text-5xl font-mono tracking-tighter font-medium px-4 leading-none">
            <span className="tabular-nums font-mono">
              {formatEnergy(allTimeCalories, energyUnit).value.toLocaleString()}
            </span>
            <span className="text-lg sm:text-xl font-normal text-muted-foreground ml-1.5">
              {energyUnit}
            </span>
          </AutoMarquee>
        </div>

        {/* 下半部：近一月 & 近一年 */}
        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-card p-4">
            <div className="flex items-center justify-between h-5 mb-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground leading-none">
                {t('stats.pastMonth', '近一月')}
              </p>
              <span className="text-[11px] font-mono text-muted-foreground leading-none">
                {t('diet.loggedCountShort', { count: pastMonthCount })}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-mono tracking-tight font-medium leading-none mt-2 truncate">
              <span className="tabular-nums font-mono">
                {formatEnergy(pastMonthCalories, energyUnit).value.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {energyUnit}
              </span>
            </div>
          </div>

          <div className="bg-card p-4">
            <div className="flex items-center justify-between h-5 mb-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground leading-none">
                {t('stats.pastYear', '近一年')}
              </p>
              <span className="text-[11px] font-mono text-muted-foreground leading-none">
                {t('diet.loggedCountShort', { count: pastYearCount })}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-mono tracking-tight font-medium leading-none mt-2 truncate">
              <span className="tabular-nums font-mono">
                {formatEnergy(pastYearCalories, energyUnit).value.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {energyUnit}
              </span>
            </div>
          </div>
        </div>
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
            <span className="font-mono text-foreground font-medium">
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

      {/* 歷史飲食記錄清單 (沿用首頁表格設計) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('diet.consumptionHistory', '飲食記錄清單')}
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            {t('diet.itemsCount', { count: foodLogs?.length ?? 0 })}
          </span>
        </div>

        {groupedLogs.length === 0 ? (
          <div className="border border-border rounded-lg p-8 text-center bg-card text-muted-foreground text-sm">
            <Utensils className="size-6 mx-auto mb-2 opacity-30" />
            {t('diet.noFoodLogs', '尚無該食物的飲食記錄')}
          </div>
        ) : (
          <div className="space-y-3">
            {groupedLogs.map((group) => (
              <div
                key={group.date}
                className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden"
              >
                {/* 灰底表頭橫欄 (單行 40px 高度，沿用首頁設計) */}
                <div className="h-10 px-3.5 sm:px-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3 text-xs font-mono text-muted-foreground shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm tracking-tight text-foreground shrink-0">
                      {group.date}
                    </span>
                    {group.groupCalories > 0 && (
                      <>
                        <span className="text-border select-none shrink-0">·</span>
                        <span className="text-foreground/80">
                          {formatEnergy(group.groupCalories, energyUnit).formatted}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {t('diet.itemsCount', { count: group.items.length })}
                  </span>
                </div>

                {/* 食物條目列表 (沿用首頁 MacroSquares 矩陣與雙行資訊佈局) */}
                <div className="divide-y divide-border">
                  {group.items.map((log) => {
                    const logEvalRes = evaluateNutritionalHighlight({
                      calories: log.calories,
                      protein: log.protein,
                      carbs: log.carbs,
                      fat: log.fat,
                      servingSize: log.quantity,
                      servingUnit: log.unit || 'g',
                    });
                    const isLowCalorie = logEvalRes.labels.includes('low-calorie');
                    const isHighCalorie = logEvalRes.labels.includes('high-calorie');

                    return (
                      <div
                        key={log.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setEditingFoodLog(log);
                        }}
                        className="min-h-16 py-2.5 px-3.5 sm:px-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        {/* 左側：餐別與份量熱量副標 */}
                        <div className="flex-1 min-w-0 pr-3 select-none">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-foreground font-medium text-sm truncate">
                              {getMealTypeLabel(log.mealType)}
                            </span>
                            {log.notes && (
                              <span className="text-xs text-muted-foreground truncate">
                                ({log.notes})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                            <span>
                              {formatFoodServing(log.quantity, log.unit, foodWeightUnit, foodVolumeUnit).formatted}
                            </span>
                            <span className="text-border">·</span>
                            <span
                              className={cn(
                                isLowCalorie &&
                                  'text-emerald-600/90 dark:text-emerald-400/90 px-1 py-0.5 rounded bg-emerald-500/5',
                                isHighCalorie &&
                                  'text-rose-600/90 dark:text-rose-400/90 px-1 py-0.5 rounded bg-rose-500/5'
                              )}
                            >
                              {formatEnergy(log.calories, energyUnit).formatted}
                            </span>
                          </div>
                        </div>

                        {/* 右側：MacroSquares 矩陣 (首頁採用方案 A 柔和微光) */}
                        <div className="flex items-center shrink-0">
                          <MacroSquares
                            protein={log.protein}
                            carbs={log.carbs}
                            fat={log.fat}
                            highlights={logEvalRes.highlights}
                            variant="subtle"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編輯食材 Dialog (FoodFormDialog 共用組件) */}
      <FoodFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={food}
        onSubmit={handleEditSubmit}
      />

      {/* 編輯單筆飲食記錄 Dialog (首頁同款組件) */}
      <EditFoodLogDialog
        open={!!editingFoodLog}
        onOpenChange={(open) => !open && setEditingFoodLog(null)}
        log={editingFoodLog}
        onSave={handleSaveFoodLog}
        onDelete={handleDeleteFoodLog}
      />
    </div>
  );
}
