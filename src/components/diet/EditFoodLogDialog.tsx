import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { db } from '@/services/db/db';
import type { FoodLog, FoodItem } from '@/types';
import { formatDisplayAmount } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { calculateIngredientMacros } from '@/utils/recipeMath';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy } from '@/utils/unitMath';

export interface EditFoodLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: FoodLog | null;
  onSave: (id: string, updates: { quantity: number; calories: number; carbs: number; protein: number; fat: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditFoodLogDialog({
  open,
  onOpenChange,
  log,
  onSave,
  onDelete,
}: EditFoodLogDialogProps) {
  const { t } = useTranslation();
  const { energyUnit } = useUnitPreferences();

  // 本地狀態：用量與基準食材資訊
  const [quantity, setQuantity] = useState<number>(log?.quantity || 100);
  const [baseFood, setBaseFood] = useState<FoodItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 數字鍵盤狀態
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const initialQuantityRef = useRef<number>(quantity);

  // 當 log 變更時同步初始狀態與查詢原食物實體
  useEffect(() => {
    if (log && open) {
      setQuantity(log.quantity);
      initialQuantityRef.current = log.quantity;

      if (log.foodId) {
        db.foods.get(log.foodId).then((food) => {
          if (food) {
            setBaseFood(food);
          } else {
            setBaseFood(null);
          }
        });
      } else {
        setBaseFood(null);
      }
    }
  }, [log, open]);

  // 動態推算即時營養素 (C -> P -> F 順序)
  const currentMacros = useMemo(() => {
    if (!log) {
      return { calories: 0, carbs: 0, protein: 0, fat: 0 };
    }

    if (baseFood) {
      return calculateIngredientMacros(baseFood, quantity);
    }

    // 若無原始 FoodItem 定義，依原記錄等比縮放
    const baseQty = log.quantity || 1;
    const ratio = quantity / baseQty;
    return {
      calories: Math.round((log.calories || 0) * ratio),
      carbs: Math.round((log.carbs || 0) * ratio * 10) / 10,
      protein: Math.round((log.protein || 0) * ratio * 10) / 10,
      fat: Math.round((log.fat || 0) * ratio * 10) / 10,
    };
  }, [log, baseFood, quantity]);

  // 供能比比例推算 (供能比標尺：碳水 4kcal/g, 蛋白 4kcal/g, 脂肪 9kcal/g)
  const energyRatios = useMemo(() => {
    const carbCals = currentMacros.carbs * 4;
    const proteinCals = currentMacros.protein * 4;
    const fatCals = currentMacros.fat * 9;
    const totalCal = carbCals + proteinCals + fatCals;

    if (totalCal <= 0) {
      return { carbs: 33.3, protein: 33.3, fat: 33.4 };
    }

    return {
      carbs: (carbCals / totalCal) * 100,
      protein: (proteinCals / totalCal) * 100,
      fat: (fatCals / totalCal) * 100,
    };
  }, [currentMacros]);

  // 打開數字鍵盤
  const handleOpenKeypad = (el: HTMLElement) => {
    triggerHaptic('selection');
    anchorElRef.current = el;
    initialQuantityRef.current = quantity;
    setIsKeypadOpen(true);
  };

  // 數字鍵盤即時鏡像聯動
  const handleKeypadLiveChange = useCallback((val: number) => {
    setQuantity(val > 0 ? val : 0);
  }, []);

  // 數字鍵盤確認
  const handleKeypadConfirm = useCallback((val: number) => {
    setQuantity(val > 0 ? val : 1);
    setIsKeypadOpen(false);
  }, []);

  // 數字鍵盤取消
  const handleKeypadCancel = useCallback(() => {
    setQuantity(initialQuantityRef.current);
    setIsKeypadOpen(false);
  }, []);

  // 主彈窗開關保護 (若次級鍵盤開啟中，阻斷關閉)
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isKeypadOpen) {
      return;
    }
    onOpenChange(nextOpen);
  };

  // 送出保存
  const handleSubmit = async () => {
    if (!log || isSubmitting || quantity <= 0) return;
    setIsSubmitting(true);
    try {
      await onSave(log.id, {
        quantity,
        calories: currentMacros.calories,
        carbs: currentMacros.carbs,
        protein: currentMacros.protein,
        fat: currentMacros.fat,
      });
      triggerHaptic('success');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 刪除記錄
  const handleDelete = async () => {
    if (!log || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDelete(log.id);
      triggerHaptic('medium');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!log) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <PrecisionDialogContent
          title={log.foodName}
          onSubmit={handleSubmit}
          submitDisabled={isSubmitting || quantity <= 0}
          submitAriaLabel={t('common.save')}
          cancelAriaLabel={t('common.cancel')}
          overlayClassName="z-[70]"
          className="z-[70] flex flex-col overflow-hidden"
          initialFocus={false}
        >
          {/* 表單主體 */}
          <div className="flex flex-col space-y-3 pt-3.5">
            {/* 4 欄即時 HUD Banner 與供能比標尺組合 */}
            <div className="space-y-1.5 shrink-0">
              <div className="border border-border rounded-lg overflow-hidden bg-card grid grid-cols-4 divide-x divide-border select-none py-2 text-center shrink-0">
                {/* 熱量 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-calories uppercase tracking-wider truncate">
                    {t('diet.calories')}
                  </span>
                  <div className="font-mono text-xs font-bold text-calories mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{formatEnergy(currentMacros.calories, energyUnit).value}</span>
                    <span className="text-[9px] font-normal opacity-75">{formatEnergy(currentMacros.calories, energyUnit).unit}</span>
                  </div>
                </div>

                {/* 碳水化合物 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-carbs uppercase tracking-wider truncate">
                    {t('diet.carbs')}
                  </span>
                  <div className="font-mono text-xs font-bold text-carbs mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{currentMacros.carbs}</span>
                    <span className="text-[9px] font-normal opacity-75">g</span>
                  </div>
                </div>

                {/* 蛋白質 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-protein uppercase tracking-wider truncate">
                    {t('diet.protein')}
                  </span>
                  <div className="font-mono text-xs font-bold text-protein mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{currentMacros.protein}</span>
                    <span className="text-[9px] font-normal opacity-75">g</span>
                  </div>
                </div>

                {/* 脂肪 */}
                <div className="px-1 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[10px] font-medium text-fat uppercase tracking-wider truncate">
                    {t('diet.fat')}
                  </span>
                  <div className="font-mono text-xs font-bold text-fat mt-0.5 truncate flex items-baseline gap-0.5">
                    <span>{currentMacros.fat}</span>
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

            {/* 表格卡片 (Usage List 表格行：食用份量 + 常用數字輸入框膠囊) */}
            <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
              <div className="h-10 px-3 flex items-center justify-between bg-card">
                <span className="text-muted-foreground text-xs font-sans">
                  {t('diet.serving', '食用份量')}
                </span>

                {/* Zenfit 專案常用的標準數字輸入框膠囊 */}
                <button
                  type="button"
                  onClick={(e) => handleOpenKeypad(e.currentTarget)}
                  className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95 select-none"
                  title={t('diet.clickToEnter', '點擊輸入數值')}
                >
                  <span className="font-bold text-foreground">
                    {formatDisplayAmount(String(quantity)) || '0'}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {log.unit || 'g'}
                  </span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>
            </div>

            {/* 底部破壞性高危按鈕 (實色紅底 + 純白文字) */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="w-full h-9 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.98] transition-all font-mono text-xs font-semibold cursor-pointer select-none flex items-center justify-center disabled:opacity-30"
            >
              {t('diet.deleteRecord', '刪除記錄')}
            </button>
          </div>
        </PrecisionDialogContent>
      </Dialog>

      {/* 次級懸浮鍵盤 (平級兄弟節點聲明，層級 zIndex={70} 高於主彈窗) */}
      {isKeypadOpen && (
        <NumericKeypadDialog
          open={isKeypadOpen}
          onOpenChange={(kOpen) => {
            if (!kOpen) handleKeypadCancel();
          }}
          title={log.foodName}
          value={initialQuantityRef.current}
          unit={log.unit || 'g'}
          allowDecimals={true}
          maxDecimals={2}
          anchorEl={anchorElRef.current}
          onLiveChange={handleKeypadLiveChange}
          onConfirm={handleKeypadConfirm}
          onCancel={handleKeypadCancel}
        />
      )}
    </>
  );
}
