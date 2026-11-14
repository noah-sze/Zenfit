import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { WeightTrendChart } from '@/components/body/WeightTrendChart';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import {
  calculateBMI,
  calculateFatMass,
  calculateFFMI,
  calculateVTaperRatio,
  calculateWHRatio,
} from '@/utils/weightMath';
import { convertBodyWeight, cmToIn, inToCm, lbsToKg } from '@/utils/unitMath';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { useBodyPreferences } from '@/hooks/useBodyPreferences';
import { Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BodyMetric } from '@/types';

type KeypadMetricField =
  | 'weight'
  | 'bodyFat'
  | 'shouldersCm'
  | 'waistCm'
  | 'hipsCm'
  | 'chestCm'
  | 'armsCm'
  | 'thighsCm';

type BodyMetricKey =
  | 'trendWeight'
  | 'bmi'
  | 'ffmi'
  | 'leanBodyMass'
  | 'fatMass'
  | 'vTaperRatio'
  | 'whRatio';

interface KeypadConfig {
  field: KeypadMetricField;
  title: string;
  value: number;
  unit: string;
  allowDecimals: boolean;
  anchorEl?: HTMLElement | null;
}

export default function Body() {
  const { t } = useTranslation();
  const { selectedDate } = useAppStore();
  const { profile, updateProfile } = useUserProfile();
  const { bodyWeightUnit, lengthUnit } = useUnitPreferences();
  const { bodyPreferences } = useBodyPreferences();
  const confirm = useConfirm();

  const {
    metricToday,
    recentHistory,
    trendPoints,
    currentTrendWeight,
    saveMetric,
    deleteMetric,
  } = useBodyMetrics(selectedDate);

  // 鍵盤微調彈窗狀態
  const [keypadConfig, setKeypadConfig] = useState<KeypadConfig | null>(null);

  // 體態指標說明 Popover 狀態
  const [activeMetricInfo, setActiveMetricInfo] = useState<BodyMetricKey | null>(null);
  const [metricAnchorEl, setMetricAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpenMetricPopover = (key: BodyMetricKey, target: HTMLElement) => {
    triggerHaptic('selection');
    setActiveMetricInfo(key);
    setMetricAnchorEl(target);
  };


  // 1. 客觀體重與生理指標推算
  const rawTodayWeight = metricToday?.weight || null;
  const displayTodayWeight = rawTodayWeight
    ? convertBodyWeight(rawTodayWeight, 'kg', bodyWeightUnit)
    : null;

  const displayTrendWeight = currentTrendWeight
    ? convertBodyWeight(currentTrendWeight, 'kg', bodyWeightUnit)
    : null;

  const displayCurrentWeight = profile.currentWeightKg
    ? convertBodyWeight(profile.currentWeightKg, 'kg', bodyWeightUnit)
    : null;

  // 趨勢折線圖數據 (依照當前體重單位適配)
  const displayTrendPoints = useMemo(() => {
    if (bodyWeightUnit === 'kg') return trendPoints;
    return trendPoints.map((p) => ({
      ...p,
      rawWeight: p.rawWeight ? convertBodyWeight(p.rawWeight, 'kg', 'lbs') : undefined,
      trendWeight: convertBodyWeight(p.trendWeight, 'kg', 'lbs'),
    }));
  }, [trendPoints, bodyWeightUnit]);

  // 統計當日已填寫的體態指標項數
  const loggedMetricsCount = useMemo(() => {
    if (!metricToday) return 0;
    let count = 0;
    if (typeof metricToday.weight === 'number' && metricToday.weight > 0) count++;
    if (typeof metricToday.bodyFat === 'number' && metricToday.bodyFat > 0) count++;
    if (!bodyPreferences.ignoreTorsoCircumferences) {
      if (typeof metricToday.shouldersCm === 'number' && metricToday.shouldersCm > 0) count++;
      if (typeof metricToday.chestCm === 'number' && metricToday.chestCm > 0) count++;
      if (typeof metricToday.waistCm === 'number' && metricToday.waistCm > 0) count++;
      if (typeof metricToday.hipsCm === 'number' && metricToday.hipsCm > 0) count++;
    }
    if (!bodyPreferences.ignoreLimbCircumferences) {
      if (typeof metricToday.armsCm === 'number' && metricToday.armsCm > 0) count++;
      if (typeof metricToday.thighsCm === 'number' && metricToday.thighsCm > 0) count++;
    }
    return count;
  }, [metricToday, bodyPreferences.ignoreTorsoCircumferences, bodyPreferences.ignoreLimbCircumferences]);

  const hasAnyTodayLog = loggedMetricsCount > 0;

  // 查找最後一次（最近歷史）的各項指標數據（用於當日未填寫時的淡灰參考顯示）
  const lastRecordedValues = useMemo(() => {
    const priorHistory = recentHistory.filter((m) => m.date < selectedDate);
    const candidateHistory = priorHistory.length > 0
      ? priorHistory
      : recentHistory.filter((m) => m.date !== selectedDate);

    const getLatestValue = (field: keyof BodyMetric): number | null => {
      for (const rec of candidateHistory) {
        const val = rec[field];
        if (typeof val === 'number' && val > 0) {
          return val;
        }
      }
      return null;
    };

    return {
      weight: getLatestValue('weight') ?? profile.currentWeightKg ?? null,
      bodyFat: getLatestValue('bodyFat'),
      shouldersCm: getLatestValue('shouldersCm'),
      chestCm: getLatestValue('chestCm'),
      waistCm: getLatestValue('waistCm'),
      hipsCm: getLatestValue('hipsCm'),
      armsCm: getLatestValue('armsCm'),
      thighsCm: getLatestValue('thighsCm'),
    };
  }, [recentHistory, selectedDate, profile.currentWeightKg]);

  // 各指標項當日是否已記錄判斷
  const hasTodayWeight = typeof metricToday?.weight === 'number' && metricToday.weight > 0;
  const hasTodayBodyFat = typeof metricToday?.bodyFat === 'number' && metricToday.bodyFat > 0;
  const hasTodayShoulders = typeof metricToday?.shouldersCm === 'number' && metricToday.shouldersCm > 0;
  const hasTodayChest = typeof metricToday?.chestCm === 'number' && metricToday.chestCm > 0;
  const hasTodayWaist = typeof metricToday?.waistCm === 'number' && metricToday.waistCm > 0;
  const hasTodayHips = typeof metricToday?.hipsCm === 'number' && metricToday.hipsCm > 0;
  const hasTodayArms = typeof metricToday?.armsCm === 'number' && metricToday.armsCm > 0;
  const hasTodayThighs = typeof metricToday?.thighsCm === 'number' && metricToday.thighsCm > 0;

  // 各指標展示數值推算（當日優先，回退最後一次歷史值）
  const displayLastWeight = lastRecordedValues.weight
    ? convertBodyWeight(lastRecordedValues.weight, 'kg', bodyWeightUnit)
    : null;
  const heroDisplayWeight = hasTodayWeight ? displayTodayWeight : displayLastWeight;

  const effectiveBodyFat = hasTodayBodyFat ? metricToday?.bodyFat : lastRecordedValues.bodyFat;

  const rawShoulders = hasTodayShoulders ? metricToday?.shouldersCm : lastRecordedValues.shouldersCm;
  const effectiveShoulders = rawShoulders ? (lengthUnit === 'in' ? cmToIn(rawShoulders, 1) : rawShoulders) : null;

  const rawChest = hasTodayChest ? metricToday?.chestCm : lastRecordedValues.chestCm;
  const effectiveChest = rawChest ? (lengthUnit === 'in' ? cmToIn(rawChest, 1) : rawChest) : null;

  const rawWaist = hasTodayWaist ? metricToday?.waistCm : lastRecordedValues.waistCm;
  const effectiveWaist = rawWaist ? (lengthUnit === 'in' ? cmToIn(rawWaist, 1) : rawWaist) : null;

  const rawHips = hasTodayHips ? metricToday?.hipsCm : lastRecordedValues.hipsCm;
  const effectiveHips = rawHips ? (lengthUnit === 'in' ? cmToIn(rawHips, 1) : rawHips) : null;

  const rawArms = hasTodayArms ? metricToday?.armsCm : lastRecordedValues.armsCm;
  const effectiveArms = rawArms ? (lengthUnit === 'in' ? cmToIn(rawArms, 1) : rawArms) : null;

  const rawThighs = hasTodayThighs ? metricToday?.thighsCm : lastRecordedValues.thighsCm;
  const effectiveThighs = rawThighs ? (lengthUnit === 'in' ? cmToIn(rawThighs, 1) : rawThighs) : null;

  // 客觀體重與生理指標推算 (BMI、去脂體重、脂肪總重)
  const effectiveWeightKg =
    rawTodayWeight ||
    currentTrendWeight ||
    lastRecordedValues.weight ||
    profile.currentWeightKg ||
    null;

  const bmi =
    effectiveWeightKg && effectiveWeightKg > 0
      ? calculateBMI(effectiveWeightKg, profile.heightCm)
      : 0;

  // 去脂體重 (LBM) 與 脂肪總重 (FM)
  const leanMassKg = useMemo(() => {
    const w =
      rawTodayWeight ||
      currentTrendWeight ||
      lastRecordedValues.weight ||
      profile.currentWeightKg ||
      null;
    const bf = effectiveBodyFat;
    if (w && bf && w > 0 && bf > 0) {
      return Math.round(w * (1 - bf / 100) * 10) / 10;
    }
    return null;
  }, [rawTodayWeight, currentTrendWeight, lastRecordedValues.weight, profile.currentWeightKg, effectiveBodyFat]);

  const displayLeanMass = leanMassKg !== null
    ? convertBodyWeight(leanMassKg, 'kg', bodyWeightUnit)
    : null;

  const fatMassKg = useMemo(() => {
    const w =
      rawTodayWeight ||
      currentTrendWeight ||
      lastRecordedValues.weight ||
      profile.currentWeightKg ||
      null;
    return calculateFatMass(w, effectiveBodyFat);
  }, [rawTodayWeight, currentTrendWeight, lastRecordedValues.weight, profile.currentWeightKg, effectiveBodyFat]);

  const displayFatMass = fatMassKg !== null
    ? convertBodyWeight(fatMassKg, 'kg', bodyWeightUnit)
    : null;

  // 去脂體重指數 (FFMI)
  const ffmi = useMemo(() => {
    return calculateFFMI(leanMassKg, profile.heightCm);
  }, [leanMassKg, profile.heightCm]);

  // 判斷體態指標是否擁有當日最新實測數據 (無今日數據時變灰顯示)
  const isMetricFresh = (key: BodyMetricKey): boolean => {
    switch (key) {
      case 'trendWeight':
      case 'bmi':
        return hasTodayWeight;
      case 'ffmi':
      case 'leanBodyMass':
      case 'fatMass':
        return hasTodayWeight && hasTodayBodyFat;
      case 'vTaperRatio':
        return hasTodayChest && hasTodayWaist;
      case 'whRatio':
        return hasTodayWaist && hasTodayHips;
      default:
        return false;
    }
  };

  // 體型幾何比例 (胸腰倒三角比、腰臀比)
  const vTaperRatio = useMemo(() => {
    return calculateVTaperRatio(rawChest, rawWaist);
  }, [rawChest, rawWaist]);

  const whRatio = useMemo(() => {
    return calculateWHRatio(rawWaist, rawHips);
  }, [rawWaist, rawHips]);

  // 取得體態指標格式化數值
  const getMetricDisplayValue = (key: BodyMetricKey): string => {
    switch (key) {
      case 'trendWeight':
        return displayTrendWeight ? `${displayTrendWeight}${bodyWeightUnit}` : '-';
      case 'bmi':
        return bmi > 0 ? `${bmi}` : '-';
      case 'ffmi':
        return ffmi !== null ? `${ffmi}` : '-';
      case 'leanBodyMass':
        return displayLeanMass ? `${displayLeanMass}${bodyWeightUnit}` : '-';
      case 'fatMass':
        return displayFatMass ? `${displayFatMass}${bodyWeightUnit}` : '-';
      case 'vTaperRatio':
        return vTaperRatio !== null ? `${vTaperRatio}` : '-';
      case 'whRatio':
        return whRatio !== null ? `${whRatio}` : '-';
      default:
        return '-';
    }
  };

  // 是否忽略所有圍度（胸腰臀與四肢圍度均被忽略時，今日數據卡片切換為方案 C 極簡一體化微膠囊嵌合結構）
  const isAllCircumferencesIgnored =
    bodyPreferences.ignoreTorsoCircumferences && bodyPreferences.ignoreLimbCircumferences;

  // 30 天圍度演進變動量推算
  const circumferenceChanges = useMemo(() => {
    const thirtyDaysAgoStr = format(subDays(parseISO(selectedDate), 30), 'yyyy-MM-dd');
    const historyIn30Days = recentHistory
      .filter((r) => r.date < selectedDate && r.date >= thirtyDaysAgoStr)
      .sort((a, b) => a.date.localeCompare(b.date)); // 升序，最舊的在前

    const getBaseline = (field: keyof BodyMetric): number | null => {
      for (const r of historyIn30Days) {
        const v = r[field];
        if (typeof v === 'number' && v > 0) return v;
      }
      const prior = recentHistory.filter((r) => r.date < selectedDate);
      for (const r of prior) {
        const v = r[field];
        if (typeof v === 'number' && v > 0) return v;
      }
      return null;
    };

    const getDelta = (currentRaw: number | null | undefined, baselineRaw: number | null) => {
      if (!currentRaw || !baselineRaw) return null;
      const currentVal = lengthUnit === 'in' ? cmToIn(currentRaw, 1) : currentRaw;
      const baselineVal = lengthUnit === 'in' ? cmToIn(baselineRaw, 1) : baselineRaw;
      return Math.round((currentVal - baselineVal) * 10) / 10;
    };

    return {
      shouldersDelta: getDelta(rawShoulders, getBaseline('shouldersCm')),
      chestDelta: getDelta(rawChest, getBaseline('chestCm')),
      waistDelta: getDelta(rawWaist, getBaseline('waistCm')),
      hipsDelta: getDelta(rawHips, getBaseline('hipsCm')),
      armsDelta: getDelta(rawArms, getBaseline('armsCm')),
      thighsDelta: getDelta(rawThighs, getBaseline('thighsCm')),
    };
  }, [recentHistory, selectedDate, lengthUnit, rawShoulders, rawChest, rawWaist, rawHips, rawArms, rawThighs]);

  // ==========================================
  // 數字鍵盤微調處理
  // ==========================================
  const handleOpenKeypad = (
    field: KeypadMetricField,
    _currentVal: number,
    title: string,
    unit: string,
    anchorEl?: HTMLElement | null
  ) => {
    triggerHaptic('selection');
    setKeypadConfig({
      field,
      title: `${selectedDate} · ${title}`,
      value: 0,
      unit,
      allowDecimals: true,
      anchorEl,
    });
  };

  // 取得當前鍵盤欄位的指引說明、測量方法與現時數值/來源
  const getFieldGuideInfo = (field: KeypadMetricField) => {
    let displayVal: number | null = null;
    let sourceText = '';
    let isToday = false;

    // 1. 檢查當日是否已有記錄
    if (field === 'weight') {
      if (hasTodayWeight && metricToday?.weight) {
        displayVal = convertBodyWeight(metricToday.weight, 'kg', bodyWeightUnit);
        sourceText = t('body.keypadGuide.todayRecord', '當日記錄');
        isToday = true;
      }
    } else if (field === 'bodyFat') {
      if (hasTodayBodyFat && metricToday?.bodyFat) {
        displayVal = metricToday.bodyFat;
        sourceText = t('body.keypadGuide.todayRecord', '當日記錄');
        isToday = true;
      }
    } else {
      const todayCircum = metricToday?.[field];
      if (typeof todayCircum === 'number' && todayCircum > 0) {
        displayVal = lengthUnit === 'in' ? cmToIn(todayCircum, 1) : todayCircum;
        sourceText = t('body.keypadGuide.todayRecord', '當日記錄');
        isToday = true;
      }
    }

    // 2. 若當日無記錄，尋找最後歷史舊記錄
    if (!isToday) {
      const priorHistory = recentHistory.filter((m) => m.date < selectedDate);
      const candidateHistory = priorHistory.length > 0
        ? priorHistory
        : recentHistory.filter((m) => m.date !== selectedDate);

      let foundRec: BodyMetric | null = null;
      for (const rec of candidateHistory) {
        const val = rec[field];
        if (typeof val === 'number' && val > 0) {
          foundRec = rec;
          break;
        }
      }

      if (foundRec) {
        const recVal = foundRec[field] as number;
        const daysAgo = Math.max(1, differenceInCalendarDays(parseISO(selectedDate), parseISO(foundRec.date)));
        sourceText = t('body.keypadGuide.daysAgoReference', {
          defaultValue: '來自 {{days}} 天前',
          days: daysAgo,
        });

        if (field === 'weight') {
          displayVal = convertBodyWeight(recVal, 'kg', bodyWeightUnit);
        } else if (field === 'bodyFat') {
          displayVal = recVal;
        } else {
          displayVal = lengthUnit === 'in' ? cmToIn(recVal, 1) : recVal;
        }
      } else if (field === 'weight' && profile.currentWeightKg && profile.currentWeightKg > 0) {
        displayVal = convertBodyWeight(profile.currentWeightKg, 'kg', bodyWeightUnit);
        sourceText = t('body.keypadGuide.profileReference', '來自基本資料');
      } else {
        sourceText = t('body.keypadGuide.noRecord', '尚未記錄');
      }
    }

    const desc = t(`body.metricGuides.${field}.desc`, '');
    const method = t(`body.metricGuides.${field}.method`, '');

    return {
      displayVal,
      sourceText,
      isToday,
      desc,
      method,
    };
  };

  const handleKeypadConfirm = async (val: number) => {
    if (!keypadConfig) return;
    const { field } = keypadConfig;
    const cleanNum = val > 0 ? val : undefined;

    if (field === 'weight') {
      const kgVal = cleanNum !== undefined
        ? (bodyWeightUnit === 'lbs' ? lbsToKg(cleanNum, 1) : cleanNum)
        : undefined;

      await saveMetric({ weight: kgVal });
      if (kgVal) {
        await updateProfile({ currentWeightKg: kgVal });
      }
    } else if (field === 'bodyFat') {
      await saveMetric({ bodyFat: cleanNum });
    } else {
      // 圍度單位統一轉回 cm 儲存
      const cmVal = cleanNum !== undefined
        ? (lengthUnit === 'in' ? inToCm(cleanNum, 2) : cleanNum)
        : undefined;
      await saveMetric({ [field]: cmVal });
    }

    triggerHaptic('success');
    toast.show(t('common.saved', '已儲存'));
    setKeypadConfig(null);
  };

  // 刪除當日過磅記錄
  const handleDeleteTodayMetric = async () => {
    if (!metricToday) return;
    const ok = await confirm({
      title: t('common.delete', '刪除'),
      description: t('body.confirmDeleteTodayWeight', '確認刪除今日過磅記錄？'),
      variant: 'destructive',
    });
    if (ok) {
      triggerHaptic('warning');
      await deleteMetric(metricToday.id);
      toast.show(t('common.deleted', '已刪除'));
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20 select-none">
      {/* ========================================================================= */}
      {/* 模組 1：過磅記錄卡片 (方案 C：全圍度忽略時之一體化微膠囊嵌合結構) */}
      {/* ========================================================================= */}
      <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground select-none font-mono">
        {/* 上半部：實測體重 (Hero Metric) 與 體脂率微型工藝膠囊 */}
        <div className="p-4 sm:p-5 relative space-y-3">
          {/* 頂部列：中間標題「今日數據」居中，右側動作 (刪除今日記錄) */}
          <div className="relative flex items-center justify-between">
            {/* 佔位平衡元素保證標題幾何絕對置中 */}
            <div className="size-6 shrink-0 opacity-0 pointer-events-none" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs sm:text-sm font-normal text-muted-foreground select-none">
                {t('body.todayData', '今日數據')}
              </span>
            </div>

            <div className="shrink-0 z-10">
              {hasAnyTodayLog ? (
                <button
                  type="button"
                  onClick={handleDeleteTodayMetric}
                  className="size-6 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title={t('common.delete', '刪除')}
                  aria-label={t('common.delete', '刪除')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : (
                <div className="size-6 shrink-0 opacity-0 pointer-events-none" />
              )}
            </div>
          </div>

          {/* 居中巨型數值 (點擊呼出鍵盤微調體重) */}
          <div
            onClick={(e) =>
              handleOpenKeypad(
                'weight',
                heroDisplayWeight || displayTrendWeight || displayCurrentWeight || 0,
                t('body.rawWeight', '體重'),
                bodyWeightUnit,
                e.currentTarget
              )
            }
            className="pt-1 text-center cursor-pointer group"
          >
            <div className="hero-number flex items-baseline justify-center gap-1.5 font-mono">
              <span
                className={cn(
                  'text-4xl sm:text-5xl font-bold tracking-tight transition-all',
                  hasTodayWeight
                    ? 'text-foreground group-hover:opacity-80'
                    : heroDisplayWeight
                      ? 'text-muted-foreground/40 group-hover:text-muted-foreground/70'
                      : 'text-muted-foreground/30 group-hover:text-foreground'
                )}
              >
                {heroDisplayWeight || '-'}
              </span>
              <span
                className={cn(
                  'text-sm sm:text-base font-normal font-mono transition-colors',
                  hasTodayWeight ? 'text-muted-foreground' : 'text-muted-foreground/40'
                )}
              >
                {bodyWeightUnit}
              </span>
            </div>
          </div>

          {/* 嵌合在下方的體脂率微型工藝膠囊 */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={(e) =>
                handleOpenKeypad(
                  'bodyFat',
                  effectiveBodyFat || 0,
                  t('body.bodyFat', '體脂率'),
                  '%',
                  e.currentTarget
                )
              }
              className="h-7 px-3 rounded-full border border-border bg-muted/30 hover:bg-hover active:scale-95 transition-all cursor-pointer font-mono text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <span className="text-[11px]">{t('body.bodyFat', '體脂率')}</span>
              <span
                className={cn(
                  'transition-colors font-medium',
                  hasTodayBodyFat
                    ? 'text-foreground'
                    : effectiveBodyFat
                      ? 'text-muted-foreground/60'
                      : 'text-muted-foreground/40'
                )}
              >
                {effectiveBodyFat ? `${effectiveBodyFat}%` : '-'}
              </span>
              <ChevronRight className="size-3 opacity-60" />
            </button>
          </div>
        </div>

        {/* 下半部圍度欄位（當 !isAllCircumferencesIgnored 時） */}
        {!isAllCircumferencesIgnored && (
          <>
            {/* 軀幹部位圍度：4 欄 (肩寬 | 胸圍 | 腰圍 | 臀圍) */}
            {!bodyPreferences.ignoreTorsoCircumferences && (
              <div className="grid grid-cols-4 divide-x divide-border border-t border-border font-mono">
                {/* 1. 肩寬 */}
                <button
                  type="button"
                  onClick={(e) =>
                    handleOpenKeypad(
                      'shouldersCm',
                      effectiveShoulders || 0,
                      t('body.shoulders', '肩寬'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-2.5 sm:p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.shoulders', '肩寬')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayShoulders
                        ? 'text-foreground'
                        : effectiveShoulders
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {effectiveShoulders ? `${effectiveShoulders}${lengthUnit}` : '-'}
                  </div>
                </button>

                {/* 2. 胸圍 */}
                <button
                  type="button"
                  onClick={(e) =>
                    handleOpenKeypad(
                      'chestCm',
                      effectiveChest || 0,
                      t('body.chest', '胸圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-2.5 sm:p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.chest', '胸圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayChest
                        ? 'text-foreground'
                        : effectiveChest
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {effectiveChest ? `${effectiveChest}${lengthUnit}` : '-'}
                  </div>
                </button>

                {/* 3. 腰圍 */}
                <button
                  type="button"
                  onClick={(e) =>
                    handleOpenKeypad(
                      'waistCm',
                      effectiveWaist || 0,
                      t('body.waist', '腰圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-2.5 sm:p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.waist', '腰圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayWaist
                        ? 'text-foreground'
                        : effectiveWaist
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {effectiveWaist ? `${effectiveWaist}${lengthUnit}` : '-'}
                  </div>
                </button>

                {/* 4. 臀圍 */}
                <button
                  type="button"
                  onClick={(e) =>
                    handleOpenKeypad(
                      'hipsCm',
                      effectiveHips || 0,
                      t('body.hips', '臀圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-2.5 sm:p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.hips', '臀圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayHips
                        ? 'text-foreground'
                        : effectiveHips
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {effectiveHips ? `${effectiveHips}${lengthUnit}` : '-'}
                  </div>
                </button>
              </div>
            )}

            {/* 四肢部位圍度：2 欄 (手臂圍 | 大腿圍) */}
            {!bodyPreferences.ignoreLimbCircumferences && (
              <div className="grid grid-cols-2 divide-x divide-border border-t border-border font-mono">
                {/* 手臂圍 */}
                <button
                  type="button"
                  onClick={(e) =>
                    handleOpenKeypad(
                      'armsCm',
                      effectiveArms || 0,
                      t('body.arms', '手臂圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-2.5 sm:p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.arms', '手臂圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayArms
                        ? 'text-foreground'
                        : effectiveArms
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {effectiveArms ? `${effectiveArms}${lengthUnit}` : '-'}
                  </div>
                </button>

                {/* 大腿圍 */}
                <button
                  type="button"
                  onClick={(e) =>
                    handleOpenKeypad(
                      'thighsCm',
                      effectiveThighs || 0,
                      t('body.thighs', '大腿圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-2.5 sm:p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.thighs', '大腿圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayThighs
                        ? 'text-foreground'
                        : effectiveThighs
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {effectiveThighs ? `${effectiveThighs}${lengthUnit}` : '-'}
                  </div>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 模組 2：體態指標 (平滑體重 · BMI · FFMI · 去脂體重 · 脂肪總重) */}
      {/* ========================================================================= */}
      <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground select-none font-mono">
        <div className="px-3.5 sm:px-4 py-2.5 border-b border-border flex items-center justify-between text-xs">
          <span className="font-semibold text-xs uppercase tracking-widest text-muted-foreground font-sans">
            {t('body.metricsTitle', '體態指標')}
          </span>
        </div>

        {/* 第一列：平滑體重 (獨立一行，基準生理指標，點擊展開說明) */}
        <button
          type="button"
          onClick={(e) => handleOpenMetricPopover('trendWeight', e.currentTarget)}
          className="w-full p-3 sm:p-3.5 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
        >
          <div className="text-[11px] text-muted-foreground truncate">
            {t('body.trendWeight', '平滑體重')}
          </div>
          <div
            className={cn(
              'text-base sm:text-lg font-normal truncate transition-colors',
              hasTodayWeight
                ? 'text-foreground'
                : displayTrendWeight
                  ? 'text-muted-foreground/40'
                  : 'text-muted-foreground/25'
            )}
          >
            {displayTrendWeight ? `${displayTrendWeight}${bodyWeightUnit}` : '-'}
          </div>
        </button>

        {/* 第二列：雙生理指數 (BMI 首位 · FFMI 去脂指數) */}
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          {/* 1. BMI 指數 (排在第一位) */}
          <button
            type="button"
            onClick={(e) => handleOpenMetricPopover('bmi', e.currentTarget)}
            className="p-2.5 sm:p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
          >
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.bmi', 'BMI')}
            </div>
            <div
              className={cn(
                'text-sm sm:text-base font-normal truncate transition-colors',
                hasTodayWeight
                  ? 'text-foreground'
                  : bmi > 0
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {bmi > 0 ? bmi : '-'}
            </div>
          </button>

          {/* 2. FFMI 指數 (去脂體重指數) */}
          <button
            type="button"
            onClick={(e) => handleOpenMetricPopover('ffmi', e.currentTarget)}
            className="p-2.5 sm:p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
          >
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.ffmi', 'FFMI')}
            </div>
            <div
              className={cn(
                'text-sm sm:text-base font-normal truncate transition-colors',
                hasTodayWeight && hasTodayBodyFat
                  ? 'text-foreground'
                  : ffmi !== null
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {ffmi !== null ? ffmi : '-'}
            </div>
          </button>
        </div>

        {/* 第三列：雙體組成物理量 (去脂體重 · 脂肪總重) */}
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          {/* 3. 去脂體重 */}
          <button
            type="button"
            onClick={(e) => handleOpenMetricPopover('leanBodyMass', e.currentTarget)}
            className="p-2.5 sm:p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
          >
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.leanBodyMass', '去脂體重')}
            </div>
            <div
              className={cn(
                'text-sm sm:text-base font-normal truncate transition-colors',
                hasTodayWeight && hasTodayBodyFat
                  ? 'text-foreground'
                  : displayLeanMass
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {displayLeanMass ? `${displayLeanMass}${bodyWeightUnit}` : '-'}
            </div>
          </button>

          {/* 4. 脂肪總重 */}
          <button
            type="button"
            onClick={(e) => handleOpenMetricPopover('fatMass', e.currentTarget)}
            className="p-2.5 sm:p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
          >
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.fatMass', '脂肪總重')}
            </div>
            <div
              className={cn(
                'text-sm sm:text-base font-normal truncate transition-colors',
                hasTodayWeight && hasTodayBodyFat
                  ? 'text-foreground'
                  : displayFatMass
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {displayFatMass ? `${displayFatMass}${bodyWeightUnit}` : '-'}
            </div>
          </button>
        </div>
      </div>

      {/* 體態指標說明 Popover 浮層 */}
      <Popover
        open={!!activeMetricInfo}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setActiveMetricInfo(null);
            setMetricAnchorEl(null);
          }
        }}
      >
        {metricAnchorEl && activeMetricInfo && (
          <PopoverContent
            anchor={metricAnchorEl}
            align="center"
            side="bottom"
            sideOffset={6}
            className="w-80 sm:w-88 max-w-[calc(100vw-24px)] p-3.5 bg-popover text-popover-foreground border border-border shadow-none rounded-lg select-none font-mono focus:outline-hidden"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="text-xs font-semibold text-foreground">
                  {t(`body.metricExplanations.${activeMetricInfo}.title`)}
                </div>
                <div
                  className={cn(
                    'text-xs font-mono transition-colors',
                    isMetricFresh(activeMetricInfo)
                      ? 'text-foreground'
                      : 'text-muted-foreground/60'
                  )}
                >
                  {getMetricDisplayValue(activeMetricInfo)}
                  {!isMetricFresh(activeMetricInfo) &&
                    getMetricDisplayValue(activeMetricInfo) !== '-' && (
                      <span className="text-[10px] text-muted-foreground/60 ml-1.5 font-sans">
                        ({t('body.referenceValue', '參考值')})
                      </span>
                    )}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono flex flex-wrap items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded leading-relaxed">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 shrink-0">
                  {t('body.metricExplanations.formula', '計算公式')}:
                </span>
                <span className="text-foreground whitespace-normal break-words">
                  {t(`body.metricExplanations.${activeMetricInfo}.formula`)}
                </span>
              </div>

              <div className="text-xs text-muted-foreground font-sans leading-relaxed pt-0.5 break-words">
                {t(`body.metricExplanations.${activeMetricInfo}.desc`)}
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>

      {/* ========================================================================= */}
      {/* 模組 3：雙軌體重視覺化折線圖 (散點 + EWMA 平滑線) */}
      {/* ========================================================================= */}
      <WeightTrendChart
        data={displayTrendPoints}
        unit={bodyWeightUnit}
      />

      {/* ========================================================================= */}
      {/* 模組 4：體型圍度 (若全部圍度皆被忽略則整塊隱藏) */}
      {/* ========================================================================= */}
      {(!bodyPreferences.ignoreTorsoCircumferences || !bodyPreferences.ignoreLimbCircumferences) && (
        <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground select-none font-mono">
          <div className="px-3.5 sm:px-4 py-2.5 border-b border-border flex items-center justify-between text-xs">
            <span className="font-semibold text-xs uppercase tracking-widest text-muted-foreground font-sans">
              {t('body.bodyProportions', '體型圍度')}
            </span>
          </div>

          {/* 雙比例槽 (僅在未忽略胸腰臀時展示，點擊展開說明) */}
          {!bodyPreferences.ignoreTorsoCircumferences && (
            <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
              {/* 1. 胸腰比 */}
              <button
                type="button"
                onClick={(e) => handleOpenMetricPopover('vTaperRatio', e.currentTarget)}
                className="p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
              >
                <div className="text-[11px] text-muted-foreground truncate">
                  {t('body.vTaperRatio', '胸腰比')}
                </div>
                <div
                  className={cn(
                    'text-base sm:text-lg font-normal truncate transition-colors',
                    hasTodayChest && hasTodayWaist
                      ? 'text-foreground'
                      : vTaperRatio !== null
                        ? 'text-muted-foreground/40'
                        : 'text-muted-foreground/25'
                  )}
                >
                  {vTaperRatio !== null ? vTaperRatio : '-'}
                </div>
                <div className="text-[10px] text-muted-foreground/60 truncate">
                  {t('body.vTaperHint', '倒三角係數')}
                </div>
              </button>

              {/* 2. 腰臀比 */}
              <button
                type="button"
                onClick={(e) => handleOpenMetricPopover('whRatio', e.currentTarget)}
                className="p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
              >
                <div className="text-[11px] text-muted-foreground truncate">
                  {t('body.whRatio', '腰臀比')}
                </div>
                <div
                  className={cn(
                    'text-base sm:text-lg font-normal truncate transition-colors',
                    hasTodayWaist && hasTodayHips
                      ? 'text-foreground'
                      : whRatio !== null
                        ? 'text-muted-foreground/40'
                        : 'text-muted-foreground/25'
                  )}
                >
                  {whRatio !== null ? whRatio : '-'}
                </div>
                <div className="text-[10px] text-muted-foreground/60 truncate">
                  {t('body.whRatioHint', '形態基準')}
                </div>
              </button>
            </div>
          )}

          {/* 圍度演進表格 (三欄固定 Grid 佈局，依偏好動態過濾項目) */}
          <div className="divide-y divide-border text-xs">
            <div className="px-3.5 sm:px-4 py-2 grid grid-cols-3 items-center text-muted-foreground text-[11px] bg-muted/20">
              <span className="text-left">{t('body.bodyPart', '部位圍度')}</span>
              <span className="text-center">{t('body.currentValue', '當前數值')}</span>
              <span className="text-right">{t('body.thirtyDaysChange', '30 天變動')}</span>
            </div>

            {/* 軀幹部位群組 */}
            {!bodyPreferences.ignoreTorsoCircumferences && (
              <>
                {/* 1. 肩寬 */}
                <div className="px-3.5 sm:px-4 py-2.5 grid grid-cols-3 items-center hover:bg-hover transition-colors">
                  <span className="text-left font-medium text-foreground">{t('body.shoulders', '肩寬')}</span>
                  <span className="text-center font-normal text-foreground">{effectiveShoulders ? `${effectiveShoulders}${lengthUnit}` : '-'}</span>
                  <span className="text-right font-mono text-muted-foreground">
                    {circumferenceChanges.shouldersDelta !== null
                      ? `${circumferenceChanges.shouldersDelta > 0 ? '+' : ''}${circumferenceChanges.shouldersDelta}${lengthUnit}`
                      : '-'}
                  </span>
                </div>

                {/* 2. 胸圍 */}
                <div className="px-3.5 sm:px-4 py-2.5 grid grid-cols-3 items-center hover:bg-hover transition-colors">
                  <span className="text-left font-medium text-foreground">{t('body.chest', '胸圍')}</span>
                  <span className="text-center font-normal text-foreground">{effectiveChest ? `${effectiveChest}${lengthUnit}` : '-'}</span>
                  <span className="text-right font-mono text-muted-foreground">
                    {circumferenceChanges.chestDelta !== null
                      ? `${circumferenceChanges.chestDelta > 0 ? '+' : ''}${circumferenceChanges.chestDelta}${lengthUnit}`
                      : '-'}
                  </span>
                </div>

                {/* 3. 腰圍 */}
                <div className="px-3.5 sm:px-4 py-2.5 grid grid-cols-3 items-center hover:bg-hover transition-colors">
                  <span className="text-left font-medium text-foreground">{t('body.waist', '腰圍')}</span>
                  <span className="text-center font-normal text-foreground">{effectiveWaist ? `${effectiveWaist}${lengthUnit}` : '-'}</span>
                  <span className="text-right font-mono text-muted-foreground">
                    {circumferenceChanges.waistDelta !== null
                      ? `${circumferenceChanges.waistDelta > 0 ? '+' : ''}${circumferenceChanges.waistDelta}${lengthUnit}`
                      : '-'}
                  </span>
                </div>

                {/* 4. 臀圍 */}
                <div className="px-3.5 sm:px-4 py-2.5 grid grid-cols-3 items-center hover:bg-hover transition-colors">
                  <span className="text-left font-medium text-foreground">{t('body.hips', '臀圍')}</span>
                  <span className="text-center font-normal text-foreground">{effectiveHips ? `${effectiveHips}${lengthUnit}` : '-'}</span>
                  <span className="text-right font-mono text-muted-foreground">
                    {circumferenceChanges.hipsDelta !== null
                      ? `${circumferenceChanges.hipsDelta > 0 ? '+' : ''}${circumferenceChanges.hipsDelta}${lengthUnit}`
                      : '-'}
                  </span>
                </div>
              </>
            )}

            {/* 手臂與大腿圍群組 */}
            {!bodyPreferences.ignoreLimbCircumferences && (
              <>
                {/* 手臂圍 */}
                <div className="px-3.5 sm:px-4 py-2.5 grid grid-cols-3 items-center hover:bg-hover transition-colors">
                  <span className="text-left font-medium text-foreground">{t('body.arms', '手臂圍')}</span>
                  <span className="text-center font-normal text-foreground">{effectiveArms ? `${effectiveArms}${lengthUnit}` : '-'}</span>
                  <span className="text-right font-mono text-muted-foreground">
                    {circumferenceChanges.armsDelta !== null
                      ? `${circumferenceChanges.armsDelta > 0 ? '+' : ''}${circumferenceChanges.armsDelta}${lengthUnit}`
                      : '-'}
                  </span>
                </div>

                {/* 大腿圍 */}
                <div className="px-3.5 sm:px-4 py-2.5 grid grid-cols-3 items-center hover:bg-hover transition-colors">
                  <span className="text-left font-medium text-foreground">{t('body.thighs', '大腿圍')}</span>
                  <span className="text-center font-normal text-foreground">{effectiveThighs ? `${effectiveThighs}${lengthUnit}` : '-'}</span>
                  <span className="text-right font-mono text-muted-foreground">
                    {circumferenceChanges.thighsDelta !== null
                      ? `${circumferenceChanges.thighsDelta > 0 ? '+' : ''}${circumferenceChanges.thighsDelta}${lengthUnit}`
                      : '-'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 次級彈窗區域：平鋪兄弟節點 (Instant Pop, 數字鍵盤微調彈窗) */}
      {/* ========================================================================= */}
      {keypadConfig && (() => {
        const guideInfo = getFieldGuideInfo(keypadConfig.field);
        const { displayVal, sourceText, isToday, desc, method } = guideInfo;

        const infoCard = (
          <div className="w-full bg-card text-card-foreground border border-border rounded-[18px] p-3 text-xs select-none shadow-none space-y-2.5">
            {/* 居中排版：數值更大，「當日記錄/參考值」動態顯示於數值上方 */}
            <div className="py-1 text-center space-y-0.5">
              {/* 上方動態標籤列（僅在有數值時展示） */}
              {displayVal !== null && (
                <div className="text-[11px] font-sans text-muted-foreground tracking-wide">
                  {isToday ? (
                    <span>{t('body.keypadGuide.todayRecord', '當日記錄')}</span>
                  ) : (
                    <span>{t('body.keypadGuide.reference', '參考值')} · {sourceText}</span>
                  )}
                </div>
              )}

              {/* 居中大數值 */}
              {displayVal !== null ? (
                <div className="flex items-baseline justify-center gap-1 font-mono">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                    {displayVal}
                  </span>
                  {keypadConfig.unit && (
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground font-mono">
                      {keypadConfig.unit}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-base sm:text-lg font-medium font-sans text-muted-foreground pt-0.5">
                  {t('body.keypadGuide.noRecord', '尚未記錄')}
                </div>
              )}
            </div>

            {/* 項目說明與測量步驟 (純文字排版，無前綴標籤) */}
            {(desc || method) && (
              <div className="pt-2 border-t border-border/60 space-y-1.5 font-sans leading-relaxed text-[11px] text-muted-foreground text-left">
                {desc && <div>{desc}</div>}
                {method && <div>{method}</div>}
              </div>
            )}
          </div>
        );

        return (
          <NumericKeypadDialog
            key={keypadConfig.field}
            open={!!keypadConfig}
            onOpenChange={(kOpen) => {
              if (!kOpen) setKeypadConfig(null);
            }}
            title={keypadConfig.title}
            value={keypadConfig.value}
            unit={keypadConfig.unit}
            infoCard={infoCard}
            allowDecimals={keypadConfig.allowDecimals}
            maxDecimals={keypadConfig.allowDecimals ? 1 : 0}
            allowZero={false}
            anchorEl={keypadConfig.anchorEl}
            onConfirm={handleKeypadConfirm}
            onCancel={() => setKeypadConfig(null)}
          />
        );
      })()}
    </div>
  );
}
