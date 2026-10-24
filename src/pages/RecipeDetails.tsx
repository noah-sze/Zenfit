import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  Utensils,
  ChevronRight,
  Edit2,
  Archive,
  RefreshCcw,
  Trash2,
  MoreVertical,
  Plus,
} from 'lucide-react';
import { useFoods } from '@/hooks/useFoods';
import { useRecipes } from '@/hooks/useRecipes';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import { subDays, subYears, format } from 'date-fns';
import { AutoMarquee } from '@/components/ui/AutoMarquee';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { calculateIngredientMacros, calculateRecipeTotals } from '@/utils/recipeMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import type { RecipeIngredient } from '@/types';

export default function RecipeDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const { allFoods } = useFoods();
  const { updateRecipe, archiveRecipe, unarchiveRecipe, deleteRecipe } = useRecipes();

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

  // 取得此菜餚的所有歷史飲食記錄 (透過 notes 包含 [菜餚名稱])
  const relatedFoodLogs = useLiveQuery(
    async () => {
      if (!recipe) return [];
      const logs = await db.food_logs
        .filter(
          (log) =>
            !!log.notes &&
            log.notes.includes(`[${recipe.name}]`)
        )
        .toArray();

      return logs.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt - a.createdAt;
      });
    },
    [recipe?.name]
  );

  // 統計累計數據：全部、近一月、近一年
  const {
    allTimeCount,
    allTimeCalories,
    pastMonthCount,
    pastMonthCalories,
    pastYearCount,
    pastYearCalories,
  } = useMemo(() => {
    if (!relatedFoodLogs || relatedFoodLogs.length === 0) {
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

    let allCal = 0;
    let monthCount = 0;
    let monthCal = 0;
    let yearCount = 0;
    let yearCal = 0;

    relatedFoodLogs.forEach((log) => {
      const cal = log.calories || 0;
      allCal += cal;

      if (log.date >= oneMonthAgoStr) {
        monthCount += 1;
        monthCal += cal;
      }
      if (log.date >= oneYearAgoStr) {
        yearCount += 1;
        yearCal += cal;
      }
    });

    return {
      allTimeCount: relatedFoodLogs.length,
      allTimeCalories: Math.round(allCal),
      pastMonthCount: monthCount,
      pastMonthCalories: Math.round(monthCal),
      pastYearCount: yearCount,
      pastYearCalories: Math.round(yearCal),
    };
  }, [relatedFoodLogs]);

  // 按日期分組歷史飲食記錄
  const groupedLogs = useMemo(() => {
    if (!relatedFoodLogs || relatedFoodLogs.length === 0) return [];
    const groups: { date: string; items: typeof relatedFoodLogs }[] = [];
    relatedFoodLogs.forEach((log) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === log.date) {
        lastGroup.items.push(log);
      } else {
        groups.push({ date: log.date, items: [log] });
      }
    });
    return groups;
  }, [relatedFoodLogs]);

  // 菜餚標準營養素
  const standardTotals = useMemo(() => {
    if (!recipe) return null;
    return calculateRecipeTotals(recipe, foodMap);
  }, [recipe, foodMap]);

  // 菜餚無油/瀝乾客觀對比數值
  const oilFreeTotals = useMemo(() => {
    if (!recipe) return null;
    return calculateRecipeTotals(recipe, foodMap, { excludeAllOptional: true });
  }, [recipe, foodMap]);

  // 是否有可選原料（如烹調用油）
  const hasOptionalIngredients = useMemo(() => {
    return recipe?.ingredients.some((ing) => ing.isOptional) ?? false;
  }, [recipe]);

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
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIngredients, setEditIngredients] = useState<
    Array<{ foodId: string; quantity: string; isOptional: boolean }>
  >([]);

  const handleOpenEdit = () => {
    if (!recipe) return;
    setEditName(recipe.name);
    setEditDescription(recipe.description || '');
    setEditIngredients(
      recipe.ingredients.map((ing) => ({
        foodId: ing.foodId,
        quantity: String(ing.quantity),
        isOptional: !!ing.isOptional,
      }))
    );
    setIsEditDialogOpen(true);
  };

  const handleAddIngredientRow = () => {
    if (allFoods.length === 0) return;
    setEditIngredients((prev) => [
      ...prev,
      { foodId: allFoods[0].id, quantity: '100', isOptional: false },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setEditIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe || !editName.trim()) return;

    const validIngredients: RecipeIngredient[] = [];
    for (const item of editIngredients) {
      const targetFood = allFoods.find((f) => f.id === item.foodId);
      const qty = parseFloat(item.quantity);
      if (targetFood && qty > 0) {
        validIngredients.push({
          foodId: targetFood.id,
          foodName: formatFoodDisplayName(targetFood),
          quantity: qty,
          unit: targetFood.servingUnit || 'g',
          isOptional: item.isOptional,
        });
      }
    }

    if (validIngredients.length === 0) {
      toast.show(t('diet.noIngredients'));
      return;
    }

    await updateRecipe(recipe.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      ingredients: validIngredients,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditDialogOpen(false);
  };

  const handleArchive = async () => {
    if (!recipe) return;
    await archiveRecipe(recipe.id);
    triggerHaptic('selection');
    toast.show(t('settings.archivedSuccess', '已歸檔'));
  };

  const handleUnarchive = async () => {
    if (!recipe) return;
    await unarchiveRecipe(recipe.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess', '已恢復'));
  };

  const handleDelete = async () => {
    if (!recipe) return;
    const isOk = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${recipe.name}?`,
      variant: 'destructive',
    });
    if (!isOk) return;

    await deleteRecipe(recipe.id);
    triggerHaptic('warning');
    toast.show(t('common.deleted', '已刪除'));
    navigate('/settings/recipes');
  };

  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderActionEl(document.getElementById('subpage-header-action'));
  }, []);

  if (recipe === null) {
    return <Navigate to="/settings/recipes" replace />;
  }

  if (!recipe || !standardTotals) {
    return null;
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* 頂部操作按鈕 (Portal 映射至 AppLayout 頂部標頭右側) */}
      {headerActionEl &&
        createPortal(
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleOpenEdit}
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              title={t('common.edit')}
              aria-label={t('common.edit')}
            >
              <Edit2 className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-[160px]">
                {recipe.isArchived ? (
                  <DropdownMenuItem className="cursor-pointer" onClick={handleUnarchive}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    {t('settings.unarchive')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="cursor-pointer" onClick={handleArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    {t('settings.archive')}
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>,
          headerActionEl
        )}

      {/* 菜餚基本抬頭資訊 */}
      <div className="flex flex-col items-center justify-center text-center pt-2">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {recipe.name}
        </h2>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-1">
          <span>{t('diet.ingredientsCount', { count: recipe.ingredients.length })}</span>
          {recipe.isArchived && (
            <>
              <span>·</span>
              <span className="text-destructive">{t('settings.archived')}</span>
            </>
          )}
        </div>
        {recipe.description && (
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs italic">
            {recipe.description}
          </p>
        )}
      </div>

      {/* 1:1 復刻 Zenance 統計卡片 (Hero Metric Card) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-none">
        {/* 上半部：全部 (All Time) */}
        <div className="p-7 border-b border-border flex flex-col items-center justify-center text-center">
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
              {allTimeCalories.toLocaleString()}
            </span>
            <span className="text-lg sm:text-xl font-normal text-muted-foreground ml-1.5">
              kcal
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
                {pastMonthCalories.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                kcal
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
                {pastYearCalories.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                kcal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 配方營養素總計卡片 */}
      <div className="space-y-1.5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1">
          {t('diet.recipeNutrients', '配方營養素總計')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-muted-foreground">{t('diet.calories')}</span>
            <span className="font-mono text-foreground font-medium">
              {standardTotals.calories} kcal
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-muted-foreground">{t('diet.unit')} (g)</span>
            <span className="font-mono text-foreground font-medium">
              {standardTotals.totalWeightGrams} g
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-muted-foreground">{t('diet.protein')}</span>
            <span className="font-mono text-foreground font-medium">
              {standardTotals.protein} g ({macroRatio.p}%)
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-muted-foreground">{t('diet.carbs')}</span>
            <span className="font-mono text-foreground font-medium">
              {standardTotals.carbs} g ({macroRatio.c}%)
            </span>
          </div>
          <div className="h-10 px-4 flex items-center justify-between">
            <span className="text-muted-foreground">{t('diet.fat')}</span>
            <span className="font-mono text-foreground font-medium">
              {standardTotals.fat} g ({macroRatio.f}%)
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
          <span className="text-xs font-mono text-muted-foreground">
            {t('diet.ingredientsCount', { count: recipe.ingredients.length })}
          </span>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
          {recipe.ingredients.map((ing, idx) => {
            const food = foodMap.get(ing.foodId);
            const macros = calculateIngredientMacros(food, ing.quantity);

            return (
              <div
                key={idx}
                onClick={() => food && navigate(`/settings/foods/${food.id}`)}
                className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground truncate">
                      {ing.foodName}
                    </span>
                    {ing.isOptional && (
                      <span className="text-[10px] font-mono border border-dashed border-border px-1.5 py-0.2 rounded text-muted-foreground shrink-0">
                        {t('diet.optionalBadge')}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                    {ing.quantity} {ing.unit} · {macros.protein}g P · {macros.carbs}g C · {macros.fat}g F
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-medium text-foreground text-sm">
                    {macros.calories} kcal
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 客觀烹飪變量對比 (Cooking Modifier Impact) */}
      {hasOptionalIngredients && oilFreeTotals && (
        <div className="space-y-1.5 pt-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground px-1">
            {t('diet.cookingModifierImpact')}
          </div>
          <div className="border border-border rounded-lg overflow-hidden bg-card p-3 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded border border-border bg-muted/20">
                <div className="text-[10px] uppercase font-mono text-muted-foreground">
                  {t('diet.standardRecipe')}
                </div>
                <div className="text-sm font-semibold font-mono text-foreground mt-0.5">
                  {standardTotals.calories} kcal
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {standardTotals.fat} g {t('diet.fat')}
                </div>
              </div>

              <div className="p-2 rounded border border-border bg-muted/20">
                <div className="text-[10px] uppercase font-mono text-muted-foreground">
                  {t('diet.oilFreeDrained')}
                </div>
                <div className="text-sm font-semibold font-mono text-foreground mt-0.5">
                  {oilFreeTotals.calories} kcal
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {oilFreeTotals.fat} g {t('diet.fat')}
                </div>
              </div>
            </div>

            <div className="text-center font-mono text-xs text-muted-foreground pt-1 border-t border-border/50">
              {t('diet.oilReductionDelta')}:{' '}
              <span className="text-foreground font-medium">
                -{standardTotals.calories - oilFreeTotals.calories} kcal
              </span>{' '}
              (
              <span>
                -{(Math.round((standardTotals.fat - oilFreeTotals.fat) * 10) / 10)} g {t('diet.fat')}
              </span>
              )
            </div>
          </div>
        </div>
      )}

      {/* 歷史飲食記錄清單 */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('diet.consumptionHistory', '飲食記錄清單')}
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            {t('diet.itemsCount', { count: relatedFoodLogs?.length ?? 0 })}
          </span>
        </div>

        {groupedLogs.length === 0 ? (
          <div className="border border-border rounded-lg p-8 text-center bg-card text-muted-foreground text-sm">
            <Utensils className="size-6 mx-auto mb-2 opacity-30" />
            {t('diet.noRecipeLogs')}
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
                      className="h-12 px-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {t(`diet.${log.mealType}`)}
                        </span>
                        <span className="text-sm text-foreground font-medium truncate">
                          {log.foodName}
                        </span>
                      </div>
                      <div className="font-mono text-sm text-foreground shrink-0 pl-2">
                        {log.calories} kcal
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編輯菜餚 Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          overlayClassName="z-[70]"
          className="z-[70] w-[360px] max-w-[calc(100vw-32px)] sm:w-[420px] sm:max-w-[420px] max-h-[85vh] flex flex-col bg-card border border-border text-card-foreground p-5"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-card-foreground text-base font-semibold">
              {t('diet.editRecipe')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col min-h-0 space-y-3 py-2">
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.recipeName')} *
                </Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.recipeDescription')}
                </Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              {/* 構成食材列表 */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('diet.recipeIngredients')}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary cursor-pointer px-2"
                    onClick={handleAddIngredientRow}
                  >
                    <Plus className="size-3.5 mr-1" />
                    {t('diet.addIngredient')}
                  </Button>
                </div>

                <div className="space-y-2">
                  {editIngredients.map((item, idx) => {
                    const selFood = allFoods.find((f) => f.id === item.foodId);
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded border border-border bg-muted/20 space-y-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <select
                            value={item.foodId}
                            onChange={(e) => {
                              const newId = e.target.value;
                              setEditIngredients((prev) =>
                                prev.map((ing, i) => (i === idx ? { ...ing, foodId: newId } : ing))
                              );
                            }}
                            className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs text-foreground cursor-pointer"
                          >
                            {allFoods.map((f) => (
                              <option key={f.id} value={f.id}>
                                {formatFoodDisplayName(f)} ({f.calories} kcal / {f.servingSize} {f.servingUnit})
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                            onClick={() => handleRemoveIngredientRow(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQty = e.target.value;
                                setEditIngredients((prev) =>
                                  prev.map((ing, i) =>
                                    i === idx ? { ...ing, quantity: newQty } : ing
                                  )
                                );
                              }}
                              className="h-7 w-20 text-xs font-mono"
                            />
                            <span className="text-muted-foreground text-xs font-mono">
                              {selFood?.servingUnit || 'g'}
                            </span>
                          </div>

                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.isOptional}
                              onChange={(e) => {
                                const chk = e.target.checked;
                                setEditIngredients((prev) =>
                                  prev.map((ing, i) =>
                                    i === idx ? { ...ing, isOptional: chk } : ing
                                  )
                                );
                              }}
                              className="size-3.5 rounded border-border"
                            />
                            <span>{t('diet.optionalModifier')}</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3 shrink-0 border-t border-border/50">
              <DialogClose render={<Button type="button" variant="outline" className="border-border cursor-pointer" />}>
                {t('common.cancel')}
              </DialogClose>
              <Button type="submit" disabled={!editName.trim()} className="cursor-pointer">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
