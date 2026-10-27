import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NutritionBasisToggle } from '@/components/food/NutritionBasisToggle';
import { FoodListItem } from '@/components/food/FoodListItem';
import { RecipeListItem } from '@/components/food/RecipeListItem';
import { useFoods } from '@/hooks/useFoods';
import { useRecipes } from '@/hooks/useRecipes';
import type { FoodItem, FoodRecipe, FoodCategory, NutritionTag } from '@/types';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export type FoodSelectMode = 'all' | 'foods' | 'recipes';
export type FoodInteractiveMode = 'manage' | 'select';

export interface FoodRecipeBrowserProps {
  /** 模式：全部 (可切換)、僅食材、或僅食譜 @default 'all' */
  mode?: FoodSelectMode;
  /** 當前選中的 Tab (受控模式) */
  activeTab?: 'foods' | 'recipes';
  /** Tab 切換回調 (受控模式) */
  onTabChange?: (tab: 'foods' | 'recipes') => void;
  /** 交互模式：管理 (可跳轉與歸檔操作) 或選擇 (單擊回傳) @default 'select' */
  interactiveMode?: FoodInteractiveMode;
  /** 項目點擊回調 */
  onItemClick?: (item: FoodItem | FoodRecipe, type: 'food' | 'recipe') => void;
  /** 是否允許查看歸檔 @default interactiveMode === 'manage' */
  showArchivedOption?: boolean;
  /** 禁用的項目 ID 陣列（將反灰顯示且無法點擊選取） */
  disabledIds?: string[];
  /** 自訂項目是否禁用的判斷函數 */
  isItemDisabled?: (item: FoodItem | FoodRecipe, type: 'food' | 'recipe') => boolean;
  /** 歸檔管理操作回調 */
  onDeleteFood?: (food: FoodItem) => void;
  onUnarchiveFood?: (food: FoodItem) => void;
  onDeleteRecipe?: (recipe: FoodRecipe) => void;
  onUnarchiveRecipe?: (recipe: FoodRecipe) => void;
  /** 自訂容器類名 */
  className?: string;
  /** 自訂列表滾動容器類名 */
  listContainerClassName?: string;
}

