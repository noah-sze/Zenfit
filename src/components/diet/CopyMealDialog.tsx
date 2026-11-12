import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { Check, Clock, ChevronRight, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogPrecisionHeader } from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { db } from '@/services/db/db';
import { ensureDailyDietMeta } from '@/hooks/useDietPlan';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy } from '@/utils/unitMath';
import { calculateFoodLogNutrients } from '@/utils/nutritionMath';
import { resolveFoodLogTitle } from '@/utils/foodNaming';
import { cn, formatDisplayAmount } from '@/lib/utils';
import { CopyMealDatePickerDialog } from './CopyMealDatePickerDialog';
import type { MealType, FoodLog, FoodItem } from '@/types';

export interface CopyMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetMealType: MealType;
  targetDate: string;
}

interface CopyableMealItem extends FoodLog {
  foodName: string;
  calories: number;
  baseFood?: FoodItem | null;
  baseRatio?: { calories: number; carbs: number; protein: number; fat: number };
}

/**
 * 複製餐點 Dialog (Precision Modal 標準版 · 方案 1A 一體化表頭橫欄)：
 * 1. 標準 Precision Modal 幾何（w-[320px] sm:w-[340px]，shadow-none，border border-border，p-4）。
 * 2. 標頭符合規範：左上角 ✕ 圓形關閉按鈕，中間標題純粹為「複製餐點」（去綴詞），右上角 ✓ 圓形確認按鈕。
 * 3. 佈局改用方案 1A（Integrated Header Notch）：移除舊有 40px Tab 欄，在食物滾動容器頂部整合灰底橫欄，左側顯示來源日期（如 11/09 (昨日)），右側膠囊按鈕「更換 ▾」呼出日期選擇器。
 * 4. 食材清單容器（min-h-[220px] max-h-[340px]），條目沿用食譜詳情（EditRecipeLogDialog）規格（min-h-12 / 48px），支援勾選、品名截斷與右側常用數字膠囊按鈕（點擊呼出 NumericKeypadDialog 即時調整重量）。
 * 5. 即時聯動：數字鍵盤數值變更時即時重算 calories 與底部彙總條。
 * 6. 底部單行彙總條維持無縫自然留白（無分割線）。
 * 7. 二級日期選擇 Dialog 與懸浮數字鍵盤採平級 Flat Sibling 宣告。
 */
