import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { HoldToDeleteButton } from '@/components/ui/HoldToDeleteButton';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { MealType } from '@/types';

export interface QuickPlaceholderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetMealType: MealType;
  targetDate: string;
  onConfirm: (data: {
    foodName: string;
    calories: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  }) => Promise<void>;
  initialData?: {
    id?: string;
    foodName?: string;
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  } | null;
  onDelete?: (id: string) => Promise<void>;
}

type KeypadTarget = 'calories' | 'carbs' | 'protein' | 'fat' | null;

const PRESET_CALORIES = [
  { kcal: 300, labelKey: 'diet.placeholder.presetLight', defaultLabel: '輕食' },
  { kcal: 500, labelKey: 'diet.placeholder.presetRegular', defaultLabel: '常規' },
  { kcal: 800, labelKey: 'diet.placeholder.presetFeast', defaultLabel: '大餐' },
  { kcal: 1200, labelKey: 'diet.placeholder.presetParty', defaultLabel: '應酬' },
];

export function QuickPlaceholderDialog({
  open,
  onOpenChange,
  targetMealType: _targetMealType,
  targetDate: _targetDate,
  onConfirm,
  initialData,
  onDelete,
}: QuickPlaceholderDialogProps) {
  const { t } = useTranslation();

  const [mode, setMode] = useState<'calories' | 'macros'>('calories');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState(500);
  const [carbs, setCarbs] = useState(50);
  const [protein, setProtein] = useState(30);
  const [fat, setFat] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keypad
  const [keypadTarget, setKeypadTarget] = useState<KeypadTarget>(null);
  const keypadAnchorRef = useRef<HTMLElement | null>(null);

  // Initialize or reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFoodName(initialData.foodName || '');
        setCalories(initialData.calories ?? 500);
        const hasCustomMacros =
          initialData.carbs !== undefined ||
          initialData.protein !== undefined ||
          initialData.fat !== undefined;
        if (hasCustomMacros) {
          setMode('macros');
          setCarbs(initialData.carbs ?? 0);
          setProtein(initialData.protein ?? 0);
          setFat(initialData.fat ?? 0);
        } else {
          setMode('calories');
          setCarbs(50);
          setProtein(30);
          setFat(15);
        }
      } else {
        setFoodName('');
        setMode('calories');
        setCalories(500);
        setCarbs(50);
        setProtein(30);
        setFat(15);
      }
      setKeypadTarget(null);
    }
  }, [open, initialData]);

  // When in macros mode, keep calories in sync: C*4 + P*4 + F*9
  const handleMacrosChange = (c: number, p: number, f: number) => {
    setCarbs(c);
    setProtein(p);
    setFat(f);
    setCalories(Math.round(c * 4 + p * 4 + f * 9));
  };

  const handleStepCalories = (delta: number) => {
    triggerHaptic('light');
    setCalories((prev) => Math.min(3000, Math.max(50, prev + delta)));
  };

  const handleOpenKeypad = (target: KeypadTarget, anchorEl: HTMLElement) => {
    triggerHaptic('light');
    keypadAnchorRef.current = anchorEl;
    setKeypadTarget(target);
  };

  const handleKeypadConfirm = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    if (keypadTarget === 'calories') {
      setCalories(Math.round(safeVal));
    } else if (keypadTarget === 'carbs') {
      handleMacrosChange(Math.round(safeVal * 10) / 10, protein, fat);
    } else if (keypadTarget === 'protein') {
      handleMacrosChange(carbs, Math.round(safeVal * 10) / 10, fat);
    } else if (keypadTarget === 'fat') {
      handleMacrosChange(carbs, protein, Math.round(safeVal * 10) / 10);
    }
    setKeypadTarget(null);
  };

  const handleKeypadLiveChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    if (keypadTarget === 'calories') {
      setCalories(Math.round(safeVal));
    } else if (keypadTarget === 'carbs') {
      handleMacrosChange(Math.round(safeVal * 10) / 10, protein, fat);
    } else if (keypadTarget === 'protein') {
      handleMacrosChange(carbs, Math.round(safeVal * 10) / 10, fat);
    } else if (keypadTarget === 'fat') {
      handleMacrosChange(carbs, protein, Math.round(safeVal * 10) / 10);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || calories <= 0) return;
    setIsSubmitting(true);
    try {
      const finalName = foodName.trim() || t('diet.placeholder.defaultName', '快速估算');
      await onConfirm({
        foodName: finalName,
        calories: Math.round(calories),
        carbs: mode === 'macros' ? carbs : undefined,
        protein: mode === 'macros' ? protein : undefined,
        fat: mode === 'macros' ? fat : undefined,
      });
      triggerHaptic('success');
      toast.show(t('diet.placeholder.successToast', '已記錄估算'));
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDelete(initialData.id);
      triggerHaptic('medium');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine current keypad props
  const getKeypadProps = () => {
    switch (keypadTarget) {
      case 'calories':
        return {
          title: t('diet.calories', '熱量'),
          value: calories,
          unit: 'kcal',
          allowDecimals: false,
        };
      case 'carbs':
        return {
          title: t('diet.macroMicro.carbs', '碳水'),
          value: carbs,
          unit: 'g',
          allowDecimals: true,
        };
      case 'protein':
        return {
          title: t('diet.macroMicro.protein', '蛋白質'),
          value: protein,
          unit: 'g',
          allowDecimals: true,
        };
      case 'fat':
        return {
          title: t('diet.macroMicro.fat', '脂肪'),
          value: fat,
          unit: 'g',
          allowDecimals: true,
        };
      default:
        return {
          title: '',
          value: 0,
          unit: '',
          allowDecimals: false,
        };
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <PrecisionDialogContent
          title={t('diet.placeholder.title', '快速估算')}
          onSubmit={handleSubmit}
          onClose={() => onOpenChange(false)}
          submitDisabled={isSubmitting || calories <= 0}
          submitAriaLabel={t('common.save', '儲存')}
          cancelAriaLabel={t('common.cancel', '取消')}
          overlayClassName="z-[70]"
          className="z-[70] w-[320px] max-w-[calc(100vw-24px)] sm:w-[340px] sm:max-w-[340px] p-4 pb-5 sm:p-4 sm:pb-5 bg-card border border-border shadow-none font-mono text-xs select-none flex flex-col"
          initialFocus={false}
        >
          <div className="flex flex-col space-y-3 pt-3.5">
            {/* 頂部模式切換器 (Segmented Control) */}
            <div className="grid grid-cols-2 p-1 rounded-lg bg-muted border border-border text-xs font-mono select-none">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setMode('calories');
                }}
                className={cn(
                  "h-7 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center shadow-none",
                  mode === 'calories'
                    ? "bg-background text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('diet.placeholder.modeCalories', '純熱量 (kcal)')}
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setMode('macros');
                  setCalories(Math.round(carbs * 4 + protein * 4 + fat * 9));
                }}
                className={cn(
                  "h-7 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center shadow-none",
                  mode === 'macros'
                    ? "bg-background text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('diet.placeholder.modeMacros', '三大元素 (C/P/F)')}
              </button>
            </div>

            {/* 巨幅 Hero 讀數顯示區 */}
            {mode === 'calories' ? (
              <button
                type="button"
                onClick={(e) => handleOpenKeypad('calories', e.currentTarget)}
                className="w-full py-1.5 flex flex-col items-center justify-center cursor-pointer select-none group focus:outline-hidden"
              >
                <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
                  {calories}
                </div>
                <div className="text-2xs font-mono text-muted-foreground mt-1 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>KILOCALORIES</span>
                  <span className="text-border">·</span>
                  <span className="underline underline-offset-2">
                    {t('diet.placeholder.tapToEdit', '點擊修改')}
                  </span>
                </div>
              </button>
            ) : (
              <div className="w-full py-1.5 flex flex-col items-center justify-center select-none">
                <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight text-foreground">
                  {calories}
                </div>
                <div className="text-2xs font-mono text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                  <span className="text-carbs font-mono">C {carbs}g</span>
                  <span className="text-border">·</span>
                  <span className="text-protein font-mono">P {protein}g</span>
                  <span className="text-border">·</span>
                  <span className="text-fat font-mono">F {fat}g</span>
                </div>
              </div>
            )}

            {/* 純熱量模式 (mode === 'calories') */}
            {mode === 'calories' && (
              <div className="space-y-3">
                {/* 標尺與滑塊容器 */}
                <div className="border border-border rounded-lg bg-card p-3 flex flex-col gap-2.5">
                  {/* 原生極簡 Range Slider */}
                  <input
                    type="range"
                    min={100}
                    max={1500}
                    step={25}
                    value={Math.min(1500, Math.max(100, calories))}
                    onChange={(e) => {
                      setCalories(Number(e.target.value));
                      triggerHaptic('selection');
                    }}
                    className="precision-slider w-full cursor-pointer"
                    aria-label={t('diet.calories', '熱量')}
                  />

                  {/* 刻度行 (Ticks Row) */}
                  <div className="text-[9px] font-mono text-muted-foreground flex justify-between px-0.5 select-none">
                    <span>100</span>
                    <span>300</span>
                    <span>500</span>
                    <span>800</span>
                    <span>1200</span>
                    <span>1500</span>
                  </div>

                  {/* 微步進按鈕行 (Steppers Row) */}
                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleStepCalories(-50)}
                      className="h-7 rounded-md border border-border bg-background hover:bg-hover active:scale-95 transition-all text-xs font-mono font-medium text-foreground flex items-center justify-center cursor-pointer select-none shadow-none"
                    >
                      ‹ -50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepCalories(-10)}
                      className="h-7 rounded-md border border-border bg-background hover:bg-hover active:scale-95 transition-all text-xs font-mono font-medium text-foreground flex items-center justify-center cursor-pointer select-none shadow-none"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepCalories(10)}
                      className="h-7 rounded-md border border-border bg-background hover:bg-hover active:scale-95 transition-all text-xs font-mono font-medium text-foreground flex items-center justify-center cursor-pointer select-none shadow-none"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepCalories(50)}
                      className="h-7 rounded-md border border-border bg-background hover:bg-hover active:scale-95 transition-all text-xs font-mono font-medium text-foreground flex items-center justify-center cursor-pointer select-none shadow-none"
                    >
                      +50 ›
                    </button>
                  </div>
                </div>

                {/* 快速情境膠囊行 (Preset Pills) */}
                <div className="grid grid-cols-4 gap-1.5">
                  {PRESET_CALORIES.map((preset) => (
                    <button
                      key={preset.kcal}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setCalories(preset.kcal);
                      }}
                      className={cn(
                        "py-1.5 px-1 rounded-lg border font-mono text-xs flex flex-col items-center justify-center transition-colors cursor-pointer select-none shadow-none",
                        calories === preset.kcal
                          ? "border-foreground bg-foreground text-background font-semibold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-hover"
                      )}
                    >
                      <span className="font-bold leading-tight">{preset.kcal}</span>
                      <span className="text-[10px] leading-tight opacity-80 truncate">
                        {t(preset.labelKey, preset.defaultLabel)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 三大元素模式 (mode === 'macros'，嚴格遵守 Rule 20: 碳水 C -> 蛋白質 P -> 脂肪 F) */}
            {mode === 'macros' && (
              <div className="space-y-2">
                {/* 1. 碳水化合物 (C) */}
                <div className="border border-border rounded-lg bg-card p-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-carbs font-mono tracking-wide">
                      {t('diet.macroMicro.carbs', '碳水')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenKeypad('carbs', e.currentTarget)}
                      className="h-6 px-2 rounded-md border border-border bg-background hover:bg-hover active:bg-muted/40 text-foreground font-mono text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-none select-none"
                    >
                      <span>{carbs} g</span>
                      <span className="text-muted-foreground text-[10px]">›</span>
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={250}
                    step={5}
                    value={carbs}
                    onChange={(e) => {
                      handleMacrosChange(Number(e.target.value), protein, fat);
                      triggerHaptic('selection');
                    }}
                    className="precision-slider precision-slider-carbs w-full cursor-pointer"
                    aria-label={t('diet.macroMicro.carbs', '碳水')}
                  />
                  <div className="text-[9px] font-mono text-muted-foreground flex justify-between px-0.5 select-none">
                    <span>0g</span>
                    <span>250g</span>
                  </div>
                </div>

                {/* 2. 蛋白質 (P) */}
                <div className="border border-border rounded-lg bg-card p-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-protein font-mono tracking-wide">
                      {t('diet.macroMicro.protein', '蛋白質')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenKeypad('protein', e.currentTarget)}
                      className="h-6 px-2 rounded-md border border-border bg-background hover:bg-hover active:bg-muted/40 text-foreground font-mono text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-none select-none"
                    >
                      <span>{protein} g</span>
                      <span className="text-muted-foreground text-[10px]">›</span>
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={protein}
                    onChange={(e) => {
                      handleMacrosChange(carbs, Number(e.target.value), fat);
                      triggerHaptic('selection');
                    }}
                    className="precision-slider precision-slider-protein w-full cursor-pointer"
                    aria-label={t('diet.macroMicro.protein', '蛋白質')}
                  />
                  <div className="text-[9px] font-mono text-muted-foreground flex justify-between px-0.5 select-none">
                    <span>0g</span>
                    <span>200g</span>
                  </div>
                </div>

                {/* 3. 脂肪 (F) */}
                <div className="border border-border rounded-lg bg-card p-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-fat font-mono tracking-wide">
                      {t('diet.macroMicro.fat', '脂肪')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenKeypad('fat', e.currentTarget)}
                      className="h-6 px-2 rounded-md border border-border bg-background hover:bg-hover active:bg-muted/40 text-foreground font-mono text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-none select-none"
                    >
                      <span>{fat} g</span>
                      <span className="text-muted-foreground text-[10px]">›</span>
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={2}
                    value={fat}
                    onChange={(e) => {
                      handleMacrosChange(carbs, protein, Number(e.target.value));
                      triggerHaptic('selection');
                    }}
                    className="precision-slider precision-slider-fat w-full cursor-pointer"
                    aria-label={t('diet.macroMicro.fat', '脂肪')}
                  />
                  <div className="text-[9px] font-mono text-muted-foreground flex justify-between px-0.5 select-none">
                    <span>0g</span>
                    <span>120g</span>
                  </div>
                </div>

                {/* 底部 HUD 公式條 */}
                <div className="p-2 rounded-lg border border-border bg-muted/40 font-mono text-[11px] text-muted-foreground flex items-center justify-between select-none">
                  <span className="truncate">
                    {carbs}×4 + {protein}×4 + {fat}×9
                  </span>
                  <span className="font-bold text-foreground shrink-0 text-xs pl-2">
                    = {calories} kcal
                  </span>
                </div>
              </div>
            )}

            {/* 底部備註輸入框 */}
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder={t('diet.placeholder.namePlaceholder', '備註（如外食火鍋，選填）')}
              className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-foreground shadow-none"
            />

            {/* 若為編輯已存在條目，在備註下方渲染 HoldToDeleteButton */}
            {initialData?.id && onDelete && (
              <HoldToDeleteButton
                onConfirm={handleDelete}
                disabled={isSubmitting}
                text={t('common.delete', '刪除')}
              />
            )}
          </div>
        </PrecisionDialogContent>
      </Dialog>

      {/* 次級懸浮鍵盤（平級兄弟節點，層級高於主彈窗） */}
      {keypadTarget && (
        <NumericKeypadDialog
          open={Boolean(keypadTarget)}
          onOpenChange={(kOpen) => {
            if (!kOpen) setKeypadTarget(null);
          }}
          title={getKeypadProps().title}
          value={getKeypadProps().value}
          unit={getKeypadProps().unit}
          allowDecimals={getKeypadProps().allowDecimals}
          maxDecimals={1}
          anchorEl={keypadAnchorRef.current}
          onLiveChange={handleKeypadLiveChange}
          onConfirm={handleKeypadConfirm}
          onCancel={() => setKeypadTarget(null)}
        />
      )}
    </>
  );
}
