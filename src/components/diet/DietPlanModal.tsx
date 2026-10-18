import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import {
  calculateBMR,
  calculateTDEE,
  calculateAgeFromBirth,
  calculateMacrosFromSplit,
} from '@/utils/weightMath';
import type { UserProfile, MacroSplit, DietPlan } from '@/types';

export interface DietPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
  currentPlan?: DietPlan;
  onSavePlan?: (updates: Partial<DietPlan>) => Promise<void>;
  profile: UserProfile;
  onSave?: (updates: Partial<UserProfile>) => Promise<void>;
}

export function DietPlanModal({
  isOpen,
  onClose,
  currentPlan,
  onSavePlan,
  profile,
  onSave,
}: DietPlanModalProps) {
  const { t } = useTranslation();

  // 計算客觀生理常數 BMR
  const age = profile.birthDate
    ? calculateAgeFromBirth(profile.birthDate)
    : profile.age || 25;
  const currentBMR = calculateBMR(
    profile.currentWeightKg,
    profile.heightCm,
    profile.gender,
    age
  );

  // 本地表單狀態
  const [activityLevel, setActivityLevel] = useState<number>(
    profile.activityLevel || 1.55
  );
  const [targetCalories, setTargetCalories] = useState<string>(
    String(profile.dailyCaloriesTarget || calculateTDEE(currentBMR, profile.activityLevel || 1.55))
  );

  const initialSplit = profile.macroSplit || { carbs: 40, protein: 30, fat: 30 };
  const [carbsPercent, setCarbsPercent] = useState<string>(String(initialSplit.carbs));
  const [proteinPercent, setProteinPercent] = useState<string>(String(initialSplit.protein));
  const [fatPercent, setFatPercent] = useState<string>(String(initialSplit.fat));
  const [template, setTemplate] = useState<string>('custom');

  useEffect(() => {
    if (isOpen) {
      const act = profile.activityLevel || 1.55;
      setActivityLevel(act);

      // 優先讀取當日專屬計劃之目標熱量，若無則讀取 profile 或計算之 TDEE
      const defTarget = currentPlan?.caloriesTarget || profile.dailyCaloriesTarget || calculateTDEE(currentBMR, act);
      setTargetCalories(String(defTarget));

      // 若 currentPlan 有宏量目標克數，反推熱量百分比；否則使用 profile.macroSplit
      let split = profile.macroSplit || { carbs: 40, protein: 30, fat: 30 };
      if (currentPlan && currentPlan.caloriesTarget > 0 && currentPlan.proteinTarget) {
        const cKcal = currentPlan.carbsTarget * 4;
        const pKcal = currentPlan.proteinTarget * 4;
        const fKcal = currentPlan.fatTarget * 9;
        const total = cKcal + pKcal + fKcal;
        if (total > 0) {
          split = {
            carbs: Math.round((cKcal / total) * 100),
            protein: Math.round((pKcal / total) * 100),
            fat: Math.max(0, 100 - Math.round((cKcal / total) * 100) - Math.round((pKcal / total) * 100)),
          };
        }
      }

      setCarbsPercent(String(split.carbs));
      setProteinPercent(String(split.protein));
      setFatPercent(String(split.fat));

      // 檢查是否符合預設模板
      if (split.carbs === 40 && split.protein === 30 && split.fat === 30) {
        setTemplate('balance');
      } else if (split.carbs === 40 && split.protein === 35 && split.fat === 25) {
        setTemplate('highProtein');
      } else if (split.carbs === 25 && split.protein === 40 && split.fat === 35) {
        setTemplate('lowCarb');
      } else {
        setTemplate('custom');
      }
    }
  }, [isOpen, profile, currentPlan, currentBMR]);


  // 當前推算的 TDEE
  const currentTDEE = calculateTDEE(currentBMR, activityLevel);

  // 數值解析
  const parsedCalories = Math.max(0, parseInt(targetCalories, 10) || 0);
  const parsedCarbs = Math.max(0, parseInt(carbsPercent, 10) || 0);
  const parsedProtein = Math.max(0, parseInt(proteinPercent, 10) || 0);
  const parsedFat = Math.max(0, parseInt(fatPercent, 10) || 0);
  const ratioTotal = parsedCarbs + parsedProtein + parsedFat;
  const isRatioValid = ratioTotal === 100;

  // 動態計算目標克數
  const calculatedMacros = calculateMacrosFromSplit(
    parsedCalories,
    parsedCarbs,
    parsedProtein,
    parsedFat
  );

  // 三大營養素各別熱量 (kcal)
  const carbsKcal = Math.round((parsedCalories * parsedCarbs) / 100);
  const proteinKcal = Math.round((parsedCalories * parsedProtein) / 100);
  const fatKcal = Math.round((parsedCalories * parsedFat) / 100);

  // 目標熱量與 TDEE 差異
  const calorieDelta = parsedCalories > 0 ? parsedCalories - currentTDEE : 0;

  // 供能比視覺標尺寬度推算
  const ratioScale = ratioTotal > 100 ? 100 / ratioTotal : 1;
  const carbsBarWidth = Math.min(100, Math.round(parsedCarbs * ratioScale));
  const proteinBarWidth = Math.min(100 - carbsBarWidth, Math.round(parsedProtein * ratioScale));
  const fatBarWidth = Math.max(0, Math.min(100 - carbsBarWidth - proteinBarWidth, Math.round(parsedFat * ratioScale)));

  // 活動係數顯示標籤
  const getActivityLabel = (level: number) => {
    switch (level) {
      case 1.2:
        return t('dietPlan.sedentary');
      case 1.375:
        return t('dietPlan.light');
      case 1.55:
        return t('dietPlan.moderate');
      case 1.725:
        return t('dietPlan.heavy');
      case 1.9:
        return t('dietPlan.athlete');
      default:
        return String(level);
    }
  };

  // 模板顯示標籤
  const getTemplateLabel = (tpl: string) => {
    switch (tpl) {
      case 'balance':
        return t('dietPlan.balance');
      case 'highProtein':
        return t('dietPlan.highProtein');
      case 'lowCarb':
        return t('dietPlan.lowCarb');
      case 'custom':
      default:
        return t('dietPlan.custom');
    }
  };

  // 切換模板
  const handleTemplateChange = (val: string) => {
    setTemplate(val);
    triggerHaptic('selection');
    if (val === 'balance') {
      setCarbsPercent('40');
      setProteinPercent('30');
      setFatPercent('30');
    } else if (val === 'highProtein') {
      setCarbsPercent('40');
      setProteinPercent('35');
      setFatPercent('25');
    } else if (val === 'lowCarb') {
      setCarbsPercent('25');
      setProteinPercent('40');
      setFatPercent('35');
    }
  };

  // 切換活動係數，同步更新 TDEE
  const handleActivityLevelChange = (val: string) => {
    const act = parseFloat(val);
    setActivityLevel(act);
    triggerHaptic('selection');
    const newTDEE = calculateTDEE(currentBMR, act);
    setTargetCalories(String(newTDEE));
  };

  // 一鍵同步目標熱量至 TDEE
  const handleSyncTdee = () => {
    setTargetCalories(String(currentTDEE));
    triggerHaptic('light');
  };

  // 儲存設定
  const handleSave = async () => {
    if (!isRatioValid || parsedCalories <= 0) return;

    const newSplit: MacroSplit = {
      carbs: parsedCarbs,
      protein: parsedProtein,
      fat: parsedFat,
    };

    if (onSavePlan) {
      await onSavePlan({
        caloriesTarget: parsedCalories,
        proteinTarget: calculatedMacros.proteinGrams,
        carbsTarget: calculatedMacros.carbsGrams,
        fatTarget: calculatedMacros.fatGrams,
      });
    }

    if (onSave) {
      await onSave({
        activityLevel,
        dailyCaloriesTarget: parsedCalories,
        macroSplit: newSplit,
        proteinGramsTarget: calculatedMacros.proteinGrams,
        carbsGramsTarget: calculatedMacros.carbsGrams,
        fatGramsTarget: calculatedMacros.fatGrams,
      });
    }

    triggerHaptic('success');
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px] p-5 sm:p-6 gap-4">
        {/* 標題與簡潔客觀副標 */}
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
            {t('dietPlan.title')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('dietPlan.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 區塊 1：客觀代謝常數與目標熱量 */}
          <div className="border border-border rounded-lg bg-card divide-y divide-border overflow-hidden">
            {/* 活動係數行 */}
            <div className="h-12 px-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <span className="text-xs font-normal text-foreground">
                {t('dietPlan.activityLevel')}
              </span>
              <Select
                value={String(activityLevel)}
                onValueChange={(val) => val && handleActivityLevelChange(val)}
              >
                <SelectTrigger
                  size="custom"
                  className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  <SelectValue className="flex-none text-right">
                    {getActivityLabel(activityLevel)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="min-w-44">
                  <SelectItem value="1.2">{t('dietPlan.sedentary')}</SelectItem>
                  <SelectItem value="1.375">{t('dietPlan.light')}</SelectItem>
                  <SelectItem value="1.55">{t('dietPlan.moderate')}</SelectItem>
                  <SelectItem value="1.725">{t('dietPlan.heavy')}</SelectItem>
                  <SelectItem value="1.9">{t('dietPlan.athlete')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 客觀代謝參考條 (BMR & TDEE + 同步按鈕) */}
            <div className="px-3.5 py-2 bg-muted/20 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wider text-muted-foreground/80 font-mono">
                  BMR
                </span>
                <span className="text-foreground font-medium font-mono">
                  {currentBMR}
                </span>
                <span className="text-2xs">kcal</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xs uppercase tracking-wider text-muted-foreground/80 font-mono">
                    TDEE
                  </span>
                  <span className="text-foreground font-medium font-mono">
                    {currentTDEE}
                  </span>
                  <span className="text-2xs">kcal</span>
                </div>

                {parsedCalories !== currentTDEE && (
                  <button
                    type="button"
                    onClick={handleSyncTdee}
                    className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded-lg border border-border/70 hover:border-foreground/40 bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={t('dietPlan.syncTdeeTooltip')}
                  >
                    <RefreshCw className="size-2.5" />
                    <span>{t('dietPlan.syncTdee')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 目標熱量輸入行 */}
            <div className="h-12 px-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-foreground">
                  {t('dietPlan.targetCalories')}
                </span>
                {calorieDelta !== 0 && parsedCalories > 0 && (
                  <span className="text-2xs font-mono text-muted-foreground">
                    {calorieDelta > 0 ? `(+${calorieDelta})` : `(${calorieDelta})`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs font-mono">
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(e.target.value.replace(/\D/g, ''))}
                  className="h-8 w-20 text-right text-sm font-mono font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
                />
                <span className="text-muted-foreground">kcal</span>
              </div>
            </div>
          </div>

          {/* 區塊 2：三大營養素供能比 (Macro Split) */}
          <div className="space-y-2">
            {/* 頂部標籤與模板切換 */}
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {t('dietPlan.macroSplit')}
              </span>
              <Select
                value={template}
                onValueChange={(val) => val && handleTemplateChange(val)}
              >
                <SelectTrigger
                  size="custom"
                  className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  <SelectValue className="flex-none text-right">
                    {getTemplateLabel(template)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="min-w-56">
                  <SelectItem value="balance">{t('dietPlan.balanceTemplate')}</SelectItem>
                  <SelectItem value="highProtein">{t('dietPlan.highProteinTemplate')}</SelectItem>
                  <SelectItem value="lowCarb">{t('dietPlan.lowCarbTemplate')}</SelectItem>
                  <SelectItem value="custom">{t('dietPlan.customTemplate')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 供能比整體卡片：標尺 + 3 欄並列 + 總和行 */}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              {/* 視覺供能比標尺 (Ratio Bar) */}
              <div className="h-1.5 w-full bg-muted/40 flex overflow-hidden">
                {ratioTotal > 0 && (
                  <>
                    <div
                      style={{ width: `${carbsBarWidth}%` }}
                      className="h-full bg-carbs transition-all duration-300"
                    />
                    <div
                      style={{ width: `${proteinBarWidth}%` }}
                      className="h-full bg-protein transition-all duration-300"
                    />
                    <div
                      style={{ width: `${fatBarWidth}%` }}
                      className="h-full bg-fat transition-all duration-300"
                    />
                  </>
                )}
              </div>

              {/* 3 欄並列：碳水、蛋白質、脂肪 */}
              <div className="grid grid-cols-3 divide-x divide-border">
                {/* 碳水化合物 */}
                <div className="p-3 flex flex-col items-center justify-between text-center gap-1.5 bg-card hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-1 text-2xs font-mono text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-carbs shrink-0" />
                    <span>C · {t('dietPlan.carbsShort')}</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={carbsPercent}
                      onChange={(e) => {
                        setCarbsPercent(e.target.value.replace(/\D/g, ''));
                        setTemplate('custom');
                      }}
                      className="h-7 w-9 text-center text-base font-bold font-mono text-foreground bg-transparent border-b border-border/80 focus:border-foreground outline-none transition-colors p-0"
                    />
                    <span className="text-2xs font-mono text-muted-foreground">%</span>
                  </div>
                  <div className="space-y-0.5 text-center">
                    <span className="text-xs font-mono font-semibold text-foreground block">
                      {calculatedMacros.carbsGrams} g
                    </span>
                    <span className="text-2xs font-mono text-muted-foreground block">
                      {carbsKcal} kcal
                    </span>
                  </div>
                </div>

                {/* 蛋白質 */}
                <div className="p-3 flex flex-col items-center justify-between text-center gap-1.5 bg-card hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-1 text-2xs font-mono text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-protein shrink-0" />
                    <span>P · {t('dietPlan.proteinShort')}</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={proteinPercent}
                      onChange={(e) => {
                        setProteinPercent(e.target.value.replace(/\D/g, ''));
                        setTemplate('custom');
                      }}
                      className="h-7 w-9 text-center text-base font-bold font-mono text-foreground bg-transparent border-b border-border/80 focus:border-foreground outline-none transition-colors p-0"
                    />
                    <span className="text-2xs font-mono text-muted-foreground">%</span>
                  </div>
                  <div className="space-y-0.5 text-center">
                    <span className="text-xs font-mono font-semibold text-foreground block">
                      {calculatedMacros.proteinGrams} g
                    </span>
                    <span className="text-2xs font-mono text-muted-foreground block">
                      {proteinKcal} kcal
                    </span>
                  </div>
                </div>

                {/* 脂肪 */}
                <div className="p-3 flex flex-col items-center justify-between text-center gap-1.5 bg-card hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-1 text-2xs font-mono text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-fat shrink-0" />
                    <span>F · {t('dietPlan.fatShort')}</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={fatPercent}
                      onChange={(e) => {
                        setFatPercent(e.target.value.replace(/\D/g, ''));
                        setTemplate('custom');
                      }}
                      className="h-7 w-9 text-center text-base font-bold font-mono text-foreground bg-transparent border-b border-border/80 focus:border-foreground outline-none transition-colors p-0"
                    />
                    <span className="text-2xs font-mono text-muted-foreground">%</span>
                  </div>
                  <div className="space-y-0.5 text-center">
                    <span className="text-xs font-mono font-semibold text-foreground block">
                      {calculatedMacros.fatGrams} g
                    </span>
                    <span className="text-2xs font-mono text-muted-foreground block">
                      {fatKcal} kcal
                    </span>
                  </div>
                </div>
              </div>

              {/* 底部總和狀態條 (高度恆定防抖) */}
              <div className="px-3.5 py-2 bg-muted/20 border-t border-border flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">
                  {t('dietPlan.ratioTotal')}
                </span>
                <div className="flex items-center gap-1 font-semibold">
                  {isRatioValid ? (
                    <span className="text-foreground flex items-center gap-1">
                      100 %
                      <Check className="size-3 text-foreground stroke-[2.5]" />
                    </span>
                  ) : (
                    <span className="text-destructive font-mono">
                      {ratioTotal} %{' '}
                      <span className="text-2xs font-normal">
                        ({ratioTotal < 100
                          ? `${t('dietPlan.remain')} ${100 - ratioTotal} %`
                          : `${t('dietPlan.excess')} +${ratioTotal - 100} %`})
                      </span>
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 底部按鈕：水平並列 */}
        <DialogFooter className="flex flex-row items-center justify-between gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 text-xs h-9 rounded-lg font-normal cursor-pointer"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isRatioValid || parsedCalories <= 0}
            className="flex-1 text-xs h-9 rounded-lg bg-foreground text-background hover:opacity-90 font-mono disabled:opacity-40 cursor-pointer"
          >
            {t('dietPlan.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
