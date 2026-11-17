import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MonthPicker } from '@/components/ui/month-picker';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { Logo } from '@/components/ui/Logo';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { calculateBMI, calculateBMR, calculateAgeFromBirth } from '@/utils/weightMath';
import { cmToIn, inToCm, kgToLbs, lbsToKg } from '@/utils/unitMath';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SetupProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (name?: string) => void;
}

/**
 * 基本資料設定彈窗 (Setup Profile Dialog)
 * 將原本歡迎嚮導中的基本資料表單 Dialog 化，對標 Vercel 極簡高對比工程師風格。
 */
export function SetupProfileDialog({
  open,
  onOpenChange,
  onComplete,
}: SetupProfileDialogProps) {
  const { t } = useTranslation();
  const { profile, updateProfile, isLoading } = useUserProfile();
  const { preferences, lengthUnit, bodyWeightUnit, updatePreset } = useUnitPreferences();

  // 本地表單狀態
  const [name, setName] = useState(profile.name || '');
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [birthDate, setBirthDate] = useState(profile.birthDate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 身高與體重的本地展示狀態
  const [displayHeight, setDisplayHeight] = useState('');
  const [displayWeight, setDisplayWeight] = useState('');

  // 內置數字鍵盤次級彈窗狀態
  const [keypadConfig, setKeypadConfig] = useState<{
    type: 'height' | 'weight';
    title: string;
    value: number;
    unit: string;
    allowDecimals?: boolean;
    anchorEl?: HTMLElement | null;
  } | null>(null);

  // 初始化個人資料 (每次開啟彈窗或設定變更時同步)
  useEffect(() => {
    if (open && !isLoading) {
      setName(profile.name || '');
      setGender(profile.gender || 'male');
      setBirthDate(profile.birthDate || '');

      const rawCm = profile.heightCm || 0;
      if (rawCm > 0) {
        setDisplayHeight(lengthUnit === 'in' ? String(cmToIn(rawCm, 1)) : String(Math.round(rawCm)));
      } else {
        setDisplayHeight('');
      }

      const rawKg = profile.currentWeightKg || 0;
      if (rawKg > 0) {
        setDisplayWeight(bodyWeightUnit === 'lbs' ? String(kgToLbs(rawKg, 1)) : String(Math.round(rawKg * 10) / 10));
      } else {
        setDisplayWeight('');
      }
    }
  }, [open, isLoading, profile, lengthUnit, bodyWeightUnit]);

  // 折算身高基準 cm
  const parsedDisplayHeight = parseFloat(displayHeight) || 0;
  const heightInCm = useMemo(() => {
    if (parsedDisplayHeight <= 0) return 0;
    return lengthUnit === 'in' ? inToCm(parsedDisplayHeight) : parsedDisplayHeight;
  }, [displayHeight, lengthUnit]);

  // 折算體重基準 kg
  const parsedDisplayWeight = parseFloat(displayWeight) || 0;
  const weightInKg = useMemo(() => {
    if (parsedDisplayWeight <= 0) return 0;
    return bodyWeightUnit === 'lbs' ? lbsToKg(parsedDisplayWeight) : parsedDisplayWeight;
  }, [displayWeight, bodyWeightUnit]);

  // 切換單位系統時同步數值
  const handleUnitSystemChange = (system: 'metric' | 'imperial') => {
    triggerHaptic('selection');
    if (system === preferences.preset) return;

    if (system === 'imperial') {
      if (heightInCm > 0) {
        setDisplayHeight(String(cmToIn(heightInCm, 1)));
      }
      if (weightInKg > 0) {
        setDisplayWeight(String(kgToLbs(weightInKg, 1)));
      }
      updatePreset('imperial');
    } else {
      if (heightInCm > 0) {
        setDisplayHeight(String(Math.round(heightInCm)));
      }
      if (weightInKg > 0) {
        setDisplayWeight(String(Math.round(weightInKg * 10) / 10));
      }
      updatePreset('metric');
    }
  };

  // 鍵盤確認與即時聯動回調
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

  // 年齡與生理常數即時推算
  const calculatedAge = useMemo(() => {
    return birthDate ? calculateAgeFromBirth(birthDate) : 0;
  }, [birthDate]);

  const currentBMI = useMemo(() => {
    return calculateBMI(weightInKg, heightInCm);
  }, [weightInKg, heightInCm]);

  const currentBMR = useMemo(() => {
    return calculateBMR(weightInKg, heightInCm, gender, calculatedAge);
  }, [weightInKg, heightInCm, gender, calculatedAge]);

  // 完整填寫校驗門檻
  const isFormValid = useMemo(() => {
    const isNameValid = name.trim().length > 0;
    const isBirthValid = Boolean(birthDate);
    const isHeightValid = heightInCm >= 50 && heightInCm <= 250;
    const isWeightValid = weightInKg >= 20 && weightInKg <= 300;
    return isNameValid && isBirthValid && isHeightValid && isWeightValid;
  }, [name, birthDate, heightInCm, weightInKg]);

  // 提交完成設定
  const handleComplete = async () => {
    if (!isFormValid || isSubmitting) return;

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
      onOpenChange(false);

      if (onComplete) {
        onComplete(name.trim());
      }
    } catch (err) {
      console.error('Failed to complete onboarding setup:', err);
      toast.show(t('common.error', '發生錯誤'));
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="standard"
          overlayClassName="z-[60]"
          className="z-[60] overflow-hidden relative w-[360px] max-w-[calc(100vw-24px)] sm:w-[380px] sm:max-w-[380px] p-6 sm:p-6"
          initialFocus={false}
        >
          {/* 背景微縮動態線框球體 (3D Celestial Wireframe Dome，放大至 3x，1px 精準細線) */}
          <div className="absolute -top-[240px] -right-[240px] w-[600px] h-[600px] pointer-events-none opacity-[0.14] dark:opacity-[0.22] text-foreground select-none">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              style={{ animation: 'spin 90s linear infinite' }}
              fill="none"
              stroke="currentColor"
            >
              <circle cx="50" cy="50" r="48" vectorEffect="non-scaling-stroke" strokeWidth="1" />
              <ellipse cx="50" cy="50" rx="48" ry="18" vectorEffect="non-scaling-stroke" strokeWidth="1" />
              <ellipse cx="50" cy="50" rx="48" ry="34" vectorEffect="non-scaling-stroke" strokeWidth="1" />
              <ellipse cx="50" cy="50" rx="18" ry="48" vectorEffect="non-scaling-stroke" strokeWidth="1" />
              <ellipse cx="50" cy="50" rx="34" ry="48" vectorEffect="non-scaling-stroke" strokeWidth="1" />
              <line x1="50" y1="2" x2="50" y2="98" vectorEffect="non-scaling-stroke" strokeWidth="1" />
              <line x1="2" y1="50" x2="98" y2="50" vectorEffect="non-scaling-stroke" strokeWidth="1" />
            </svg>
          </div>

          {/* 標頭區塊：Logo 置頂、大尺寸歡迎標題與右側關閉按鈕 */}
          <div className="flex items-start justify-between w-full relative z-10 shrink-0">
            <div className="space-y-2.5 select-none pr-2">
              <Logo size={36} className="shrink-0 shadow-none" />
              <div className="space-y-1">
                <DialogTitle className="font-sans font-bold text-lg sm:text-xl tracking-tight text-foreground p-0 m-0 leading-tight">
                  {t('welcome.dialogWelcomeTitle', '歡迎使用 Zenfit，')}
                </DialogTitle>
                <p className="text-sm text-muted-foreground font-sans leading-normal">
                  {t('welcome.dialogWelcomeSubtitle', '開始之前請輸入個人基本信息。')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground hover:bg-border transition-all cursor-pointer shrink-0 active:scale-92 -mr-0.5 -mt-0.5"
              title={t('common.close', '關閉')}
              aria-label={t('common.close', '關閉')}
            >
              <X className="size-3.5 stroke-[2.2]" />
            </button>
          </div>

          {/* 主容器：pt-2 space-y-3 嚴格縱向律動 */}
          <div className="flex flex-col space-y-3 pt-2 relative z-10">
            {/* 表單本體卡片 (Vercel Usage List 結構，divide-y) */}
            <div className="rounded-md border border-border divide-y divide-border bg-card text-foreground overflow-hidden">
            {/* 分區 1：姓名 */}
            <label className="h-10 px-3 flex items-center justify-between hover:bg-hover transition-colors cursor-text min-w-0">
              <span className="text-xs font-normal text-muted-foreground font-mono shrink-0">
                {t('welcome.name', '姓名')}
              </span>
              <input
                type="text"
                size={1}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="-"
                className="h-8 flex-1 min-w-0 ml-3 text-right text-xs font-mono text-foreground placeholder:text-muted-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
              />
            </label>

            {/* 分區 2：性別 與 出生年月 */}
            <div className="grid grid-cols-2 divide-x divide-border">
              {/* 左欄：性別 */}
              <div className="h-10 pl-3 pr-2.5 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden">
                <span className="text-xs font-normal text-muted-foreground font-mono truncate">
                  {t('welcome.gender', '性別')}
                </span>
                <div className="flex items-center gap-0.5 p-0.5 rounded bg-muted/20 border border-border text-xs font-mono shrink-0">
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

              {/* 右欄：出生年月 */}
              <MonthPicker
                value={birthDate}
                onChange={(val) => {
                  setBirthDate(val);
                  triggerHaptic('selection');
                }}
                className="h-10 pl-2.5 pr-3 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden cursor-pointer w-full select-none"
              >
                <span className="text-xs font-normal text-muted-foreground font-mono truncate">
                  {t('welcome.birthDate', '出生年月')}
                </span>
                <div className="flex items-center text-xs font-mono shrink-0">
                  <span className={cn(birthDate ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {birthDate ? (calculatedAge > 0 ? `${calculatedAge} ${t('welcome.yearsOld', '歲')}` : birthDate) : '-'}
                  </span>
                </div>
              </MonthPicker>
            </div>

            {/* 分區 3：單位偏好 */}
            <div className="h-10 px-3 flex items-center justify-between hover:bg-hover transition-colors">
              <span className="text-xs font-normal text-muted-foreground font-mono truncate">
                {t('welcome.unitPreference', '單位偏好')}
              </span>
              <div className="flex items-center gap-0.5 p-0.5 rounded bg-muted/20 border border-border text-xs font-mono shrink-0">
                <button
                  type="button"
                  onClick={() => handleUnitSystemChange('metric')}
                  className={cn(
                    'px-2.5 py-0.5 rounded text-[11px] cursor-pointer transition-all select-none',
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
                    'px-2.5 py-0.5 rounded text-[11px] cursor-pointer transition-all select-none',
                    preferences.preset === 'imperial'
                      ? 'bg-foreground text-background shadow-none'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t('settings.unitPresetImperial', '英制')}
                </button>
              </div>
            </div>

            {/* 分區 4：身高 與 體重 */}
            <div className="grid grid-cols-2 divide-x divide-border">
              {/* 左欄：身高 */}
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
                className="h-10 pl-3 pr-2.5 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden cursor-pointer w-full text-left select-none"
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

              {/* 右欄：體重 */}
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
                className="h-10 pl-2.5 pr-3 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden cursor-pointer w-full text-left select-none"
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

          {/* 獨立區塊：生理常數 (即時推算雙欄) */}
          <div className="rounded-md border border-border bg-card overflow-hidden font-mono divide-y divide-border/60">
            {/* 標籤小列 */}
            <div className="px-3 py-1 flex items-center justify-between text-muted-foreground bg-muted/20">
              <span className="text-[10px] uppercase tracking-wider">
                {t('welcome.previewTitle', '生理常數')}
              </span>
            </div>
            {/* 雙欄指標 */}
            <div className="grid grid-cols-2 divide-x divide-border text-left bg-muted/10">
              <div className="pl-3 pr-2.5 py-2 space-y-0.5 overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">
                  {t('welcome.bmi', '身體質量指數 (BMI)')}
                </div>
                <div className="text-xs sm:text-sm font-normal text-foreground font-mono leading-none">
                  {currentBMI > 0 ? currentBMI : '-'}
                </div>
              </div>
              <div className="pl-2.5 pr-3 py-2 space-y-0.5 overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">
                  {t('welcome.bmr', '靜態基礎代謝 (BMR)')}
                </div>
                <div className="flex items-baseline gap-1 text-foreground font-mono leading-none">
                  <span className="text-xs sm:text-sm font-normal">
                    {currentBMR > 0 ? currentBMR : '-'}
                  </span>
                  {currentBMR > 0 && (
                    <span className="text-[9px] text-muted-foreground font-normal">
                      kcal/day
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 進入 Zenfit 按鈕 (高度加高至 h-11 44px，帶 shrink-0 保證高度飽滿) */}
          <button
            type="button"
            onClick={handleComplete}
            disabled={!isFormValid || isSubmitting}
            className="w-full h-11 shrink-0 rounded-md bg-foreground text-background font-mono text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1.5 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-none"
          >
            <span>{isSubmitting ? t('welcome.startingApp', '正在啟動…') : t('welcome.enterApp', '進入 Zenfit')}</span>
          </button>

          {/* 底部客觀儀式小字 */}
          <div className="pt-0.5 text-center text-[10px] font-mono text-muted-foreground select-none">
            LOCAL-FIRST &middot; 100% PRIVATE
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* 平級兄弟節點：數字鍵盤次級彈窗 (Flat Sibling Portals 防巢狀) */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={Boolean(keypadConfig)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setKeypadConfig(null);
          }}
          title={keypadConfig.title}
          value={keypadConfig.value}
          unit={keypadConfig.unit}
          allowDecimals={keypadConfig.allowDecimals}
          maxDecimals={keypadConfig.allowDecimals ? 1 : 0}
          anchorEl={keypadConfig.anchorEl}
          onConfirm={handleKeypadConfirm}
          onLiveChange={handleKeypadLiveChange}
          onCancel={() => setKeypadConfig(null)}
          zIndex={80}
        />
      )}
    </>
  );
}
