import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { MonthPicker } from '@/components/ui/month-picker';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { Logo } from '@/components/ui/Logo';
import { WireframeGlobe } from './WireframeGlobe';
import { BodyHighlighter } from '@/components/workout/BodyHighlighter';
import { calculateBMI, calculateBMR, calculateAgeFromBirth } from '@/utils/weightMath';
import { cmToIn, inToCm, kgToLbs, lbsToKg } from '@/utils/unitMath';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WelcomeWizardProps {
  onComplete?: () => void;
}

export function WelcomeWizard({ onComplete }: WelcomeWizardProps) {
  const { t } = useTranslation();
  const { profile, updateProfile } = useUserProfile();
  const { lengthUnit, bodyWeightUnit, preferences, updatePreset } = useUnitPreferences();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const totalSteps = 4;

  // 步驟 4 本地表單狀態
  const [name, setName] = useState(profile.name || '');
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [birthDate, setBirthDate] = useState(profile.birthDate || '');
  const [displayHeight, setDisplayHeight] = useState(() => {
    if (profile.heightCm && profile.heightCm > 0) {
      return lengthUnit === 'in' ? String(cmToIn(profile.heightCm, 1)) : String(profile.heightCm);
    }
    return '';
  });
  const [displayWeight, setDisplayWeight] = useState(() => {
    if (profile.currentWeightKg && profile.currentWeightKg > 0) {
      return bodyWeightUnit === 'lbs' ? String(kgToLbs(profile.currentWeightKg, 1)) : String(profile.currentWeightKg);
    }
    return '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 內置數字鍵盤狀態
  const [keypadConfig, setKeypadConfig] = useState<{
    type: 'height' | 'weight';
    title: string;
    value: number;
    unit: string;
    allowDecimals?: boolean;
    anchorEl?: HTMLElement | null;
  } | null>(null);

  // 折算物理基準 kg & cm 計算
  const parsedDisplayWeight = parseFloat(displayWeight) || 0;
  const parsedDisplayHeight = parseFloat(displayHeight) || 0;
  const weightInKg = bodyWeightUnit === 'lbs' ? lbsToKg(parsedDisplayWeight) : parsedDisplayWeight;
  const heightInCm = lengthUnit === 'in' ? inToCm(parsedDisplayHeight) : parsedDisplayHeight;

  // 單位偏好切換 (公制 / 英制，即時動態換算數值)
  const handleUnitSystemChange = (preset: 'metric' | 'imperial') => {
    if (preset === preferences.preset) return;
    triggerHaptic('selection');

    if (preset === 'imperial') {
      if (heightInCm > 0) setDisplayHeight(String(cmToIn(heightInCm, 1)));
      if (weightInKg > 0) setDisplayWeight(String(kgToLbs(weightInKg, 1)));
    } else {
      if (heightInCm > 0) setDisplayHeight(String(Math.round(heightInCm)));
      if (weightInKg > 0) setDisplayWeight(String(Math.round(weightInKg * 10) / 10));
    }
    updatePreset(preset);
  };

  // 內置數字鍵盤確認與即時連動回調
  const handleKeypadConfirm = (val: number) => {
    if (keypadConfig?.type === 'height') {
      setDisplayHeight(val > 0 ? String(val) : '');
    } else if (keypadConfig?.type === 'weight') {
      setDisplayWeight(val > 0 ? String(val) : '');
    }
    setKeypadConfig(null);
  };

  const handleKeypadLiveChange = (val: number) => {
    if (keypadConfig?.type === 'height') {
      setDisplayHeight(val > 0 ? String(val) : '');
    } else if (keypadConfig?.type === 'weight') {
      setDisplayWeight(val > 0 ? String(val) : '');
    }
  };

  const calculatedAge = useMemo(() => {
    return birthDate ? calculateAgeFromBirth(birthDate) : 0;
  }, [birthDate]);

  const currentBMI = useMemo(() => {
    return calculateBMI(weightInKg, heightInCm);
  }, [weightInKg, heightInCm]);

  const currentBMR = useMemo(() => {
    return calculateBMR(weightInKg, heightInCm, gender, calculatedAge);
  }, [weightInKg, heightInCm, gender, calculatedAge]);

  // 步驟 4 完整填寫校驗門檻
  const isStep4Valid = useMemo(() => {
    const isNameValid = name.trim().length > 0;
    const isBirthValid = Boolean(birthDate);
    const isHeightValid = heightInCm >= 50 && heightInCm <= 250;
    const isWeightValid = weightInKg >= 20 && weightInKg <= 300;
    return isNameValid && isBirthValid && isHeightValid && isWeightValid;
  }, [name, birthDate, heightInCm, weightInKg]);

  const goToStep = (step: 1 | 2 | 3 | 4) => {
    triggerHaptic('light');
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      goToStep((currentStep + 1) as 1 | 2 | 3 | 4);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      goToStep((currentStep - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleComplete = async () => {
    if (!isStep4Valid || isSubmitting) return;

    setIsSubmitting(true);
    triggerHaptic('success');

    try {
      await updateProfile({
        name: name.trim(),
        gender,
        birthDate,
        age: calculatedAge > 0 ? calculatedAge : 25,
        heightCm: heightInCm,
        currentWeightKg: weightInKg,
        weightUnit: bodyWeightUnit,
        isSetupCompleted: true,
      });

      toast.show(t('common.saved', '已儲存'));

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to complete onboarding setup:', err);
      toast.show(t('common.error', '發生錯誤'));
      setIsSubmitting(false);
    }
  };

  // 鍵盤 Enter 快速流轉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (currentStep < totalSteps) {
          handleNext();
        } else if (isStep4Valid && !isSubmitting) {
          handleComplete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isStep4Valid, isSubmitting]);

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full flex flex-col justify-between p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none bg-background text-foreground relative overflow-hidden transition-colors duration-300">
      {/* 3D 幾何線框球體晶格視覺層 (僅在首頁顯示，突破容器限制全景懸浮) */}
      {currentStep === 1 && <WireframeGlobe />}

      {/* 動態環境微光 (淺色清透微光 / 深色沉浸夜空) */}
      {currentStep === 1 && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(147,51,234,0.035),transparent_70%)] dark:bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(147,51,234,0.08),transparent_70%)] pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(ellipse_80%_35%_at_50%_100%,rgba(0,0,0,0.02),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_35%_at_50%_100%,rgba(255,255,255,0.035),transparent_70%)] pointer-events-none" />
        </>
      )}

      {/* 主嚮導容器 (420px 緊湊規格，樹狀 100% 高度撐滿可見視窗，安全避讓 Safari 工具列) */}
      <div className="w-full max-w-[420px] mx-auto h-full flex-1 flex flex-col justify-between relative z-10">

        {/* ==================================================================== */}
        {/* 中間內容切換區 (整體垂直居中 + 步驟間恆定基準高度錨定對齊) */}
        {/* ==================================================================== */}
        <main className="flex-1 flex flex-col justify-center my-auto py-2">

          {/* ==================================================================== */}
          {/* 步驟 1：品牌呈現與核心宣言 · 3D Wireframe */}
          {/* ==================================================================== */}
          {currentStep === 1 && (
            <section className="space-y-6 text-left my-auto animate-in fade-in-50 duration-300">
              {/* 0. 品牌標準 Logo (左上角，黑底白圖圓角矩形) */}
              <div className="flex items-center">
                <Logo
                  size={56}
                  className="shadow-sm transition-transform hover:scale-105 duration-200 border border-black/10 dark:border-white/10"
                />
              </div>

              {/* 1. 主標題 (Giant Display Serif with Dynamic Ink/Silver Gradient) */}
              <div className="space-y-1">
                <h1 className="font-serif text-[48px] sm:text-[54px] font-normal tracking-[-0.03em] leading-[1.04] text-hero-gradient select-none">
                  {t('welcome.resendHero1', 'Zenfit for')}<br />
                  {t('welcome.resendHero2', 'individuals')}
                </h1>
              </div>

              {/* 2. 副標題與核心哲學宣言 */}
              <div className="space-y-1.5 text-[15px] sm:text-[16px] leading-relaxed tracking-tight max-w-[380px]">
                <p className="text-neutral-900 dark:text-neutral-100 font-medium">
                  <span>{t('welcome.resendSub1Part1', '個人飲食')}</span>
                  <span className="text-neutral-500 dark:text-neutral-400 font-normal">
                    {t('welcome.resendSub1And', '與')}
                  </span>
                  <span>{t('welcome.resendSub1Part2', '肌力訓練記錄。')}</span>
                </p>
                <p className="text-neutral-500 dark:text-neutral-400">
                  <span>{t('welcome.resendSub2Lead', '只記錄生理事實。')}</span>
                  <del className="resend-del not-italic">
                    {t('welcome.noPreach', '不說教')}
                  </del>
                  <span className="text-neutral-500 dark:text-neutral-400">，</span>
                  <del className="resend-del not-italic">
                    {t('welcome.noAnxiety', '不製造焦慮')}
                  </del>
                  <span className="text-neutral-500 dark:text-neutral-400">。</span>
                </p>
              </div>

              {/* 3. 開始體驗操作按鈕 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="resend-primary-btn px-7 h-11 rounded-xl text-sm font-semibold tracking-tight transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer select-none"
                >
                  <span>{t('welcome.startBtn', '開始體驗')}</span>
                </button>
              </div>
            </section>
          )}

          {/* ==================================================================== */}
          {/* 步驟 2、3、4：恆定基準高度居中容器 (確保三者在居中之時頂部 Y 座標完全絕對鎖死) */}
          {/* ==================================================================== */}
          {currentStep > 1 && (
            <div className="w-full min-h-[450px] sm:min-h-[470px] flex flex-col justify-start">

              {/* ==================================================================== */}
              {/* 步驟 2：飲食記錄展示 · 方案 5 空間毛玻璃稜鏡卡片 */}
              {/* ==================================================================== */}
              {currentStep === 2 && (
            <section className="text-left animate-in fade-in-50 duration-300">
              {/* 標頭介紹 (固定頂部錨定) */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  {t('welcome.step2Tag', '01 // NUTRITION')}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {t('welcome.step2Title', '精準飲食追蹤')}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('welcome.step2Sub', '自動推算能量缺口與三大營養素供能比。')}
                </p>
              </div>

              {/* 方案 5 空間立體毛玻璃容器 (加大頂部留白 mt-[108px] 3x 空間感，精緻微縮尺寸) */}
              <div className="relative w-full max-w-[324px] sm:max-w-[340px] mx-auto mt-[108px] pb-1">
                {/* 空間景深後置卡片 (向左傾斜 -3 度，模擬 VisionOS 玻璃折射，左上圓圈與標籤完整露出) */}
                <div className="absolute inset-x-1 -top-2.5 bottom-2.5 rounded-[22px] pointer-events-none -rotate-3 -translate-y-1.5 border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.025] dark:bg-white/[0.03] backdrop-blur-xl flex flex-col justify-between p-3 transition-transform duration-500">
                  <div className="flex items-center justify-between">
                    <div className="w-4 h-4 rounded-full border border-black/15 dark:border-white/15" />
                    <div className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
                      PRISM_01 // NUTRITION
                    </div>
                  </div>
                  <div className="w-8 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                </div>

                {/* 前方主卡片：1:1 復刻飲食記錄頂部統計區塊 (大圓角、毛玻璃、精緻邊界) */}
                <div className="relative rounded-[20px] overflow-hidden bg-card/90 dark:bg-[#0c0c0e]/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] text-foreground">
                  {/* 上半部：熱量統計 (Hero Metric) */}
                  <div className="p-3.5 sm:p-4 space-y-2.5">
                    {/* 頂部列：左側活動係數膠囊、中間熱量統計標籤 (幾何絕對居中)、右側供能比膠囊 */}
                    <div className="relative flex items-center justify-between">
                      {/* 左側：活動係數膠囊 */}
                      <div className="shrink-0 z-10">
                        <span className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-center gap-1 font-mono select-none">
                          <span>{t('dietPlan.lightShort', '輕度活動')}</span>
                          <ChevronDown className="size-3 text-muted-foreground/60" />
                        </span>
                      </div>

                      {/* 中間：熱量統計標籤 (幾何絕對居中) */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs sm:text-sm font-normal text-muted-foreground select-none font-mono">
                          {t('diet.calorieStats', '熱量統計')}
                        </span>
                      </div>

                      {/* 右側：供能比模板膠囊 */}
                      <div className="shrink-0 z-10">
                        <span className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-center gap-1 font-mono select-none">
                          <span>{t('dietPlan.highProtein', '高蛋白')}</span>
                          <ChevronRight className="size-3 text-muted-foreground/60 shrink-0 -ml-0.5" />
                        </span>
                      </div>
                    </div>

                    {/* 核心熱量巨型數值 (居中) */}
                    <div className="pt-1 pb-0.5 text-center">
                      <div className="hero-number flex items-baseline justify-center gap-1.5 font-mono">
                        <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">1,940</span>
                        <span className="text-sm sm:text-base font-normal text-muted-foreground font-mono">kcal</span>
                      </div>

                      {/* 客觀差額事實 (1:1 復刻 Diet.tsx: 剩餘 160kcal) */}
                      <div className="flex items-center justify-center gap-2 mt-1 text-sm font-mono text-muted-foreground">
                        <span>{t('dietPlan.underBudget', '剩餘')} 160kcal</span>
                      </div>

                      {/* 客觀進度標尺 (1:1 復刻 Diet.tsx: h-2 max-w-[220px] bg-track) */}
                      <div className="h-2 w-full max-w-[220px] mx-auto bg-track rounded-full overflow-hidden mt-3">
                        <div
                          className="h-full bg-foreground transition-all duration-300 rounded-full"
                          style={{ width: '92%' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 下半部：三大營養素 (1:1 復刻 Diet.tsx：碳水化合物、蛋白質、脂肪，使用 Tokens) */}
                  <div className="grid grid-cols-3 divide-x divide-border border-t border-border font-mono text-left">
                    {/* 1. 碳水化合物 */}
                    <div className="p-2.5 sm:p-3.5 space-y-1 overflow-hidden">
                      <div className="text-xs font-medium text-carbs truncate whitespace-nowrap">
                        {t('dietPlan.carbsShort', '碳水化合物')}
                      </div>
                      <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
                        <span className="font-bold text-foreground">210g</span>
                        <span className="text-2xs sm:text-xs font-normal text-muted-foreground">/240g</span>
                      </div>
                      <div className="h-2 w-full bg-carbs-subtle rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-carbs transition-all duration-300 rounded-full"
                          style={{ width: '87%' }}
                        />
                      </div>
                    </div>

                    {/* 2. 蛋白質 */}
                    <div className="p-2.5 sm:p-3.5 space-y-1 overflow-hidden">
                      <div className="text-xs font-medium text-protein truncate whitespace-nowrap">
                        {t('dietPlan.proteinShort', '蛋白質')}
                      </div>
                      <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
                        <span className="font-bold text-foreground">145g</span>
                        <span className="text-2xs sm:text-xs font-normal text-muted-foreground">/160g</span>
                      </div>
                      <div className="h-2 w-full bg-protein-subtle rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-protein transition-all duration-300 rounded-full"
                          style={{ width: '90%' }}
                        />
                      </div>
                    </div>

                    {/* 3. 脂肪 */}
                    <div className="p-2.5 sm:p-3.5 space-y-1 overflow-hidden">
                      <div className="text-xs font-medium text-fat truncate whitespace-nowrap">
                        {t('dietPlan.fatShort', '脂肪')}
                      </div>
                      <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
                        <span className="font-bold text-foreground">52g</span>
                        <span className="text-2xs sm:text-xs font-normal text-muted-foreground">/60g</span>
                      </div>
                      <div className="h-2 w-full bg-fat-subtle rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-fat transition-all duration-300 rounded-full"
                          style={{ width: '86%' }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>
          )}

          {/* ==================================================================== */}
          {/* 步驟 3：訓練記錄展示 · 方案 5 空間人體解剖地圖卡片 */}
          {/* ==================================================================== */}
          {currentStep === 3 && (
            <section className="text-left animate-in fade-in-50 duration-300">
              {/* 標頭介紹 (固定頂部錨定) */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  {t('welcome.step3Tag', '02 // WORKOUT')}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {t('welcome.step3Title', '肌力與人體地圖')}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('welcome.step3Sub', '視覺化肌群刺激深度與每週容量分佈。')}
                </p>
              </div>

              {/* 方案 5 空間立體毛玻璃容器 (加大頂部留白 mt-[108px] 3x 空間感，精緻微縮尺寸) */}
              <div className="relative w-full max-w-[324px] sm:max-w-[340px] mx-auto mt-[108px] pb-1">
                {/* 空間景深後置卡片 (向右傾斜 3 度，左上圓圈與標籤完整露出) */}
                <div className="absolute inset-x-1 -top-2.5 bottom-2.5 rounded-[22px] pointer-events-none rotate-3 -translate-y-1.5 border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.025] dark:bg-white/[0.03] backdrop-blur-xl flex flex-col justify-between p-3 transition-transform duration-500">
                  <div className="flex items-center justify-between">
                    <div className="w-4 h-4 rounded-full border border-black/15 dark:border-white/15" />
                    <div className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
                      PRISM_02 // ANATOMY
                    </div>
                  </div>
                  <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/10 self-end" />
                </div>

                {/* 前方主卡片：1:1 復刻訓練人體地圖與指標 (大圓角、毛玻璃、精緻邊界) */}
                <div className="relative rounded-[20px] overflow-hidden bg-card/90 dark:bg-[#0c0c0e]/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] text-foreground">
                  {/* 上半部：前後雙向人體解剖圖渲染 (1:1 復刻 WorkoutRecoveryDashboard) */}
                  <div className="p-3 sm:p-3.5 space-y-1.5">
                    {/* 頂部列：無左側訓練日與中間負荷，右上角靠右對齊的恢復摘要膠囊 (完全對齊實際訓練頁面) */}
                    <div className="flex items-center justify-end">
                      <span className="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border border-[var(--muscle-intensity-high-text)]/40 bg-[var(--muscle-intensity-high-bg)]/30 text-[var(--muscle-intensity-high-text)] select-none">
                        <span>3 {t('workout.musclesRecovering', '個肌群恢復中')}</span>
                      </span>
                    </div>

                    {/* 正式 BodyHighlighter 人體解剖肌群熱力圖 */}
                    <div className="flex items-center justify-center py-0.5">
                      <BodyHighlighter
                        view="both"
                        muscles={{
                          upper_chest: 85,
                          mid_lower_chest: 90,
                          lats: 70,
                          quads: 80,
                          side_delts: 65,
                          triceps: 60,
                          hamstrings: 55,
                        }}
                        size="sm"
                        interactive={false}
                        showLabels={true}
                        showOutline={true}
                        showHud={false}
                        highlightColor="#ef4444"
                        className="w-full max-w-[240px] h-[135px] mx-auto"
                      />
                    </div>
                  </div>

                  {/* 下半部：訓練客觀 3 欄指標 (1:1 復刻 WorkoutRecoveryDashboard：動作項目、完成組數、訓練容量) */}
                  <div className="grid grid-cols-3 divide-x divide-border border-t border-border font-mono text-left">
                    <div className="p-2 sm:p-2.5 space-y-0.5 overflow-hidden">
                      <div className="text-[10px] font-medium text-muted-foreground truncate">
                        {t('workout.exercises', '動作項目')}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-foreground">
                        5 <span className="text-[9px] font-normal text-muted-foreground">{t('common.items', '項')}</span>
                      </div>
                    </div>

                    <div className="p-2 sm:p-2.5 space-y-0.5 overflow-hidden">
                      <div className="text-[10px] font-medium text-muted-foreground truncate">
                        {t('workout.completedSets', '完成組數')}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-foreground">
                        18 <span className="text-[9px] font-normal text-muted-foreground">{t('workout.set', '組')}</span>
                      </div>
                    </div>

                    <div className="p-2 sm:p-2.5 space-y-0.5 overflow-hidden">
                      <div className="text-[10px] font-medium text-muted-foreground truncate">
                        {t('workout.totalVolume', '總容量')}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-foreground">
                        8,450<span className="text-[9px] font-normal text-muted-foreground">kg</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>
          )}

          {/* ==================================================================== */}
          {/* 步驟 4：基本資料 (表單) */}
          {/* ==================================================================== */}
          {currentStep === 4 && (
            <section className="text-left animate-in fade-in-50 duration-300">
              {/* 標頭介紹 (固定頂部錨定) */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  {t('welcome.step4Tag', '03 // CALIBRATION')}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {t('welcome.step4Title', '基本資料')}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('welcome.step4Sub', '錄入基礎物理常數，系統將即時推算代謝指標。')}
                </p>
              </div>

              {/* 方案 5 空間立體毛玻璃分區卡片 (加大頂部留白 mt-[108px] 3x 空間感，精緻微縮尺寸) */}
              <div className="relative w-full max-w-[324px] sm:max-w-[340px] mx-auto mt-[108px] pb-1">
                {/* 空間景深後置卡片 (向左傾斜 -2.5 度，左上圓圈與標籤完整露出) */}
                <div className="absolute inset-x-1 -top-2.5 bottom-2.5 rounded-[22px] pointer-events-none -rotate-2 -translate-y-1.5 border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.025] dark:bg-white/[0.03] backdrop-blur-xl flex flex-col justify-between p-3 transition-transform duration-500">
                  <div className="flex items-center justify-between">
                    <div className="w-4 h-4 rounded-full border border-black/15 dark:border-white/15" />
                    <div className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
                      PRISM_03 // CALIBRATION
                    </div>
                  </div>
                  <div className="w-8 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                </div>

                {/* 前方主卡片：經典分區卡片 (分區 1: 姓名；分區 2: 4 宮格參數；分區 3: 生理常數雙欄) */}
                <div className="relative rounded-[20px] overflow-hidden bg-card/90 dark:bg-[#0c0c0e]/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] text-foreground">
                  {/* 分區 1：姓名 (全行全寬點擊即可觸發輸入，嚴謹對齊與小屏防截斷) */}
                  <label className="h-11 px-3.5 sm:px-4 flex items-center justify-between hover:bg-hover transition-colors cursor-text min-w-0">
                    <span className="text-xs font-normal text-muted-foreground font-mono shrink-0">
                      {t('welcome.name', '姓名')}
                    </span>
                    <input
                      type="text"
                      size={1}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="-"
                      className="h-8 flex-1 min-w-0 ml-3 sm:ml-4 text-right text-xs font-mono text-foreground placeholder:text-muted-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
                    />
                  </label>

                  {/* 分區 2：基本參數分區 (性別/出生年月、單位偏好、身高/體重) */}
                  <div className="border-t border-border">
                    {/* 行 1：性別 與 出生年月 (各佔 50%，視覺邊距嚴謹對齊) */}
                    <div className="grid grid-cols-2 divide-x divide-border">
                      {/* 左欄：性別 */}
                      <div className="h-11 pl-3.5 sm:pl-4 pr-3 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden">
                        <span className="text-xs font-normal text-muted-foreground font-mono truncate">
                          {t('welcome.gender', '性別')}
                        </span>
                        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/20 border border-border text-xs font-mono shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setGender('male');
                              triggerHaptic('selection');
                            }}
                            className={cn(
                              'px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-all select-none',
                              gender === 'male'
                                ? 'bg-foreground text-background shadow-none'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {t('welcome.male', '男')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGender('female');
                              triggerHaptic('selection');
                            }}
                            className={cn(
                              'px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-all select-none',
                              gender === 'female'
                                ? 'bg-foreground text-background shadow-none'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {t('welcome.female', '女')}
                          </button>
                        </div>
                      </div>

                      {/* 右欄：出生年月 (全格全寬可點擊呼出 MonthPicker) */}
                      <MonthPicker
                        value={birthDate}
                        onChange={(val) => {
                          setBirthDate(val);
                          triggerHaptic('selection');
                        }}
                        className="h-11 pl-3 pr-3.5 sm:pr-4 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden cursor-pointer w-full select-none"
                      >
                        <span className="text-xs font-normal text-muted-foreground font-mono truncate">
                          {t('welcome.birthDate', '出生年月')}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-mono shrink-0">
                          <span className={cn(birthDate ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                            {birthDate ? (calculatedAge > 0 ? `${calculatedAge} ${t('welcome.yearsOld', '歲')}` : birthDate) : '-'}
                          </span>
                          <CalendarDays className="size-3 text-muted-foreground/70 shrink-0" />
                        </div>
                      </MonthPicker>
                    </div>

                    {/* 行 2：單位偏好設置 (在身高體重上方，全寬單行，切換公制 / 英制) */}
                    <div className="h-11 px-3.5 sm:px-4 flex items-center justify-between border-t border-border hover:bg-hover transition-colors">
                      <span className="text-xs font-normal text-muted-foreground font-mono truncate">
                        {t('welcome.unitPreference', '單位偏好')}
                      </span>
                      <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/20 border border-border text-xs font-mono shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUnitSystemChange('metric')}
                          className={cn(
                            'px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-all select-none',
                            preferences.preset === 'metric'
                              ? 'bg-foreground text-background shadow-none'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {t('settings.unitPresetMetric', '公制')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUnitSystemChange('imperial')}
                          className={cn(
                            'px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-all select-none',
                            preferences.preset === 'imperial'
                              ? 'bg-foreground text-background shadow-none'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {t('settings.unitPresetImperial', '英制')}
                        </button>
                      </div>
                    </div>

                    {/* 行 3：身高 與 體重 (全格全寬可點擊，調用內置數字鍵盤) */}
                    <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                      {/* 左欄：身高 (整格可點擊呼出鍵盤，對齊左邊距) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          triggerHaptic('light');
                          setKeypadConfig({
                            type: 'height',
                            title: t('welcome.height', '身高'),
                            value: parsedDisplayHeight,
                            unit: lengthUnit,
                            allowDecimals: lengthUnit === 'in',
                            anchorEl: e.currentTarget,
                          });
                        }}
                        className="h-11 pl-3.5 sm:pl-4 pr-3 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden cursor-pointer w-full text-left select-none"
                      >
                        <span className="text-xs font-normal text-muted-foreground font-mono truncate">
                          {t('welcome.height', '身高')}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-xs shrink-0">
                          <span className={cn(displayHeight ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                            {displayHeight || '-'}
                          </span>
                          <span className="text-xs text-foreground font-mono">{lengthUnit}</span>
                        </div>
                      </button>

                      {/* 右欄：體重 (整格可點擊呼出鍵盤，對齊右邊距) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          triggerHaptic('light');
                          setKeypadConfig({
                            type: 'weight',
                            title: t('welcome.weight', '體重'),
                            value: parsedDisplayWeight,
                            unit: bodyWeightUnit,
                            allowDecimals: true,
                            anchorEl: e.currentTarget,
                          });
                        }}
                        className="h-11 pl-3 pr-3.5 sm:pr-4 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden cursor-pointer w-full text-left select-none"
                      >
                        <span className="text-xs font-normal text-muted-foreground font-mono truncate">
                          {t('welcome.weight', '體重')}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-xs shrink-0">
                          <span className={cn(displayWeight ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                            {displayWeight || '-'}
                          </span>
                          <span className="text-xs text-foreground font-mono">{bodyWeightUnit}</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 分區 3：生理常數 (對標 Zenfit 指標分區卡片) */}
                  <div className="border-t border-border bg-muted/10 font-mono">
                    {/* 小標題列 (純客觀標籤，無冗餘公式標註) */}
                    <div className="px-3.5 sm:px-4 py-1.5 flex items-center justify-between text-muted-foreground/80 border-b border-border/60">
                      <span className="text-[10px] uppercase tracking-wider font-semibold">
                        {t('welcome.previewTitle', '生理常數')}
                      </span>
                    </div>

                    {/* 雙欄指標 (BMI 與 BMR，嚴謹對齊外側留白) */}
                    <div className="grid grid-cols-2 divide-x divide-border text-left">
                      {/* BMI */}
                      <div className="pl-3.5 sm:pl-4 pr-3 py-2.5 sm:py-3 space-y-1 overflow-hidden">
                        <div className="text-[10px] font-medium text-muted-foreground truncate">
                          {t('welcome.bmi', '身體質量指數 (BMI)')}
                        </div>
                        <div className="text-sm sm:text-base font-bold text-foreground font-mono leading-none">
                          {currentBMI > 0 ? currentBMI : '-'}
                        </div>
                      </div>

                      {/* BMR */}
                      <div className="pl-3 pr-3.5 sm:pr-4 py-2.5 sm:py-3 space-y-1 overflow-hidden">
                        <div className="text-[10px] font-medium text-muted-foreground truncate">
                          {t('welcome.bmr', '靜態基礎代謝 (BMR)')}
                        </div>
                        <div className="flex items-baseline gap-1 text-foreground font-mono leading-none">
                          <span className="text-sm sm:text-base font-bold">
                            {currentBMR > 0 ? currentBMR : '-'}
                          </span>
                          {currentBMR > 0 && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              kcal/day
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>
          )}

            </div>
          )}

        </main>

        {/* ==================================================================== */}
        {/* 底部導覽列與固定版本標籤 */}
        {/* ==================================================================== */}
        {currentStep === 1 ? (
          <footer className="w-full shrink-0 pt-3 pb-1 sm:pb-2">
            <div className="flex items-center text-neutral-400 dark:text-neutral-500 font-mono text-[11px] uppercase tracking-widest select-none">
              <span>v1.0.0 &middot; LOCAL-FIRST</span>
            </div>
          </footer>
        ) : (
          <footer className="w-full pt-3 pb-1 sm:pb-2 shrink-0">
            <div className="flex items-center justify-between gap-3">
              {/* 上一步按鈕 */}
              <button
                type="button"
                onClick={handlePrev}
                className="h-10 px-4 rounded-lg font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-hover transition-colors cursor-pointer select-none flex items-center gap-1"
              >
                <ChevronLeft className="size-3.5" />
                <span>{t('welcome.prevBtn', '上一步')}</span>
              </button>

              {/* 下一步 / 完成進入按鈕 */}
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-10 px-5 rounded-lg font-mono text-xs font-semibold select-none flex items-center gap-1.5 transition-all shadow-none ml-auto cursor-pointer bg-foreground text-background hover:opacity-90 active:scale-[0.99]"
                >
                  <span>{t('welcome.nextBtn', '繼續')}</span>
                  <ChevronRight className="size-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={!isStep4Valid || isSubmitting}
                  className={cn(
                    'h-10 px-5 rounded-lg font-mono text-xs font-semibold select-none flex items-center gap-1.5 transition-all shadow-none ml-auto cursor-pointer',
                    isStep4Valid && !isSubmitting
                      ? 'bg-foreground text-background hover:opacity-90 active:scale-[0.99]'
                      : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                  )}
                >
                  <span>
                    {isSubmitting
                      ? t('welcome.startingApp', '正在啟動應用…')
                      : t('welcome.completeBtn', '完成')}
                  </span>
                  <Check className="size-3.5" />
                </button>
              )}
            </div>
          </footer>
        )}

      </div>

      {/* 內置數字鍵盤微調彈窗 (平級兄弟節點, Instant Pop, 專屬身高與體重調用) */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={Boolean(keypadConfig)}
          onOpenChange={(open) => {
            if (!open) setKeypadConfig(null);
          }}
          anchorEl={keypadConfig.anchorEl}
          title={keypadConfig.title}
          value={keypadConfig.value}
          unit={keypadConfig.unit}
          allowDecimals={keypadConfig.allowDecimals}
          maxDecimals={keypadConfig.allowDecimals ? 1 : 0}
          onConfirm={handleKeypadConfirm}
          onLiveChange={handleKeypadLiveChange}
          onCancel={() => setKeypadConfig(null)}
        />
      )}
    </div>
  );
}
