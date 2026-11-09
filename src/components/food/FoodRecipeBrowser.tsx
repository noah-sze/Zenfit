import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
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
import { useRecentFoods } from '@/hooks/useRecentFoods';
import type { FoodItem, FoodRecipe, FoodCategory, NutritionTag } from '@/types';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { calculateScaledNutrition } from '@/utils/nutritionMath';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useBrowserStateStore, type FoodSortOption } from '@/store/useBrowserStateStore';
import { useAppStore } from '@/store/useAppStore';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';

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
  /** 當前在選擇模式下被選中的項目 ID */
  selectedId?: string;
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
  selectedId,
  onDeleteFood: _onDeleteFood,
  onUnarchiveFood: _onUnarchiveFood,
  onDeleteRecipe: _onDeleteRecipe,
  onUnarchiveRecipe: _onUnarchiveRecipe,
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

  const isManage = interactiveMode === 'manage';
  const { foodBrowser, setFoodBrowserState } = useBrowserStateStore();

  // 父層統一取得偏好，避免 40+ 個列表子元件各自重複調用 Hook 訂閱
  const { nutritionDisplayMode } = useAppStore();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();

  // 提取最近記錄
  const { recentFoodIds, recentRecipeIds } = useRecentFoods();
  const recentFoodIdSet = useMemo(() => new Set(recentFoodIds), [recentFoodIds]);
  const recentRecipeIdSet = useMemo(() => new Set(recentRecipeIds), [recentRecipeIds]);

  const recentFoodOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    recentFoodIds.forEach((id, idx) => map.set(id, idx));
    return map;
  }, [recentFoodIds]);

  const recentRecipeOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    recentRecipeIds.forEach((id, idx) => map.set(id, idx));
    return map;
  }, [recentRecipeIds]);

  // 穩定的選擇回調（100% 避免行內匿名函數參照抖動，啟動 React.memo）
  const handleSelectFood = useCallback(
    (food: FoodItem) => {
      onItemClick?.(food, 'food');
    },
    [onItemClick]
  );

  const handleSelectRecipe = useCallback(
    (recipe: FoodRecipe) => {
      onItemClick?.(recipe, 'recipe');
    },
    [onItemClick]
  );

  const [localCategory, setLocalCategory] = useState<'recent' | 'all' | FoodCategory>(() => {
    return !isManage ? 'recent' : 'all';
  });
  const [localNutritionTag, setLocalNutritionTag] = useState<'all' | NutritionTag>('all');
  const [localFoodSortBy, setLocalFoodSortBy] = useState<FoodSortOption>('default');
  const [localFoodSearchQuery, setLocalFoodSearchQuery] = useState('');
  const [localShowFoodArchived, setLocalShowFoodArchived] = useState(false);

  const selectedCategory = isManage ? foodBrowser.selectedCategory : localCategory;
  const setSelectedCategory = isManage
    ? (cat: 'recent' | 'all' | FoodCategory) => setFoodBrowserState({ selectedCategory: cat })
    : setLocalCategory;

  const selectedNutritionTag = isManage ? foodBrowser.selectedNutritionTag : localNutritionTag;
  const setSelectedNutritionTag = isManage
    ? (tag: 'all' | NutritionTag) => setFoodBrowserState({ selectedNutritionTag: tag })
    : setLocalNutritionTag;

  const foodSortBy = isManage ? (foodBrowser.foodSortBy ?? 'default') : localFoodSortBy;
  const setFoodSortBy = isManage
    ? (sort: FoodSortOption) => setFoodBrowserState({ foodSortBy: sort })
    : setLocalFoodSortBy;

  const foodSearchQuery = isManage ? foodBrowser.foodSearchQuery : localFoodSearchQuery;
  const setFoodSearchQuery = isManage
    ? (query: string) => setFoodBrowserState({ foodSearchQuery: query })
    : setLocalFoodSearchQuery;

  const showFoodArchived = isManage ? foodBrowser.showFoodArchived : localShowFoodArchived;
  const setShowFoodArchived = isManage
    ? (updater: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof updater === 'function' ? updater(foodBrowser.showFoodArchived) : updater;
        setFoodBrowserState({ showFoodArchived: next });
      }
    : setLocalShowFoodArchived;

  const totalActiveFoodsCount = useMemo(() => {
    return customFoods.length + presetFoods.length;
  }, [customFoods, presetFoods]);

  const totalArchivedFoods = useMemo(() => {
    return [...archivedCustomFoods, ...archivedPresetFoods];
  }, [archivedCustomFoods, archivedPresetFoods]);

  const tabBaseFoods = useMemo(() => {
    if (!showFoodArchived) {
      return [...customFoods, ...presetFoods];
    }
    return totalArchivedFoods;
  }, [showFoodArchived, customFoods, presetFoods, totalArchivedFoods]);

  const recentFoodsCount = useMemo(() => {
    return tabBaseFoods.filter((f) => recentFoodIdSet.has(f.id)).length;
  }, [tabBaseFoods, recentFoodIdSet]);

  const categoryCounts = useMemo(() => {
    const counts: Record<'recent' | 'all' | FoodCategory, number> = {
      recent: recentFoodsCount,
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
  }, [tabBaseFoods, recentFoodsCount]);

  // 針對 tabBaseFoods 建立 O(1) 營養特徵標籤快取 Map，徹底避免每次選單切換或過濾時對 422 筆食材全量重複進行昂貴的浮點運算
  const foodNutritionTagMap = useMemo(() => {
    const map = new Map<string, NutritionTag[]>();
    for (const food of tabBaseFoods) {
      map.set(food.id, evaluateNutritionalHighlight(food).labels);
    }
    return map;
  }, [tabBaseFoods]);

  const nutritionTagCounts = useMemo(() => {
    const counts: Record<NutritionTag, number> = {
      'high-protein': 0,
      'carb-source': 0,
      'fat-source': 0,
      'low-calorie': 0,
      'high-calorie': 0,
    };
    foodNutritionTagMap.forEach((labels) => {
      for (const tag of labels) {
        if (counts[tag] !== undefined) {
          counts[tag] += 1;
        }
      }
    });
    return counts;
  }, [foodNutritionTagMap]);

  const filteredFoods = useMemo(() => {
    let list = tabBaseFoods;

    if (selectedCategory === 'recent') {
      list = list.filter((food) => recentFoodIdSet.has(food.id));
    } else if (selectedCategory !== 'all') {
      list = list.filter((food) => (food.category || 'natural') === selectedCategory);
    }

    if (selectedNutritionTag !== 'all') {
      list = list.filter((food) => {
        const labels = foodNutritionTagMap.get(food.id);
        return labels ? labels.includes(selectedNutritionTag) : false;
      });
    }

    if (foodSearchQuery.trim()) {
      const q = foodSearchQuery.trim().toLowerCase();
      list = list.filter((food) => {
        const nameMatch = food.name.toLowerCase().includes(q);
        const brandMatch = food.brand ? food.brand.toLowerCase().includes(q) : false;
        return nameMatch || brandMatch;
      });
    }

    // 預先對列表項目計算對應當前 displayMode 的營養數值，避免在 sort O(N log N) 比較中重複多次計算
    const scaledMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
    if (foodSortBy !== 'default') {
      for (const item of list) {
        scaledMap.set(item.id, calculateScaledNutrition(item, nutritionDisplayMode));
      }
    }

    return list.slice().sort((a, b) => {
      if (foodSortBy !== 'default') {
        const valA = scaledMap.get(a.id);
        const valB = scaledMap.get(b.id);
        if (valA && valB) {
          if (foodSortBy === 'calories-desc') {
            const diff = valB.calories - valA.calories;
            if (Math.abs(diff) > 0.001) return diff;
          } else if (foodSortBy === 'calories-asc') {
            const diff = valA.calories - valB.calories;
            if (Math.abs(diff) > 0.001) return diff;
          } else if (foodSortBy === 'protein-desc') {
            const diff = valB.protein - valA.protein;
            if (Math.abs(diff) > 0.001) return diff;
          } else if (foodSortBy === 'carbs-desc') {
            const diff = valB.carbs - valA.carbs;
            if (Math.abs(diff) > 0.001) return diff;
          } else if (foodSortBy === 'fat-desc') {
            const diff = valB.fat - valA.fat;
            if (Math.abs(diff) > 0.001) return diff;
          }
        }
      } else {
        if (selectedCategory === 'recent') {
          const orderA = recentFoodOrderMap.get(a.id) ?? 999999;
          const orderB = recentFoodOrderMap.get(b.id) ?? 999999;
          if (orderA !== orderB) return orderA - orderB;
        }
      }

      return a.name.localeCompare(b.name);
    });
  }, [tabBaseFoods, selectedCategory, selectedNutritionTag, foodSearchQuery, foodSortBy, nutritionDisplayMode, recentFoodIdSet, recentFoodOrderMap, foodNutritionTagMap]);

  // ==========================================
  // 食材分批漸進加載 (Incremental Windowing)
  // 首屏渲染 40 筆，滾動觸底無感追加，消除 400+ DOM 節點一次性渲染卡頓
  // 使用 Callback Ref 確保在 Tab 切換或 DOM 重新掛載時 100% 重新綁定 Observer
  // ==========================================
  const FOOD_BATCH_SIZE = 40;
  const [visibleFoodCount, setVisibleFoodCount] = useState(FOOD_BATCH_SIZE);
  const foodObserverRef = useRef<IntersectionObserver | null>(null);
  const filteredFoodsLengthRef = useRef(filteredFoods.length);
  filteredFoodsLengthRef.current = filteredFoods.length;

  useEffect(() => {
    setVisibleFoodCount(FOOD_BATCH_SIZE);
  }, [selectedCategory, selectedNutritionTag, foodSortBy, foodSearchQuery, showFoodArchived]);

  const foodSentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (foodObserverRef.current) {
      foodObserverRef.current.disconnect();
      foodObserverRef.current = null;
    }

    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisibleFoodCount(filteredFoodsLengthRef.current);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleFoodCount((prev) => Math.min(prev + FOOD_BATCH_SIZE, filteredFoodsLengthRef.current));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(node);
    foodObserverRef.current = observer;
  }, []);

  useEffect(() => {
    return () => {
      foodObserverRef.current?.disconnect();
    };
  }, []);

  const visibleFoods = useMemo(() => {
    return filteredFoods.slice(0, visibleFoodCount);
  }, [filteredFoods, visibleFoodCount]);

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

  const [localRecipeSearchQuery, setLocalRecipeSearchQuery] = useState('');
  const [localShowRecipeArchived, setLocalShowRecipeArchived] = useState(false);
  const [localSelectedRecipeNutritionTag, setLocalSelectedRecipeNutritionTag] = useState<'all' | NutritionTag>('all');
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState<'recent' | 'all'>(() => {
    return !isManage ? 'recent' : 'all';
  });

  const recipeSearchQuery = isManage ? foodBrowser.recipeSearchQuery : localRecipeSearchQuery;
  const setRecipeSearchQuery = isManage
    ? (query: string) => setFoodBrowserState({ recipeSearchQuery: query })
    : setLocalRecipeSearchQuery;

  const showRecipeArchived = isManage ? foodBrowser.showRecipeArchived : localShowRecipeArchived;
  const setShowRecipeArchived = isManage
    ? (updater: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof updater === 'function' ? updater(foodBrowser.showRecipeArchived) : updater;
        setFoodBrowserState({ showRecipeArchived: next });
      }
    : setLocalShowRecipeArchived;

  const selectedRecipeNutritionTag = isManage
    ? foodBrowser.selectedRecipeNutritionTag
    : localSelectedRecipeNutritionTag;
  const setSelectedRecipeNutritionTag = isManage
    ? (tag: 'all' | NutritionTag) => setFoodBrowserState({ selectedRecipeNutritionTag: tag })
    : setLocalSelectedRecipeNutritionTag;

  const [localRecipeSortBy, setLocalRecipeSortBy] = useState<FoodSortOption>('default');
  const recipeSortBy = isManage ? (foodBrowser.recipeSortBy ?? 'default') : localRecipeSortBy;
  const setRecipeSortBy = isManage
    ? (sort: FoodSortOption) => setFoodBrowserState({ recipeSortBy: sort })
    : setLocalRecipeSortBy;

  const sortOptions = useMemo(
    () =>
      [
        { id: 'default' as const, label: t('diet.sort.default', '預設') },
        { id: 'calories-desc' as const, label: t('diet.sort.caloriesDesc', '熱量最高') },
        { id: 'calories-asc' as const, label: t('diet.sort.caloriesAsc', '熱量最低') },
        { id: 'protein-desc' as const, label: t('diet.sort.proteinDesc', '蛋白質最高') },
        { id: 'carbs-desc' as const, label: t('diet.sort.carbsDesc', '碳水最高') },
        { id: 'fat-desc' as const, label: t('diet.sort.fatDesc', '脂肪最高') },
      ] as const,
    [t]
  );

  const totalActiveRecipes = useMemo(() => {
    return [...customRecipes, ...presetRecipes];
  }, [customRecipes, presetRecipes]);

  const totalArchivedRecipes = useMemo(() => {
    return [...archivedCustomRecipes, ...archivedPresetRecipes];
  }, [archivedCustomRecipes, archivedPresetRecipes]);

  const tabBaseRecipes = useMemo(() => {
    return showRecipeArchived ? totalArchivedRecipes : totalActiveRecipes;
  }, [showRecipeArchived, totalArchivedRecipes, totalActiveRecipes]);

  const recentRecipesCount = useMemo(() => {
    return tabBaseRecipes.filter((r) => recentRecipeIdSet.has(r.id)).length;
  }, [tabBaseRecipes, recentRecipeIdSet]);

  // 針對 tabBaseRecipes 建立 O(1) 營養特徵標籤快取 Map
  const recipeNutritionTagMap = useMemo(() => {
    const map = new Map<string, NutritionTag[]>();
    for (const recipe of tabBaseRecipes) {
      const macros = getRecipeMacros(recipe);
      const evalRes = evaluateNutritionalHighlight({
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        servingSize: macros.totalWeightGrams || 100,
        servingUnit: 'g',
      });
      map.set(recipe.id, evalRes.labels);
    }
    return map;
  }, [tabBaseRecipes, getRecipeMacros]);

  const recipeNutritionTagCounts = useMemo(() => {
    const counts: Record<NutritionTag, number> = {
      'high-protein': 0,
      'carb-source': 0,
      'fat-source': 0,
      'low-calorie': 0,
      'high-calorie': 0,
    };
    recipeNutritionTagMap.forEach((labels) => {
      for (const tag of labels) {
        if (counts[tag] !== undefined) {
          counts[tag] += 1;
        }
      }
    });
    return counts;
  }, [recipeNutritionTagMap]);

  const filteredRecipes = useMemo(() => {
    let list = tabBaseRecipes;

    if (selectedRecipeCategory === 'recent') {
      list = list.filter((r) => recentRecipeIdSet.has(r.id));
    }

    if (selectedRecipeNutritionTag !== 'all') {
      list = list.filter((recipe) => {
        const labels = recipeNutritionTagMap.get(recipe.id);
        return labels ? labels.includes(selectedRecipeNutritionTag) : false;
      });
    }

    if (recipeSearchQuery.trim()) {
      const q = recipeSearchQuery.trim().toLowerCase();
      list = list.filter((recipe) => recipe.name.toLowerCase().includes(q));
    }

    return list.slice().sort((a, b) => {
      if (recipeSortBy !== 'default') {
        const macrosA = getRecipeMacros(a);
        const macrosB = getRecipeMacros(b);

        if (recipeSortBy === 'calories-desc') {
          const diff = macrosB.calories - macrosA.calories;
          if (Math.abs(diff) > 0.001) return diff;
        } else if (recipeSortBy === 'calories-asc') {
          const diff = macrosA.calories - macrosB.calories;
          if (Math.abs(diff) > 0.001) return diff;
        } else if (recipeSortBy === 'protein-desc') {
          const diff = macrosB.protein - macrosA.protein;
          if (Math.abs(diff) > 0.001) return diff;
        } else if (recipeSortBy === 'carbs-desc') {
          const diff = macrosB.carbs - macrosA.carbs;
          if (Math.abs(diff) > 0.001) return diff;
        } else if (recipeSortBy === 'fat-desc') {
          const diff = macrosB.fat - macrosA.fat;
          if (Math.abs(diff) > 0.001) return diff;
        }
      } else {
        if (selectedRecipeCategory === 'recent') {
          const orderA = recentRecipeOrderMap.get(a.id) ?? 999999;
          const orderB = recentRecipeOrderMap.get(b.id) ?? 999999;
          if (orderA !== orderB) return orderA - orderB;
        }
      }

      return a.name.localeCompare(b.name);
    });
  }, [tabBaseRecipes, selectedRecipeCategory, selectedRecipeNutritionTag, recipeSearchQuery, recipeSortBy, recentRecipeIdSet, recentRecipeOrderMap, recipeNutritionTagMap, getRecipeMacros]);

  // ==========================================
  // 食譜分批漸進加載 (Incremental Windowing)
  // 使用 Callback Ref 確保在 Tab 切換或 DOM 重新掛載時 100% 重新綁定 Observer
  // ==========================================
  const RECIPE_BATCH_SIZE = 40;
  const [visibleRecipeCount, setVisibleRecipeCount] = useState(RECIPE_BATCH_SIZE);
  const recipeObserverRef = useRef<IntersectionObserver | null>(null);
  const filteredRecipesLengthRef = useRef(filteredRecipes.length);
  filteredRecipesLengthRef.current = filteredRecipes.length;

  useEffect(() => {
    setVisibleRecipeCount(RECIPE_BATCH_SIZE);
  }, [recipeSearchQuery, selectedRecipeNutritionTag, recipeSortBy, showRecipeArchived]);

  const recipeSentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (recipeObserverRef.current) {
      recipeObserverRef.current.disconnect();
      recipeObserverRef.current = null;
    }

    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisibleRecipeCount(filteredRecipesLengthRef.current);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleRecipeCount((prev) => Math.min(prev + RECIPE_BATCH_SIZE, filteredRecipesLengthRef.current));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(node);
    recipeObserverRef.current = observer;
  }, []);

  useEffect(() => {
    return () => {
      recipeObserverRef.current?.disconnect();
    };
  }, []);

  const visibleRecipes = useMemo(() => {
    return filteredRecipes.slice(0, visibleRecipeCount);
  }, [filteredRecipes, visibleRecipeCount]);

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
              'px-3 rounded-xl text-left cursor-pointer transition-all flex flex-col outline-none',
              isManage
                ? 'py-2.5 sm:py-3 justify-between h-[66px]'
                : 'h-10 justify-center',
              viewTab === 'foods'
                ? 'border border-foreground bg-muted/30 shadow-none'
                : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
            )}
          >
            <div className="flex items-center justify-between text-xs w-full">
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
            {isManage && (
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
            )}
          </button>

          {/* 食譜指標卡 */}
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === 'recipes'}
            onClick={() => handleTabChange('recipes')}
            className={cn(
              'px-3 rounded-xl text-left cursor-pointer transition-all flex flex-col outline-none',
              isManage
                ? 'py-2.5 sm:py-3 justify-between h-[66px]'
                : 'h-10 justify-center',
              viewTab === 'recipes'
                ? 'border border-foreground bg-muted/30 shadow-none'
                : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
            )}
          >
            <div className="flex items-center justify-between text-xs w-full">
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
            {isManage && (
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
            )}
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
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus:ring-0 focus-visible:ring-0 shadow-none"
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

          {/* 分類橫向滾動列 (全寬滾動，不被右側按鈕擠壓) */}
          <div
            ref={categoryScrollRef}
            onWheel={(e) => {
              if (e.deltaY !== 0 && categoryScrollRef.current) {
                categoryScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="overflow-x-auto no-scrollbar shrink-0 py-0.5"
          >
            <div className="flex items-center gap-1 shrink-0 pr-1">
              {/* 最近膠囊 (僅在選擇彈窗模式下顯示) */}
              {!isManage && (
                <button
                  type="button"
                  onClick={(e) => {
                    triggerHaptic('selection');
                    setShowFoodArchived(false);
                    setSelectedCategory('recent');
                    handleScrollTabIntoView(e.currentTarget, true, false);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
                    !showFoodArchived && selectedCategory === 'recent'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{t('common.recent', '最近')}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      !showFoodArchived && selectedCategory === 'recent' ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {recentFoodsCount}
                  </span>
                </button>
              )}

              {/* 狀態下拉膠囊：全部 vs 已歸檔 (未選中全部時點擊直接切換，已選中全部時點擊才打開選擇) */}
              {showArchivedOption && (showFoodArchived || selectedCategory === 'all') ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0 bg-foreground text-background"
                      >
                        <span>{showFoodArchived ? t('common.archived', '已歸檔') : t('diet.foodCategory.all', '全部')}</span>
                        <span className="text-[10px] tabular-nums opacity-60">
                          {showFoodArchived ? totalArchivedFoods.length : totalActiveFoodsCount}
                        </span>
                        <ChevronDown className="size-3 opacity-60 shrink-0" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="start" className="w-[140px] font-mono text-xs">
                    <DropdownMenuItem
                      onClick={() => {
                        triggerHaptic('selection');
                        setShowFoodArchived(false);
                        setSelectedCategory('all');
                      }}
                      className={cn(
                        'cursor-pointer flex items-center justify-between',
                        !showFoodArchived && selectedCategory === 'all' && 'font-semibold bg-muted'
                      )}
                    >
                      <span>{t('diet.foodCategory.all', '全部')}</span>
                      <span className="text-[10px] opacity-60 tabular-nums">
                        {totalActiveFoodsCount}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        triggerHaptic('selection');
                        setShowFoodArchived(true);
                        setSelectedCategory('all');
                      }}
                      className={cn(
                        'cursor-pointer flex items-center justify-between',
                        showFoodArchived && 'font-semibold bg-muted'
                      )}
                    >
                      <span>{t('common.archived', '已歸檔')}</span>
                      <span className="text-[10px] opacity-60 tabular-nums">
                        {totalArchivedFoods.length}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    triggerHaptic('selection');
                    setShowFoodArchived(false);
                    setSelectedCategory('all');
                    handleScrollTabIntoView(e.currentTarget, true, false);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0',
                    !showFoodArchived && selectedCategory === 'all'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{t('diet.foodCategory.all', '全部')}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      !showFoodArchived && selectedCategory === 'all' ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {totalActiveFoodsCount}
                  </span>
                  {showArchivedOption && <ChevronDown className="size-3 opacity-60 shrink-0" />}
                </button>
              )}

              {/* 分類膠囊 */}
              {(
                [
                  { id: 'natural', label: t('diet.foodCategory.natural') },
                  { id: 'processed', label: t('diet.foodCategory.processed') },
                  { id: 'beverage', label: t('diet.foodCategory.beverage') },
                  { id: 'oil', label: t('diet.foodCategory.oil') },
                  { id: 'condiment', label: t('diet.foodCategory.condiment') },
                ] as const
              ).map((cat) => {
                const isSelected = !showFoodArchived && selectedCategory === cat.id;
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={(e) => {
                      triggerHaptic('selection');
                      setShowFoodArchived(false);
                      setSelectedCategory(cat.id);
                      handleScrollTabIntoView(e.currentTarget, false, false);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0',
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
            </div>
          </div>

          {/* 工具過濾與排序列 (分類下方單獨一行) */}
          <div className="flex items-center gap-1.5 shrink-0 py-0.5">
            {/* 營養特徵選單 */}
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
                      className="flex items-center gap-1.5 py-1 pl-2.5 pr-2 cursor-pointer focus:outline-none"
                    >
                      <SlidersHorizontal className="size-3 opacity-60" />
                      <span className="truncate">
                        {selectedNutritionTag === 'all'
                          ? t('diet.nutritionTags.title', '營養特徵')
                          : t(`diet.nutritionTags.${selectedNutritionTag}`)}
                      </span>
                      <ChevronDown className="size-3 opacity-60" />
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="w-[180px] font-mono text-xs">
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
                      { id: 'carb-source', label: t('diet.nutritionTags.carb-source') },
                      { id: 'high-protein', label: t('diet.nutritionTags.high-protein') },
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

            {/* 排序功能選單 */}
            <div
              className={cn(
                'inline-flex items-center rounded-full text-xs font-mono transition-all border',
                foodSortBy !== 'default'
                  ? 'bg-foreground text-background border-foreground font-medium'
                  : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-1.5 py-1 pl-2.5 pr-2 cursor-pointer focus:outline-none"
                    >
                      <ArrowUpDown className="size-3 opacity-60" />
                      <span className="truncate">
                        {foodSortBy === 'default'
                          ? t('diet.sort.title', '排序')
                          : sortOptions.find((o) => o.id === foodSortBy)?.label ?? t('diet.sort.title', '排序')}
                      </span>
                      <ChevronDown className="size-3 opacity-60" />
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="w-[180px] font-mono text-xs">
                  {sortOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => {
                        triggerHaptic('selection');
                        setFoodSortBy(opt.id);
                      }}
                      className={cn(
                        'cursor-pointer flex items-center justify-between',
                        foodSortBy === opt.id && 'font-semibold bg-muted'
                      )}
                    >
                      <span>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {foodSortBy !== 'default' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    setFoodSortBy('default');
                  }}
                  className="p-1 pr-2 hover:opacity-70 cursor-pointer"
                  title={t('diet.resetFilter', '重設')}
                >
                  <X className="size-3" />
                </button>
              )}
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
                    : selectedCategory === 'recent'
                    ? t('diet.noRecentFoods', '無最近記錄')
                    : t('settings.noCustomFoods')}
                </div>
              ) : (
                <>
                  {visibleFoods.map((food) => {
                    const isDisabled = checkIsFoodDisabled(food);
                    return (
                      <FoodListItem
                        key={food.id}
                        food={food}
                        disabled={isDisabled}
                        selected={interactiveMode === 'select' && selectedId === food.id}
                        onSelect={handleSelectFood}
                        nutritionDisplayMode={nutritionDisplayMode}
                        foodWeightUnit={foodWeightUnit}
                        foodVolumeUnit={foodVolumeUnit}
                        energyUnit={energyUnit}
                      />
                    );
                  })}
                  {visibleFoodCount < filteredFoods.length && (
                    <div
                      ref={foodSentinelRef}
                      className="h-8 flex items-center justify-center text-xs text-muted-foreground font-mono shrink-0 pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                </>
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
              placeholder={t('diet.searchRecipePlaceholder', '搜尋食譜名稱...')}
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus:ring-0 focus-visible:ring-0 shadow-none"
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
          {/* 食譜分類橫向滾動列 (全寬滾動，不被右側按鈕擠壓) */}
          <div className="overflow-x-auto no-scrollbar shrink-0 py-0.5">
            <div className="flex items-center gap-1 shrink-0 pr-1">
              {/* 最近食譜膠囊 (僅在選擇彈窗模式下顯示) */}
              {!isManage && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowRecipeArchived(false);
                    setSelectedRecipeCategory('recent');
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
                    !showRecipeArchived && selectedRecipeCategory === 'recent'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{t('common.recent', '最近')}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      !showRecipeArchived && selectedRecipeCategory === 'recent' ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {recentRecipesCount}
                  </span>
                </button>
              )}

              {/* 狀態下拉膠囊：全部 vs 已歸檔 (未選中全部時點擊直接切換，已選中全部時點擊才打開選擇) */}
              {showArchivedOption && (showRecipeArchived || selectedRecipeCategory === 'all') ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0 bg-foreground text-background"
                      >
                        <span>{showRecipeArchived ? t('common.archived', '已歸檔') : t('diet.foodCategory.all', '全部')}</span>
                        <span className="text-[10px] tabular-nums opacity-60">
                          {showRecipeArchived ? totalArchivedRecipes.length : totalActiveRecipes.length}
                        </span>
                        <ChevronDown className="size-3 opacity-60 shrink-0" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="start" className="w-[140px] font-mono text-xs">
                    <DropdownMenuItem
                      onClick={() => {
                        triggerHaptic('selection');
                        setShowRecipeArchived(false);
                        setSelectedRecipeCategory('all');
                      }}
                      className={cn(
                        'cursor-pointer flex items-center justify-between',
                        !showRecipeArchived && selectedRecipeCategory === 'all' && 'font-semibold bg-muted'
                      )}
                    >
                      <span>{t('diet.foodCategory.all', '全部')}</span>
                      <span className="text-[10px] opacity-60 tabular-nums">
                        {totalActiveRecipes.length}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        triggerHaptic('selection');
                        setShowRecipeArchived(true);
                        setSelectedRecipeCategory('all');
                      }}
                      className={cn(
                        'cursor-pointer flex items-center justify-between',
                        showRecipeArchived && 'font-semibold bg-muted'
                      )}
                    >
                      <span>{t('common.archived', '已歸檔')}</span>
                      <span className="text-[10px] opacity-60 tabular-nums">
                        {totalArchivedRecipes.length}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowRecipeArchived(false);
                    setSelectedRecipeCategory('all');
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0',
                    !showRecipeArchived && selectedRecipeCategory === 'all'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{t('diet.foodCategory.all', '全部')}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      !showRecipeArchived && selectedRecipeCategory === 'all' ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {totalActiveRecipes.length}
                  </span>
                  {showArchivedOption && <ChevronDown className="size-3 opacity-60 shrink-0" />}
                </button>
              )}
            </div>
          </div>

          {/* 工具過濾與排序列 (分類下方單獨一行) */}
          <div className="flex items-center gap-1.5 shrink-0 py-0.5">
            {/* 營養特徵選單 */}
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
                      className="flex items-center gap-1.5 py-1 pl-2.5 pr-2 cursor-pointer focus:outline-none"
                    >
                      <SlidersHorizontal className="size-3 opacity-60" />
                      <span className="truncate">
                        {selectedRecipeNutritionTag === 'all'
                          ? t('diet.nutritionTags.title', '營養特徵')
                          : t(`diet.nutritionTags.${selectedRecipeNutritionTag}`)}
                      </span>
                      <ChevronDown className="size-3 opacity-60" />
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="w-[180px] font-mono text-xs">
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
                      { id: 'carb-source', label: t('diet.nutritionTags.carb-source') },
                      { id: 'high-protein', label: t('diet.nutritionTags.high-protein') },
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

            {/* 排序功能選單 */}
            <div
              className={cn(
                'inline-flex items-center rounded-full text-xs font-mono transition-all border',
                recipeSortBy !== 'default'
                  ? 'bg-foreground text-background border-foreground font-medium'
                  : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-1.5 py-1 pl-2.5 pr-2 cursor-pointer focus:outline-none"
                    >
                      <ArrowUpDown className="size-3 opacity-60" />
                      <span className="truncate">
                        {recipeSortBy === 'default'
                          ? t('diet.sort.title', '排序')
                          : sortOptions.find((o) => o.id === recipeSortBy)?.label ?? t('diet.sort.title', '排序')}
                      </span>
                      <ChevronDown className="size-3 opacity-60" />
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="w-[180px] font-mono text-xs">
                  {sortOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => {
                        triggerHaptic('selection');
                        setRecipeSortBy(opt.id);
                      }}
                      className={cn(
                        'cursor-pointer flex items-center justify-between',
                        recipeSortBy === opt.id && 'font-semibold bg-muted'
                      )}
                    >
                      <span>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {recipeSortBy !== 'default' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    setRecipeSortBy('default');
                  }}
                  className="p-1 pr-2 hover:opacity-70 cursor-pointer"
                  title={t('diet.resetFilter', '重設')}
                >
                  <X className="size-3" />
                </button>
              )}
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
                    : selectedRecipeCategory === 'recent'
                    ? t('diet.noRecentFoods', '無最近記錄')
                    : t('diet.noRecipes')}
                </div>
              ) : (
                <>
                  {visibleRecipes.map((recipe) => {
                    const isDisabled = checkIsRecipeDisabled(recipe);
                    return (
                      <RecipeListItem
                        key={recipe.id}
                        recipe={recipe}
                        macros={getRecipeMacros(recipe)}
                        disabled={isDisabled}
                        selected={interactiveMode === 'select' && selectedId === recipe.id}
                        onSelect={handleSelectRecipe}
                        nutritionDisplayMode={nutritionDisplayMode}
                        foodWeightUnit={foodWeightUnit}
                        foodVolumeUnit={foodVolumeUnit}
                        energyUnit={energyUnit}
                      />
                    );
                  })}
                  {visibleRecipeCount < filteredRecipes.length && (
                    <div
                      ref={recipeSentinelRef}
                      className="h-8 flex items-center justify-center text-xs text-muted-foreground font-mono shrink-0 pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
