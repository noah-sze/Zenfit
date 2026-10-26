import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  Archive,
  RefreshCcw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFoods } from '@/hooks/useFoods';
import { useRecipes } from '@/hooks/useRecipes';
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
import type { FoodItem, FoodRecipe, RecipeIngredient } from '@/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing, ozToG, flOzToMl } from '@/utils/unitMath';

export default function Recipes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();

  const { allFoods } = useFoods();
  const {
    customRecipes,
    presetRecipes,
    archivedCustomRecipes,
    archivedPresetRecipes,
    addRecipe,
    updateRecipe,
    archiveRecipe,
    unarchiveRecipe,
    deleteRecipe,
    getRecipeMacros,
  } = useRecipes();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const handleTabChange = (tab: 'active' | 'archived') => {
    triggerHaptic('selection');
    setActiveTab(tab);
  };

  // 新增或編輯菜餚彈窗狀態
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<FoodRecipe | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<
    Array<{ foodId: string; quantity: string; isOptional: boolean }>
  >([]);

  const currentRecipes = useMemo(() => {
    let list: FoodRecipe[] = [];
    if (activeTab === 'active') {
      list = [...customRecipes, ...presetRecipes];
    } else {
      list = [...archivedCustomRecipes, ...archivedPresetRecipes];
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTab, customRecipes, presetRecipes, archivedCustomRecipes, archivedPresetRecipes]);

  const handleOpenAddRecipe = () => {
    setEditingRecipe(null);
    setRecipeName('');
    setRecipeDescription('');
    if (allFoods.length > 0) {
      const firstFood = allFoods[0];
      const isLiquid = (firstFood.servingUnit || 'g').toLowerCase().includes('ml') || firstFood.category === 'beverage';
      const defaultQty = isLiquid
        ? (foodVolumeUnit === 'fl oz' ? '8' : '250')
        : (foodWeightUnit === 'oz' ? '1' : '100');
      setRecipeIngredients([{ foodId: firstFood.id, quantity: defaultQty, isOptional: false }]);
    } else {
      setRecipeIngredients([]);
    }
    setIsRecipeDialogOpen(true);
  };

  const handleOpenEditRecipe = (recipe: FoodRecipe) => {
    setEditingRecipe(recipe);
    setRecipeName(recipe.name);
    setRecipeDescription(recipe.description || '');
    setRecipeIngredients(
      recipe.ingredients.map((ing) => {
        const displayServing = formatFoodServing(ing.quantity, ing.unit, foodWeightUnit, foodVolumeUnit);
        return {
          foodId: ing.foodId,
          quantity: String(displayServing.size),
          isOptional: !!ing.isOptional,
        };
      })
    );
    setIsRecipeDialogOpen(true);
  };

  const handleAddIngredientRow = () => {
    if (allFoods.length === 0) return;
    const firstFood = allFoods[0];
    const isLiquid = (firstFood.servingUnit || 'g').toLowerCase().includes('ml') || firstFood.category === 'beverage';
    const defaultQty = isLiquid
      ? (foodVolumeUnit === 'fl oz' ? '8' : '250')
      : (foodWeightUnit === 'oz' ? '1' : '100');
    setRecipeIngredients((prev) => [
      ...prev,
      { foodId: firstFood.id, quantity: defaultQty, isOptional: false },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim()) return;

    const validIngredients: RecipeIngredient[] = [];
    for (const item of recipeIngredients) {
      const targetFood = allFoods.find((f) => f.id === item.foodId);
      const qty = parseFloat(item.quantity);
      if (targetFood && qty > 0) {
        const isLiquid = (targetFood.servingUnit || 'g').toLowerCase().includes('ml') || targetFood.category === 'beverage';
        let normalizedQty = qty;
        if (isLiquid && foodVolumeUnit === 'fl oz') {
          normalizedQty = flOzToMl(qty, 2);
        } else if (!isLiquid && foodWeightUnit === 'oz') {
          normalizedQty = ozToG(qty, 2);
        }

        validIngredients.push({
          foodId: targetFood.id,
          foodName: formatFoodDisplayName(targetFood),
          quantity: normalizedQty,
          unit: targetFood.servingUnit || 'g',
          isOptional: item.isOptional,
        });
      }
    }

    if (validIngredients.length === 0) {
      toast.show(t('diet.noIngredients'));
      return;
    }

    if (editingRecipe) {
      await updateRecipe(editingRecipe.id, {
        name: recipeName.trim(),
        description: recipeDescription.trim() || undefined,
        ingredients: validIngredients,
      });
      toast.show(t('common.saved'));
    } else {
      await addRecipe({
        name: recipeName.trim(),
        description: recipeDescription.trim() || undefined,
        ingredients: validIngredients,
        isCustom: true,
      });
      toast.show(t('common.saved'));
    }

    triggerHaptic('success');
    setIsRecipeDialogOpen(false);
  };

  const handleDeleteRecipe = async (recipe: FoodRecipe) => {
    const isOk = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${recipe.name}?`,
      variant: 'destructive',
    });
    if (!isOk) return;

    await deleteRecipe(recipe.id);
    triggerHaptic('warning');
    toast.show(t('common.deleted', '已刪除'));
  };

  const handleArchiveRecipe = async (recipe: FoodRecipe) => {
    await archiveRecipe(recipe.id);
    triggerHaptic('selection');
    toast.show(t('settings.archivedSuccess', '已歸檔'));
  };

  const handleUnarchiveRecipe = async (recipe: FoodRecipe) => {
    await unarchiveRecipe(recipe.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess', '已恢復'));
  };

  // 即時計算彈窗中食譜預估營養素
  const previewRecipeMacros = useMemo(() => {
    const ingList: RecipeIngredient[] = [];
    for (const item of recipeIngredients) {
      const f = allFoods.find((food) => food.id === item.foodId);
      const qty = parseFloat(item.quantity) || 0;
      if (f && qty > 0) {
        ingList.push({
          foodId: f.id,
          foodName: formatFoodDisplayName(f),
          quantity: qty,
          unit: f.servingUnit,
          isOptional: item.isOptional,
        });
      }
    }
    const foodMap = new Map<string, FoodItem>();
    allFoods.forEach((f) => foodMap.set(f.id, f));

    return getRecipeMacros({
      id: 'preview',
      name: recipeName,
      ingredients: ingList,
      isCustom: true,
      createdAt: 0,
      updatedAt: 0,
    });
  }, [recipeIngredients, recipeName, allFoods, getRecipeMacros]);

  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderActionEl(document.getElementById('subpage-header-action'));
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* 頂部操作按鈕 (Portal 映射至 AppLayout 頂部標頭右側) */}
      {headerActionEl &&
        activeTab === 'active' &&
        createPortal(
          <Button
            size="icon"
            variant="ghost"
            onClick={handleOpenAddRecipe}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title={t('diet.addRecipe')}
            aria-label={t('diet.addRecipe')}
          >
            <Plus className="h-5 w-5" />
          </Button>,
          headerActionEl
        )}

      {/* 頂部 Tab 欄 (使用中 / 已歸檔) */}
      <SegmentedControl<'active' | 'archived'>
        value={activeTab}
        onChange={handleTabChange}
        fullWidth
        options={[
          { value: 'active', label: t('common.active') },
          { value: 'archived', label: t('common.archived') },
        ]}
      />

      {/* 狀態列：計數顯示 */}
      <div className="flex items-center justify-between px-1 text-xs font-mono text-muted-foreground">
        <span>
          {activeTab === 'active'
            ? t('settings.activeCount', { count: currentRecipes.length })
            : t('settings.archivedCount', { count: currentRecipes.length })}
        </span>
      </div>

      {/* 菜餚組合清單 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {currentRecipes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {activeTab === 'archived'
                ? t('settings.noArchivedRecipes')
                : t('settings.noCustomRecipes')}
            </div>
          ) : (
            currentRecipes.map((recipe) => {
              const macros = getRecipeMacros(recipe);

              return (
                <div key={recipe.id} className="transition-colors hover:bg-muted/30">
                  <div className="min-h-14 py-2.5 flex items-center justify-between px-4 group">
                    <button
                      type="button"
                      className="flex-1 text-left cursor-pointer min-w-0 select-none flex items-center justify-between pr-3"
                      onClick={() => navigate(`/settings/recipes/${recipe.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-foreground font-medium text-sm">
                            {recipe.name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                          {formatEnergy(macros.calories, energyUnit).formatted} · {macros.protein}g P · {macros.carbs}g C · {macros.fat}g F
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <div className="flex items-center pl-2 shrink-0">
                      {activeTab === 'archived' ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-primary opacity-90 hover:opacity-100 cursor-pointer"
                            onClick={() => handleUnarchiveRecipe(recipe)}
                            title={t('common.restore')}
                            aria-label={t('common.restore')}
                          >
                            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                            {t('common.restore')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => handleDeleteRecipe(recipe)}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity cursor-pointer"
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleOpenEditRecipe(recipe)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleArchiveRecipe(recipe)}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              {t('settings.archive')}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className={cn(
                                "text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                              )}
                              onClick={() => handleDeleteRecipe(recipe)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 新增或編輯菜餚組合 Dialog */}
      <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
        <DialogContent
          overlayClassName="z-[70]"
          className="z-[70] w-[360px] max-w-[calc(100vw-32px)] sm:w-[420px] sm:max-w-[420px] max-h-[85vh] flex flex-col bg-card border border-border text-card-foreground p-5"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-card-foreground text-base font-semibold">
              {editingRecipe ? t('diet.editRecipe') : t('diet.addRecipe')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecipeSubmit} className="flex-1 flex flex-col min-h-0 space-y-3 py-2">
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {/* 菜餚基本資料 */}
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.recipeName')} *
                </Label>
                <Input
                  placeholder={t('diet.recipeNamePlaceholder')}
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.recipeDescription')}
                </Label>
                <Input
                  placeholder={t('common.notes')}
                  value={recipeDescription}
                  onChange={(e) => setRecipeDescription(e.target.value)}
                />
              </div>

              {/* 構成食材動態列表 */}
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
                  {recipeIngredients.map((item, idx) => {
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
                              setRecipeIngredients((prev) =>
                                prev.map((ing, i) => (i === idx ? { ...ing, foodId: newId } : ing))
                              );
                            }}
                            className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs text-foreground cursor-pointer"
                          >
                            {allFoods.map((f) => (
                              <option key={f.id} value={f.id}>
                                {formatFoodDisplayName(f)} ({formatEnergy(f.calories, energyUnit).formatted} / {formatFoodServing(f.servingSize, f.servingUnit, foodWeightUnit, foodVolumeUnit).formatted})
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
                                setRecipeIngredients((prev) =>
                                  prev.map((ing, i) =>
                                    i === idx ? { ...ing, quantity: newQty } : ing
                                  )
                                );
                              }}
                              className="h-7 w-20 text-xs font-mono"
                            />
                            <span className="text-muted-foreground text-xs font-mono">
                              {formatFoodServing(1, selFood?.servingUnit || 'g', foodWeightUnit, foodVolumeUnit).unit}
                            </span>
                          </div>

                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.isOptional}
                              onChange={(e) => {
                                const chk = e.target.checked;
                                setRecipeIngredients((prev) =>
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

              {/* 底部預計計算統計卡片 */}
              <div className="p-2.5 rounded border border-border bg-card space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  {t('diet.totalEstimated')}
                </div>
                <div className="text-sm font-semibold font-mono text-foreground">
                  {previewRecipeMacros.calories} kcal
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({previewRecipeMacros.totalWeightGrams} g)
                  </span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground flex gap-3 pt-0.5">
                  <span>P: {previewRecipeMacros.protein} g</span>
                  <span>C: {previewRecipeMacros.carbs} g</span>
                  <span>F: {previewRecipeMacros.fat} g</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3 shrink-0 border-t border-border/50">
              <DialogClose render={<Button type="button" variant="outline" className="border-border cursor-pointer" />}>
                {t('common.cancel')}
              </DialogClose>
              <Button type="submit" disabled={!recipeName.trim()} className="cursor-pointer">
                {editingRecipe ? t('common.save') : t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
