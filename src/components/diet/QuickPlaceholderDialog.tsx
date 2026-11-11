import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

export type DiningScenarioId =
  | 'balanced'
  | 'bento'
  | 'fastfood'
  | 'hotpot'
  | 'bbq'
  | 'sushi'
  | 'pizza'
  | 'salad'
  | 'party'
  | 'dessert';

export interface DiningScenario {
  id: DiningScenarioId;
  nameKey: string;
  defaultName: string;
  ratios: {
    carbs: number;   // 4 kcal/g
    protein: number; // 4 kcal/g
    fat: number;     // 9 kcal/g
  };
}

export const DINING_SCENARIOS: Record<DiningScenarioId, DiningScenario> = {
  balanced: {
    id: 'balanced',
    nameKey: 'diet.placeholder.scenarioBalanced',
    defaultName: '常規',
    ratios: { carbs: 0.45, protein: 0.25, fat: 0.30 },
  },
  bento: {
    id: 'bento',
    nameKey: 'diet.placeholder.scenarioBento',
    defaultName: '便當',
    ratios: { carbs: 0.55, protein: 0.15, fat: 0.30 },
  },
  fastfood: {
    id: 'fastfood',
    nameKey: 'diet.placeholder.scenarioFastfood',
    defaultName: '快餐',
    ratios: { carbs: 0.40, protein: 0.15, fat: 0.45 },
  },
  hotpot: {
    id: 'hotpot',
    nameKey: 'diet.placeholder.scenarioHotpot',
    defaultName: '火鍋',
    ratios: { carbs: 0.10, protein: 0.25, fat: 0.65 },
  },
  bbq: {
    id: 'bbq',
    nameKey: 'diet.placeholder.scenarioBbq',
    defaultName: '燒肉',
    ratios: { carbs: 0.10, protein: 0.35, fat: 0.55 },
  },
  sushi: {
    id: 'sushi',
    nameKey: 'diet.placeholder.scenarioSushi',
    defaultName: '壽司',
    ratios: { carbs: 0.60, protein: 0.25, fat: 0.15 },
  },
  pizza: {
    id: 'pizza',
    nameKey: 'diet.placeholder.scenarioPizza',
    defaultName: '披薩',
    ratios: { carbs: 0.50, protein: 0.15, fat: 0.35 },
  },
  salad: {
    id: 'salad',
    nameKey: 'diet.placeholder.scenarioSalad',
    defaultName: '輕食',
    ratios: { carbs: 0.45, protein: 0.40, fat: 0.15 },
  },
  party: {
    id: 'party',
    nameKey: 'diet.placeholder.scenarioParty',
    defaultName: '酒局',
    ratios: { carbs: 0.50, protein: 0.10, fat: 0.40 },
  },
  dessert: {
    id: 'dessert',
    nameKey: 'diet.placeholder.scenarioDessert',
    defaultName: '甜點',
    ratios: { carbs: 0.65, protein: 0.05, fat: 0.30 },
  },
};

const PRESET_CALORIES = [
  { kcal: 300, labelKey: 'diet.placeholder.presetLight', defaultLabel: '輕食' },
  { kcal: 500, labelKey: 'diet.placeholder.presetRegular', defaultLabel: '常規' },
  { kcal: 800, labelKey: 'diet.placeholder.presetFeast', defaultLabel: '大餐' },
  { kcal: 1200, labelKey: 'diet.placeholder.presetParty', defaultLabel: '應酬' },
];

const STEP_OPTIONS = [-100, -50, 50, 100];

/**
 * 依據宏量供能比推斷最接近的外食情境
 */
export function inferDiningScenario(
  _calories?: number,
  carbs?: number,
  protein?: number,
  fat?: number
): DiningScenario {
  const cKcal = (carbs || 0) * 4;
  const pKcal = (protein || 0) * 4;
  const fKcal = (fat || 0) * 9;
  const total = cKcal + pKcal + fKcal;

  if (total <= 0) {
    return DINING_SCENARIOS.balanced;
  }

  const cRatio = cKcal / total;
  const pRatio = pKcal / total;
  const fRatio = fKcal / total;

  let bestScenario = DINING_SCENARIOS.balanced;
  let minDiff = Infinity;

  for (const sc of Object.values(DINING_SCENARIOS)) {
    const diff =
      Math.pow(cRatio - sc.ratios.carbs, 2) +
      Math.pow(pRatio - sc.ratios.protein, 2) +
      Math.pow(fRatio - sc.ratios.fat, 2);
    if (diff < minDiff) {
      minDiff = diff;
      bestScenario = sc;
    }
  }

  return bestScenario;
}

