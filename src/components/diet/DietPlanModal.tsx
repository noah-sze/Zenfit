import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, Info } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import {
  calculateMacrosFromSplit,
  calculateBMR,
  calculateTDEE,
  calculateAgeFromBirth,
} from '@/utils/weightMath';
import type { UserProfile, MacroSplit, DietPlan } from '@/types';
import {
  MACRO_SPLIT_TEMPLATES,
  findMatchingTemplate,
  getTemplateDescKey,
  type TemplateId,
} from '@/constants/dietTemplates';

export interface DietPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
  currentPlan?: DietPlan;
  onSavePlan?: (updates: Partial<DietPlan>) => Promise<void>;
  profile: UserProfile;
  onSave?: (updates: Partial<UserProfile>) => Promise<void>;
}

type MacroKey = 'carbs' | 'protein' | 'fat';

export function DietPlanModal({
  isOpen,
  onClose,
  currentPlan,
  onSavePlan,
  profile,
  onSave,
}: DietPlanModalProps) {
  const { t } = useTranslation();

  // 活動係數：依據當日日誌或使用者個人資料繼承，彈窗內不再提供冗餘設置
  const activityLevel = currentPlan?.activityLevel || profile.activityLevel || 1.55;

  // 本地供能比狀態 (嚴格固定順序：碳 C ➔ 蛋 P ➔ 脂 F)
  const [carbsPercent, setCarbsPercent] = useState<number>(40);
  const [proteinPercent, setProteinPercent] = useState<number>(30);
  const [fatPercent, setFatPercent] = useState<number>(30);
  const [template, setTemplate] = useState<TemplateId>('balance');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 數字鍵盤狀態
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [activeKeypadKey, setActiveKeypadKey] = useState<MacroKey | null>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const initialValueRef = useRef<number>(0);
  const isKeypadConfirmedRef = useRef(false);

  // 計算客觀生理常數 (BMR)
  const age = profile.birthDate
    ? calculateAgeFromBirth(profile.birthDate)
    : profile.age || 25;
  const currentBMR = calculateBMR(
    profile.currentWeightKg,
    profile.heightCm,
    profile.gender,
    age
  );

  // 基準目標熱量 (依據 BMR 與當前活動係數動態推算 TDEE)
  const isBinge = activityLevel === 999;
  const targetCaloriesKcal = useMemo(() => {
    if (isBinge) {
      return 9999;
    }
    if (currentBMR > 0 && activityLevel > 0) {
      return calculateTDEE(currentBMR, activityLevel);
    }
    return currentPlan?.caloriesTarget || 2000;
  }, [isBinge, currentBMR, activityLevel, currentPlan?.caloriesTarget]);

  // 初始化讀取使用者或當日既有供能比
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      let split: MacroSplit = currentPlan?.macroSplit || profile.macroSplit || { carbs: 40, protein: 30, fat: 30 };

      // 若 currentPlan 具備克數目標且無明確 macroSplit，反推供能比百分比
      if (
        !currentPlan?.macroSplit &&
        currentPlan &&
        typeof currentPlan.caloriesTarget === 'number' &&
        currentPlan.caloriesTarget > 0 &&
        typeof currentPlan.proteinTarget === 'number' &&
        typeof currentPlan.carbsTarget === 'number' &&
        typeof currentPlan.fatTarget === 'number'
      ) {
        const cKcal = currentPlan.carbsTarget * 4;
        const pKcal = currentPlan.proteinTarget * 4;
        const fKcal = currentPlan.fatTarget * 9;
        const totalKcal = cKcal + pKcal + fKcal;
        if (totalKcal > 0) {
          const cPct = Math.round((cKcal / totalKcal) * 100);
          const pPct = Math.round((pKcal / totalKcal) * 100);
          const fPct = Math.max(0, 100 - cPct - pPct);
          split = { carbs: cPct, protein: pPct, fat: fPct };
        }
      }

      setCarbsPercent(split.carbs);
      setProteinPercent(split.protein);
      setFatPercent(split.fat);

      // 檢查是否符合預設模板
      setTemplate(findMatchingTemplate(split));
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, profile, currentPlan]);

  // 配比總和計算
  const ratioTotal = carbsPercent + proteinPercent + fatPercent;
  const isRatioValid = ratioTotal === 100;

  // 動態推算即時目標克數 (C ➔ P ➔ F 順序)
  const calculatedMacros = useMemo(() => {
    if (isBinge) {
      return { carbsGrams: 999, proteinGrams: 999, fatGrams: 999 };
    }
    return calculateMacrosFromSplit(
      targetCaloriesKcal,
      carbsPercent,
      proteinPercent,
      fatPercent
    );
  }, [isBinge, targetCaloriesKcal, carbsPercent, proteinPercent, fatPercent]);

  // 供能比標尺寬度推算
  const ratioScale = ratioTotal > 100 ? 100 / ratioTotal : 1;
  const carbsBarWidth = Math.min(100, Math.round(carbsPercent * ratioScale));
  const proteinBarWidth = Math.min(100 - carbsBarWidth, Math.round(proteinPercent * ratioScale));
  const fatBarWidth = Math.max(0, 100 - carbsBarWidth - proteinBarWidth);

  // 切換供能比模板
  const handleTemplateChange = (val: string) => {
    const tpl = val as TemplateId;
    setTemplate(tpl);
    triggerHaptic('selection');

    const matched = MACRO_SPLIT_TEMPLATES.find((item) => item.id === tpl);
    if (matched) {
      setCarbsPercent(matched.split.carbs);
      setProteinPercent(matched.split.protein);
      setFatPercent(matched.split.fat);
    }
  };

  // 模板顯示標籤
  const getTemplateLabel = (tpl: TemplateId) => {
    const matched = MACRO_SPLIT_TEMPLATES.find((item) => item.id === tpl);
    if (matched) {
      return t(matched.labelKey);
    }
    return t('dietPlan.customTemplate', '自定義');
  };

  // 開啟數字鍵盤
  const handleOpenKeypad = (macro: MacroKey, el: HTMLElement) => {
    if (template !== 'custom') return;
    triggerHaptic('selection');
    setActiveKeypadKey(macro);
    anchorElRef.current = el;

    const curVal = macro === 'carbs' ? carbsPercent : macro === 'protein' ? proteinPercent : fatPercent;
    initialValueRef.current = curVal;
    isKeypadConfirmedRef.current = false;
    setIsKeypadOpen(true);
  };

  // 鍵盤即時鏡像聯動
  const handleKeypadLiveChange = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    if (activeKeypadKey === 'carbs') {
      setCarbsPercent(clamped);
    } else if (activeKeypadKey === 'protein') {
      setProteinPercent(clamped);
    } else if (activeKeypadKey === 'fat') {
      setFatPercent(clamped);
    }
  }, [activeKeypadKey]);

  // 鍵盤確認提交
  const handleKeypadConfirm = useCallback((val: number) => {
    isKeypadConfirmedRef.current = true;
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    if (activeKeypadKey === 'carbs') {
      setCarbsPercent(clamped);
    } else if (activeKeypadKey === 'protein') {
      setProteinPercent(clamped);
    } else if (activeKeypadKey === 'fat') {
      setFatPercent(clamped);
    }
    setIsKeypadOpen(false);
    setActiveKeypadKey(null);
  }, [activeKeypadKey]);

  // 鍵盤取消
  const handleKeypadCancel = useCallback(() => {
    if (isKeypadConfirmedRef.current) return;
    if (activeKeypadKey === 'carbs') {
      setCarbsPercent(initialValueRef.current);
    } else if (activeKeypadKey === 'protein') {
      setProteinPercent(initialValueRef.current);
    } else if (activeKeypadKey === 'fat') {
      setFatPercent(initialValueRef.current);
    }
    setIsKeypadOpen(false);
    setActiveKeypadKey(null);
  }, [activeKeypadKey]);

  // 取得當前鍵盤標題
  const getKeypadTitle = (key: MacroKey | null) => {
    switch (key) {
      case 'carbs':
        return t('dietPlan.carbs', '碳水化合物');
      case 'protein':
        return t('dietPlan.protein', '蛋白質');
      case 'fat':
        return t('dietPlan.fat', '脂肪');
      default:
        return '';
    }
  };

  // 取得當前鍵盤數值
  const getKeypadCurrentValue = (key: MacroKey | null) => {
    switch (key) {
      case 'carbs':
        return carbsPercent;
      case 'protein':
        return proteinPercent;
      case 'fat':
        return fatPercent;
      default:
        return 0;
    }
  };

  // 主彈窗開關保護
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isKeypadOpen) {
      return;
    }
    if (!nextOpen) {
      onClose();
    }
  };

  // 儲存設定 (傳遞當日活動係數、供能比、推算目標熱量與三大營養素)
  const handleSubmit = async () => {
    if (!isRatioValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newSplit: MacroSplit = {
        carbs: carbsPercent,
        protein: proteinPercent,
        fat: fatPercent,
      };

      if (onSavePlan) {
        await onSavePlan({
          activityLevel,
          macroSplit: newSplit,
        });
      }

      if (onSave) {
        await onSave({
          activityLevel,
          macroSplit: newSplit,
        });
      }

      triggerHaptic('success');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <PrecisionDialogContent
          title={t('dietPlan.title', '供能比')}
          onSubmit={handleSubmit}
          submitDisabled={!isRatioValid || isSubmitting}
          submitAriaLabel={t('common.save', '儲存')}
          cancelAriaLabel={t('common.cancel', '取消')}
          overlayClassName="z-[60]"
          className="z-[60]"
          initialFocus={false}
        >
          {/* 主容器：pt-3.5 space-y-3 嚴格縱向律動 */}
          <div className="flex flex-col space-y-3 pt-3.5">
            {/* 單行 Usage Table：供能比比例選項 (統一使用 Select 下拉選單) */}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="h-10 px-3 flex items-center justify-between">
                <span className="text-xs font-normal text-foreground">
                  {t('dietPlan.ratio', '比例')}
                </span>
                <Select
                  value={template}
                  onValueChange={(val) => val && handleTemplateChange(val)}
                >
                  <SelectTrigger
                    size="custom"
                    className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <SelectValue className="flex-none text-right">
                      {getTemplateLabel(template)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-48">
                    {MACRO_SPLIT_TEMPLATES.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {t(item.labelKey)}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      {t('dietPlan.customTemplate', '自定義')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 供能比卡片模組：能量標尺 + 3 欄並列 (嚴格固定順序：碳 ➔ 蛋 ➔ 脂) + 重構配比總和 */}
            <div className="border border-border rounded-lg bg-card overflow-hidden select-none">
              {/* 頂部能量彩色標尺 (Ratio Bar) */}
              <div className="h-1 w-full bg-track flex overflow-hidden">
                <div
                  style={{ width: `${carbsBarWidth}%` }}
                  className="h-full bg-carbs transition-all duration-200"
                />
                <div
                  style={{ width: `${proteinBarWidth}%` }}
                  className="h-full bg-protein transition-all duration-200"
                />
                <div
                  style={{ width: `${fatBarWidth}%` }}
                  className="h-full bg-fat transition-all duration-200"
                />
              </div>

              {/* 3 欄並列：碳水化合物 (C) ➔ 蛋白質 (P) ➔ 脂肪 (F) */}
              <div className="grid grid-cols-3 divide-x divide-border">
                {/* 1. 碳水化合物 (C) */}
                <div className="p-2.5 flex flex-col items-center justify-center text-center gap-1.5 hover:bg-hover/10 transition-colors">
                  <span className="text-[11px] font-bold text-carbs tracking-tight truncate max-w-full">
                    {t('dietPlan.carbs', '碳水化合物')}
                  </span>

                  {template === 'custom' ? (
                    <button
                      type="button"
                      onClick={(e) => handleOpenKeypad('carbs', e.currentTarget)}
                      className="h-7 px-2 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-0.5 transition-colors cursor-pointer active:scale-95 select-none"
                      title={t('diet.clickToEnter', '點擊輸入數值')}
                    >
                      <span className="font-bold text-foreground">{carbsPercent}</span>
                      <span className="text-muted-foreground text-2xs">%</span>
                      <ChevronRight className="size-2.5 text-muted-foreground/60 shrink-0" />
                    </button>
                  ) : (
                    <div className="h-7 flex items-baseline justify-center gap-0.5 select-none">
                      <span className="font-mono text-xs font-bold text-foreground">{carbsPercent}</span>
                      <span className="text-muted-foreground text-2xs font-mono">%</span>
                    </div>
                  )}

                  <span className="text-2xs font-mono text-muted-foreground truncate max-w-full">
                    {calculatedMacros.carbsGrams}g
                  </span>
                </div>

                {/* 2. 蛋白質 (P) */}
                <div className="p-2.5 flex flex-col items-center justify-center text-center gap-1.5 hover:bg-hover/10 transition-colors">
                  <span className="text-[11px] font-bold text-protein tracking-tight truncate max-w-full">
                    {t('dietPlan.protein', '蛋白質')}
                  </span>

                  {template === 'custom' ? (
                    <button
                      type="button"
                      onClick={(e) => handleOpenKeypad('protein', e.currentTarget)}
                      className="h-7 px-2 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-0.5 transition-colors cursor-pointer active:scale-95 select-none"
                      title={t('diet.clickToEnter', '點擊輸入數值')}
                    >
                      <span className="font-bold text-foreground">{proteinPercent}</span>
                      <span className="text-muted-foreground text-2xs">%</span>
                      <ChevronRight className="size-2.5 text-muted-foreground/60 shrink-0" />
                    </button>
                  ) : (
                    <div className="h-7 flex items-baseline justify-center gap-0.5 select-none">
                      <span className="font-mono text-xs font-bold text-foreground">{proteinPercent}</span>
                      <span className="text-muted-foreground text-2xs font-mono">%</span>
                    </div>
                  )}

                  <span className="text-2xs font-mono text-muted-foreground truncate max-w-full">
                    {calculatedMacros.proteinGrams}g
                  </span>
                </div>

                {/* 3. 脂肪 (F) */}
                <div className="p-2.5 flex flex-col items-center justify-center text-center gap-1.5 hover:bg-hover/10 transition-colors">
                  <span className="text-[11px] font-bold text-fat tracking-tight truncate max-w-full">
                    {t('dietPlan.fat', '脂肪')}
                  </span>

                  {template === 'custom' ? (
                    <button
                      type="button"
                      onClick={(e) => handleOpenKeypad('fat', e.currentTarget)}
                      className="h-7 px-2 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-0.5 transition-colors cursor-pointer active:scale-95 select-none"
                      title={t('diet.clickToEnter', '點擊輸入數值')}
                    >
                      <span className="font-bold text-foreground">{fatPercent}</span>
                      <span className="text-muted-foreground text-2xs">%</span>
                      <ChevronRight className="size-2.5 text-muted-foreground/60 shrink-0" />
                    </button>
                  ) : (
                    <div className="h-7 flex items-baseline justify-center gap-0.5 select-none">
                      <span className="font-mono text-xs font-bold text-foreground">{fatPercent}</span>
                      <span className="text-muted-foreground text-2xs font-mono">%</span>
                    </div>
                  )}

                  <span className="text-2xs font-mono text-muted-foreground truncate max-w-full">
                    {calculatedMacros.fatGrams}g
                  </span>
                </div>
              </div>

              {/* 底部總和狀態行 (恆定高度 h-8，嚴格防抖無抖動) */}
              <div className="h-8 px-3 bg-muted/20 border-t border-border flex items-center justify-between text-2xs font-mono">
                <span className="text-muted-foreground font-sans">
                  {t('dietPlan.ratioTotal', '配比總和')}
                </span>
                <span
                  className={
                    isRatioValid
                      ? 'text-muted-foreground font-bold'
                      : 'text-destructive font-bold'
                  }
                >
                  {ratioTotal}% {isRatioValid ? '' : `(${ratioTotal > 100 ? `+${ratioTotal - 100}%` : `-${100 - ratioTotal}%`})`}
                </span>
              </div>
            </div>

            {/* 供能比方案說明與描述卡片 */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 select-none">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                <Info className="size-3.5 text-muted-foreground stroke-[2] shrink-0" />
                <span>{getTemplateLabel(template)}</span>
              </div>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                {t(getTemplateDescKey(template))}
              </p>
            </div>
          </div>
        </PrecisionDialogContent>
      </Dialog>

      {/* 次級懸浮數字鍵盤 (平級兄弟節點聲明，層級 zIndex={70} 高於主彈窗) */}
      {isKeypadOpen && (
        <NumericKeypadDialog
          open={isKeypadOpen}
          onOpenChange={(kOpen) => {
            if (!kOpen) {
              if (!isKeypadConfirmedRef.current) {
                handleKeypadCancel();
              } else {
                setIsKeypadOpen(false);
                setActiveKeypadKey(null);
              }
            }
          }}
          title={getKeypadTitle(activeKeypadKey)}
          value={getKeypadCurrentValue(activeKeypadKey)}
          unit="%"
          allowDecimals={false}
          allowNegative={false}
          anchorEl={anchorElRef.current}
          onLiveChange={handleKeypadLiveChange}
          onConfirm={handleKeypadConfirm}
          onCancel={handleKeypadCancel}
        />
      )}
    </>
  );
}