export function CopyMealDialog({
  open,
  onOpenChange,
  targetMealType,
  targetDate,
}: CopyMealDialogProps) {
  const { t } = useTranslation();
  const { energyUnit } = useUnitPreferences();

  // 查詢當前目標日期前，該餐別所有有記錄的歷史日期 (降序排列)
  const recordedDates = useLiveQuery<string[]>(async () => {
    if (!targetDate || !targetMealType) return [];
    const logs = await db.daily_diet_logs
      .where('date')
      .below(targetDate)
      .reverse()
      .toArray();

    return logs
      .filter((log) => log.entries && log.entries.some((e) => e.mealType === targetMealType))
      .map((log) => log.date);
  }, [targetDate, targetMealType]);

  const lastRecordedDate = recordedDates && recordedDates.length > 0 ? recordedDates[0] : null;

  // 手動選擇日期狀態與日曆彈窗
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // 當前生效之歷史日期字串（手動選擇優先，預設為最新一次紀錄日期）
  const activeHistoryDate = useMemo(() => {
    return selectedHistoryDate || lastRecordedDate;
  }, [selectedHistoryDate, lastRecordedDate]);

  // 彈窗開啟或目標參數變更時，預設重置手動選擇與次級彈窗
  useEffect(() => {
    if (open) {
      setSelectedHistoryDate(null);
      setIsDatePickerOpen(false);
      setKeypadConfig(null);
    }
  }, [open, targetDate, targetMealType]);

  // 查詢歷史日期該餐別所有食材條目
  const historicalLogs = useLiveQuery<CopyableMealItem[]>(async () => {
    if (!activeHistoryDate) return [];
    const dailyLog = await db.daily_diet_logs.where('date').equals(activeHistoryDate).first();
    const rawEntries = (dailyLog?.entries || []).filter((e) => e.mealType === targetMealType);
    if (rawEntries.length === 0) return [];

    const allFoods = await db.foods.toArray();
    const foodMap = new Map(allFoods.map((f) => [f.id, f]));

    return rawEntries.map((log) => {
      const isSystem = log.entryType === 'estimate' || log.entryType === 'as_planned' || log.isPlaceholder || log.isAsPlanned;
      const food = (!isSystem && log.foodId) ? foodMap.get(log.foodId) : undefined;
      const raw = log as unknown as { foodName?: string; calories?: number; carbs?: number; protein?: number; fat?: number };
      const computed = food
        ? calculateFoodLogNutrients(food, log.quantity || 0, log.unit || 'g')
        : {
            calories: raw.calories || 0,
            protein: raw.protein || 0,
            carbs: raw.carbs || 0,
            fat: raw.fat || 0,
          };
      const displayName = resolveFoodLogTitle(log, t, food);

      return {
        ...log,
        foodName: displayName,
        calories: computed.calories,
        baseFood: food || null,
        baseRatio: (log.quantity && log.quantity > 0) ? {
          calories: (computed.calories || 0) / log.quantity,
          carbs: (computed.carbs || 0) / log.quantity,
          protein: (computed.protein || 0) / log.quantity,
          fat: (computed.fat || 0) / log.quantity,
        } : undefined,
      };
    });
  }, [activeHistoryDate, targetMealType]);

  // 本地可編輯食材清單
  const [items, setItems] = useState<CopyableMealItem[]>([]);
  // 勾選項目的 id 集合
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當歷史資料讀取或切換歷史日期時，更新本地列表並預設全選
  useEffect(() => {
    if (open && historicalLogs) {
      setItems(historicalLogs);
      setSelectedIds(new Set(historicalLogs.map((item) => item.id)));
    }
  }, [open, historicalLogs]);

  // 數字鍵盤狀態
  const [keypadConfig, setKeypadConfig] = useState<{
    index: number;
    title: string;
    value: number;
    unit: string;
    anchorEl?: HTMLElement | null;
  } | null>(null);
  const initialKeypadValueRef = useRef<number>(0);
  const isKeypadConfirmedRef = useRef(false);

  // 重新計算單項熱量純函數
  const recalculateCalories = useCallback((item: CopyableMealItem, newQty: number): number => {
    if (item.baseFood) {
      return calculateFoodLogNutrients(item.baseFood, newQty, item.unit).calories;
    }
    if (item.baseRatio) {
      return Math.round(item.baseRatio.calories * newQty);
    }
    return item.calories;
  }, []);

  // 打開數字鍵盤編輯用量
  const handleOpenKeypad = (index: number, anchorEl: HTMLElement) => {
    const row = items[index];
    if (!row || row.quantity === undefined) return;
    triggerHaptic('selection');
    initialKeypadValueRef.current = row.quantity;
    isKeypadConfirmedRef.current = false;
    setKeypadConfig({
      index,
      title: row.foodName,
      value: row.quantity,
      unit: row.unit || 'g',
      anchorEl,
    });
  };

  const handleKeypadLiveChange = useCallback((val: number) => {
    setItems((prev) => {
      if (!keypadConfig) return prev;
      return prev.map((row, idx) => {
        if (idx !== keypadConfig.index) return row;
        const safeQty = val > 0 ? val : 0;
        return {
          ...row,
          quantity: safeQty,
          calories: recalculateCalories(row, safeQty),
        };
      });
    });
  }, [keypadConfig, recalculateCalories]);

  const handleKeypadConfirm = useCallback((val: number) => {
    isKeypadConfirmedRef.current = true;
    setItems((prev) => {
      if (!keypadConfig) return prev;
      return prev.map((row, idx) => {
        if (idx !== keypadConfig.index) return row;
        const safeQty = val > 0 ? val : 1;
        return {
          ...row,
          quantity: safeQty,
          calories: recalculateCalories(row, safeQty),
        };
      });
    });
    setKeypadConfig(null);
  }, [keypadConfig, recalculateCalories]);

  const handleKeypadCancel = useCallback(() => {
    if (isKeypadConfirmedRef.current) return;
    if (!keypadConfig) return;
    const prevVal = initialKeypadValueRef.current;
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== keypadConfig.index) return row;
        return {
          ...row,
          quantity: prevVal,
          calories: recalculateCalories(row, prevVal),
        };
      })
    );
    setKeypadConfig(null);
  }, [keypadConfig, recalculateCalories]);

  const toggleItem = (id: string) => {
    triggerHaptic('selection');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  // 計算已選食材之總熱量
  const selectedCalories = useMemo(() => {
    if (items.length === 0 || selectedCount === 0) return 0;
    return items
      .filter((item) => selectedIds.has(item.id))
      .reduce((sum, item) => sum + (item.calories || 0), 0);
  }, [items, selectedIds, selectedCount]);

  const totalCaloriesFormatted = formatEnergy(selectedCalories, energyUnit).formatted;

  // 格式化來源日期標籤 (如: 11/09 (昨日) 或 11/09)
  const sourceDateLabel = useMemo(() => {
    if (!activeHistoryDate) return null;
    const parsedActive = parseISO(activeHistoryDate);
    if (!isValid(parsedActive)) return activeHistoryDate;
    const formattedDate = format(parsedActive, 'MM/dd');

    if (targetDate) {
      const parsedTarget = parseISO(targetDate);
      if (isValid(parsedTarget)) {
        const diff = differenceInCalendarDays(parsedTarget, parsedActive);
        if (diff === 1) {
          return `${formattedDate} (${t('diet.copyMeal.yesterdayShort', '昨日')})`;
        }
        if (diff === 2) {
          return `${formattedDate} (${t('diet.copyMeal.dayBeforeShort', '前天')})`;
        }
      }
    }
    return formattedDate;
  }, [activeHistoryDate, targetDate, t]);

  // 主彈窗開關保護（防止懸浮鍵盤或日期選擇器開啟時誤關主彈窗）
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (keypadConfig || isDatePickerOpen)) {
      return;
    }
    onOpenChange(nextOpen);
  };

  // 執行複製寫入
  const handleCopy = async () => {
    if (items.length === 0 || selectedCount === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const itemsToCopy = items.filter((item) => selectedIds.has(item.id));
      if (itemsToCopy.length === 0) return;

      const now = Date.now();
      let dailyLog = await db.daily_diet_logs.where('date').equals(targetDate).first();
      if (!dailyLog) {
        const meta = await ensureDailyDietMeta(targetDate);
        dailyLog = {
          id: uuidv4(),
          date: targetDate,
          meta: {
            activityLevel: meta.activityLevel ?? 1.55,
            macroSplit: meta.macroSplit ?? { carbs: 40, protein: 30, fat: 30 },
          },
          entries: [],
          createdAt: now,
          updatedAt: now,
        };
      }

      // 若原歷史項目具備 bundleId，為當前目標建立全新 mapping，維護分組完整性
      const bundleIdMap = new Map<string, string>();
      const newEntries: FoodLog[] = itemsToCopy.map((item) => {
        let newBundleId: string | undefined = undefined;
        if (item.bundleId) {
          if (!bundleIdMap.has(item.bundleId)) {
            bundleIdMap.set(item.bundleId, uuidv4());
          }
          newBundleId = bundleIdMap.get(item.bundleId);
        }

        const isSystem = item.entryType === 'estimate' || item.entryType === 'as_planned' || item.isPlaceholder || item.isAsPlanned;
        if (isSystem) {
          return {
            id: uuidv4(),
            date: targetDate,
            mealType: targetMealType,
            entryType: item.entryType || (item.isAsPlanned ? 'as_planned' : 'estimate'),
            scenario: item.scenario,
            customTitle: item.customTitle,
            calories: item.calories,
            carbs: item.carbs,
            protein: item.protein,
            fat: item.fat,
            isPlaceholder: item.isPlaceholder,
            isAsPlanned: item.isAsPlanned,
            createdAt: now,
            updatedAt: now,
          };
        }

        return {
          id: uuidv4(),
          date: targetDate,
          mealType: targetMealType,
          entryType: 'item',
          foodId: item.foodId,
          quantity: item.quantity,
          unit: item.unit,
          bundleId: newBundleId,
          createdAt: now,
          updatedAt: now,
        };
      });

      dailyLog.entries.push(...newEntries);
      dailyLog.updatedAt = now;
      await db.daily_diet_logs.put(dailyLog);

      triggerHaptic('success');
      toast.show(
        t('diet.copyMeal.successToast', {
          count: newEntries.length,
          meal: t(`diet.${targetMealType}`),
        })
      );
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to copy meal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          size="standard"
          showCloseButton={false}
          initialFocus={false}
          className="w-[320px] sm:w-[340px] max-w-[calc(100vw-24px)] sm:max-w-[340px] p-4 pb-5 sm:p-4 sm:pb-5 bg-card text-card-foreground border border-border shadow-none font-mono text-xs select-none flex flex-col overflow-hidden max-h-[85vh] max-h-[85dvh]"
        >
          {/* 頂部標準標頭：左上角 ✕ 關閉，中間標題純粹「複製餐點」（去綴詞），右上角 ✓ 確認複製 */}
          <DialogPrecisionHeader
            title={t('diet.copyMeal.title', '複製餐點')}
            onClose={() => onOpenChange(false)}
            onSubmit={handleCopy}
            submitDisabled={items.length === 0 || selectedCount === 0 || isSubmitting}
            submitAriaLabel={t('diet.copyMeal.confirm', '確認複製')}
            cancelAriaLabel={t('common.cancel', '取消')}
          />

          {/* 食材清單容器（全站標準 min-h-[220px] max-h-[340px]，方案 1A 表頭一體化橫欄 Integrated Header Notch） */}
          <div className="flex-1 min-h-[220px] max-h-[340px] flex flex-col mt-5 mb-5 rounded-lg border border-border bg-card overflow-hidden">
            {/* 表頭一體化橫欄 */}
            <div className="h-8.5 bg-muted/40 border-b border-border px-3 flex items-center justify-between select-none shrink-0">
              {/* 左側：時鐘圖標 + 來源： + 粗體高亮日期 */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono min-w-0 truncate">
                <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="shrink-0">{t('diet.copyMeal.source', '來源：')}</span>
                <span className="font-semibold text-foreground truncate">
                  {sourceDateLabel || t('common.none', '無')}
                </span>
              </div>

              {/* 右側：微型膠囊按鈕 [更換 ▾] */}
              <button
                type="button"
                disabled={!recordedDates || recordedDates.length === 0}
                onClick={() => {
                  triggerHaptic('selection');
                  setIsDatePickerOpen(true);
                }}
                className="h-6 px-2 rounded border border-border/80 bg-background hover:bg-hover text-2xs font-mono flex items-center gap-1 text-foreground cursor-pointer transition-colors active:scale-95 disabled:opacity-40 disabled:pointer-events-none select-none shrink-0"
              >
                <span>{t('diet.copyMeal.change', '更換')}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </div>

            {/* 食物清單滾動區 */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {t('diet.copyMeal.empty', '該餐別無歷史記錄')}
                  </span>
                  <span className="text-2xs text-muted-foreground/60 font-mono">
                    {t('diet.copyMeal.emptyHint', '請選擇其他日期')}
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, index) => {
                    const isSelected = selectedIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'min-h-12 py-2 px-3 sm:px-4 flex items-center justify-between gap-2 bg-card transition-all cursor-pointer hover:bg-hover select-none',
                          !isSelected && 'opacity-40'
                        )}
                      >
                        {/* 自訂高對比 Checkbox 與食材名稱 */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div
                            className={cn(
                              'size-4 rounded flex items-center justify-center shrink-0 border transition-colors',
                              isSelected
                                ? 'bg-foreground text-background border-foreground'
                                : 'border-border bg-transparent text-transparent'
                            )}
                          >
                            {isSelected && <Check className="size-3 stroke-[3]" />}
                          </div>

                          <span className="truncate text-xs font-medium text-foreground flex-1 min-w-0">
                            {item.foodName}
                          </span>
                        </div>

                        {/* 右側結構：常用數字輸入框膠囊 / 系統條目熱量標籤 */}
                        {item.entryType === 'estimate' || item.entryType === 'as_planned' || item.isPlaceholder || item.isAsPlanned ? (
                          <div className="h-7 px-2.5 rounded-full border border-border/80 bg-muted/40 font-mono text-xs flex items-center shrink-0">
                            <span className="font-bold text-foreground">
                              {formatEnergy(item.calories || 0, energyUnit).formatted}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!isSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSelected) return;
                              handleOpenKeypad(index, e.currentTarget);
                            }}
                            className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95 select-none shrink-0 disabled:pointer-events-none"
                          >
                            <span className="font-bold text-foreground">
                              {formatDisplayAmount(String(item.quantity)) || '0'}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {item.unit}
                            </span>
                            <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 底部單行彙總條（自然無縫留白，無分割線） */}
          <div className="flex items-center justify-center px-1 pt-0 pb-0 text-xs font-mono text-muted-foreground shrink-0 select-none">
            <span>
              {t('diet.copyMeal.summary', {
                count: selectedCount,
                calories: totalCaloriesFormatted,
                defaultValue: `已選 ${selectedCount} 項食材 · 總計 ${totalCaloriesFormatted}`,
              })}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* 二級日期選擇 Dialog (Flat Sibling 宣告，z-[70]) */}
      <CopyMealDatePickerDialog
        open={open && isDatePickerOpen}
        onOpenChange={setIsDatePickerOpen}
        targetMealType={targetMealType}
        targetDate={targetDate}
        selectedDate={activeHistoryDate}
        recordedDates={recordedDates || []}
        onSelectDate={(dateStr) => {
          setSelectedHistoryDate(dateStr);
          setIsDatePickerOpen(false);
        }}
      />

      {/* 次級懸浮鍵盤 (平級兄弟節點聲明，層級 zIndex={70} 高於主彈窗) */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={!!keypadConfig}
          onOpenChange={(kOpen) => {
            if (!kOpen) {
              if (!isKeypadConfirmedRef.current) {
                handleKeypadCancel();
              } else {
                setKeypadConfig(null);
              }
            }
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
    </>
  );
}
