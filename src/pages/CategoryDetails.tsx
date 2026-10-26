import { useState, useMemo } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { useAppStore } from '@/store/useAppStore';
import { calculateScaledNutrition } from '@/utils/nutritionMath';
import { NutritionBasisToggle } from '@/components/food/NutritionBasisToggle';
import { FoodFormDialog, type FoodFormData } from '@/components/food/FoodFormDialog';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';

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

  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEditSubmit = async (formData: FoodFormData) => {
    if (!food) return;

    await updateFood(food.id, formData);

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditOpen(false);
  };

  const handleToggleArchive = async () => {
    if (!food) return;
    if (food.isArchived) {
      await unarchiveFood(food.id);
      triggerHaptic('success');
      toast.show(t('common.saved'));
    } else {
      const ok = await confirm({
        title: t('common.archive'),
        description: `${t('common.confirm')} ${t('common.archive')} ${formatFoodDisplayName(food)}?`,
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
    if (!food) return;
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${t('common.delete')} ${formatFoodDisplayName(food)}?`,
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
    const groups: { date: string; items: typeof foodLogs }[] = [];
    foodLogs.forEach((log) => {
      let g = groups.find((grp) => grp.date === log.date);
      if (!g) {
        g = { date: log.date, items: [] };
        groups.push(g);
      }
      g.items.push(log);
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
      {/* 食物名稱與品牌標籤卡片 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight truncate">
            {formatFoodDisplayName(food)}
          </h2>
          <span className="text-xs font-mono text-muted-foreground truncate border border-border px-1.5 py-0.5 rounded">
            {t(`diet.foodCategory.${food.category || 'natural'}`)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditOpen(true)}
          className="h-8 text-xs font-mono px-2.5 cursor-pointer shrink-0"
        >
          <Edit2 className="size-3.5 mr-1" />
          {t('common.edit')}
        </Button>
      </div>

      {/* 1:1 復刻 Zenance 統計卡片 (Hero Metric Card) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-none">
        {/* 上半部：全部 (All Time) */}
        <div className="p-8 border-b border-border flex flex-col items-center justify-center text-center">
          <div className="relative flex items-center justify-center h-5 mb-2 w-full">
            <p className="text-xs uppercase tracking-widest text-muted-foreground leading-none">
              {t('stats.allTime', '全部')}
            </p>
            <div className="absolute right-0 flex items-center">
              <span className="text-[11px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded leading-none">
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
            <span className="text-muted-foreground">{t('diet.foodCategory.title')}</span>
            <span className="font-mono text-foreground font-medium">
              {t(`diet.foodCategory.${food.category || 'natural'}`)}
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-muted-foreground">{t('diet.serving')}</span>
            <span className="font-mono text-foreground font-medium">
              {formatFoodServing(scaledNutrition?.servingSize ?? food.servingSize, scaledNutrition?.servingUnit ?? food.servingUnit, foodWeightUnit, foodVolumeUnit).formatted}
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-calories font-medium">{t('diet.calories')}</span>
            <span className="font-mono text-foreground font-medium">
              {formatEnergy(scaledNutrition?.calories ?? food.calories, energyUnit).formatted}
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-protein font-medium">{t('diet.protein')}</span>
            <span className="font-mono text-foreground font-medium">
              {scaledNutrition?.protein ?? food.protein} g
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-carbs font-medium">{t('diet.carbs')}</span>
            <span className="font-mono text-foreground font-medium">
              {scaledNutrition?.carbs ?? food.carbs} g
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-fat font-medium">{t('diet.fat')}</span>
            <span className="font-mono text-foreground font-medium">
              {scaledNutrition?.fat ?? food.fat} g
            </span>
          </div>
        </div>
      </div>

      {/* 歷史飲食記錄清單 (1:1 復刻 GroupedTransactionList 結構) */}
      <div className="space-y-2 pt-2">
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
              <div key={group.date} className="space-y-1">
                <div className="text-xs font-mono text-muted-foreground px-1">
                  {group.date}
                </div>
                <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
                  {group.items.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 px-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium text-foreground border border-border">
                            {getMealTypeLabel(log.mealType)}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground truncate">
                            {formatFoodServing(log.quantity, log.unit, foodWeightUnit, foodVolumeUnit).formatted}
                          </span>
                        </div>
                        {log.notes && (
                          <span className="text-xs text-muted-foreground/80 truncate mt-1">
                            {log.notes}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-mono font-medium text-foreground">
                          {formatEnergy(log.calories, energyUnit).formatted}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground/70">
                          P: {log.protein}g · C: {log.carbs}g · F: {log.fat}g
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部封存與刪除操作區 (同 ExerciseDetails) */}
      <div className="pt-2 space-y-3">
        <Button
          variant="outline"
          onClick={handleToggleArchive}
          className="w-full text-xs font-mono h-10 border-border text-foreground hover:bg-muted/50 cursor-pointer"
        >
          {food.isArchived ? (
            <>
              <RefreshCcw className="size-3.5 mr-1.5" />
              {t('common.restore')}
            </>
          ) : (
            <>
              <Archive className="size-3.5 mr-1.5" />
              {t('common.archive')}
            </>
          )}
        </Button>

        <Button
          variant="destructive"
          onClick={handleDelete}
          className="w-full text-xs font-mono h-10 bg-destructive text-destructive-foreground hover:opacity-90 cursor-pointer"
        >
          <Trash2 className="size-3.5 mr-1.5" />
          {t('common.delete')}
        </Button>
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
