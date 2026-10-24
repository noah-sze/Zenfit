import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { WeightTrendChart } from '@/components/body/WeightTrendChart';
import { calculateBMI } from '@/utils/weightMath';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { BodyMetric } from '@/types';

export default function Body() {
  const { t } = useTranslation();
  const { selectedDate } = useAppStore();
  const { profile, updateProfile } = useUserProfile();
  const {
    metricToday,
    recentHistory,
    trendPoints,
    currentTrendWeight,
    weeklyRate,
    saveMetric,
    deleteMetric,
  } = useBodyMetrics(selectedDate);
  const confirm = useConfirm();

  // 輸入狀態
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [chest, setChest] = useState('');
  const [arms, setArms] = useState('');
  const [thighs, setThighs] = useState('');
  const [showCircumferences, setShowCircumferences] = useState(false);

  // 當切換日期或今天數據變更時同步
  useEffect(() => {
    if (metricToday) {
      setWeight(metricToday.weight ? String(metricToday.weight) : '');
      setBodyFat(metricToday.bodyFat ? String(metricToday.bodyFat) : '');
      setWaist(metricToday.waistCm ? String(metricToday.waistCm) : '');
      setHips(metricToday.hipsCm ? String(metricToday.hipsCm) : '');
      setChest(metricToday.chestCm ? String(metricToday.chestCm) : '');
      setArms(metricToday.armsCm ? String(metricToday.armsCm) : '');
      setThighs(metricToday.thighsCm ? String(metricToday.thighsCm) : '');
    } else {
      setWeight('');
      setBodyFat('');
      setWaist('');
      setHips('');
      setChest('');
      setArms('');
      setThighs('');
    }
  }, [metricToday, selectedDate]);

  const rawWeight = metricToday?.weight || (weight ? parseFloat(weight) : undefined);
  const displayWeight = currentTrendWeight || rawWeight || profile.currentWeightKg || 70;
  const bmi = calculateBMI(displayWeight, profile.heightCm);

  // 計算去脂體重 (LBM)
  let leanMassKg: number | null = null;
  if (metricToday?.bodyFat && metricToday.weight) {
    leanMassKg = Math.round(metricToday.weight * (1 - metricToday.bodyFat / 100) * 10) / 10;
  }

  const handleSave = async () => {
    const weightVal = weight ? parseFloat(weight) : undefined;
    const bodyFatVal = bodyFat ? parseFloat(bodyFat) : undefined;
    const waistVal = waist ? parseFloat(waist) : undefined;
    const hipsVal = hips ? parseFloat(hips) : undefined;
    const chestVal = chest ? parseFloat(chest) : undefined;
    const armsVal = arms ? parseFloat(arms) : undefined;
    const thighsVal = thighs ? parseFloat(thighs) : undefined;

    if (
      weightVal === undefined &&
      bodyFatVal === undefined &&
      waistVal === undefined &&
      hipsVal === undefined &&
      chestVal === undefined &&
      armsVal === undefined &&
      thighsVal === undefined
    ) {
      toast.show(t('common.required'));
      return;
    }

    await saveMetric({
      weight: weightVal,
      bodyFat: bodyFatVal,
      waistCm: waistVal,
      hipsCm: hipsVal,
      chestCm: chestVal,
      armsCm: armsVal,
      thighsCm: thighsVal,
    });

    if (weightVal) {
      await updateProfile({ currentWeightKg: weightVal });
    }

    toast.show(t('common.saved'));
  };

  const handleDeleteHistory = async (rec: BodyMetric) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${rec.date} ${t('body.title')}?`,
      variant: 'destructive',
    });
    if (ok) {
      await deleteMetric(rec.id);
      toast.show(t('common.saved'));
    }
  };

  return (
    <div className="space-y-4">
      {/* 頂部親切問候與客觀數據矩陣 */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          {profile.name} · {t('body.title')}
        </div>
        <h1 className="text-xl font-bold tracking-tight">
          {currentTrendWeight ? (
            <>
              {currentTrendWeight} <span className="text-xs font-normal text-muted-foreground font-mono">{profile.weightUnit} ({t('body.trend')})</span>
            </>
          ) : (
            `${profile.currentWeightKg} ${profile.weightUnit}`
          )}
        </h1>
      </div>

      {/* 客觀指標並列網格 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 sm:p-3.5 bg-muted/40 border border-border/80 rounded-lg space-y-1">
          <span className="text-xs font-mono text-muted-foreground block truncate">
            {t('body.trendWeight')}
          </span>
          <span className="text-base sm:text-lg font-bold font-mono">
            {currentTrendWeight ? `${currentTrendWeight}` : '--'}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 bg-muted/40 border border-border/80 rounded-lg space-y-1">
          <span className="text-xs font-mono text-muted-foreground block truncate">
            {t('body.weeklyRate')}
          </span>
          <span className="text-base sm:text-lg font-bold font-mono">
            {weeklyRate !== null ? `${weeklyRate > 0 ? '+' : ''}${weeklyRate}` : '--'}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 bg-muted/40 border border-border/80 rounded-lg space-y-1">
          <span className="text-xs font-mono text-muted-foreground block truncate">
            {t('body.leanBodyMass')}
          </span>
          <span className="text-base sm:text-lg font-bold font-mono">
            {leanMassKg ? `${leanMassKg}` : '--'}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 bg-muted/40 border border-border/80 rounded-lg space-y-1">
          <span className="text-xs font-mono text-muted-foreground block truncate">
            {t('body.bmi')}
          </span>
          <span className="text-base sm:text-lg font-bold font-mono">
            {bmi || '--'}
          </span>
        </div>
      </div>

      {/* 無邊界極速過磅打卡卡片 (Borderless Craft Input) */}
      <Card className="border border-border bg-card text-card-foreground shadow-none rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>{selectedDate} {t('body.rawWeight')}</span>
          <span>{profile.weightUnit}</span>
        </div>

        {/* 無邊界超大字體輸入 */}
        <div className="flex items-center justify-center py-2">
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={String(profile.currentWeightKg || '70.0')}
            className="w-full text-center text-5xl font-bold font-mono tracking-tight bg-transparent border-0 outline-none placeholder:text-muted-foreground/30 focus:ring-0 text-foreground"
          />
        </div>

        {/* 體脂率與去脂體重快速欄位 */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">
              {t('body.bodyFat')} (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="如: 15.0"
              className="h-10 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">
              {t('body.waist')} (cm)
            </label>
            <Input
              type="number"
              step="0.5"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              placeholder="如: 78.0"
              className="h-10 text-sm font-mono"
            />
          </div>
        </div>

        {/* 可展開身體圍度 (胸、臀、臂、腿) */}
        <div>
          <button
            type="button"
            onClick={() => setShowCircumferences(!showCircumferences)}
            className="w-full py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            {showCircumferences ? (
              <>
                <ChevronUp className="size-4" />
                {t('body.collapseCircumferences')}
              </>
            ) : (
              <>
                <ChevronDown className="size-4" />
                {t('body.expandCircumferences')}
              </>
            )}
          </button>

          {showCircumferences && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 animate-in fade-in duration-200">
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  {t('body.chest')} (cm)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  placeholder="如: 98.0"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  {t('body.hips')} (cm)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={hips}
                  onChange={(e) => setHips(e.target.value)}
                  placeholder="如: 95.0"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  {t('body.arms')} (cm)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={arms}
                  onChange={(e) => setArms(e.target.value)}
                  placeholder="如: 35.0"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  {t('body.thighs')} (cm)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={thighs}
                  onChange={(e) => setThighs(e.target.value)}
                  placeholder="如: 56.0"
                  className="h-10 text-sm font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          className="w-full text-xs sm:text-sm h-10 cursor-pointer rounded-lg font-medium"
        >
          {t('common.save')}
        </Button>
      </Card>

      {/* 雙軌體重視覺化折線圖 (散點 + EWMA 平滑線) */}
      <WeightTrendChart
        data={trendPoints}
        unit={profile.weightUnit}
      />

      {/* 歷史時序流水記錄表 */}
      <Card className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden">
        <CardHeader className="py-3.5 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-semibold tracking-tight uppercase font-mono text-muted-foreground">
            {t('body.history')}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {recentHistory.length > 0 ? (
            <div className="divide-y divide-border/40">
              {recentHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-mono hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground">{rec.date}</span>
                    {(rec.waistCm || rec.chestCm || rec.armsCm) && (
                      <div className="text-xs text-muted-foreground">
                        {rec.waistCm && `腰: ${rec.waistCm}cm `}
                        {rec.chestCm && `胸: ${rec.chestCm}cm `}
                        {rec.armsCm && `臂: ${rec.armsCm}cm`}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {rec.weight && (
                        <div className="font-semibold text-foreground">
                          {rec.weight} {profile.weightUnit}
                        </div>
                      )}
                      {rec.bodyFat && (
                        <div className="text-xs text-muted-foreground">
                          {rec.bodyFat} %
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(rec)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground font-mono">
              {t('common.noData')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
