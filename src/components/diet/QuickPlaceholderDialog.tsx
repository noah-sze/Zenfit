import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { HoldToDeleteButton } from '@/components/ui/HoldToDeleteButton';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn, formatDisplayAmount } from '@/lib/utils';
import { db } from '@/services/db/db';
import {
  getInMemoryDailyDietLogsCache,
  setInMemoryDailyDietLogsCache,
} from '@/hooks/useFoodLogs';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy } from '@/utils/unitMath';
import { matchesAutocomplete } from '@/utils/multilingualSearch';
import type { MealType } from '@/types';
import {
  type DiningScenarioId,
  type DiningScenario,
  DINING_SCENARIOS,
  inferDiningScenario,
  resolvePlaceholderDisplayName,
} from '@/utils/foodNaming';

export {
  type DiningScenarioId,
  type DiningScenario,
  DINING_SCENARIOS,
  inferDiningScenario,
  resolvePlaceholderDisplayName,
};

export interface QuickPlaceholderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetMealType: MealType;
  targetDate: string;
  onConfirm: (data: {
    scenario: DiningScenarioId;
    customTitle?: string;
    calories: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    foodName?: string;
  }) => Promise<void>;
  initialData?: {
    id?: string;
    scenario?: string;
    customTitle?: string;
    foodName?: string;
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  } | null;
  onDelete?: (id: string) => Promise<void>;
}

type EstimateKeypadField = 'calories' | 'carbs' | 'protein' | 'fat';

interface MacroSnapshot {
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  calories: number;
}

interface ActiveKeypadState {
  field: EstimateKeypadField;
  anchorEl: HTMLElement | null;
  snapshot: MacroSnapshot;
}

interface HistoricalEstimateItem {
  title: string;
  calories: number;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  updatedAt: number;
}

const STEP_OPTIONS = [-100, -50, 50, 100];

const round1 = (val: number) => Math.round(val * 10) / 10;

function calcCaloriesFromMacros(
  carbs: number | null,
  protein: number | null,
  fat: number | null
): number {
  return Math.round((carbs || 0) * 4 + (protein || 0) * 4 + (fat || 0) * 9);
}

