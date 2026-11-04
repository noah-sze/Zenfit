import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { WeightTrendChart } from '@/components/body/WeightTrendChart';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { calculateBMI } from '@/utils/weightMath';
import { convertBodyWeight, cmToIn, inToCm, lbsToKg } from '@/utils/unitMath';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { Scale, Plus, Trash2, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { BodyMetric } from '@/types';

type KeypadMetricField =
  | 'weight'
  | 'bodyFat'
  | 'waistCm'
  | 'hipsCm'
  | 'chestCm'
  | 'armsCm'
  | 'thighsCm';

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
  const confirm = useConfirm();

  const {
    metricToday,
    recentHistory,
    trendPoints,
    currentTrendWeight,
    weeklyRate,
    saveMetric,
    deleteMetric,
  } = useBodyMetrics(selectedDate);

  // 鍵盤微調彈窗狀態
  const [keypadConfig, setKeypadConfig] = useState<KeypadConfig | null>(null);

  // 展開更多圍度
  const [showCircumferences, setShowCircumferences] = useState(false);

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
    : 70;

  // 核心展示體重：當日過磅優先，其次平滑趨勢，再次回退使用者設定基準體重
  const effectiveWeightKg = rawTodayWeight || currentTrendWeight || profile.currentWeightKg || 70;
  const bmi = calculateBMI(effectiveWeightKg, profile.heightCm);

  // 去脂體重 (LBM)
  const leanMassKg = useMemo(() => {
    if (metricToday?.bodyFat && metricToday.weight) {
      return Math.round(metricToday.weight * (1 - metricToday.bodyFat / 100) * 10) / 10;
    }
    return null;
  }, [metricToday]);

  const displayLeanMass = leanMassKg !== null
    ? convertBodyWeight(leanMassKg, 'kg', bodyWeightUnit)
    : null;

  const displayWeeklyRate = weeklyRate !== null
    ? (bodyWeightUnit === 'lbs' ? Math.round(weeklyRate * 2.20462 * 100) / 100 : weeklyRate)
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
    if (typeof metricToday.waistCm === 'number' && metricToday.waistCm > 0) count++;
    if (typeof metricToday.hipsCm === 'number' && metricToday.hipsCm > 0) count++;
    if (typeof metricToday.chestCm === 'number' && metricToday.chestCm > 0) count++;
    if (typeof metricToday.armsCm === 'number' && metricToday.armsCm > 0) count++;
    if (typeof metricToday.thighsCm === 'number' && metricToday.thighsCm > 0) count++;
    return count;
  }, [metricToday]);

  const hasAnyTodayLog = loggedMetricsCount > 0;

  // ==========================================
  // 數字鍵盤微調處理
  // ==========================================
  const handleOpenKeypad = (
    field: KeypadMetricField,
    currentVal: number,
    title: string,
    unit: string,
    anchorEl?: HTMLElement | null
  ) => {
    triggerHaptic('selection');
    setKeypadConfig({
      field,
      title: `${selectedDate} · ${title}`,
      value: currentVal,
      unit,
      allowDecimals: true,
      anchorEl,
    });
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

  // 刪除歷史日誌項目
  const handleDeleteHistory = async (rec: BodyMetric) => {
    const ok = await confirm({
      title: t('common.delete', '刪除'),
      description: t('common.confirmDeleteItem', { name: `${rec.date} ${t('body.weightLog', '過磅記錄')}` }),
      variant: 'destructive',
    });
    if (ok) {
      triggerHaptic('warning');
      await deleteMetric(rec.id);
      toast.show(t('common.deleted', '已刪除'));
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20 select-none">
      {/* ========================================================================= */}
      {/* 頂部體態全日指標大卡片 (100% 沿用飲食頁面熱量與三大元素排版) */}
      {/* ========================================================================= */}
      <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground">
        {/* 上半部：體態 Hero Metric (居中巨型數值) */}
        <div className="p-4 sm:p-5 relative space-y-3">
          {/* 頂部列：左側客觀標記，右側單位切換純膠囊 */}
          <div className="relative flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {t('body.metricsTitle', '體態指標')}
            </span>
            <div className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-center font-mono select-none">
              {bodyWeightUnit}
            </div>
          </div>

          {/* 居中巨型數值 */}
          <div className="pt-2 pb-1 text-center">
            <div className="hero-number flex items-baseline justify-center gap-1.5 font-mono">
              <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                {displayTodayWeight || displayTrendWeight || displayCurrentWeight}
              </span>
              <span className="text-sm sm:text-base font-normal text-muted-foreground font-mono">
                {bodyWeightUnit}
              </span>
            </div>

            {/* 客觀差額事實或輔助資訊 */}
            <div className="flex items-center justify-center gap-2 mt-1 text-xs sm:text-sm font-mono text-muted-foreground">
              {displayTodayWeight ? (
                <>
                  <span>
                    {t('body.trendWeight', '平滑趨勢')} {displayTrendWeight || displayTodayWeight} {bodyWeightUnit}
                  </span>
                  {displayWeeklyRate !== null && (
                    <>
                      <span className="text-border select-none">·</span>
                      <span className={displayWeeklyRate < 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                        {displayWeeklyRate > 0 ? `+${displayWeeklyRate}` : displayWeeklyRate} {bodyWeightUnit} / 週
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span>{t('body.unloggedEstimate', '無過磅 · 依平滑趨勢估算')}</span>
              )}
            </div>
          </div>
        </div>

        {/* 下半部：4 欄客觀指標 (100% 沿用飲食頁面 divide-x divide-border 排版) */}
        <div className="grid grid-cols-4 divide-x divide-border border-t border-border font-mono">
          {/* 1. 趨勢體重 */}
          <div className="p-2.5 sm:p-3 text-center space-y-0.5 overflow-hidden">
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.trend', '趨勢體重')}
            </div>
            <div className="text-sm sm:text-base font-bold text-foreground truncate">
              {displayTrendWeight ? `${displayTrendWeight}` : '--'}
            </div>
          </div>

          {/* 2. 7 天速率 */}
          <div className="p-2.5 sm:p-3 text-center space-y-0.5 overflow-hidden">
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.weeklyRate', '7 天速率')}
            </div>
            <div className="text-sm sm:text-base font-bold text-foreground truncate">
              {displayWeeklyRate !== null ? `${displayWeeklyRate > 0 ? '+' : ''}${displayWeeklyRate}` : '--'}
            </div>
          </div>

          {/* 3. 去脂體重 */}
          <div className="p-2.5 sm:p-3 text-center space-y-0.5 overflow-hidden">
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.leanBodyMass', '去脂體重')}
            </div>
            <div className="text-sm sm:text-base font-bold text-foreground truncate">
              {displayLeanMass ? `${displayLeanMass}` : '--'}
            </div>
          </div>

          {/* 4. BMI */}
          <div className="p-2.5 sm:p-3 text-center space-y-0.5 overflow-hidden">
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.bmi', 'BMI')}
            </div>
            <div className="text-sm sm:text-base font-bold text-foreground truncate">
              {bmi || '--'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模組 2：過磅記錄卡片 (方案 3：無過磅極簡空狀態 / 有過磅 Usage List 微調行) */}
      {/* ========================================================================= */}
      {hasAnyTodayLog ? (
        <div className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden select-none font-mono text-xs">
          {/* 40px 標準灰底表頭 */}
          <div className="h-10 px-3.5 sm:px-4 bg-muted/40 border-b border-border flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm tracking-tight text-foreground font-sans">
                {t('body.weightLog', '過磅記錄')}
              </span>
              <span className="text-border select-none shrink-0">·</span>
              <span className="text-muted-foreground font-mono shrink-0">
                {loggedMetricsCount} {t('common.itemsUnit', '項')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleDeleteTodayMetric}
              className="size-7 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title={t('common.delete', '刪除')}
              aria-label={t('common.delete', '刪除')}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {/* Usage List 列表行 (divide-y divide-border/40 bg-muted/10) */}
          <div className="divide-y divide-border/40 bg-muted/10">
            {/* 行 1：過磅體重 */}
            <div className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3">
              <span className="text-foreground font-medium">
                {t('body.rawWeight', '過磅體重')}
              </span>
              <button
                type="button"
                onClick={(e) =>
                  handleOpenKeypad(
                    'weight',
                    displayTodayWeight || 0,
                    t('body.rawWeight', '過磅體重'),
                    bodyWeightUnit,
                    e.currentTarget
                  )
                }
                className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              >
                <span className={displayTodayWeight ? 'font-bold text-foreground' : 'font-bold text-muted-foreground'}>
                  {displayTodayWeight || '-'}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {bodyWeightUnit}
                </span>
                <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
              </button>
            </div>

            {/* 行 2：體脂率 */}
            <div className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {t('body.bodyFat', '體脂率')}
              </span>
              <button
                type="button"
                onClick={(e) =>
                  handleOpenKeypad(
                    'bodyFat',
                    metricToday?.bodyFat || 0,
                    t('body.bodyFat', '體脂率'),
                    '%',
                    e.currentTarget
                  )
                }
                className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              >
                <span className={metricToday?.bodyFat ? 'font-bold text-foreground' : 'font-bold text-muted-foreground'}>
                  {metricToday?.bodyFat ? metricToday.bodyFat : '-'}
                </span>
                <span className="text-muted-foreground text-[10px]">%</span>
                <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
              </button>
            </div>

            {/* 行 3：腰圍 */}
            <div className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {t('body.waist', '腰圍')}
              </span>
              <button
                type="button"
                onClick={(e) =>
                  handleOpenKeypad(
                    'waistCm',
                    metricToday?.waistCm ? (lengthUnit === 'in' ? cmToIn(metricToday.waistCm, 1) : metricToday.waistCm) : 0,
                    t('body.waist', '腰圍'),
                    lengthUnit,
                    e.currentTarget
                  )
                }
                className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              >
                <span className={metricToday?.waistCm ? 'font-bold text-foreground' : 'font-bold text-muted-foreground'}>
                  {metricToday?.waistCm ? (lengthUnit === 'in' ? cmToIn(metricToday.waistCm, 1) : metricToday.waistCm) : '-'}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {lengthUnit}
                </span>
                <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
              </button>
            </div>

            {/* 展開之身體圍度行 (胸圍、臀圍、手臂圍、大腿圍) */}
            {showCircumferences && (
              <>
                {/* 行 4：胸圍 */}
                <div className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t('body.chest', '胸圍')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleOpenKeypad(
                        'chestCm',
                        metricToday?.chestCm ? (lengthUnit === 'in' ? cmToIn(metricToday.chestCm, 1) : metricToday.chestCm) : 0,
                        t('body.chest', '胸圍'),
                        lengthUnit,
                        e.currentTarget
                      )
                    }
                    className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                  >
                    <span className={metricToday?.chestCm ? 'font-bold text-foreground' : 'font-bold text-muted-foreground'}>
                      {metricToday?.chestCm ? (lengthUnit === 'in' ? cmToIn(metricToday.chestCm, 1) : metricToday.chestCm) : '-'}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {lengthUnit}
                    </span>
                    <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                  </button>
                </div>

                {/* 行 5：臀圍 */}
                <div className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t('body.hips', '臀圍')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleOpenKeypad(
                        'hipsCm',
                        metricToday?.hipsCm ? (lengthUnit === 'in' ? cmToIn(metricToday.hipsCm, 1) : metricToday.hipsCm) : 0,
                        t('body.hips', '臀圍'),
                        lengthUnit,
                        e.currentTarget
                      )
                    }
                    className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                  >
                    <span className={metricToday?.hipsCm ? 'font-bold text-foreground' : 'font-bold text-muted-foreground'}>
                      {metricToday?.hipsCm ? (lengthUnit === 'in' ? cmToIn(metricToday.hipsCm, 1) : metricToday.hipsCm) : '-'}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {lengthUnit}
                    </span>
                    <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                  </button>
                </div>

                {/* 行 6：手臂圍 */}
                <div className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t('body.arms', '手臂圍')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleOpenKeypad(
                        'armsCm',
                        metricToday?.armsCm ? (lengthUnit === 'in' ? cmToIn(metricToday.armsCm, 1) : metricToday.armsCm) : 0,
                        t('body.arms', '手臂圍'),
                        lengthUnit,
                        e.currentTarget
                      )
                    }
                    className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                  >
                    <span className={metricToday?.armsCm ? 'font-bold text-foreground' : 'font-bold text-muted-foreground'}>
                      {metricToday?.armsCm ? (lengthUnit === 'in' ? cmToIn(metricToday.armsCm, 1) : metricToday.armsCm) : '-'}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {lengthUnit}
                    </span>
                    <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                  </button>
                </div>

                {/* 行 7：大腿圍 */}
                <div className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t('body.thighs', '大腿圍')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleOpenKeypad(
                        'thighsCm',
                        metricToday?.thighsCm ? (lengthUnit === 'in' ? cmToIn(metricToday.thighsCm, 1) : metricToday.thighsCm) : 0,
                        t('body.thighs', '大腿圍'),
                        lengthUnit,
                        e.currentTarget
                      )
                    }
                    className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                  >
                    <span className={metricToday?.thighsCm ? 'font-bold text-foreground' : 'font-bold text-muted-foreground'}>
                      {metricToday?.thighsCm ? (lengthUnit === 'in' ? cmToIn(metricToday.thighsCm, 1) : metricToday.thighsCm) : '-'}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {lengthUnit}
                    </span>
                    <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 展開/收起身體圍度按鈕 */}
          <button
            type="button"
            onClick={() => setShowCircumferences(!showCircumferences)}
            className="w-full h-9 border-t border-border flex items-center justify-center text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer select-none"
          >
            {showCircumferences ? (
              <span className="flex items-center gap-1">
                <ChevronUp className="size-3.5" />
                <span>{t('body.collapseCircumferences', '收起圍度')}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ChevronDown className="size-3.5" />
                <span>{t('body.expandCircumferences', '記錄圍度')}</span>
              </span>
            )}
          </button>
        </div>
      ) : (
        /* 當日無過磅記錄時的客觀極簡空狀態 (方案 3：去「補錄歷史」按鈕，僅保留「記錄今日過磅」) */
        <div className="border border-border bg-card text-card-foreground shadow-none rounded-lg p-8 text-center space-y-4 font-mono">
          <div className="size-10 rounded-full border border-border bg-muted/40 mx-auto flex items-center justify-center text-muted-foreground">
            <Scale className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">
              {t('body.noWeightLog', '無過磅記錄')}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('body.recordWeightHint', '記錄今日過磅以更新體態趨勢與各項指標')}
            </div>
          </div>
          <div className="pt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={(e) =>
                handleOpenKeypad(
                  'weight',
                  displayTrendWeight || displayCurrentWeight || 0,
                  t('body.rawWeight', '過磅體重'),
                  bodyWeightUnit,
                  e.currentTarget
                )
              }
              className="h-8 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-none"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              <span>{t('body.recordWeight', '記錄今日過磅')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 模組 3：雙軌體重視覺化折線圖 (散點 + EWMA 平滑線) */}
      {/* ========================================================================= */}
      <WeightTrendChart
        data={displayTrendPoints}
        unit={bodyWeightUnit}
      />

      {/* ========================================================================= */}
      {/* 模組 4：過磅流水記錄表 (對標 Usage List 表格化排版) */}
      {/* ========================================================================= */}
      <div className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden select-none font-mono text-xs">
        {/* 40px 標準灰底表頭 */}
        <div className="h-10 px-3.5 sm:px-4 bg-muted/40 border-b border-border flex items-center justify-between text-muted-foreground">
          <span className="font-semibold text-sm tracking-tight text-foreground font-sans">
            {t('body.weightHistory', '過磅流水')}
          </span>
          <span className="text-[11px] font-mono">
            {t('body.recentDays', { count: Math.min(14, recentHistory.length), defaultValue: `最近 ${Math.min(14, recentHistory.length)} 筆` })}
          </span>
        </div>

        {recentHistory.length > 0 ? (
          <div className="divide-y divide-border/40">
            {recentHistory.slice(0, 14).map((rec) => {
              const recWeight = rec.weight
                ? convertBodyWeight(rec.weight, 'kg', bodyWeightUnit)
                : null;

              return (
                <div
                  key={rec.id}
                  className="px-3.5 sm:px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-semibold text-foreground">
                      {rec.date === selectedDate ? `${rec.date} (${t('common.today', '今天')})` : rec.date}
                    </span>
                    {(rec.waistCm || rec.chestCm || rec.armsCm || rec.hipsCm || rec.thighsCm) && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {rec.waistCm && `${t('body.waist', '腰')}: ${lengthUnit === 'in' ? cmToIn(rec.waistCm, 1) : rec.waistCm}${lengthUnit} `}
                        {rec.chestCm && `${t('body.chest', '胸')}: ${lengthUnit === 'in' ? cmToIn(rec.chestCm, 1) : rec.chestCm}${lengthUnit} `}
                        {rec.armsCm && `${t('body.arms', '臂')}: ${lengthUnit === 'in' ? cmToIn(rec.armsCm, 1) : rec.armsCm}${lengthUnit} `}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {recWeight && (
                        <div className="font-bold text-foreground">
                          {recWeight} {bodyWeightUnit}
                        </div>
                      )}
                      {rec.bodyFat && (
                        <div className="text-[11px] text-muted-foreground">
                          {rec.bodyFat} %
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(rec)}
                      className="size-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors cursor-pointer"
                      title={t('common.delete', '刪除')}
                      aria-label={t('common.delete', '刪除')}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground font-mono">
            {t('common.noData', '無數據')}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 次級彈窗區域：平鋪兄弟節點 (Instant Pop, 數字鍵盤微調彈窗) */}
      {/* ========================================================================= */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={!!keypadConfig}
          onOpenChange={(kOpen) => {
            if (!kOpen) setKeypadConfig(null);
          }}
          title={keypadConfig.title}
          value={keypadConfig.value}
          unit={keypadConfig.unit}
          allowDecimals={keypadConfig.allowDecimals}
          maxDecimals={keypadConfig.allowDecimals ? 1 : 0}
          anchorEl={keypadConfig.anchorEl}
          onConfirm={handleKeypadConfirm}
          onCancel={() => setKeypadConfig(null)}
        />
      )}
    </div>
  );
}
