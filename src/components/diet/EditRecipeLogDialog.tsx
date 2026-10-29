import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { FoodRecipeSelectDialog } from '@/components/food/FoodRecipeSelectDialog';
import { db } from '@/services/db/db';
import type { FoodLog, FoodItem, FoodRecipe } from '@/types';
import { formatDisplayAmount } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { calculateIngredientMacros } from '@/utils/recipeMath';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy } from '@/utils/unitMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';

export interface EditableRecipeIngredient {
  id: string; // 唯一列識別碼
  originalLogId?: string; // 原 FoodLog ID (若是新增的則無)
  foodId?: string;
  foodName: string;
  quantity: number;
  unit: string;
  baseFood?: FoodItem | null;
  baseRatio?: { calories: number; carbs: number; protein: number; fat: number };
}

export interface EditRecipeLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundleId: string | null;
  bundleName: string;
  logs: FoodLog[];
  onSave: (
    bundleId: string,
    items: Array<{
      id?: string;
      foodId?: string;
      foodName: string;
      quantity: number;
      unit: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    }>
  ) => Promise<void>;
  onDeleteBundle: (bundleId: string) => Promise<void>;
}

export function EditRecipeLogDialog({
  open,
  onOpenChange,
  bundleId,
  bundleName,
  logs,
  onSave,
  onDeleteBundle,
}: EditRecipeLogDialogProps) {
  const { t } = useTranslation();
  const { energyUnit, foodWeightUnit, foodVolumeUnit } = useUnitPreferences();

  const [ingredients, setIngredients] = useState<EditableRecipeIngredient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 次級鍵盤與食物選擇器狀態
  const [keypadConfig, setKeypadConfig] = useState<{
    index: number;
    title: string;
    value: number;
    unit: string;
    anchorEl?: HTMLElement | null;
  } | null>(null);
  const initialKeypadValueRef = useRef<number>(0);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // 初始化食材清單與拉取關聯 FoodItem 基準資料
  useEffect(() => {
    if (open && logs.length > 0) {
      const initRows: EditableRecipeIngredient[] = logs.map((log) => ({
        id: log.id,
        originalLogId: log.id,
        foodId: log.foodId,
        foodName: log.foodName,
        quantity: log.quantity,
        unit: log.unit || 'g',
        baseRatio: log.quantity > 0 ? {
          calories: log.calories / log.quantity,
          carbs: log.carbs / log.quantity,
          protein: log.protein / log.quantity,
          fat: log.fat / log.quantity,
        } : undefined,
      }));

      // 異步拉取所有已知 foodId 的最新基準 FoodItem
      const foodIds = logs.map((l) => l.foodId).filter(Boolean) as string[];
      if (foodIds.length > 0) {
        db.foods.where('id').anyOf(foodIds).toArray().then((foods) => {
          const foodMap = new Map(foods.map((f) => [f.id, f]));
          setIngredients(
            initRows.map((row) => ({
              ...row,
              baseFood: row.foodId ? foodMap.get(row.foodId) || null : null,
            }))
          );
        });
      } else {
        setIngredients(initRows);
      }
    }
  }, [open, logs]);

  // 單項食材即時營養素計算
  const getIngredientMacros = (item: EditableRecipeIngredient) => {
    if (item.baseFood) {
      return calculateIngredientMacros(item.baseFood, item.quantity);
    }
    if (item.baseRatio) {
      return {
        calories: Math.round(item.baseRatio.calories * item.quantity),
        carbs: Math.round(item.baseRatio.carbs * item.quantity * 10) / 10,
        protein: Math.round(item.baseRatio.protein * item.quantity * 10) / 10,
        fat: Math.round(item.baseRatio.fat * item.quantity * 10) / 10,
      };
    }
    return { calories: 0, carbs: 0, protein: 0, fat: 0 };
  };

  // 全菜餚總營養素累計 (C -> P -> F 順序)
  const totals = useMemo(() => {
    return ingredients.reduce(
      (acc, item) => {
        const macros = getIngredientMacros(item);
        acc.calories += macros.calories;
        acc.carbs += macros.carbs;
        acc.protein += macros.protein;
        acc.fat += macros.fat;
        return acc;
      },
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );
  }, [ingredients]);

  // 供能比比例條推算
  const energyRatios = useMemo(() => {
    const carbCals = totals.carbs * 4;
    const proteinCals = totals.protein * 4;
    const fatCals = totals.fat * 9;
    const totalCal = carbCals + proteinCals + fatCals;

    if (totalCal <= 0) {
      return { carbs: 33.3, protein: 33.3, fat: 33.4 };
    }

    return {
      carbs: (carbCals / totalCal) * 100,
      protein: (proteinCals / totalCal) * 100,
      fat: (fatCals / totalCal) * 100,
    };
  }, [totals]);

  // 食材清單反灰清單（防重複添加）
  const disabledFoodIds = useMemo(() => {
    return ingredients
      .map((row) => row.foodId)
      .filter(Boolean) as string[];
  }, [ingredients]);

  // 打開數字鍵盤編輯用量
  const handleOpenKeypad = (index: number, anchorEl: HTMLElement) => {
    const row = ingredients[index];
    if (!row) return;
    triggerHaptic('selection');
    initialKeypadValueRef.current = row.quantity;
    setKeypadConfig({
      index,
      title: row.foodName,
      value: row.quantity,
      unit: row.unit,
      anchorEl,
    });
  };

  const handleKeypadLiveChange = useCallback((val: number) => {
    setIngredients((prev) => {
      if (!keypadConfig) return prev;
      return prev.map((row, idx) =>
        idx === keypadConfig.index ? { ...row, quantity: val > 0 ? val : 0 } : row
      );
    });
  }, [keypadConfig]);

  const handleKeypadConfirm = useCallback((val: number) => {
    setIngredients((prev) => {
      if (!keypadConfig) return prev;
      return prev.map((row, idx) =>
        idx === keypadConfig.index ? { ...row, quantity: val > 0 ? val : 1 } : row
      );
    });
    setKeypadConfig(null);
  }, [keypadConfig]);

  const handleKeypadCancel = useCallback(() => {
    if (!keypadConfig) return;
    const prevVal = initialKeypadValueRef.current;
    setIngredients((prev) =>
      prev.map((row, idx) =>
        idx === keypadConfig.index ? { ...row, quantity: prevVal } : row
      )
    );
    setKeypadConfig(null);
  }, [keypadConfig]);

  // 打開新增食材選擇器
  const handleOpenAddIngredient = () => {
    triggerHaptic('light');
    setReplacingIndex(null);
    setIsPickerOpen(true);
  };

  // 打開替換食材選擇器
  const handleOpenReplaceIngredient = (index: number) => {
    triggerHaptic('light');
    setReplacingIndex(index);
    setIsPickerOpen(true);
  };

  // 選擇食材回調
  const handleSelectFood = (item: FoodItem | FoodRecipe) => {
    const food = item as FoodItem;
    const isLiquid =
      (food.servingUnit || 'g').toLowerCase().includes('ml') ||
      food.category === 'beverage';
    const prefUnit = isLiquid ? foodVolumeUnit : foodWeightUnit;
    const defaultQty = isLiquid ? (prefUnit === 'fl oz' ? 8 : 250) : (prefUnit === 'oz' ? 3.5 : 100);

    if (replacingIndex !== null && replacingIndex >= 0 && replacingIndex < ingredients.length) {
      setIngredients((prev) =>
        prev.map((row, idx) =>
          idx === replacingIndex
            ? {
                ...row,
                foodId: food.id,
                foodName: formatFoodDisplayName(food),
                unit: prefUnit,
                quantity: row.quantity || defaultQty,
                baseFood: food,
                baseRatio: undefined,
              }
            : row
        )
      );
    } else {
      const newRow: EditableRecipeIngredient = {
        id: `row-${Date.now()}-${Math.random()}`,
        foodId: food.id,
        foodName: formatFoodDisplayName(food),
        quantity: defaultQty,
        unit: prefUnit,
        baseFood: food,
      };
      setIngredients((prev) => [...prev, newRow]);
    }

    triggerHaptic('selection');
    setReplacingIndex(null);
  };

  // 移除食材 (至少保留 1 項)
  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    triggerHaptic('light');
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 主彈窗開關保護
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (keypadConfig || isPickerOpen)) {
      return;
    }
    onOpenChange(nextOpen);
  };

  // 保存整組菜餚記錄
  const handleSubmit = async () => {
    if (!bundleId || isSubmitting || ingredients.length === 0) return;
    setIsSubmitting(true);
    try {
      const updatedItems = ingredients.map((item) => {
        const macros = getIngredientMacros(item);
        return {
          id: item.originalLogId,
          foodId: item.foodId,
          foodName: item.foodName,
          quantity: item.quantity,
          unit: item.unit,
          calories: macros.calories,
          carbs: macros.carbs,
          protein: macros.protein,
          fat: macros.fat,
        };
      });

      await onSave(bundleId, updatedItems);
      triggerHaptic('success');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 刪除整組菜餚記錄
  const handleDeleteAll = async () => {
    if (!bundleId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDeleteBundle(bundleId);
      triggerHaptic('medium');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!bundleId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <PrecisionDialogContent
          title={bundleName}
          onSubmit={handleSubmit}
          submitDisabled={isSubmitting || ingredients.length === 0}
          submitAriaLabel={t('common.save')}
          cancelAriaLabel={t('common.cancel')}
          overlayClassName="z-[70]"
          className="z-[70] flex flex-col max-h-[85vh] overflow-hidden"
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
                    <span>{Math.round(totals.carbs * 10) / 10}</span>
                    <span className="text-[9px] font-normal opacity-75">g</span>
                  </div>
                </div>

                {/* 蛋白質 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-protein uppercase tracking-wider truncate">
                    {t('diet.protein')}
                  </span>
                  <div className="font-mono text-xs font-bold text-protein mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{Math.round(totals.protein * 10) / 10}</span>
                    <span className="text-[9px] font-normal opacity-75">g</span>
                  </div>
                </div>

                {/* 脂肪 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-fat uppercase tracking-wider truncate">
                    {t('diet.fat')}
                  </span>
                  <div className="font-mono text-xs font-bold text-fat mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{Math.round(totals.fat * 10) / 10}</span>
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

            {/* 底部破壞性高危按鈕 (實色紅底 + 純白文字) */}
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={isSubmitting}
              className="w-full h-9 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.98] transition-all font-mono text-xs font-semibold cursor-pointer select-none flex items-center justify-center disabled:opacity-30 shrink-0"
            >
              {t('diet.deleteBundleRecord', '刪除整組菜餚記錄')}
            </button>
          </div>
        </PrecisionDialogContent>
      </Dialog>

      {/* 次級懸浮鍵盤 (平級兄弟節點聲明，層級 zIndex={70} 高於主彈窗) */}
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

      {/* 次級食材選擇器 (平級兄弟節點聲明，層級 zIndex={80}) */}
      <FoodRecipeSelectDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        mode="foods"
        zIndex={80}
        disabledIds={replacingIndex !== null ? disabledFoodIds.filter((id) => id !== ingredients[replacingIndex]?.foodId) : disabledFoodIds}
        onSelect={handleSelectFood}
      />
    </>
  );
}