function scaleMacrosByCalories(snapshot: MacroSnapshot, targetCalories: number): MacroSnapshot {
  const safeCalories = Math.max(0, Math.round(targetCalories));
  const baseCalories = calcCaloriesFromMacros(snapshot.carbs, snapshot.protein, snapshot.fat);
  if (baseCalories <= 0) {
    return { ...snapshot, calories: safeCalories };
  }
  const ratio = safeCalories / baseCalories;
  return {
    carbs: snapshot.carbs !== null && snapshot.carbs > 0 ? round1(snapshot.carbs * ratio) : snapshot.carbs,
    protein:
      snapshot.protein !== null && snapshot.protein > 0
        ? round1(snapshot.protein * ratio)
        : snapshot.protein,
    fat: snapshot.fat !== null && snapshot.fat > 0 ? round1(snapshot.fat * ratio) : snapshot.fat,
    calories: safeCalories,
  };
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
  const { energyUnit } = useUnitPreferences();

  const [carbs, setCarbs] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);
  const [calories, setCalories] = useState<number>(0);
  const [customTitle, setCustomTitle] = useState('');
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [noteHighlightIdx, setNoteHighlightIdx] = useState(-1);
  const [noteInputEl, setNoteInputEl] = useState<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeKeypad, setActiveKeypad] = useState<ActiveKeypadState | null>(null);

  // 讀取歷史飲食日誌中的估算紀錄（具記憶體快取第 0 幀同步注水）
  const liveDailyLogs = useLiveQuery(async () => {
    const logs = await db.daily_diet_logs.toArray();
    setInMemoryDailyDietLogsCache(logs);
    return logs;
  }, []);
  const allDailyLogs = liveDailyLogs ?? getInMemoryDailyDietLogsCache() ?? [];

  const historicalEstimates = useMemo<HistoricalEstimateItem[]>(() => {
    const defaultTitle = t('diet.placeholder.defaultName', '快速估算');
    const dedupMap = new Map<string, HistoricalEstimateItem>();

    for (const dailyLog of allDailyLogs) {
      for (const entry of dailyLog.entries || []) {
        if (entry.entryType !== 'estimate' && !entry.isPlaceholder) continue;
        const resolvedTitle = resolvePlaceholderDisplayName(entry, t).trim();
        if (!resolvedTitle || resolvedTitle === defaultTitle) continue;

        const c = typeof entry.carbs === 'number' && entry.carbs > 0 ? round1(entry.carbs) : null;
        const p =
          typeof entry.protein === 'number' && entry.protein > 0 ? round1(entry.protein) : null;
        const f = typeof entry.fat === 'number' && entry.fat > 0 ? round1(entry.fat) : null;
        const cal =
          typeof entry.calories === 'number' && entry.calories > 0
            ? Math.round(entry.calories)
            : calcCaloriesFromMacros(c, p, f);
        if (cal <= 0 || (c === null && p === null && f === null)) continue;

        const ts = entry.updatedAt || entry.createdAt || dailyLog.updatedAt || 0;
        const key = resolvedTitle.toLowerCase();
        const existing = dedupMap.get(key);
        if (!existing || ts >= existing.updatedAt) {
          dedupMap.set(key, {
            title: resolvedTitle,
            calories: cal,
            carbs: c,
            protein: p,
            fat: f,
            updatedAt: ts,
          });
        }
      }
    }

    return Array.from(dedupMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [allDailyLogs, t]);

  const noteSuggestions = useMemo(() => {
    const q = customTitle.trim();
    if (!q) return historicalEstimates.slice(0, 8);
    const matched = historicalEstimates.filter((item) =>
      matchesAutocomplete(q, item.title)
    );
    if (matched.length === 1 && matched[0].title.toLowerCase() === q.toLowerCase()) {
      return [];
    }
    return matched.slice(0, 12);
  }, [customTitle, historicalEstimates]);

  const showNoteSuggestions = open && isNoteFocused && noteSuggestions.length > 0;

  const applyHistoryEstimate = (item: HistoricalEstimateItem) => {
    triggerHaptic('selection');
    setCustomTitle(item.title);
    setCarbs(item.carbs);
    setProtein(item.protein);
    setFat(item.fat);
    setCalories(item.calories);
    setIsNoteFocused(false);
    setNoteHighlightIdx(-1);
  };

  const hasAnyMacro =
    (carbs !== null && carbs > 0) ||
    (protein !== null && protein > 0) ||
    (fat !== null && fat > 0);

  // 供能比例條計算
  const cKcal = (carbs || 0) * 4;
  const pKcal = (protein || 0) * 4;
  const fKcal = (fat || 0) * 9;
  const totalMacroKcal = cKcal + pKcal + fKcal;
  const carbsPct = totalMacroKcal > 0 ? Math.round((cKcal / totalMacroKcal) * 100) : 0;
  const proteinPct = totalMacroKcal > 0 ? Math.round((pKcal / totalMacroKcal) * 100) : 0;
  const fatPct = totalMacroKcal > 0 ? Math.max(0, 100 - carbsPct - proteinPct) : 0;

  // 開啟時初始化或重置狀態
  useEffect(() => {
    if (!open) return;

    if (initialData) {
      const initCarbs =
        typeof initialData.carbs === 'number' && initialData.carbs > 0 ? initialData.carbs : null;
      const initProtein =
        typeof initialData.protein === 'number' && initialData.protein > 0
          ? initialData.protein
          : null;
      const initFat =
        typeof initialData.fat === 'number' && initialData.fat > 0 ? initialData.fat : null;

      setCarbs(initCarbs);
      setProtein(initProtein);
      setFat(initFat);

      const hasInitMacro = initCarbs !== null || initProtein !== null || initFat !== null;
      setCalories(
        hasInitMacro
          ? initialData.calories ?? calcCaloriesFromMacros(initCarbs, initProtein, initFat)
          : 0
      );

      if (initialData.customTitle?.trim()) {
        setCustomTitle(initialData.customTitle.trim());
      } else if (initialData.foodName) {
        const rawName = initialData.foodName.trim();
        const isGeneric =
          !rawName ||
          rawName === '快速估算' ||
          rawName === '快速粗估' ||
          rawName === 'Quick Estimate' ||
          rawName === t('diet.placeholder.title', '快速估算') ||
          rawName === t('diet.placeholder.defaultName', '快速估算');
        setCustomTitle(isGeneric ? '' : rawName);
      } else {
        setCustomTitle('');
      }
    } else {
      setCarbs(null);
      setProtein(null);
      setFat(null);
      setCalories(0);
      setCustomTitle('');
    }
    setActiveKeypad(null);
  }, [open, initialData, t]);

  const applyMacroField = (field: 'carbs' | 'protein' | 'fat', rawValue: number) => {
    const safe = rawValue > 0 ? round1(rawValue) : null;
    const nextCarbs = field === 'carbs' ? safe : carbs;
    const nextProtein = field === 'protein' ? safe : protein;
    const nextFat = field === 'fat' ? safe : fat;

    setCarbs(nextCarbs);
    setProtein(nextProtein);
    setFat(nextFat);
    setCalories(calcCaloriesFromMacros(nextCarbs, nextProtein, nextFat));
  };

  const applyScaledCalories = (snapshot: MacroSnapshot, targetCalories: number) => {
    const scaled = scaleMacrosByCalories(snapshot, targetCalories);
    setCarbs(scaled.carbs);
    setProtein(scaled.protein);
    setFat(scaled.fat);
    setCalories(scaled.calories);
  };

  const handleStepCalories = (delta: number) => {
    if (!hasAnyMacro) return;
    triggerHaptic('light');
    applyScaledCalories({ carbs, protein, fat, calories }, Math.max(0, calories + delta));
  };

  const openKeypad = (field: EstimateKeypadField, anchorEl: HTMLElement) => {
    if (field === 'calories' && !hasAnyMacro) return;
    triggerHaptic('light');
    setActiveKeypad({
      field,
      anchorEl,
      snapshot: { carbs, protein, fat, calories },
    });
  };

  const handleKeypadLiveChange = (val: number) => {
    if (!activeKeypad) return;
    const safeVal = Number.isNaN(val) ? 0 : Math.max(0, val);
    if (activeKeypad.field === 'calories') {
      applyScaledCalories(activeKeypad.snapshot, safeVal);
    } else {
      applyMacroField(activeKeypad.field, safeVal);
    }
  };

  const handleKeypadConfirm = (val: number) => {
    if (!activeKeypad) return;
    const safeVal = Number.isNaN(val) ? 0 : Math.max(0, val);
    if (activeKeypad.field === 'calories') {
      applyScaledCalories(activeKeypad.snapshot, safeVal);
    } else {
      applyMacroField(activeKeypad.field, safeVal);
    }
    setActiveKeypad(null);
  };

  const handleKeypadCancel = () => {
    if (activeKeypad) {
      const { snapshot } = activeKeypad;
      setCarbs(snapshot.carbs);
      setProtein(snapshot.protein);
      setFat(snapshot.fat);
      setCalories(snapshot.calories);
    }
    setActiveKeypad(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting || !hasAnyMacro || calories <= 0) return;
    setIsSubmitting(true);
    try {
      const finalCustomTitle = customTitle.trim() || undefined;
      const finalCalories = Math.round(calories);
      const finalCarbs = round1(carbs || 0);
      const finalProtein = round1(protein || 0);
      const finalFat = round1(fat || 0);
      const inferredScenario = inferDiningScenario(
        finalCalories,
        finalCarbs,
        finalProtein,
        finalFat
      ).id;

      await onConfirm({
        scenario: inferredScenario,
        customTitle: finalCustomTitle,
        foodName: finalCustomTitle || t('diet.placeholder.defaultName', '快速估算'),
        calories: finalCalories,
        carbs: finalCarbs,
        protein: finalProtein,
        fat: finalFat,
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

  const getKeypadMeta = (field: EstimateKeypadField) => {
    switch (field) {
      case 'calories':
        return {
          title: t('diet.calories', '熱量'),
          value: calories,
          unit: 'kcal',
          allowDecimals: false,
          maxDecimals: 0,
          colorClass: 'text-calories',
        };
      case 'carbs':
        return {
          title: t('diet.carbs', '碳水化合物'),
          value: carbs ?? 0,
          unit: 'g',
          allowDecimals: true,
          maxDecimals: 1,
          colorClass: 'text-carbs',
        };
      case 'protein':
        return {
          title: t('diet.protein', '蛋白質'),
          value: protein ?? 0,
          unit: 'g',
          allowDecimals: true,
          maxDecimals: 1,
          colorClass: 'text-protein',
        };
      case 'fat':
        return {
          title: t('diet.fat', '脂肪'),
          value: fat ?? 0,
          unit: 'g',
          allowDecimals: true,
          maxDecimals: 1,
          colorClass: 'text-fat',
        };
    }
  };

  const keypadMeta = activeKeypad ? getKeypadMeta(activeKeypad.field) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <PrecisionDialogContent
          title={t('diet.placeholder.title', '快速估算')}
          onSubmit={handleSubmit}
          onClose={() => onOpenChange(false)}
          submitDisabled={isSubmitting || !hasAnyMacro || calories <= 0}
          submitAriaLabel={t('common.save', '儲存')}
          cancelAriaLabel={t('common.cancel', '取消')}
          overlayClassName="z-[70]"
          className="z-[70]"
          initialFocus={false}
        >
          <div className="pt-3.5 space-y-3">
            {/* 1. Hero 熱量讀數（未輸入任一三大元素前鎖定不可調，解鎖後點擊可依比例縮放） */}
            <button
              type="button"
              disabled={!hasAnyMacro}
              onClick={(e) => openKeypad('calories', e.currentTarget)}
              className={cn(
                'w-full pt-2 pb-1 flex flex-col items-center justify-center select-none group focus:outline-hidden',
                hasAnyMacro ? 'cursor-pointer' : 'cursor-not-allowed'
              )}
            >
              <div
                className={cn(
                  'flex items-baseline justify-center gap-1.5 transition-opacity',
                  hasAnyMacro
                    ? 'text-foreground group-hover:opacity-80'
                    : 'text-muted-foreground opacity-45'
                )}
              >
                <span className="text-4xl font-mono font-extrabold tracking-tight tabular-nums">
                  {hasAnyMacro ? calories : 0}
                </span>
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  kcal
                </span>
              </div>

              {/* 動態供能比例條 */}
              <div className="w-full h-1.5 rounded-full bg-track overflow-hidden flex mt-2.5">
                <div
                  className="bg-carbs h-full transition-all duration-200"
                  style={{ width: `${carbsPct}%` }}
                />
                <div
                  className="bg-protein h-full transition-all duration-200"
                  style={{ width: `${proteinPct}%` }}
                />
                <div
                  className="bg-fat h-full transition-all duration-200"
                  style={{ width: `${fatPct}%` }}
                />
              </div>
            </button>

            {/* 2. 等比例熱量步進微調列 */}
            <div className="grid grid-cols-4 gap-1.5">
              {STEP_OPTIONS.map((step) => (
                <button
                  key={step}
                  type="button"
                  disabled={!hasAnyMacro}
                  onClick={() => handleStepCalories(step)}
                  className={cn(
                    'h-7 rounded-md border border-border bg-muted/40 text-xs font-mono font-normal text-foreground flex items-center justify-center transition-all shadow-none select-none',
                    hasAnyMacro
                      ? 'hover:bg-hover hover:border-foreground active:scale-95 cursor-pointer'
                      : 'opacity-35 cursor-not-allowed'
                  )}
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>

            {/* 3. 三大元素標準數字輸入膠囊列表（嚴格固定順序：碳 / 蛋 / 脂） */}
            <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm font-sans">
              {/* 碳水化合物 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-carbs text-xs font-medium">
                  {t('diet.carbs', '碳水化合物')}
                </span>
                <button
                  type="button"
                  onClick={(e) => openKeypad('carbs', e.currentTarget)}
                  className={cn(
                    'h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none',
                    carbs !== null && carbs > 0 ? 'text-carbs' : 'text-muted-foreground'
                  )}
                >
                  <span className={carbs !== null && carbs > 0 ? 'text-carbs font-normal tabular-nums' : 'text-muted-foreground'}>
                    {carbs !== null && carbs > 0 ? formatDisplayAmount(String(carbs)) : '-'}
                  </span>
                  <span className="font-sans text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>

              {/* 蛋白質 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-protein text-xs font-medium">
                  {t('diet.protein', '蛋白質')}
                </span>
                <button
                  type="button"
                  onClick={(e) => openKeypad('protein', e.currentTarget)}
                  className={cn(
                    'h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none',
                    protein !== null && protein > 0 ? 'text-protein' : 'text-muted-foreground'
                  )}
                >
                  <span className={protein !== null && protein > 0 ? 'text-protein font-normal tabular-nums' : 'text-muted-foreground'}>
                    {protein !== null && protein > 0 ? formatDisplayAmount(String(protein)) : '-'}
                  </span>
                  <span className="font-sans text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>

              {/* 脂肪 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-fat text-xs font-medium">
                  {t('diet.fat', '脂肪')}
                </span>
                <button
                  type="button"
                  onClick={(e) => openKeypad('fat', e.currentTarget)}
                  className={cn(
                    'h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none',
                    fat !== null && fat > 0 ? 'text-fat' : 'text-muted-foreground'
                  )}
                >
                  <span className={fat !== null && fat > 0 ? 'text-fat font-normal tabular-nums' : 'text-muted-foreground'}>
                    {fat !== null && fat > 0 ? formatDisplayAmount(String(fat)) : '-'}
                  </span>
                  <span className="font-sans text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>
            </div>

            {/* 4. 備註輸入框（支援歷史估算聯想搜索與快速帶入） */}
            <input
              ref={setNoteInputEl}
              type="text"
              value={customTitle}
              onFocus={() => {
                setIsNoteFocused(true);
                setNoteHighlightIdx(-1);
              }}
              onBlur={() => setIsNoteFocused(false)}
              onChange={(e) => {
                setCustomTitle(e.target.value);
                setIsNoteFocused(true);
                setNoteHighlightIdx(-1);
              }}
              onKeyDown={(e) => {
                if (!showNoteSuggestions) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setNoteHighlightIdx((prev) =>
                    prev < noteSuggestions.length - 1 ? prev + 1 : 0
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setNoteHighlightIdx((prev) =>
                    prev > 0 ? prev - 1 : noteSuggestions.length - 1
                  );
                } else if (e.key === 'Enter' && noteHighlightIdx >= 0) {
                  e.preventDefault();
                  const chosen = noteSuggestions[noteHighlightIdx];
                  if (chosen) applyHistoryEstimate(chosen);
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setIsNoteFocused(false);
                  setNoteHighlightIdx(-1);
                }
              }}
              placeholder={t('diet.placeholder.namePlaceholder', '備註')}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-sans text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-foreground shadow-none"
            />

            {/* 編輯模式長按刪除按鈕 */}
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
      {activeKeypad && keypadMeta && (
        <NumericKeypadDialog
          open={!!activeKeypad}
          onOpenChange={(isOpen) => {
            if (!isOpen) setActiveKeypad(null);
          }}
          zIndex={80}
          anchorEl={activeKeypad.anchorEl}
          title={keypadMeta.title}
          value={keypadMeta.value}
          unit={keypadMeta.unit}
          allowDecimals={keypadMeta.allowDecimals}
          maxDecimals={keypadMeta.maxDecimals}
          valueClassName={keypadMeta.colorClass}
          titleClassName={keypadMeta.colorClass}
          onLiveChange={handleKeypadLiveChange}
          onConfirm={handleKeypadConfirm}
          onCancel={handleKeypadCancel}
        />
      )}

      {/* 歷史估算聯想選擇浮層 (平級兄弟節點，不撐大彈窗高度且不搶奪輸入焦點) */}
      <Popover
        open={showNoteSuggestions}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setIsNoteFocused(false);
            setNoteHighlightIdx(-1);
          }
        }}
      >
        {noteInputEl && showNoteSuggestions && (
          <PopoverContent
            anchor={noteInputEl}
            side="bottom"
            align="center"
            sideOffset={6}
            initialFocus={false}
            finalFocus={false}
            positionerClassName="z-[95]"
            className="w-[268px] p-0 gap-0 divide-y divide-border max-h-48 overflow-y-auto no-scrollbar rounded-lg border border-border bg-popover text-popover-foreground shadow-none"
          >
            {noteSuggestions.map((item, idx) => (
              <button
                key={item.title}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyHistoryEstimate(item)}
                className={cn(
                  'w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer',
                  idx === noteHighlightIdx ? 'bg-hover' : 'hover:bg-hover'
                )}
              >
                <span className="text-xs font-sans font-medium text-foreground truncate min-w-0">
                  {item.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                  <span className="text-muted-foreground font-normal tabular-nums">
                    {formatEnergy(item.calories, energyUnit).formatted}
                  </span>
                  <span className="h-2.5 w-px bg-border" aria-hidden="true" />
                  <span className="text-carbs tabular-nums">{item.carbs ?? 0}</span>
                  <span className="text-border">/</span>
                  <span className="text-protein tabular-nums">{item.protein ?? 0}</span>
                  <span className="text-border">/</span>
                  <span className="text-fat tabular-nums">{item.fat ?? 0}</span>
                </div>
              </button>
            ))}
          </PopoverContent>
        )}
      </Popover>
    </>
  );
}
