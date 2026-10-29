import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { Dialog, PrecisionDialogContent } from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { FoodRecipeSelectDialog } from '@/components/food/FoodRecipeSelectDialog';
import { useFoods } from '@/hooks/useFoods';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { calculateIngredientMacros } from '@/utils/recipeMath';
import { formatEnergy } from '@/utils/unitMath';
import { cn, formatDisplayAmount } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { FoodRecipe, FoodItem, MealType } from '@/types';

export interface StagedIngredient {
  id: string;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;
  baseFood?: FoodItem | null;
}

export interface RecipeStagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: FoodRecipe | null;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  onSuccess?: () => void;
  /** 多層彈窗層級 @default 70 */
  zIndex?: number;
}

export function RecipeStagingDialog({
  open,
  onOpenChange,
  recipe,
  mealType,
  date,
  onSuccess,
  zIndex = 70,
}: RecipeStagingDialogProps) {
  const { t } = useTranslation();
  const { allFoods } = useFoods();
  const { addFoodLogBundle } = useFoodLogs(date);
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();

  // 本次記錄暫存的食材列表 (活體，可增刪、可改重量)
  const [ingredients, setIngredients] = useState<StagedIngredient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 數字鍵盤配置狀態
  const [keypadConfig, setKeypadConfig] = useState<{
    index: number;
    title: string;
    value: number;
    unit: string;
    anchorEl?: HTMLElement | null;
  } | null>(null);
  const initialKeypadValueRef = useRef<number>(0);

  // 追加或替換食材選擇器開關
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // 構建 foodMap 供純函數計算引用
  const foodMap = useMemo(() => {
    const map = new Map<string, FoodItem>();
    allFoods.forEach((f) => map.set(f.id, f));
    return map;
  }, [allFoods]);

  // 當彈窗打開或選取菜餚變更時，初始化暫存食材
  useEffect(() => {
    if (open && recipe) {
      const initialStaged: StagedIngredient[] = recipe.ingredients.map((ing) => ({
        id: `${ing.foodId}-${uuidv4()}`,
        foodId: ing.foodId,
        foodName: ing.foodName,
        quantity: ing.quantity,
        unit: ing.unit || 'g',
        baseFood: foodMap.get(ing.foodId) || null,
      }));
      setIngredients(initialStaged);
    } else if (!open) {
      setIngredients([]);
      setKeypadConfig(null);
      setIsPickerOpen(false);
      setReplacingIndex(null);
    }
  }, [open, recipe, foodMap]);

  // 單項食材即時營養素計算
  const getIngredientMacros = useCallback(
    (item: StagedIngredient) => {
      const targetFood = item.baseFood || foodMap.get(item.foodId);
      return calculateIngredientMacros(targetFood, item.quantity);
    },
    [foodMap]
  );

  // 即時計算當前所有食材的總營養素
  const totals = useMemo(() => {
    let calories = 0;
    let carbs = 0;
    let protein = 0;
    let fat = 0;

    ingredients.forEach((item) => {
      const m = getIngredientMacros(item);
      calories += m.calories;
      carbs += m.carbs;
      protein += m.protein;
      fat += m.fat;
    });

    return {
      calories: Math.round(calories),
      carbs: Math.round(carbs * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }, [ingredients, getIngredientMacros]);

  // 供能比計算 (C, P, F)
  const energyRatios = useMemo(() => {
    const cCal = totals.carbs * 4;
    const pCal = totals.protein * 4;
    const fCal = totals.fat * 9;
    const sum = cCal + pCal + fCal;
    if (sum === 0) return { carbs: 33.3, protein: 33.3, fat: 33.4 };
    return {
      carbs: Math.round((cCal / sum) * 1000) / 10,
      protein: Math.round((pCal / sum) * 1000) / 10,
      fat: Math.round((fCal / sum) * 1000) / 10,
    };
  }, [totals]);

  // 移除某項暫存食材
  const handleRemoveIngredient = (index: number) => {
    triggerHaptic('light');
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 呼出食材選擇器以替換食材
  const handleOpenReplaceIngredient = (index: number) => {
    setReplacingIndex(index);
    setIsPickerOpen(true);
  };

  // 呼出食材選擇器以新增食材
  const handleOpenAddIngredient = () => {
    setReplacingIndex(null);
    setIsPickerOpen(true);
  };

  // 選擇食材回調（支援新增或替換）
  const handleSelectFood = (foodOrRecipe: FoodItem | FoodRecipe) => {
    const food = foodOrRecipe as FoodItem;
    const isLiquid =
      (food.servingUnit || 'g').toLowerCase().includes('ml') ||
      food.category === 'beverage';

    const prefUnit = isLiquid ? foodVolumeUnit : foodWeightUnit;
    const defaultQty = isLiquid ? (prefUnit === 'fl oz' ? 8 : 250) : (prefUnit === 'oz' ? 3.5 : 100);

    if (replacingIndex !== null) {
      setIngredients((prev) =>
        prev.map((item, idx) =>
          idx === replacingIndex
            ? {
                ...item,
                foodId: food.id,
                foodName: formatFoodDisplayName(food),
                baseFood: food,
              }
            : item
        )
      );
      setReplacingIndex(null);
    } else {
      const newItem: StagedIngredient = {
        id: `${food.id}-${uuidv4()}`,
        foodId: food.id,
        foodName: formatFoodDisplayName(food),
        quantity: defaultQty,
        unit: prefUnit,
        baseFood: food,
      };
      setIngredients((prev) => [...prev, newItem]);
    }

    triggerHaptic('selection');
    setIsPickerOpen(false);
  };

  // 點擊重量膠囊呼出懸浮數字鍵盤
  const handleOpenKeypad = (index: number, anchorEl: HTMLElement) => {
    const item = ingredients[index];
    if (!item) return;

    initialKeypadValueRef.current = item.quantity;
    setKeypadConfig({
      index,
      title: item.foodName,
      value: item.quantity,
      unit: item.unit,
      anchorEl,
    });
  };

  // 鍵盤實時聯動
  const handleKeypadLiveChange = useCallback((val: number) => {
    setKeypadConfig((curr) => {
      if (!curr) return null;
      const targetIndex = curr.index;
      setIngredients((prev) =>
        prev.map((ing, i) => (i === targetIndex ? { ...ing, quantity: val } : ing))
      );
      return curr;
    });
  }, []);

  // 鍵盤確認
  const handleKeypadConfirm = (val: number, unit?: string) => {
    if (!keypadConfig) return;
    const { index } = keypadConfig;
    setIngredients((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: val, unit: unit || item.unit } : item
      )
    );
    setKeypadConfig(null);
  };

  // 鍵盤取消
  const handleKeypadCancel = () => {
    if (!keypadConfig) return;
    const { index } = keypadConfig;
    const fallbackVal = initialKeypadValueRef.current;
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: fallbackVal } : item))
    );
    setKeypadConfig(null);
  };

  // 主彈窗開關保護
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (keypadConfig || isPickerOpen)) {
      return;
    }
    onOpenChange(nextOpen);
  };

  // 提交記錄至日記 (批量產生同一個 bundleId)
  const handleConfirmLog = async () => {
    if (!recipe || isSubmitting || ingredients.length === 0) return;

    setIsSubmitting(true);
    try {
      const bundleId = uuidv4();
      const bundleName = recipe.name;

      const logItems = ingredients.map((item) => {
        const macros = getIngredientMacros(item);
        return {
          date,
          mealType,
          foodId: item.foodId,
          foodName: item.foodName,
          quantity: item.quantity,
          unit: item.unit,
          calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
          notes: `[${bundleName}]`,
        };
      });

      await addFoodLogBundle(bundleId, bundleName, logItems);
      triggerHaptic('success');
      toast.show(t('common.saved', '已儲存'));
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!recipe) return null;

  const disabledFoodIds = ingredients.map((i) => i.foodId);

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <PrecisionDialogContent
          title={recipe.name}
          onSubmit={handleConfirmLog}
          submitDisabled={isSubmitting || ingredients.length === 0}
          submitAriaLabel={t('common.save', '儲存')}
          cancelAriaLabel={t('common.cancel', '取消')}
          overlayClassName={`z-[${zIndex}]`}
          className={cn(`z-[${zIndex}]`, "flex flex-col max-h-[85vh] overflow-hidden")}
          initialFocus={false}
        >
          {/* 表單主體 (聯合滾動區域) */}
          <div className="flex-1 min-h-0 flex flex-col space-y-3 pt-3.5 overflow-hidden">
            {/* 4 欄即時 HUD Banner 與供能比標尺組合 */}
            <div className="space-y-1.5 shrink-0">
              <div className="border border-border rounded-lg overflow-hidden bg-card grid grid-cols-4 divide-x divide-border select-none py-2 text-center shrink-0">
                {/* 熱量 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-calories uppercase tracking-wider truncate">
                    {t('diet.calories')}
                  </span>
                  <div className="font-mono text-xs font-bold text-calories mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{formatEnergy(totals.calories, energyUnit).value}</span>
                    <span className="text-[9px] font-normal opacity-75">{formatEnergy(totals.calories, energyUnit).unit}</span>
                  </div>
                </div>

                {/* 碳水化合物 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-carbs uppercase tracking-wider truncate">
                    {t('diet.carbs')}
                  </span>
                  <div className="font-mono text-xs font-bold text-carbs mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{totals.carbs}</span>
                    <span className="text-[9px] font-normal opacity-75">g</span>
                  </div>
                </div>

                {/* 蛋白質 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-protein uppercase tracking-wider truncate">
                    {t('diet.protein')}
                  </span>
                  <div className="font-mono text-xs font-bold text-protein mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{totals.protein}</span>
                    <span className="text-[9px] font-normal opacity-75">g</span>
                  </div>
                </div>

                {/* 脂肪 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-fat uppercase tracking-wider truncate">
                    {t('diet.fat')}
                  </span>
                  <div className="font-mono text-xs font-bold text-fat mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{totals.fat}</span>
                    <span className="text-[9px] font-normal opacity-75">g</span>
                  </div>
                </div>
              </div>

              {/* 供能比標尺 (Ratio Bar: 嚴格固定 C -> P -> F 順序) */}
              <div className="h-1 w-full rounded-full overflow-hidden flex bg-track shrink-0" title="供能比標尺">
                <div className="bg-carbs transition-all duration-150" style={{ width: `${energyRatios.carbs}%` }} />
                <div className="bg-protein transition-all duration-150" style={{ width: `${energyRatios.protein}%` }} />
                <div className="bg-fat transition-all duration-150" style={{ width: `${energyRatios.fat}%` }} />
              </div>
            </div>

            {/* 構成食材段落 */}
            <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between px-0 shrink-0">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  {t('diet.recipeIngredients', '構成食材')} ({ingredients.length})
                </div>

                {/* 微型膠囊按鈕：新增食材 */}
                <button
                  type="button"
                  onClick={handleOpenAddIngredient}
                  className="h-6 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer text-foreground active:scale-95 select-none"
                >
                  <Plus className="size-3 text-muted-foreground" />
                  <span>{t('diet.addIngredient', '新增食材')}</span>
                </button>
              </div>

              {/* 食材清單滾動容器 */}
              <div className="border border-border rounded-lg overflow-y-auto bg-card divide-y divide-border text-sm flex-1 min-h-0">
                {ingredients.map((item, index) => (
                  <div
                    key={item.id}
                    className="min-h-12 py-2 px-3 sm:px-4 flex items-center justify-between gap-2 bg-card shrink-0"
                  >
                    {/* 左側：食材品名 (點擊可替換食材) */}
                    <button
                      type="button"
                      onClick={() => handleOpenReplaceIngredient(index)}
                      className="text-left min-w-0 flex-1 truncate text-xs font-medium text-foreground hover:opacity-75 transition-opacity cursor-pointer outline-none"
                      title={item.foodName}
                    >
                      <div className="truncate">{item.foodName}</div>
                    </button>

                    {/* 右側：常用數字輸入框膠囊 + 移除按鈕 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenKeypad(index, e.currentTarget)}
                        className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95 select-none shrink-0"
                      >
                        <span className="font-bold text-foreground">
                          {formatDisplayAmount(String(item.quantity)) || '0'}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {item.unit}
                        </span>
                        <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                      </button>

                      {/* 移除按鈕 (超過 1 項時允許移除) */}
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="size-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors cursor-pointer shrink-0"
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PrecisionDialogContent>
      </Dialog>

      {/* 次級懸浮鍵盤 (平級兄弟節點聲明，層級 zIndex={80} 高於主彈窗) */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={!!keypadConfig}
          onOpenChange={(kOpen) => {
            if (!kOpen) handleKeypadCancel();
          }}
          title={keypadConfig.title}
          value={keypadConfig.value}
          unit={keypadConfig.unit}
          allowDecimals={true}
          maxDecimals={2}
          anchorEl={keypadConfig.anchorEl}
          onLiveChange={handleKeypadLiveChange}
          onConfirm={handleKeypadConfirm}
          onCancel={handleKeypadCancel}
        />
      )}

      {/* 次級食物選擇彈窗 (平級兄弟節點，用於追加或替換食材) */}
      {isPickerOpen && (
        <FoodRecipeSelectDialog
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          mode="foods"
          title={
            replacingIndex !== null
              ? t('diet.replaceIngredient', '替換食材')
              : t('diet.addIngredient', '新增食材')
          }
          onSelect={handleSelectFood}
          zIndex={80}
          disabledIds={replacingIndex !== null ? [] : disabledFoodIds}
        />
      )}
    </>
  );
}
