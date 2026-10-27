import { useState, useEffect, useMemo, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { FoodRecipeSelectDialog } from '@/components/food/FoodRecipeSelectDialog';
import type { FoodItem, FoodRecipe, RecipeIngredient } from '@/types';
import { useFoods } from '@/hooks/useFoods';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { calculateRecipeTotals } from '@/utils/recipeMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import {
  formatEnergy,
  formatFoodServing,
  ozToG,
  gToOz,
  flOzToMl,
  mlToFlOz,
} from '@/utils/unitMath';
import { triggerHaptic } from '@/lib/haptics';
import { cn, formatDisplayAmount } from '@/lib/utils';
import { ChefHat, X, ChevronRight, Plus, Trash2 } from 'lucide-react';

export type RecipeFormData = Omit<
  FoodRecipe,
  'id' | 'createdAt' | 'updatedAt' | 'isCustom' | 'isArchived'
>;

export interface RecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: FoodRecipe | null;
  onSubmit: (data: RecipeFormData) => Promise<void> | void;
}

interface FormIngredientRow {
  id: string;
  foodId: string;
  foodName: string;
  quantity: string;
  unit: string;
  isOptional: boolean;
}

interface KeypadConfig {
  index: number;
  foodName: string;
  value: number;
  unit: string;
  anchorEl?: HTMLElement | null;
}

