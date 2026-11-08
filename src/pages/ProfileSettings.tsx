import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { calculateBMI, calculateBMR, calculateAgeFromBirth } from '@/utils/weightMath';
import { cmToIn, inToCm } from '@/utils/unitMath';
import { MonthPicker } from '@/components/ui/month-picker';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { cn } from '@/lib/utils';

export default function ProfileSettings() {
  const { t } = useTranslation();
  const { profile, updateProfile, isLoading } = useUserProfile();
  const { lengthUnit } = useUnitPreferences();

  // 本地表單狀態
  const [name, setName] = useState(profile.name || '');
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [birthDate, setBirthDate] = useState(profile.birthDate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 內置數字鍵盤狀態
  const [keypadConfig, setKeypadConfig] = useState<{
    type: 'height';
    title: string;
    value: number;
    unit: string;
    allowDecimals?: boolean;
    anchorEl?: HTMLElement | null;
  } | null>(null);

  // 身高展示與換算
  const getInitialHeight = () => {
    const rawCm = profile.heightCm || 0;
    if (rawCm <= 0) return '';
    return lengthUnit === 'in' ? String(cmToIn(rawCm, 1)) : String(rawCm);
  };

  const [displayHeight, setDisplayHeight] = useState(getInitialHeight);
  const isInitializedRef = useRef(false);

  // 初始化個人資料表單數據（僅在初次非空載入時初始化，防止打字時被覆寫）
  useEffect(() => {
    if (!isLoading && !isInitializedRef.current) {
      setName(profile.name || '');
      setGender(profile.gender || 'male');
      setBirthDate(profile.birthDate || '');
      const rawCm = profile.heightCm || 0;
      setDisplayHeight(rawCm > 0 ? (lengthUnit === 'in' ? String(cmToIn(rawCm, 1)) : String(rawCm)) : '');
      isInitializedRef.current = true;
    }
  }, [isLoading, profile, lengthUnit]);

  // 長度單位切換時僅更新身高展示
  useEffect(() => {
    if (isInitializedRef.current) {
      const rawCm = heightInCm;
      if (rawCm > 0) {
        setDisplayHeight(lengthUnit === 'in' ? String(cmToIn(rawCm, 1)) : String(rawCm));
      }
    }
  }, [lengthUnit]);

  // 折算身高基準 cm
  const parsedDisplayHeight = parseFloat(displayHeight) || 0;
  const heightInCm = lengthUnit === 'in' ? inToCm(parsedDisplayHeight) : parsedDisplayHeight;

  // 體重由系統既有記錄提供 (若無則為 0)
  const weightInKg = profile.currentWeightKg || 0;

  // 年齡與生理常數即時推算
  const calculatedAge = birthDate ? calculateAgeFromBirth(birthDate) : 0;
  const currentBMI = calculateBMI(weightInKg, heightInCm);
  const currentBMR = calculateBMR(weightInKg, heightInCm, gender, calculatedAge);

  // 內置鍵盤確認與即時聯動回調
  const handleKeypadConfirm = (val: number) => {
    setDisplayHeight(val > 0 ? String(val) : '');
    setKeypadConfig(null);
  };

  const handleKeypadLiveChange = (val: number) => {
    setDisplayHeight(val > 0 ? String(val) : '');
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    const finalName = name.trim();
    const finalHeight = heightInCm > 0 ? heightInCm : 0;

    await updateProfile({
      name: finalName,
      gender,
      birthDate,
      age: calculatedAge,
      heightCm: finalHeight,
    });

    setIsSubmitting(false);
    triggerHaptic('success');
    toast.show(t('profileSettings.saved', '已儲存'));
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* 區塊 1：基本資料卡片 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
        {/* 行 1：姓名 (收斂上下邊距，高度 h-16 64px，小屏幕防溢出防截斷 min-w-0) */}
        <label className="h-16 px-3.5 sm:px-4 flex items-center justify-between hover:bg-hover transition-colors cursor-text min-w-0">
          <span className="text-xs font-normal text-muted-foreground font-mono shrink-0">
            {t('profileSettings.name', '姓名')}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="-"
            className="h-10 flex-1 min-w-0 ml-3 sm:ml-4 text-right text-base sm:text-lg font-bold font-mono text-foreground placeholder:text-muted-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
          />
        </label>

        {/* 行 2：生理性別 與 出生年月 (各佔 50%，全寬點擊熱區) */}
        <div className="grid grid-cols-2 divide-x divide-border">
          {/* 左欄：生理性別 (極簡分段按鈕) */}
          <div className="h-11 px-3 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden">
            <span className="text-xs font-normal text-muted-foreground font-mono truncate">
              {t('profileSettings.gender', '生理性別')}
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

          {/* 右欄：出生年月 (全格點擊呼出 MonthPicker，格式化帶空格歲數) */}
          <MonthPicker
            value={birthDate}
            onChange={(val) => {
              setBirthDate(val);
              triggerHaptic('selection');
            }}
            className="h-11 px-3 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden cursor-pointer w-full select-none"
          >
            <span className="text-xs font-normal text-muted-foreground font-mono truncate">
              {t('profileSettings.birthDate', '出生年月')}
            </span>
            <div className="flex items-center text-xs font-mono shrink-0">
              <span className={cn(birthDate ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {birthDate ? (calculatedAge > 0 ? `${calculatedAge} ${t('welcome.yearsOld', '歲')}` : birthDate) : '-'}
              </span>
            </div>
          </MonthPicker>
        </div>

        {/* 行 3：身高 (全行可點擊呼出數字鍵盤) */}
        <button
          type="button"
          onClick={(e) => {
            triggerHaptic('light');
            setKeypadConfig({
              type: 'height',
              title: t('profileSettings.height', '身高'),
              value: parsedDisplayHeight,
              unit: lengthUnit,
              allowDecimals: lengthUnit === 'in',
              anchorEl: e.currentTarget,
            });
          }}
          className="h-11 px-3.5 sm:px-4 flex items-center justify-between hover:bg-hover transition-colors overflow-hidden cursor-pointer w-full text-left select-none"
        >
          <span className="text-xs font-normal text-muted-foreground font-mono truncate">
            {t('profileSettings.height', '身高')}
          </span>
          <div className="flex items-center gap-1 font-mono text-xs shrink-0">
            <span className={cn(displayHeight ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {displayHeight || '-'}
            </span>
            <span className="text-xs text-foreground font-mono">{lengthUnit}</span>
          </div>
        </button>
      </div>

      {/* 區塊 2：生理常數 (單獨一個獨立卡片區塊) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card font-mono">
        {/* 小標題列 (改為純生理常數標籤，無右側冗餘公式名) */}
        <div className="px-3.5 py-1.5 flex items-center justify-between text-muted-foreground/80 border-b border-border/60 bg-muted/10">
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            {t('profileSettings.metricsCalculation', '生理常數')}
          </span>
        </div>

        {/* 雙欄指標 (BMI 與 BMR) */}
        <div className="grid grid-cols-2 divide-x divide-border text-left">
          {/* BMI */}
          <div className="p-3 sm:p-3.5 space-y-1 overflow-hidden">
            <div className="text-[10px] font-medium text-muted-foreground truncate">
              {t('welcome.bmi', '身體質量指數 (BMI)')}
            </div>
            <div className="text-base sm:text-lg font-bold text-foreground font-mono leading-none">
              {currentBMI > 0 ? currentBMI : '-'}
            </div>
          </div>

          {/* BMR */}
          <div className="p-3 sm:p-3.5 space-y-1 overflow-hidden">
            <div className="text-[10px] font-medium text-muted-foreground truncate">
              {t('welcome.bmr', '靜態基礎代謝 (BMR)')}
            </div>
            <div className="flex items-baseline gap-1 text-foreground font-mono leading-none">
              <span className="text-base sm:text-lg font-bold">
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

      {/* 儲存動作按鈕 */}
      <Button
        type="button"
        onClick={handleSave}
        disabled={isSubmitting}
        className="w-full h-10 rounded-lg bg-foreground text-background hover:opacity-90 font-mono text-xs font-medium cursor-pointer shadow-none transition-all active:scale-[0.99]"
      >
        {t('profileSettings.save', '儲存')}
      </Button>

      {/* 內置數字鍵盤微調彈窗 (平級兄弟節點, Instant Pop, 專屬身高調用) */}
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
