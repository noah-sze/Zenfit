import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { calculateBMI, calculateBMR, calculateAgeFromBirth } from '@/utils/weightMath';
import { MonthPicker } from '@/components/ui/month-picker';
import { CalendarDays } from 'lucide-react';

export default function ProfileSettings() {
  const { t } = useTranslation();
  const { profile, updateProfile } = useUserProfile();

  // 本地表單狀態
  const [name, setName] = useState(profile.name || 'Noah');
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [birthDate, setBirthDate] = useState(profile.birthDate || '1999-01');
  const [heightCm, setHeightCm] = useState(String(profile.heightCm || 175));
  const [currentWeightKg, setCurrentWeightKg] = useState(String(profile.currentWeightKg || 70));
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(profile.weightUnit || 'kg');

  useEffect(() => {
    if (profile) {
      setName(profile.name || 'Noah');
      setGender(profile.gender || 'male');
      setBirthDate(profile.birthDate || '1999-01');
      setHeightCm(String(profile.heightCm || 175));
      setCurrentWeightKg(String(profile.currentWeightKg || 70));
      setWeightUnit(profile.weightUnit || 'kg');
    }
  }, [profile]);

  // 即時計算客觀生理常數
  const parsedWeight = parseFloat(currentWeightKg) || 0;
  const parsedHeight = parseFloat(heightCm) || 0;
  const calculatedAge = calculateAgeFromBirth(birthDate);
  const currentBMI = calculateBMI(parsedWeight, parsedHeight);
  const currentBMR = calculateBMR(parsedWeight, parsedHeight, gender, calculatedAge);

  const handleSave = async () => {
    const finalName = name.trim() || 'Noah';
    const finalHeight = parseFloat(heightCm) || 175;
    const finalWeight = parseFloat(currentWeightKg) || 70;

    await updateProfile({
      name: finalName,
      gender,
      birthDate,
      age: calculatedAge,
      heightCm: finalHeight,
      currentWeightKg: finalWeight,
      weightUnit,
    });

    triggerHaptic('success');
    toast.show(t('profileSettings.saved'));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 pb-20">
      {/* 區塊 1：基本資料 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('profileSettings.basicSection')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 姓名 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">
              {t('profileSettings.name')}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('profileSettings.namePlaceholder')}
              className="h-8 w-36 text-right text-sm font-mono text-foreground placeholder:text-muted-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
            />
          </div>

          {/* 性別 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">
              {t('profileSettings.gender')}
            </span>
            <Select
              value={gender}
              onValueChange={(v) => {
                setGender(v as 'male' | 'female');
                triggerHaptic('selection');
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {gender === 'female' ? t('profileSettings.female') : t('profileSettings.male')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="male">{t('profileSettings.male')}</SelectItem>
                <SelectItem value="female">{t('profileSettings.female')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 出生年月 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">
              {t('profileSettings.birthDate')}
            </span>
            <MonthPicker
              value={birthDate}
              onChange={setBirthDate}
              className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-foreground">{birthDate}</span>
                <span className="text-xs text-muted-foreground">
                  ({calculatedAge} {t('profileSettings.yearsOld')})
                </span>
                <CalendarDays className="size-3.5 text-muted-foreground/70" />
              </div>
            </MonthPicker>
          </div>

          {/* 身高 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">
              {t('profileSettings.height')}
            </span>
            <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
              <input
                type="text"
                inputMode="decimal"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="h-8 w-16 text-right text-sm font-mono text-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
              />
              <span>cm</span>
            </div>
          </div>
        </div>
      </div>

      {/* 區塊 2：體重基準 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('profileSettings.weightSection')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 度量單位 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">
              {t('profileSettings.unit')}
            </span>
            <Select
              value={weightUnit}
              onValueChange={(v) => {
                setWeightUnit(v as 'kg' | 'lbs');
                triggerHaptic('selection');
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {weightUnit}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lbs">lbs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 基準體重 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">
              {t('profileSettings.currentWeight')}
            </span>
            <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
              <input
                type="text"
                inputMode="decimal"
                value={currentWeightKg}
                onChange={(e) => setCurrentWeightKg(e.target.value)}
                className="h-8 w-16 text-right text-sm font-mono text-foreground bg-transparent border-none outline-none focus:ring-0 p-0"
              />
              <span>{weightUnit}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 區塊 3：客觀生理常數 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('profileSettings.metricsCalculation')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* BMI */}
          <div className="h-12 px-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
            <span className="text-sm font-normal text-foreground">
              {t('profileSettings.bmi')}
            </span>
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="font-medium text-foreground">
                {currentBMI > 0 ? currentBMI : '--'}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('profileSettings.whoStandard')}
              </span>
            </div>
          </div>

          {/* 靜態基礎代謝 BMR */}
          <div className="h-12 px-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
            <span className="text-sm font-normal text-foreground">
              {t('profileSettings.bmr')}
            </span>
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="font-medium text-foreground">
                {currentBMR > 0 ? currentBMR : '--'}
              </span>
              <span className="text-xs text-muted-foreground">
                kcal/day
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 儲存動作按鈕 */}
      <Button
        type="button"
        onClick={handleSave}
        className="w-full h-10 rounded-lg bg-foreground text-background hover:opacity-90 font-medium cursor-pointer shadow-none transition-all active:scale-[0.99]"
      >
        {t('profileSettings.save')}
      </Button>

      {/* 頁尾版本標記 (完全復刻 Zenance) */}
      <div className="pt-4 text-center font-mono text-xs text-muted-foreground/50">
        Zenfit v1.0.0
      </div>
    </div>
  );
}