export function FoodRecipeBrowser({
  mode = 'all',
  activeTab: controlledTab,
  onTabChange: setControlledTab,
  interactiveMode = 'select',
  onItemClick,
  showArchivedOption = interactiveMode === 'manage',
  disabledIds,
  isItemDisabled,
  onDeleteFood,
  onUnarchiveFood,
  onDeleteRecipe,
  onUnarchiveRecipe,
  className,
  listContainerClassName,
}: FoodRecipeBrowserProps) {
  const { t } = useTranslation();

  // 建立快速查詢已禁用 ID 集合
  const disabledIdSet = useMemo(() => new Set(disabledIds || []), [disabledIds]);

  const checkIsFoodDisabled = (food: FoodItem) => {
    if (disabledIdSet.has(food.id)) return true;
    if (isItemDisabled && isItemDisabled(food, 'food')) return true;
    return false;
  };

  const checkIsRecipeDisabled = (recipe: FoodRecipe) => {
    if (disabledIdSet.has(recipe.id)) return true;
    if (isItemDisabled && isItemDisabled(recipe, 'recipe')) return true;
    return false;
  };

  // 頂部視圖：支援外部受控，若未傳則使用內部狀態
  const [internalTab, setInternalTab] = useState<'foods' | 'recipes'>(
    mode === 'recipes' ? 'recipes' : 'foods'
  );
  
  const currentTab = controlledTab ?? internalTab;
  const viewTab = mode === 'all' ? currentTab : mode;

  const handleTabChange = (tab: 'foods' | 'recipes') => {
    triggerHaptic('selection');
    if (setControlledTab) {
      setControlledTab(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // 分類導航列橫向自動平滑滾動對齊
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
    const targetDelta = relativeLeft - containerRect.width / 2 + buttonRect.width / 2;

    container.scrollBy({
      left: targetDelta,
      behavior: 'smooth',
    });
  };

  // ==========================================
  // 食物原子庫 (Foods)
  // ==========================================
  const {
    customFoods,
    presetFoods,
    archivedCustomFoods,
    archivedPresetFoods,
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
    return totalArchivedFoods.filter(
      (f) => (f.category || 'natural') === selectedCategory
    ).length;
  }, [totalArchivedFoods, selectedCategory]);

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
      'high-calorie': 0,
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
      'high-calorie': 0,
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
          const descMatch = recipe.description
            ? recipe.description.toLowerCase().includes(q)
            : false;
          return nameMatch || descMatch;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tabBaseRecipes, selectedRecipeNutritionTag, recipeSearchQuery, getRecipeMacros]);

  return (
    <div className={cn('space-y-3 font-mono flex flex-col', className)}>
      {/* 頂部雙列指標卡 (僅在 mode === 'all' 時渲染) */}
      {mode === 'all' && (
        <div
          className="grid grid-cols-2 gap-2.5 font-mono select-none shrink-0"
          role="tablist"
          aria-label={t('diet.foodItems')}
        >
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
              <span
                className={cn(
                  'font-medium',
                  viewTab === 'foods' ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
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
              <span
                className={cn(
                  'font-medium',
                  viewTab === 'recipes' ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
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
      )}

      {/* ========================================================================= */}
      {/* 視圖 1：單品食材 (Foods) */}
      {/* ========================================================================= */}
      {viewTab === 'foods' && (
        <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
          {/* 搜尋輸入框 (無 autoFocus，防止行動端鍵盤自動彈出) */}
          <div className="relative flex items-center shrink-0">
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

          {/* 分類與特徵篩選列 (橫向滾動膠囊 + 右側釘住特徵選單) */}
          <div className="flex items-center justify-between gap-1.5 py-0.5 shrink-0">
            {/* 左側：分類選擇 */}
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
                        'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap',
                        isSelected
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {cat.label}
                      <span
                        className={cn(
                          'ml-1 text-[10px] tabular-nums',
                          isSelected ? 'opacity-60' : 'opacity-45'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* 獨立已歸檔開關膠囊 (僅在允許歸檔時顯示) */}
                {showArchivedOption && (
                  <>
                    <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
                    <button
                      type="button"
                      onClick={(e) => {
                        triggerHaptic('selection');
                        setShowFoodArchived((prev) => !prev);
                        handleScrollTabIntoView(e.currentTarget, false, true);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0',
                        showFoodArchived
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {t('common.archived', '已歸檔')}
                      <span
                        className={cn(
                          'ml-1 text-[10px] tabular-nums',
                          showFoodArchived ? 'opacity-60' : 'opacity-45'
                        )}
                      >
                        {archivedFoodsCount}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 右側：營養特質固定按鈕 */}
            <div className="shrink-0 pl-1 border-l border-border/60">
              <div
                className={cn(
                  'inline-flex items-center rounded-full text-xs font-mono transition-all border',
                  selectedNutritionTag !== 'all'
                    ? 'bg-foreground text-background border-foreground font-medium'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border'
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
                        'cursor-pointer flex items-center justify-between',
                        selectedNutritionTag === 'all' && 'font-semibold bg-muted'
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
                        { id: 'high-calorie', label: t('diet.nutritionTags.high-calorie') },
                      ] as const
                    ).map((tag) => (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedNutritionTag(tag.id);
                        }}
                        className={cn(
                          'cursor-pointer flex items-center justify-between',
                          selectedNutritionTag === tag.id && 'font-semibold bg-muted'
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
          <div
            className={cn(
              'border border-border rounded-lg overflow-hidden bg-card text-card-foreground flex-1 min-h-0 flex flex-col',
              listContainerClassName
            )}
          >
            {/* 內嵌儀表表頭 */}
            <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground shrink-0">
              <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                {t('common.itemCount', { count: filteredFoods.length })}
              </span>
              <NutritionBasisToggle />
            </div>

            {/* 滾動內容區 */}
            <div className="divide-y divide-border overflow-y-auto flex-1 min-h-0">
              {filteredFoods.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {showFoodArchived
                    ? t('settings.noArchivedFoods')
                    : t('settings.noCustomFoods')}
                </div>
              ) : (
                filteredFoods.map((food) => {
                  const isDisabled = checkIsFoodDisabled(food);
                  return (
                    <FoodListItem
                      key={food.id}
                      food={food}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        onItemClick?.(food, 'food');
                      }}
                      showActions={interactiveMode === 'manage' && (showFoodArchived || !!food.isArchived)}
                      onRestore={onUnarchiveFood ? () => onUnarchiveFood(food) : undefined}
                      onDelete={onDeleteFood ? () => onDeleteFood(food) : undefined}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 視圖 2：食譜配方 (Recipes) */}
      {/* ========================================================================= */}
      {viewTab === 'recipes' && (
        <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
          {/* 搜尋輸入框 */}
          <div className="relative flex items-center shrink-0">
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

          {/* 分類與特徵篩選列 */}
          <div className="flex items-center justify-between gap-1.5 py-0.5 shrink-0">
            <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 shrink-0 pr-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowRecipeArchived(false);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap',
                    !showRecipeArchived
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {t('diet.foodCategory.all', '全部')}
                  <span
                    className={cn(
                      'ml-1 text-[10px] tabular-nums',
                      !showRecipeArchived ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {totalActiveRecipes.length}
                  </span>
                </button>

                {showArchivedOption && (
                  <>
                    <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setShowRecipeArchived((prev) => !prev);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0',
                        showRecipeArchived
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {t('common.archived', '已歸檔')}
                      <span
                        className={cn(
                          'ml-1 text-[10px] tabular-nums',
                          showRecipeArchived ? 'opacity-60' : 'opacity-45'
                        )}
                      >
                        {totalArchivedRecipes.length}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 右側：特徵選單 */}
            <div className="shrink-0">
              <div
                className={cn(
                  'inline-flex items-center rounded-full text-xs font-mono transition-all border',
                  selectedRecipeNutritionTag !== 'all'
                    ? 'bg-foreground text-background border-foreground font-medium'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border'
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
                        'cursor-pointer flex items-center justify-between',
                        selectedRecipeNutritionTag === 'all' && 'font-semibold bg-muted'
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
                        { id: 'high-calorie', label: t('diet.nutritionTags.high-calorie') },
                      ] as const
                    ).map((tag) => (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedRecipeNutritionTag(tag.id);
                        }}
                        className={cn(
                          'cursor-pointer flex items-center justify-between',
                          selectedRecipeNutritionTag === tag.id && 'font-semibold bg-muted'
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
          <div
            className={cn(
              'border border-border rounded-lg overflow-hidden bg-card text-card-foreground flex-1 min-h-0 flex flex-col',
              listContainerClassName
            )}
          >
            {/* 內嵌儀表表頭 */}
            <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground shrink-0">
              <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                {t('common.itemCount', { count: filteredRecipes.length })}
              </span>
              <NutritionBasisToggle />
            </div>

            {/* 滾動內容區 */}
            <div className="divide-y divide-border overflow-y-auto flex-1 min-h-0">
              {filteredRecipes.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {showRecipeArchived
                    ? t('settings.noArchivedRecipes')
                    : t('settings.noCustomRecipes')}
                </div>
              ) : (
                filteredRecipes.map((recipe) => {
                  const isDisabled = checkIsRecipeDisabled(recipe);
                  return (
                    <RecipeListItem
                      key={recipe.id}
                      recipe={recipe}
                      macros={getRecipeMacros(recipe)}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        onItemClick?.(recipe, 'recipe');
                      }}
                      showActions={interactiveMode === 'manage' && (showRecipeArchived || !!recipe.isArchived)}
                      onRestore={onUnarchiveRecipe ? () => onUnarchiveRecipe(recipe) : undefined}
                      onDelete={onDeleteRecipe ? () => onDeleteRecipe(recipe) : undefined}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
