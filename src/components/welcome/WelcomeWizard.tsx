import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { MonthPicker } from '@/components/ui/month-picker';
import { Logo } from '@/components/ui/Logo';
import { WireframeGlobe } from './WireframeGlobe';
import { calculateBMI, calculateBMR, calculateAgeFromBirth } from '@/utils/weightMath';
import { cmToIn, inToCm, kgToLbs, lbsToKg } from '@/utils/unitMath';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';
import { CalendarDays, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WelcomeWizardProps {
  onComplete?: () => void;
}

export function WelcomeWizard({ onComplete }: WelcomeWizardProps) {
  const { t } = useTranslation();
  const { profile, updateProfile } = useUserProfile();
  const { lengthUnit, bodyWeightUnit } = useUnitPreferences();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const totalSteps = 2;

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

  // 折算物理基準 kg & cm 計算
  const parsedDisplayWeight = parseFloat(displayWeight) || 0;
  const parsedDisplayHeight = parseFloat(displayHeight) || 0;
  const weightInKg = bodyWeightUnit === 'lbs' ? lbsToKg(parsedDisplayWeight) : parsedDisplayWeight;
  const heightInCm = lengthUnit === 'in' ? inToCm(parsedDisplayHeight) : parsedDisplayHeight;

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

  const goToStep = (step: 1 | 2) => {
    triggerHaptic('light');
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      goToStep((currentStep + 1) as 1 | 2);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      goToStep((currentStep - 1) as 1 | 2);
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
      {/* 3D 幾何線框球體晶格視覺層 (突破容器限制，全景右上角懸浮，極緩慢自轉) */}
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
        {/* 中間內容切換區 */}
        {/* ==================================================================== */}
        <main className="my-auto py-4 flex-1 flex flex-col justify-center">

          {/* ==================================================================== */}
          {/* 步驟 1：Resend 頂級動態主題美學 · 品牌呈現與核心宣言 */}
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

              {/* 3. 副標題與核心哲學宣言 (設計優先：雙行勻稱對稱色塊) */}
              <div className="space-y-1.5 text-[15px] sm:text-[16px] leading-relaxed tracking-tight max-w-[380px]">
                <p className="text-neutral-900 dark:text-neutral-100 font-medium">
                  {t('welcome.resendSub1', '個人飲食與肌力訓練記錄。')}
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

              {/* 4. 開始體驗操作按鈕 */}
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
          {/* 步驟 2：生理常數校準 (點擊開始體驗直達) */}
          {/* ==================================================================== */}
          {currentStep === 2 && (
            <section className="space-y-3.5 animate-in fade-in-50 duration-300">
              <div className="space-y-0.5">
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  {t('welcome.step4Tag', 'CALIBRATION')}
                </div>
                <h2 className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {t('welcome.step4Title', '生理常數校準')}
                </h2>
              </div>

              {/* 扁平表單 (Vercel Usage List) */}
              <div className="border border-border rounded-lg bg-card divide-y divide-border overflow-hidden">
                {/* 姓名 */}
                <div className="h-11 px-3.5 flex items-center justify-between hover:bg-hover transition-colors">
                  <span className="text-xs font-normal text-foreground">
                    {t('welcome.name', '姓名')}
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="-"
                    className="h-8 w-36 text-right text-xs font-mono text-foreground placeholder:text-muted-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
                  />
                </div>

                {/* 性別 (分段切換器) */}
                <div className="h-11 px-3.5 flex items-center justify-between hover:bg-hover transition-colors">
                  <span className="text-xs font-normal text-foreground">
                    {t('welcome.gender', '生理性別')}
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/20 border border-border text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setGender('male');
                        triggerHaptic('selection');
                      }}
                      className={cn(
                        'px-2.5 py-0.5 rounded font-semibold cursor-pointer transition-all select-none',
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
                        'px-2.5 py-0.5 rounded font-semibold cursor-pointer transition-all select-none',
                        gender === 'female'
                          ? 'bg-foreground text-background shadow-none'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t('welcome.female', '女')}
                    </button>
                  </div>
                </div>

                {/* 出生年月 */}
                <div className="h-11 px-3.5 flex items-center justify-between hover:bg-hover transition-colors">
                  <span className="text-xs font-normal text-foreground">
                    {t('welcome.birthDate', '出生年月')}
                  </span>
                  <MonthPicker
                    value={birthDate}
                    onChange={(val) => {
                      setBirthDate(val);
                      triggerHaptic('selection');
                    }}
                    className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn(birthDate ? 'text-foreground' : 'text-muted-foreground')}>
                        {birthDate || '-'}
                      </span>
                      {Boolean(birthDate) && calculatedAge > 0 && (
                        <span className="text-xs text-muted-foreground font-mono">
                          ({calculatedAge} {t('welcome.yearsOld', '歲')})
                        </span>
                      )}
                      <CalendarDays className="size-3.5 text-muted-foreground/70" />
                    </div>
                  </MonthPicker>
                </div>

                {/* 身高 */}
                <div className="h-11 px-3.5 flex items-center justify-between hover:bg-hover transition-colors">
                  <span className="text-xs font-normal text-foreground">
                    {t('welcome.height', '身高')}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={displayHeight}
                      onChange={(e) => setDisplayHeight(e.target.value)}
                      placeholder="-"
                      className="h-8 w-20 text-right text-xs font-mono text-foreground placeholder:text-muted-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
                    />
                    <span className="text-xs text-foreground font-mono">{lengthUnit}</span>
                  </div>
                </div>

                {/* 基準體重 */}
                <div className="h-11 px-3.5 flex items-center justify-between hover:bg-hover transition-colors">
                  <span className="text-xs font-normal text-foreground">
                    {t('welcome.weight', '基準體重')}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={displayWeight}
                      onChange={(e) => setDisplayWeight(e.target.value)}
                      placeholder="-"
                      className="h-8 w-20 text-right text-xs font-mono text-foreground placeholder:text-muted-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
                    />
                    <span className="text-xs text-foreground font-mono">{bodyWeightUnit}</span>
                  </div>
                </div>
              </div>

              {/* 客觀生理指標 HUD 預覽看板 */}
              <div className="border border-border rounded-lg bg-card p-3 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="uppercase tracking-wider font-semibold">
                    {t('welcome.previewTitle', '即時常數推算')}
                  </span>
                  <span>{t('welcome.formula', 'Mifflin-St Jeor')}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-0.5 divide-x divide-border">
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      {t('welcome.bmi', '身體質量指數 (BMI)')}
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-base font-bold text-foreground">
                        {currentBMI > 0 ? currentBMI : '-'}
                      </span>
                      {currentBMI > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {t('welcome.whoStandard', '標準 18.5 - 24.9')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pl-3">
                    <span className="text-muted-foreground block text-xs">
                      {t('welcome.bmr', '靜態基礎代謝 (BMR)')}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-bold text-foreground">
                        {currentBMR > 0 ? currentBMR : '-'}
                      </span>
                      {currentBMR > 0 && (
                        <span className="text-xs text-muted-foreground">kcal/day</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
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
          <footer className="w-full pt-3 pb-1 sm:pb-2 border-t border-border shrink-0">
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

              {/* 完成進入按鈕 */}
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
                    : t('welcome.completeBtn', '完成並進入 Zenfit')}
                </span>
                <Check className="size-3.5" />
              </button>
            </div>
          </footer>
        )}

      </div>
    </div>
  );
}