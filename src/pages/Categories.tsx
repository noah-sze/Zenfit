import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  RefreshCcw,
  Search,
  ChevronDown,
  X,
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
import type { FoodItem, FoodCategory, NutritionTag, FoodRecipe, RecipeIngredient } from '@/types';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { MacroSquares } from '@/components/food/MacroSquares';
import { useAppStore } from '@/store/useAppStore';
import { calculateScaledNutrition } from '@/utils/nutritionMath';
import { NutritionBasisToggle } from '@/components/food/NutritionBasisToggle';
import { FoodFormDialog, type FoodFormData } from '@/components/food/FoodFormDialog';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing, ozToG, flOzToMl } from '@/utils/unitMath';

export default function Categories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { nutritionDisplayMode } = useAppStore();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();

  // 頂部視圖切換：食材 vs 食譜 (純本地狀態，不污染 URL，遵守 Rule 4)
  const [viewTab, setViewTab] = useState<'foods' | 'recipes'>('foods');
  const handleTabChange = (tab: 'foods' | 'recipes') => {
    triggerHaptic('selection');
    setViewTab(tab);
  };

  // 分類導航列橫向自動平滑滾動對齊 (方案 A: 幾何精密居中算法)
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const handleScrollTabIntoView = (
    buttonEl: HTMLButtonElement,
    isFirst = false,
    isLast = false
  ) => {
    const container = categoryScrollRef.current;
    if (!container) return;

    if (isFirst) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (isLast) {
      container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = buttonEl.getBoundingClientRect();

    const relativeLeft = buttonRect.left - containerRect.left;
    const targetDelta = relativeLeft - (containerRect.width / 2) + (buttonRect.width / 2);

    container.scrollBy({
      left: targetDelta,
      behavior: 'smooth',
    });
  };

  // ==========================================
  // 食物原子庫 (Foods)
  // ==========================================
  const {
    allFoods,
    customFoods,
    presetFoods,
    archivedCustomFoods,
    archivedPresetFoods,
    addFood,
    unarchiveFood,
    deleteFood,
  } = useFoods();

  const [selectedCategory, setSelectedCategory] = useState<'all' | FoodCategory>('all');
  const [selectedNutritionTag, setSelectedNutritionTag] = useState<'all' | NutritionTag>('all');
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [showFoodArchived, setShowFoodArchived] = useState(false);

  const totalActiveFoodsCount = useMemo(() => {
    return customFoods.length + presetFoods.length;
  }, [customFoods, presetFoods]);

  const totalArchivedFoods = useMemo(() => {
    return [...archivedCustomFoods, ...archivedPresetFoods];
  }, [archivedCustomFoods, archivedPresetFoods]);

  const archivedFoodsCount = useMemo(() => {
    if (selectedCategory === 'all') {
      return totalArchivedFoods.length;
    }
    return totalArchivedFoods.filter((f) => (f.category || 'natural') === selectedCategory).length;
  }, [totalArchivedFoods, selectedCategory]);

  // 單品新增彈窗狀態 (使用 FoodFormDialog 共用組件)
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);

  const tabBaseFoods = useMemo(() => {
    if (!showFoodArchived) {
      return [...customFoods, ...presetFoods];
    }
    return totalArchivedFoods;
  }, [showFoodArchived, customFoods, presetFoods, totalArchivedFoods]);

  const categoryCounts = useMemo(() => {
    const counts: Record<'all' | FoodCategory, number> = {
      all: tabBaseFoods.length,
      natural: 0,
      processed: 0,
      beverage: 0,
      oil: 0,
      condiment: 0,
    };
    tabBaseFoods.forEach((food) => {
      const cat = food.category || 'natural';
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
    });
    return counts;
  }, [tabBaseFoods]);

  const nutritionTagCounts = useMemo(() => {
    const counts: Record<NutritionTag, number> = {
      'high-protein': 0,
      'carb-source': 0,
      'fat-source': 0,
      'low-calorie': 0,
    };
    tabBaseFoods.forEach((food) => {
      const evalRes = evaluateNutritionalHighlight(food);
      evalRes.labels.forEach((tag) => {
        if (counts[tag] !== undefined) {
          counts[tag] += 1;
        }
      });
    });
    return counts;
  }, [tabBaseFoods]);

  const filteredFoods = useMemo(() => {
    return tabBaseFoods
      .filter((food) => {
        const cat = food.category || 'natural';
        if (selectedCategory !== 'all' && cat !== selectedCategory) {
          return false;
        }
        if (selectedNutritionTag !== 'all') {
          const evalRes = evaluateNutritionalHighlight(food);
          if (!evalRes.labels.includes(selectedNutritionTag)) {
            return false;
          }
        }
        if (foodSearchQuery.trim()) {
          const q = foodSearchQuery.trim().toLowerCase();
          const nameMatch = food.name.toLowerCase().includes(q);
          const brandMatch = food.brand ? food.brand.toLowerCase().includes(q) : false;
          return nameMatch || brandMatch;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tabBaseFoods, selectedCategory, selectedNutritionTag, foodSearchQuery]);

  // ==========================================
  // 食譜庫 (Recipes)
  // ==========================================
  const {
    customRecipes,
    presetRecipes,
    archivedCustomRecipes,
    archivedPresetRecipes,
    addRecipe,
    updateRecipe,
    unarchiveRecipe,
    deleteRecipe,
    getRecipeMacros,
  } = useRecipes();

  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [showRecipeArchived, setShowRecipeArchived] = useState(false);
  const [selectedRecipeNutritionTag, setSelectedRecipeNutritionTag] = useState<'all' | NutritionTag>('all');

  const totalActiveRecipes = useMemo(() => {
    return [...customRecipes, ...presetRecipes];
  }, [customRecipes, presetRecipes]);

  const totalArchivedRecipes = useMemo(() => {
    return [...archivedCustomRecipes, ...archivedPresetRecipes];
  }, [archivedCustomRecipes, archivedPresetRecipes]);

  const tabBaseRecipes = useMemo(() => {
    return showRecipeArchived ? totalArchivedRecipes : totalActiveRecipes;
  }, [showRecipeArchived, totalArchivedRecipes, totalActiveRecipes]);

  const recipeNutritionTagCounts = useMemo(() => {
    const counts: Record<NutritionTag, number> = {
      'high-protein': 0,
      'carb-source': 0,
      'fat-source': 0,
      'low-calorie': 0,
    };
    tabBaseRecipes.forEach((recipe) => {
      const macros = getRecipeMacros(recipe);
      const evalRes = evaluateNutritionalHighlight({
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        servingSize: macros.totalWeightGrams || 100,
        servingUnit: 'g',
      });
      evalRes.labels.forEach((tag) => {
        if (counts[tag] !== undefined) {
          counts[tag] += 1;
        }
      });
    });
    return counts;
  }, [tabBaseRecipes, getRecipeMacros]);

  const filteredRecipes = useMemo(() => {
    return tabBaseRecipes
      .filter((recipe) => {
        const macros = getRecipeMacros(recipe);
        if (selectedRecipeNutritionTag !== 'all') {
          const evalRes = evaluateNutritionalHighlight({
            calories: macros.calories,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
            servingSize: macros.totalWeightGrams || 100,
            servingUnit: 'g',
          });
          if (!evalRes.labels.includes(selectedRecipeNutritionTag)) {
            return false;
          }
        }
        if (recipeSearchQuery.trim()) {
          const q = recipeSearchQuery.trim().toLowerCase();
          const nameMatch = recipe.name.toLowerCase().includes(q);
          const descMatch = recipe.description ? recipe.description.toLowerCase().includes(q) : false;
          return nameMatch || descMatch;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tabBaseRecipes, selectedRecipeNutritionTag, recipeSearchQuery, getRecipeMacros]);

  // 食譜彈窗狀態
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<FoodRecipe | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<
    Array<{ foodId: string; quantity: string; isOptional: boolean }>
  >([]);

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
    } else {
      await addRecipe({
        name: recipeName.trim(),
        description: recipeDescription.trim() || undefined,
        ingredients: validIngredients,
        isCustom: true,
      });
    }

    triggerHaptic('success');
    toast.show(t('common.saved'));
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
    toast.show(t('common.deleted'));
  };



  const handleUnarchiveRecipe = async (recipe: FoodRecipe) => {
    await unarchiveRecipe(recipe.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess'));
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
    return getRecipeMacros({
      id: 'preview',
      name: recipeName,
      ingredients: ingList,
      isCustom: true,
      createdAt: 0,
      updatedAt: 0,
    });
  }, [recipeIngredients, recipeName, allFoods, getRecipeMacros]);

  // ==========================================
  // 食物 Handlers
  // ==========================================


  const handleAddFoodSubmit = async (formData: FoodFormData) => {
    await addFood({
      ...formData,
      isCustom: true,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsAddFoodOpen(false);
  };

  const handleDeleteFood = async (food: FoodItem) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${food.name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

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
  };



  const handleUnarchiveFood = async (food: FoodItem) => {
    await unarchiveFood(food.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess'));
  };

  // Header Portal 錨點
  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderActionEl(document.getElementById('subpage-header-action'));
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* 頂部操作按鈕 (Portal 映射至 AppLayout 頂部標頭右側，依當前 Tab 動態映射) */}
      {headerActionEl &&
        createPortal(
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (viewTab === 'foods') {
                setIsAddFoodOpen(true);
              } else {
                handleOpenAddRecipe();
              }
            }}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title={viewTab === 'foods' ? t('settings.addCustomFood') : t('diet.addRecipe')}
            aria-label={viewTab === 'foods' ? t('settings.addCustomFood') : t('diet.addRecipe')}
          >
            <Plus className="h-5 w-5" />
          </Button>,
          headerActionEl
        )}

      {/* 頂部雙列數據微指標卡 (方案 C: Dual Metric Stat Cards) */}
      <div className="grid grid-cols-2 gap-2.5 font-mono select-none" role="tablist" aria-label={t('diet.foodItems')}>
        {/* 食材指標卡 */}
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === 'foods'}
          onClick={() => handleTabChange('foods')}
          className={cn(
            'p-2.5 sm:p-3 rounded-xl text-left cursor-pointer transition-all flex flex-col justify-between h-[66px] outline-none',
            viewTab === 'foods'
              ? 'border border-foreground bg-muted/30 shadow-none'
              : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
          )}
        >
          <div className="flex items-center justify-between text-xs">
            <span className={cn('font-medium', viewTab === 'foods' ? 'text-foreground' : 'text-muted-foreground')}>
              {t('diet.ingredientsTab', '食材')}
            </span>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                viewTab === 'foods' ? 'bg-foreground' : 'bg-transparent'
              )}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-xl font-bold tracking-tight',
                viewTab === 'foods' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {totalActiveFoodsCount}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t('diet.itemsUnit', '項單品')}
            </span>
          </div>
        </button>

        {/* 食譜指標卡 */}
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === 'recipes'}
          onClick={() => handleTabChange('recipes')}
          className={cn(
            'p-2.5 sm:p-3 rounded-xl text-left cursor-pointer transition-all flex flex-col justify-between h-[66px] outline-none',
            viewTab === 'recipes'
              ? 'border border-foreground bg-muted/30 shadow-none'
              : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
          )}
        >
          <div className="flex items-center justify-between text-xs">
            <span className={cn('font-medium', viewTab === 'recipes' ? 'text-foreground' : 'text-muted-foreground')}>
              {t('diet.recipesTab', '食譜')}
            </span>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                viewTab === 'recipes' ? 'bg-foreground' : 'bg-transparent'
              )}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-xl font-bold tracking-tight',
                viewTab === 'recipes' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {totalActiveRecipes.length}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t('diet.recipesUnit', '道配方')}
            </span>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 視圖 1：單品食材管理 (Foods) */}
      {/* ========================================================================= */}
      {viewTab === 'foods' && (
        <div className="space-y-2.5 font-mono">
          {/* 搜尋輸入框 */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={foodSearchQuery}
              onChange={(e) => setFoodSearchQuery(e.target.value)}
              placeholder={t('diet.searchFoodPlaceholder', '搜尋食材名稱或品牌...')}
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
            />
            {foodSearchQuery && (
              <button
                type="button"
                onClick={() => setFoodSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* 分類與特徵篩選列 (左側獨立滾動容器 + 右側固定釘住營養特質) */}
          <div className="flex items-center justify-between gap-1.5 py-0.5">
            {/* 左側：分類選擇與最後方的已歸檔按鈕 (橫向滾動) */}
            <div
              ref={categoryScrollRef}
              onWheel={(e) => {
                if (e.deltaY !== 0 && categoryScrollRef.current) {
                  categoryScrollRef.current.scrollLeft += e.deltaY;
                }
              }}
              className="flex-1 min-w-0 overflow-x-auto no-scrollbar"
            >
              <div className="flex items-center gap-1 shrink-0 pr-1">
                {(
                  [
                    { id: 'all', label: t('diet.foodCategory.all') },
                    { id: 'natural', label: t('diet.foodCategory.natural') },
                    { id: 'processed', label: t('diet.foodCategory.processed') },
                    { id: 'beverage', label: t('diet.foodCategory.beverage') },
                    { id: 'oil', label: t('diet.foodCategory.oil') },
                    { id: 'condiment', label: t('diet.foodCategory.condiment') },
                  ] as const
                ).map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = categoryCounts[cat.id];
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={(e) => {
                        triggerHaptic('selection');
                        setSelectedCategory(cat.id);
                        handleScrollTabIntoView(e.currentTarget, cat.id === 'all', false);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap",
                        isSelected
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {cat.label}
                      <span
                        className={cn(
                          "ml-1 text-[10px]",
                          isSelected ? "opacity-70" : "text-muted-foreground"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* 垂直微型分割線 */}
                <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />

                {/* 獨立已歸檔開關膠囊 (放置於分類選擇最後方) */}
                <button
                  type="button"
                  onClick={(e) => {
                    triggerHaptic('selection');
                    setShowFoodArchived((prev) => !prev);
                    handleScrollTabIntoView(e.currentTarget, false, true);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
                    showFoodArchived
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {t('common.archived', '已歸檔')}
                  <span
                    className={cn(
                      "ml-1 text-[10px]",
                      showFoodArchived ? "opacity-70" : "text-muted-foreground"
                    )}
                  >
                    {archivedFoodsCount}
                  </span>
                </button>
              </div>
            </div>

            {/* 右側：營養特質固定按鈕 (不隨左側滾動) */}
            <div className="shrink-0 pl-1 border-l border-border/60">
              <div
                className={cn(
                  "inline-flex items-center rounded-full text-xs font-mono transition-all border",
                  selectedNutritionTag !== 'all'
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="flex items-center gap-1 py-1.5 pl-3 pr-2 cursor-pointer focus:outline-none"
                      >
                        <span className="truncate max-w-[80px]">
                          {selectedNutritionTag === 'all'
                            ? t('diet.nutritionTags.title', '特徵')
                            : t(`diet.nutritionTags.${selectedNutritionTag}`)}
                        </span>
                        <ChevronDown className="size-3 opacity-60" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-[180px] font-mono text-xs">
                    <DropdownMenuItem
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedNutritionTag('all');
                      }}
                      className={cn(
                        "cursor-pointer flex items-center justify-between",
                        selectedNutritionTag === 'all' && "font-semibold bg-muted"
                      )}
                    >
                      <span>{t('diet.nutritionTags.all', '全部')}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {tabBaseFoods.length}
                      </span>
                    </DropdownMenuItem>
                    {(
                      [
                        { id: 'high-protein', label: t('diet.nutritionTags.high-protein') },
                        { id: 'carb-source', label: t('diet.nutritionTags.carb-source') },
                        { id: 'fat-source', label: t('diet.nutritionTags.fat-source') },
                        { id: 'low-calorie', label: t('diet.nutritionTags.low-calorie') },
                      ] as const
                    ).map((tag) => (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedNutritionTag(tag.id);
                        }}
                        className={cn(
                          "cursor-pointer flex items-center justify-between",
                          selectedNutritionTag === tag.id && "font-semibold bg-muted"
                        )}
                      >
                        <span>{tag.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {nutritionTagCounts[tag.id]}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedNutritionTag !== 'all' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setSelectedNutritionTag('all');
                    }}
                    className="p-1 pr-2 hover:opacity-70 cursor-pointer"
                    title={t('diet.resetFilter', '重設')}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 食材清單容器 */}
          <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground">
            {/* 卡片內嵌儀表表頭 */}
            <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                {t('common.itemCount', { count: filteredFoods.length })}
              </span>
              <NutritionBasisToggle />
            </div>

            <div className="divide-y divide-border">
              {filteredFoods.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {showFoodArchived
                    ? t('settings.noArchivedFoods')
                    : t('settings.noCustomFoods')}
                </div>
              ) : (
                filteredFoods.map((food) => {
                  const evalRes = evaluateNutritionalHighlight(food);
                  const isLowCalorie = evalRes.labels.includes('low-calorie');
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

                  return (
                    <div
                      key={food.id}
                      className="min-h-16 py-2.5 flex items-center justify-between px-4 group hover:bg-muted/30 transition-colors"
                    >
                      {/* 左側：品名與副標題 */}
                      <button
                        type="button"
                        className="flex-1 text-left cursor-pointer min-w-0 pr-3 select-none"
                        onClick={() => navigate(`/settings/foods/${food.id}`)}
                      >
                        <div className="truncate text-foreground font-medium text-sm">
                          {formatFoodDisplayName(food)}
                        </div>

                        <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                          <span className={cn(nutritionDisplayMode === 'per100g' && "font-medium text-foreground")}>
                            {displayServing.formatted}
                          </span>
                          <span className="opacity-40">·</span>
                          <span
                            className={cn(
                              isLowCalorie &&
                                "text-emerald-500 font-semibold px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20"
                            )}
                          >
                            {displayCal.formatted}
                          </span>
                        </div>
                      </button>

                      {/* 右側：獨立 3 列營養素矩陣 (複用 MacroSquares 組件) */}
                      <MacroSquares
                        protein={scaledNutrition.protein}
                        carbs={scaledNutrition.carbs}
                        fat={scaledNutrition.fat}
                        highlights={evalRes.highlights}
                      />

                      {/* 僅在已歸檔狀態顯示恢復/刪除按鈕 */}
                      {(showFoodArchived || food.isArchived) && (
                        <div className="flex items-center gap-0.5 shrink-0 pl-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary opacity-90 hover:opacity-100 cursor-pointer"
                            onClick={() => handleUnarchiveFood(food)}
                            title={t('common.restore')}
                            aria-label={t('common.restore')}
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => handleDeleteFood(food)}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 視圖 2：食譜管理 (Recipes - 完整沿用食材管理頁面設計) */}
      {/* ========================================================================= */}
      {viewTab === 'recipes' && (
        <div className="space-y-2.5 font-mono">
          {/* 搜尋輸入框 */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={recipeSearchQuery}
              onChange={(e) => setRecipeSearchQuery(e.target.value)}
              placeholder={t('diet.searchRecipePlaceholder', '搜尋食譜名稱或備註...')}
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
            />
            {recipeSearchQuery && (
              <button
                type="button"
                onClick={() => setRecipeSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* 分類與特徵篩選列 (左側全部與已歸檔 + 右側固定釘住營養特質) */}
          <div className="flex items-center justify-between gap-1.5 py-0.5">
            {/* 左側：全部與已歸檔 (靠左排列) */}
            <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 shrink-0 pr-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowRecipeArchived(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap",
                    !showRecipeArchived
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {t('diet.foodCategory.all', '全部')}
                  <span
                    className={cn(
                      "ml-1 text-[10px]",
                      !showRecipeArchived ? "opacity-70" : "text-muted-foreground"
                    )}
                  >
                    {totalActiveRecipes.length}
                  </span>
                </button>

                {/* 垂直微型分割線 */}
                <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />

                {/* 獨立已歸檔開關膠囊 */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowRecipeArchived((prev) => !prev);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
                    showRecipeArchived
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {t('common.archived', '已歸檔')}
                  <span
                    className={cn(
                      "ml-1 text-[10px]",
                      showRecipeArchived ? "opacity-70" : "text-muted-foreground"
                    )}
                  >
                    {totalArchivedRecipes.length}
                  </span>
                </button>
              </div>
            </div>

            {/* 右側：食譜專屬營養特質固定按鈕 (前方空間富餘，不顯示左側分割線) */}
            <div className="shrink-0">
              <div
                className={cn(
                  "inline-flex items-center rounded-full text-xs font-mono transition-all border",
                  selectedRecipeNutritionTag !== 'all'
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="flex items-center gap-1 py-1.5 pl-3 pr-2 cursor-pointer focus:outline-none"
                      >
                        <span className="truncate max-w-[80px]">
                          {selectedRecipeNutritionTag === 'all'
                            ? t('diet.nutritionTags.title', '特徵')
                            : t(`diet.nutritionTags.${selectedRecipeNutritionTag}`)}
                        </span>
                        <ChevronDown className="size-3 opacity-60" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-[180px] font-mono text-xs">
                    <DropdownMenuItem
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedRecipeNutritionTag('all');
                      }}
                      className={cn(
                        "cursor-pointer flex items-center justify-between",
                        selectedRecipeNutritionTag === 'all' && "font-semibold bg-muted"
                      )}
                    >
                      <span>{t('diet.nutritionTags.all', '全部')}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {tabBaseRecipes.length}
                      </span>
                    </DropdownMenuItem>
                    {(
                      [
                        { id: 'high-protein', label: t('diet.nutritionTags.high-protein') },
                        { id: 'carb-source', label: t('diet.nutritionTags.carb-source') },
                        { id: 'fat-source', label: t('diet.nutritionTags.fat-source') },
                        { id: 'low-calorie', label: t('diet.nutritionTags.low-calorie') },
                      ] as const
                    ).map((tag) => (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedRecipeNutritionTag(tag.id);
                        }}
                        className={cn(
                          "cursor-pointer flex items-center justify-between",
                          selectedRecipeNutritionTag === tag.id && "font-semibold bg-muted"
                        )}
                      >
                        <span>{tag.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {recipeNutritionTagCounts[tag.id]}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedRecipeNutritionTag !== 'all' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setSelectedRecipeNutritionTag('all');
                    }}
                    className="p-1 pr-2 hover:opacity-70 cursor-pointer"
                    title={t('diet.resetFilter', '重設')}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 食譜清單容器 */}
          <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground">
            {/* 卡片內嵌儀表表頭 */}
            <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                {t('common.itemCount', { count: filteredRecipes.length })}
              </span>
              <NutritionBasisToggle />
            </div>

            <div className="divide-y divide-border">
              {filteredRecipes.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {showRecipeArchived
                    ? t('settings.noArchivedRecipes')
                    : t('settings.noCustomRecipes')}
                </div>
              ) : (
                filteredRecipes.map((recipe) => {
                  const macros = getRecipeMacros(recipe);
                  const evalRes = evaluateNutritionalHighlight({
                    calories: macros.calories,
                    protein: macros.protein,
                    carbs: macros.carbs,
                    fat: macros.fat,
                    servingSize: macros.totalWeightGrams || 100,
                    servingUnit: 'g',
                  });
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

                  return (
                    <div
                      key={recipe.id}
                      className="min-h-16 py-2.5 flex items-center justify-between px-4 group hover:bg-muted/30 transition-colors"
                    >
                      {/* 左側：食譜名稱與食材數/熱量副標題 */}
                      <button
                        type="button"
                        className="flex-1 text-left cursor-pointer min-w-0 pr-3 select-none"
                        onClick={() => navigate(`/settings/recipes/${recipe.id}`)}
                      >
                        <div className="truncate text-foreground font-medium text-sm">
                          {recipe.name}
                        </div>

                        <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                          {nutritionDisplayMode === 'per100g' ? (
                            <>
                              <span className="font-medium text-foreground">
                                {formatFoodServing(scaledRecipeMacros.servingSize, scaledRecipeMacros.servingUnit, foodWeightUnit, foodVolumeUnit).formatted}
                              </span>
                              <span className="opacity-40">·</span>
                              <span>
                                {formatEnergy(scaledRecipeMacros.calories, energyUnit).formatted}
                              </span>
                            </>
                          ) : (
                            <>
                              <span>
                                {t('diet.ingredientsCount', { count: recipe.ingredients.length })}
                              </span>
                              <span className="opacity-40">·</span>
                              <span>
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

                      {/* 僅在已歸檔狀態顯示恢復/刪除按鈕 */}
                      {(showRecipeArchived || recipe.isArchived) && (
                        <div className="flex items-center gap-0.5 shrink-0 pl-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary opacity-90 hover:opacity-100 cursor-pointer"
                            onClick={() => handleUnarchiveRecipe(recipe)}
                            title={t('common.restore')}
                            aria-label={t('common.restore')}
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
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
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 彈窗區域：平鋪兄弟節點聲明 (No Nested Dialogs, Instant Pop) */}
      {/* ========================================================================= */}

      {/* 新增單品食物 Dialog */}
      <FoodFormDialog
        open={isAddFoodOpen}
        onOpenChange={setIsAddFoodOpen}
        onSubmit={handleAddFoodSubmit}
      />

      {/* 新增或編輯食譜 Dialog */}
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
                    {t('diet.recipeIngredients')} ({recipeIngredients.length})
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddIngredientRow}
                    className="h-7 text-xs font-mono px-2 cursor-pointer"
                  >
                    <Plus className="size-3 mr-1" />
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
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                            onClick={() => handleRemoveIngredientRow(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-muted-foreground shrink-0">{t('diet.serving')}:</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={item.quantity}
                              onChange={(e) => {
                                const q = e.target.value;
                                setRecipeIngredients((prev) =>
                                  prev.map((ing, i) => (i === idx ? { ...ing, quantity: q } : ing))
                                );
                              }}
                              className="h-7 text-xs font-mono w-20"
                            />
                            <span className="text-muted-foreground">{formatFoodServing(1, selFood?.servingUnit || 'g', foodWeightUnit, foodVolumeUnit).unit}</span>
                          </div>

                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.isOptional}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setRecipeIngredients((prev) =>
                                  prev.map((ing, i) =>
                                    i === idx ? { ...ing, isOptional: checked } : ing
                                  )
                                );
                              }}
                              className="rounded border-border text-primary focus:ring-0 cursor-pointer size-3.5"
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {t('diet.optionalBadge')}
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 預估營養素總計卡片 */}
              <div className="border border-border/80 rounded bg-muted/40 p-2.5 space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('diet.totalEstimated')}:</span>
                  <span className="text-foreground font-semibold">
                    {previewRecipeMacros.calories} kcal
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>P: {previewRecipeMacros.protein}g</span>
                  <span>C: {previewRecipeMacros.carbs}g</span>
                  <span>F: {previewRecipeMacros.fat}g</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3 shrink-0">
              <DialogClose render={<Button type="button" variant="outline" className="border-border cursor-pointer" />}>
                {t('common.cancel')}
              </DialogClose>
              <Button
                type="submit"
                disabled={!recipeName.trim() || recipeIngredients.length === 0}
                className="cursor-pointer"
              >
                {editingRecipe ? t('common.save') : t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
