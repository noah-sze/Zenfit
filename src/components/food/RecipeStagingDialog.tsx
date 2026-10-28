import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { FoodRecipeSelectDialog } from '@/components/food/FoodRecipeSelectDialog';
import { useFoods } from '@/hooks/useFoods';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { calculateIngredientMacros } from '@/utils/recipeMath';
import { formatEnergy } from '@/utils/unitMath';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { FoodRecipe, FoodItem, MealType } from '@/types';

export interface StagedIngredient {
  id: string;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;
  selected: boolean;
}

export interface RecipeStagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: FoodRecipe | null;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  onSuccess?: () => void;
}

export function RecipeStagingDialog({
  open,
  onOpenChange,
  recipe,
  mealType,
  date,
  onSuccess,
}: RecipeStagingDialogProps) {
  const { t } = useTranslation();
  const { allFoods } = useFoods();
  const { addFoodLogBundle } = useFoodLogs(date);
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();

  // 本次記錄暫存的食材列表 (活體，可增刪、可改重量)
  const [stagedItems, setStagedItems] = useState<StagedIngredient[]>([]);

  // 數字鍵盤配置狀態
  const [keypadConfig, setKeypadConfig] = useState<{
    index: number;
    foodName: string;
    value: number;
    unit: string;
    anchorEl: HTMLElement | null;
  } | null>(null);

  // 追加食材選擇器開關
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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
        selected: true,
      }));
      setStagedItems(initialStaged);
    } else if (!open) {
      setStagedItems([]);
      setKeypadConfig(null);
      setIsPickerOpen(false);
    }
  }, [open, recipe]);

  // 即時計算當前所有勾選食材的總營養素
  const stagedTotals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    stagedItems.forEach((item) => {
      if (!item.selected) return;
      const targetFood = foodMap.get(item.foodId);
      const macros = calculateIngredientMacros(targetFood, item.quantity);
      calories += macros.calories;
      protein += macros.protein;
      carbs += macros.carbs;
      fat += macros.fat;
    });

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }, [stagedItems, foodMap]);

  // 切換某食材的勾選狀態
  const handleToggleSelect = (index: number) => {
    triggerHaptic('light');
    setStagedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  // 移除某項暫存食材
  const handleRemoveStagedItem = (index: number) => {
    triggerHaptic('light');
    setStagedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 點擊重量呼出方案 1 數字鍵盤
  const handleOpenKeypad = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const item = stagedItems[index];
    if (!item) return;

    setKeypadConfig({
      index,
      foodName: item.foodName,
      value: item.quantity,
      unit: item.unit,
      anchorEl: e.currentTarget,
    });
  };

  // 數字鍵盤實時鏡像聯動
  const handleKeypadLiveChange = (val: number) => {
    if (!keypadConfig) return;
    const { index } = keypadConfig;
    setStagedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: val } : item))
    );
  };

  // 數字鍵盤確認
  const handleKeypadConfirm = (val: number, unit: string) => {
    if (!keypadConfig) return;
    const { index } = keypadConfig;
    setStagedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: val, unit } : item))
    );
    setKeypadConfig(null);
  };

  // 數字鍵盤取消
  const handleKeypadCancel = () => {
    setKeypadConfig(null);
  };

  // 追加食材選擇回調
  const handleSelectAdditionalFood = (foodOrRecipe: FoodItem | FoodRecipe) => {
    const food = foodOrRecipe as FoodItem;
    const isLiquid =
      (food.servingUnit || 'g').toLowerCase().includes('ml') ||
      food.category === 'beverage';

    const prefUnit = isLiquid ? foodVolumeUnit : foodWeightUnit;
    const defaultQty = isLiquid ? (prefUnit === 'fl oz' ? 8 : 250) : (prefUnit === 'oz' ? 3.5 : 100);

    const newItem: StagedIngredient = {
      id: `${food.id}-${uuidv4()}`,
      foodId: food.id,
      foodName: formatFoodDisplayName(food),
      quantity: defaultQty,
      unit: prefUnit,
      selected: true,
    };

    setStagedItems((prev) => [...prev, newItem]);
    triggerHaptic('selection');
  };

  // 提交記錄至日記 (批量產生同一個 bundleId)
  const handleConfirmLog = async () => {
    if (!recipe) return;

    const selectedItems = stagedItems.filter((i) => i.selected && i.quantity > 0);
    if (selectedItems.length === 0) {
      toast.show(t('diet.noIngredients'));
      return;
    }

    const bundleId = uuidv4();
    const bundleName = recipe.name;

    const logItems = selectedItems.map((item) => {
      const targetFood = foodMap.get(item.foodId);
      const macros = calculateIngredientMacros(targetFood, item.quantity);

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
    toast.show(t('common.saved'));
    onOpenChange(false);
    onSuccess?.();
  };

  if (!recipe) return null;

  const disabledFoodIds = stagedItems.map((i) => i.foodId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[350px] max-w-[calc(100vw-24px)] sm:w-[350px] sm:max-w-[350px] p-0 gap-0 overflow-hidden bg-card text-card-foreground border border-border rounded-xl shadow-none"
          showCloseButton={false}
        >
          {/* 方案 D 頂部整合導航 Header (左側圓形 ✕ 膠囊，中間純文字標題，右側打勾確認) */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border select-none">
            {/* 左側圓形 ✕ 膠囊 */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground hover:bg-border transition-all cursor-pointer shrink-0 active:scale-92"
              title={t('common.cancel')}
              aria-label={t('common.cancel')}
            >
              <X className="size-3.5 stroke-[2.2]" />
            </button>

            {/* 中間純文字標題 (絕對居中防擠壓) */}
            <div className="absolute inset-x-12 flex items-center justify-center pointer-events-none">
              <DialogTitle className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[180px] text-center">
                {recipe.name}
              </DialogTitle>
            </div>

            {/* 右側純圖標打勾確認按鈕 */}
            <button
              type="button"
              onClick={handleConfirmLog}
              className="size-7 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 active:scale-92 transition-all cursor-pointer shrink-0 ml-auto z-10"
              title={t('common.save')}
              aria-label={t('common.save')}
            >
              <Check className="size-3.5 stroke-[2.4]" />
            </button>
          </div>

          {/* 頂部即時營養素結算卡 (Hero Macro Bar) */}
          <div className="px-3.5 py-3 bg-muted/30 border-b border-border flex items-center justify-between select-none">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-xl font-bold tracking-tight text-foreground">
                {formatEnergy(stagedTotals.calories, energyUnit).value.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {energyUnit}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="size-1.5 rounded-full bg-carbs shrink-0" />
                <span>{stagedTotals.carbs}g</span>
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="size-1.5 rounded-full bg-protein shrink-0" />
                <span>{stagedTotals.protein}g</span>
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="size-1.5 rounded-full bg-fat shrink-0" />
                <span>{stagedTotals.fat}g</span>
              </span>
            </div>
          </div>

          {/* 活體食材檢查清單 (Usage List, divide-y) */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40 px-3.5">
            {stagedItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {t('diet.noIngredients')}
              </div>
            ) : (
              stagedItems.map((item, index) => {
                const isSelected = item.selected;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "py-2.5 flex items-center justify-between gap-2 transition-opacity",
                      !isSelected && "opacity-40"
                    )}
                  >
                    {/* 左側 Checkbox + 食材名 */}
                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none flex-1"
                      onClick={() => handleToggleSelect(index)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(index)}
                        className="size-4 rounded border-border accent-foreground cursor-pointer shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span
                        className={cn(
                          "text-xs font-medium truncate text-foreground",
                          !isSelected && "line-through text-muted-foreground"
                        )}
                      >
                        {item.foodName}
                      </span>
                    </div>

                    {/* 右側重量按鈕膠囊 (點擊呼出方案 1 數字鍵盤) + 刪除 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenKeypad(index, e)}
                        className={cn(
                          "h-6 px-2 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer select-none active:scale-95",
                          !isSelected && "pointer-events-none"
                        )}
                        title={t('keypad.input')}
                      >
                        <span className="font-semibold text-foreground">
                          {item.quantity}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {item.unit}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveStagedItem(index)}
                        className="size-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-muted transition-colors cursor-pointer shrink-0"
                        title={t('common.delete')}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 底部追加食材快捷按鈕 */}
          <div className="p-3 border-t border-border bg-card">
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border hover:border-foreground/40 hover:bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{t('common.add')}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 次級方案 1 精密數字鍵盤 (平鋪兄弟節點聲明，層級 zIndex 80+) */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={!!keypadConfig}
          onOpenChange={(kOpen) => {
            if (!kOpen) handleKeypadCancel();
          }}
          title={keypadConfig.foodName}
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

      {/* 次級追加食材選擇器 (平鋪兄弟節點聲明，層級 zIndex 80) */}
      <FoodRecipeSelectDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        mode="foods"
        zIndex={80}
        disabledIds={disabledFoodIds}
        onSelect={handleSelectAdditionalFood}
      />
    </>
  );
}