/**
 * 解析飲食佔位條目的標題顯示名稱：
 * 針對「快速估算」或「快速粗估」舊條目自動推斷情境（如「火鍋」），若為自訂備註（如「海底撈」）則保留原名稱
 */
export function resolvePlaceholderDisplayName(
  item: {
    foodName?: string;
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  },
  t: TFunction
): string {
  const rawName = item.foodName?.trim() || '';
  const isLegacy =
    !rawName ||
    rawName === '快速估算' ||
    rawName === '快速粗估' ||
    rawName === 'Quick Estimate' ||
    rawName === t('diet.placeholder.title', '快速估算') ||
    rawName === t('diet.placeholder.defaultName', '快速估算');

  if (isLegacy) {
    const scenario = inferDiningScenario(
      item.calories || 0,
      item.carbs,
      item.protein,
      item.fat
    );
    return t(scenario.nameKey, scenario.defaultName);
  }

  const matchingScenario = Object.values(DINING_SCENARIOS).find(
    (sc) =>
      sc.id === rawName ||
      sc.defaultName === rawName ||
      t(sc.nameKey, sc.defaultName) === rawName
  );
  if (matchingScenario) {
    return t(matchingScenario.nameKey, matchingScenario.defaultName);
  }

  return rawName;
}

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

  const [scenario, setScenario] = useState<DiningScenarioId>('balanced');
  const [calories, setCalories] = useState(500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keypad
  const [keypadOpen, setKeypadOpen] = useState(false);
  const keypadAnchorRef = useRef<HTMLElement | null>(null);

  // 動態計算宏量營養素（依選定外食情境供能比換算展示）
  const selectedScenario = DINING_SCENARIOS[scenario] || DINING_SCENARIOS.balanced;
  const carbs = Math.round((calories * selectedScenario.ratios.carbs) / 4);
  const protein = Math.round((calories * selectedScenario.ratios.protein) / 4);
  const fat = Math.round((calories * selectedScenario.ratios.fat) / 9);

  // Initialize or reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        const rawName = initialData.foodName?.trim() || '';
        const matchingScenario = Object.values(DINING_SCENARIOS).find(
          (sc) =>
            sc.id === rawName ||
            sc.defaultName === rawName ||
            t(sc.nameKey, sc.defaultName) === rawName
        );

        if (matchingScenario) {
          setScenario(matchingScenario.id);
        } else {
          const inferred = inferDiningScenario(
            initialData.calories ?? 500,
            initialData.carbs,
            initialData.protein,
            initialData.fat
          );
          setScenario(inferred.id);
        }
        setCalories(initialData.calories ?? 500);
      } else {
        setScenario('balanced');
        setCalories(500);
      }
      setKeypadOpen(false);
    }
  }, [open, initialData, t]);

  const handleStepCalories = (delta: number) => {
    triggerHaptic('light');
    setCalories((prev) => Math.min(3000, Math.max(50, prev + delta)));
  };

  const handleOpenKeypad = (anchorEl: HTMLElement) => {
    triggerHaptic('light');
    keypadAnchorRef.current = anchorEl;
    setKeypadOpen(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting || calories <= 0) return;
    setIsSubmitting(true);
    try {
      const finalName = t(selectedScenario.nameKey, selectedScenario.defaultName);
      await onConfirm({
        foodName: finalName,
        calories: Math.round(calories),
        carbs,
        protein,
        fat,
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
          className="z-[70] w-[300px] max-w-[calc(100vw-24px)] sm:w-[300px] sm:max-w-[300px] p-4 pb-5 sm:p-4 sm:pb-5 bg-card border border-border shadow-none font-mono text-xs select-none flex flex-col"
          initialFocus={false}
        >
          <div className="flex flex-col">
            {/* 區塊一：Hero 數值讀數區（上下留白完全一致 py-5） */}
            <button
              type="button"
              onClick={(e) => handleOpenKeypad(e.currentTarget)}
              className="w-full py-5 flex flex-col items-center justify-center cursor-pointer select-none group focus:outline-hidden"
            >
              <div className="flex items-baseline justify-center gap-1.5 text-foreground group-hover:opacity-80 transition-opacity">
                <span className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight">
                  {calories}
                </span>
                <span className="text-sm sm:text-base font-mono font-medium text-muted-foreground">
                  kcal
                </span>
              </div>
              {/* 微型宏量彩色比例條（Mini Macro Bar） */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden flex my-2 border border-border/40">
                <div
                  className="bg-carbs h-full transition-all duration-200"
                  style={{ width: `${Math.round(selectedScenario.ratios.carbs * 100)}%` }}
                />
                <div
                  className="bg-protein h-full transition-all duration-200"
                  style={{ width: `${Math.round(selectedScenario.ratios.protein * 100)}%` }}
                />
                <div
                  className="bg-fat h-full transition-all duration-200"
                  style={{ width: `${Math.round(selectedScenario.ratios.fat * 100)}%` }}
                />
              </div>
              {/* 宏量數值 */}
              <div className="text-2xs font-mono text-muted-foreground flex items-center gap-1.5 font-medium">
                <span className="text-carbs font-mono">{t('diet.macroMicro.carbs', '碳')} {carbs}g</span>
                <span className="text-border">·</span>
                <span className="text-protein font-mono">{t('diet.macroMicro.protein', '蛋')} {protein}g</span>
                <span className="text-border">·</span>
                <span className="text-fat font-mono">{t('diet.macroMicro.fat', '脂')} {fat}g</span>
              </div>
            </button>

            {/* 下方操作區塊（維持緊湊標準 space-y-3） */}
            <div className="flex flex-col space-y-3">
              {/* 方案 1 核心：橫向滑動外食情境藥丸列 */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                {Object.values(DINING_SCENARIOS).map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setScenario(sc.id);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full border text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-none font-sans",
                      scenario === sc.id
                        ? "border-foreground bg-foreground text-background font-semibold"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-hover"
                    )}
                  >
                    {t(sc.nameKey, sc.defaultName)}
                  </button>
                ))}
              </div>

              {/* 區塊二：4 檔等寬情境階梯 */}
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

              {/* 區塊三：單行微步進微調器 */}
              <div className="grid grid-cols-4 gap-1.5">
                {STEP_OPTIONS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleStepCalories(step)}
                    className="h-7 rounded-md border border-border bg-muted/40 hover:bg-hover active:scale-95 text-xs font-mono font-semibold text-foreground flex items-center justify-center transition-all cursor-pointer shadow-none select-none"
                  >
                    {step > 0 ? `+${step}` : step}
                  </button>
                ))}
              </div>

              {/* 編輯模式長按刪除按鈕 */}
              {initialData?.id && onDelete && (
                <HoldToDeleteButton
                  onConfirm={handleDelete}
                  disabled={isSubmitting}
                  text={t('common.delete', '刪除')}
                />
              )}
            </div>
          </div>
        </PrecisionDialogContent>
      </Dialog>

      {/* 次級懸浮鍵盤（平級兄弟節點，層級高於主彈窗） */}
      {keypadOpen && (
        <NumericKeypadDialog
          open={keypadOpen}
          onOpenChange={setKeypadOpen}
          title={t('diet.calories', '熱量')}
          value={calories}
          unit="kcal"
          allowDecimals={false}
          maxDecimals={0}
          anchorEl={keypadAnchorRef.current}
          onLiveChange={(val) => {
            const safeVal = Math.round(Math.max(0, isNaN(val) ? 0 : val));
            setCalories(safeVal);
          }}
          onConfirm={(val) => {
            const safeVal = Math.round(Math.max(0, isNaN(val) ? 0 : val));
            setCalories(safeVal);
            setKeypadOpen(false);
          }}
          onCancel={() => setKeypadOpen(false)}
        />
      )}
    </>
  );
}