export function RecipeFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: RecipeFormDialogProps) {
  const { t } = useTranslation();
  const { allFoods } = useFoods();
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();
  const isEdit = !!initialData;

  // 構建快速查詢 Map
  const foodMap = useMemo(() => {
    const map = new Map<string, FoodItem>();
    allFoods.forEach((f) => map.set(f.id, f));
    return map;
  }, [allFoods]);

  // 表單核心狀態
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<FormIngredientRow[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 食材選擇彈窗 (次級疊加 zIndex={80})
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // 數字鍵盤狀態
  const [keypadConfig, setKeypadConfig] = useState<KeypadConfig | null>(null);
  const initialKeypadValueRef = useRef<string>('');

  // 初始化或編輯回填
  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');

      const rows: FormIngredientRow[] = initialData.ingredients.map((ing, idx) => {
        const food = foodMap.get(ing.foodId);
        const isLiquid =
          (food?.servingUnit || ing.unit || 'g').toLowerCase().includes('ml') ||
          food?.category === 'beverage';

        let displayQty = ing.quantity;
        let displayUnit = isLiquid ? 'ml' : 'g';

        // 若使用者偏好英制，將克數/毫升自動折算為當前單位顯示
        if (isLiquid && foodVolumeUnit === 'fl oz') {
          displayQty = mlToFlOz(ing.quantity, 2);
          displayUnit = 'fl oz';
        } else if (!isLiquid && foodWeightUnit === 'oz') {
          displayQty = gToOz(ing.quantity, 2);
          displayUnit = 'oz';
        }

        return {
          id: `${ing.foodId}-${idx}-${Date.now()}`,
          foodId: ing.foodId,
          foodName: ing.foodName || (food ? formatFoodDisplayName(food) : ''),
          quantity: displayQty > 0 ? String(displayQty) : '100',
          unit: displayUnit,
          isOptional: !!ing.isOptional,
        };
      });

      setIngredients(rows);
    } else {
      setName('');
      setDescription('');
      setIngredients([]);
    }
  }, [open, initialData, foodMap, foodWeightUnit, foodVolumeUnit]);

  // 即時計算菜餚營養總計 (隨食材與數量即時變動)
  const totals = useMemo(() => {
    const normalizedIngredients: RecipeIngredient[] = ingredients.map((item) => {
      const num = parseFloat(item.quantity) || 0;
      let normalizedQty = num;
      if (item.unit === 'oz') {
        normalizedQty = ozToG(num, 2);
      } else if (item.unit === 'fl oz') {
        normalizedQty = flOzToMl(num, 2);
      }

      return {
        foodId: item.foodId,
        foodName: item.foodName,
        quantity: normalizedQty,
        unit: item.unit === 'oz' ? 'g' : item.unit === 'fl oz' ? 'ml' : item.unit,
        isOptional: item.isOptional,
      };
    });

    return calculateRecipeTotals(
      { ingredients: normalizedIngredients },
      foodMap
    );
  }, [ingredients, foodMap]);

  // 計算在食材選擇選單中需反灰禁用的食材 ID 列表（不允許重複添加）
  const disabledFoodIds = useMemo(() => {
    if (replacingIndex !== null && replacingIndex >= 0 && replacingIndex < ingredients.length) {
      // 替換模式：排除當前正被替換的那一項，其他已在清單中的食材均不可重複選取
      return ingredients
        .filter((_, idx) => idx !== replacingIndex)
        .map((row) => row.foodId);
    }
    // 新增模式：所有已在清單中的食材均不可重複選取
    return ingredients.map((row) => row.foodId);
  }, [ingredients, replacingIndex]);

  // 新增食材按鈕觸發
  const handleOpenAddIngredient = () => {
    setReplacingIndex(null);
    setIsPickerOpen(true);
  };

  // 點擊食材名稱替換食材
  const handleOpenReplaceIngredient = (index: number) => {
    setReplacingIndex(index);
    setIsPickerOpen(true);
  };

  // 食材選擇回調
  const handleSelectFood = (item: FoodItem | FoodRecipe) => {
    const food = item as FoodItem;

    // 嚴格防止重複添加
    if (disabledFoodIds.includes(food.id)) {
      return;
    }

    const isLiquid =
      (food.servingUnit || 'g').toLowerCase().includes('ml') ||
      food.category === 'beverage';

    const prefUnit = isLiquid ? foodVolumeUnit : foodWeightUnit;
    let defaultQty = '100';
    if (isLiquid) {
      defaultQty = prefUnit === 'fl oz' ? '8' : '250';
    } else {
      defaultQty = prefUnit === 'oz' ? '3.5' : '100';
    }

    if (replacingIndex !== null && replacingIndex >= 0 && replacingIndex < ingredients.length) {
      // 替換現有食材
      setIngredients((prev) =>
        prev.map((row, idx) =>
          idx === replacingIndex
            ? {
                ...row,
                foodId: food.id,
                foodName: formatFoodDisplayName(food),
                unit: prefUnit,
                quantity: row.quantity || defaultQty,
              }
            : row
        )
      );
    } else {
      // 新增食材至列表 (原子級防重複檢查)
      setIngredients((prev) => {
        if (prev.some((row) => row.foodId === food.id)) {
          return prev;
        }
        const newRow: FormIngredientRow = {
          id: `${food.id}-${Date.now()}-${Math.random()}`,
          foodId: food.id,
          foodName: formatFoodDisplayName(food),
          quantity: defaultQty,
          unit: prefUnit,
          isOptional: false,
        };
        return [...prev, newRow];
      });
    }

    triggerHaptic('selection');
    setReplacingIndex(null);
  };

  // 移除食材
  const handleRemoveIngredient = (index: number) => {
    triggerHaptic('light');
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 切換食材可選性 (isOptional)
  const handleToggleOptional = (index: number) => {
    triggerHaptic('selection');
    setIngredients((prev) =>
      prev.map((row, idx) =>
        idx === index ? { ...row, isOptional: !row.isOptional } : row
      )
    );
  };

  // 打開數字鍵盤編輯食材用量
  const handleOpenKeypad = (index: number, anchorEl: HTMLElement) => {
    const row = ingredients[index];
    if (!row) return;

    initialKeypadValueRef.current = row.quantity;
    setKeypadConfig({
      index,
      foodName: row.foodName,
      value: parseFloat(row.quantity) || 0,
      unit: row.unit,
      anchorEl,
    });
  };

  // 數字鍵盤即時輸入聯動
  const handleKeypadLiveChange = (val: number) => {
    if (!keypadConfig) return;
    setIngredients((prev) =>
      prev.map((row, idx) =>
        idx === keypadConfig.index
          ? { ...row, quantity: val > 0 ? String(val) : '' }
          : row
      )
    );
  };

  // 數字鍵盤確認
  const handleKeypadConfirm = (val: number) => {
    if (!keypadConfig) return;
    setIngredients((prev) =>
      prev.map((row, idx) =>
        idx === keypadConfig.index
          ? { ...row, quantity: val > 0 ? String(val) : '' }
          : row
      )
    );
    setKeypadConfig(null);
  };

  // 數字鍵盤取消回滾
  const handleKeypadCancel = () => {
    if (!keypadConfig) return;
    const prevVal = initialKeypadValueRef.current;
    setIngredients((prev) =>
      prev.map((row, idx) =>
        idx === keypadConfig.index ? { ...row, quantity: prevVal } : row
      )
    );
    setKeypadConfig(null);
  };

  // 處理主彈窗關閉保護 (若次級鍵盤或食物選擇器開啟中，阻斷關閉)
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (keypadConfig || isPickerOpen)) {
      return;
    }
    onOpenChange(nextOpen);
  };

  // 表單送出
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting || ingredients.length === 0) return;

    const validIngredients: RecipeIngredient[] = [];
    for (const item of ingredients) {
      const qty = parseFloat(item.quantity) || 0;
      if (qty > 0) {
        let normalizedQty = qty;
        if (item.unit === 'oz') {
          normalizedQty = ozToG(qty, 2);
        } else if (item.unit === 'fl oz') {
          normalizedQty = flOzToMl(qty, 2);
        }

        validIngredients.push({
          foodId: item.foodId,
          foodName: item.foodName,
          quantity: normalizedQty,
          unit: item.unit === 'oz' ? 'g' : item.unit === 'fl oz' ? 'ml' : item.unit,
          isOptional: item.isOptional,
        });
      }
    }

    if (validIngredients.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        ingredients: validIngredients,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formId = useId();

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[70]"
          className="z-[70] w-[340px] max-w-[calc(100vw-24px)] sm:w-[360px] sm:max-w-[360px] bg-card border border-border text-card-foreground p-5 sm:p-5 font-mono text-xs select-none shadow-none flex flex-col max-h-[85vh] overflow-hidden"
          initialFocus={false}
        >
          {/* 彈窗標頭 (1:1 復刻 FoodFormDialog 標頭) */}
          <DialogHeader className="p-0 pb-0 shrink-0">
            <div className="flex items-center justify-between w-full h-7">
              <DialogTitle className="text-foreground text-sm sm:text-base font-semibold tracking-tight font-sans flex items-center gap-2">
                <ChefHat className="size-4 text-foreground shrink-0" />
                <span>{isEdit ? t('diet.editRecipe') : t('diet.addRecipe')}</span>
              </DialogTitle>
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                  />
                }
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          {/* 表單主體：包含單一聯合滾動容器與固定於底部的按鈕列 */}
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="flex-1 min-h-0 flex flex-col pt-3.5"
          >
            {/* 單一統一聯合滾動區域：基本資訊、預估看板與食材清單合一滾動 */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3.5 pr-1">
              {/* 表格段落 1: 基本資訊 (Vercel Usage List) */}
              <div className="space-y-1.5 shrink-0">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground px-0 font-semibold">
                  {t('diet.basicInfo')}
                </div>
                <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm font-sans">
                  {/* 菜餚名稱行 */}
                  <div className="h-10 px-4 flex items-center justify-between gap-2 bg-card shrink-0">
                    <span className="text-muted-foreground text-xs shrink-0">
                      {t('diet.recipeName')}
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('diet.recipeNamePlaceholder')}
                      className="h-7 px-3 rounded-full border border-border/80 bg-background text-right text-xs font-sans text-foreground font-medium focus:outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-all duration-100 flex-1 max-w-[200px]"
                    />
                  </div>

                  {/* 備註 (選填) 行 */}
                  <div className="h-10 px-4 flex items-center justify-between gap-2 bg-card shrink-0">
                    <span className="text-muted-foreground text-xs shrink-0">
                      {t('common.notes')}
                    </span>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('diet.recipeDescription')}
                      className="h-7 px-3 rounded-full border border-border/80 bg-background text-right text-xs font-sans text-muted-foreground focus:text-foreground focus:outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-all duration-100 flex-1 max-w-[200px]"
                    />
                  </div>
                </div>
              </div>

              {/* 表格段落 2: 計算預估橫向看板 (HUD Banner) */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between px-0">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {t('diet.totalEstimated')}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground/80">{t('diet.totalWeight', '總重量')}</span>
                    <span className="font-semibold text-foreground">
                      {
                        formatFoodServing(
                          totals.totalWeightGrams,
                          'g',
                          foodWeightUnit,
                          foodVolumeUnit
                        ).formatted
                      }
                    </span>
                  </div>
                </div>

                {/* 4 欄巨量素橫向網格卡片 (高度僅約 48px，節省 150px+ 縱向空間) */}
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

                  {/* 碳水 */}
                  <div className="px-1 flex flex-col items-center justify-center min-w-0">
                    <span className="text-[10px] font-medium text-carbs uppercase tracking-wider truncate">
                      {t('diet.carbs')}
                    </span>
                    <div className="font-mono text-xs font-bold text-carbs mt-0.5 truncate flex items-baseline gap-0.5">
                      <span>{totals.carbs}</span>
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
              </div>

              {/* 表格段落 3: 構成食材清單 */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between px-0">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {t('diet.recipeIngredients')} ({ingredients.length})
                  </div>

                  {/* 微型膠囊按鈕：新增食材 */}
                  <button
                    type="button"
                    onClick={handleOpenAddIngredient}
                    className="h-6 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer text-foreground active:scale-95 select-none"
                  >
                    <Plus className="size-3 text-muted-foreground" />
                    <span>{t('diet.addIngredient')}</span>
                  </button>
                </div>

                {/* 食材列表卡片 */}
                <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
                  {ingredients.length === 0 ? (
                    <div className="py-6 px-4 text-center shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenAddIngredient}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none font-mono"
                      >
                        <Plus className="size-3.5" />
                        <span>{t('diet.addIngredient')}</span>
                      </button>
                    </div>
                  ) : (
                    ingredients.map((item, index) => (
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

                        {/* 右側：用量膠囊 + 可選按鈕 + 移除按鈕 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* 數量微調按鈕 (點擊喚起懸浮數字鍵盤) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenKeypad(index, e.currentTarget)}
                            className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95 select-none shrink-0"
                          >
                            <span className="font-bold text-foreground">
                              {formatDisplayAmount(item.quantity) || '-'}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {item.unit}
                            </span>
                            <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                          </button>

                          {/* 可選切換按鈕 (簡潔膠囊，取代醜陋的 Checkbox) */}
                          <button
                            type="button"
                            onClick={() => handleToggleOptional(index)}
                            className={cn(
                              'h-7 px-2 rounded-full border text-[11px] font-mono transition-all cursor-pointer select-none shrink-0',
                              item.isOptional
                                ? 'bg-foreground text-background border-foreground font-medium'
                                : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border'
                            )}
                            title={t('diet.optionalBadge')}
                          >
                            {t('diet.optionalBadge')}
                          </button>

                          {/* 移除按鈕 */}
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(index)}
                            className="size-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors cursor-pointer shrink-0"
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 底部按鈕區 (符合 Rule 4 規範：單行水平並排，取消在左、儲存在右) */}
            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3 shrink-0 border-t border-border/50">
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border cursor-pointer text-xs font-mono h-8 px-4"
                  />
                }
              >
                {t('common.cancel')}
              </DialogClose>
              <Button
                type="submit"
                disabled={!name.trim() || ingredients.length === 0 || isSubmitting}
                className="cursor-pointer text-xs font-mono h-8 px-5 bg-foreground text-background hover:opacity-90 active:opacity-80"
              >
                {isEdit ? t('common.save') : t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 次級懸浮鍵盤 (透過 KeypadConfig 觸發，層級高於主彈窗) */}
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

      {/* 次級食材選擇器 (平鋪兄弟節點聲明，層級 zIndex={80}) */}
      <FoodRecipeSelectDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        mode="foods"
        zIndex={80}
        disabledIds={disabledFoodIds}
        onSelect={handleSelectFood}
      />
    </>
  );
}
