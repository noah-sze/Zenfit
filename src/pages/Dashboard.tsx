import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { useBodyRecovery } from '@/hooks/useBodyRecovery';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { WorkoutRecoveryDashboard } from '@/components/workout/WorkoutRecoveryDashboard';
import { ChevronRight } from 'lucide-react';
import { formatEnergy, convertBodyWeight, kgToLbs } from '@/utils/unitMath';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

function getGreeting(t: TFunction, name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return t('dashboard.greetingMorning', { name, defaultValue: `早上好，${name}` });
  }
  if (hour >= 12 && hour < 18) {
    return t('dashboard.greetingAfternoon', { name, defaultValue: `下午好，${name}` });
  }
  return t('dashboard.greetingEvening', { name, defaultValue: `晚上好，${name}` });
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedDate } = useAppStore();
  const { profile } = useUserProfile();
  const { energyUnit, bodyWeightUnit } = useUnitPreferences();

  // 1. 體態與體重數據 (與體態頁面機制一致：今日已錄入為正常色，未錄入則調用最後一次歷史值並呈灰色)
  const { metricToday, recentHistory } = useBodyMetrics(selectedDate);
  const hasTodayWeight = typeof metricToday?.weight === 'number' && metricToday.weight > 0;

  const lastRecordedWeight = useMemo(() => {
    const priorHistory = recentHistory.filter((m) => m.date < selectedDate);
    const candidateHistory = priorHistory.length > 0
      ? priorHistory
      : recentHistory.filter((m) => m.date !== selectedDate);

    for (const rec of candidateHistory) {
      if (typeof rec.weight === 'number' && rec.weight > 0) {
        return rec.weight;
      }
    }
    return profile.currentWeightKg || null;
  }, [recentHistory, selectedDate, profile.currentWeightKg]);

  const effectiveWeightKg = hasTodayWeight ? metricToday!.weight! : lastRecordedWeight;
  const displayWeight = effectiveWeightKg
    ? convertBodyWeight(effectiveWeightKg, 'kg', bodyWeightUnit)
    : null;

  // 2. 飲食與熱量統計數據 (復刻飲食界面熱量統計核心計算)
  const { plan: dietPlan } = useDietPlan(selectedDate);
  const { totals } = useFoodLogs(selectedDate);

  const targetCalories = dietPlan.caloriesTarget || 2000;
  const targetMacros = {
    carbsGrams: dietPlan.carbsTarget || 220,
    proteinGrams: dietPlan.proteinTarget || 140,
    fatGrams: dietPlan.fatTarget || 60,
  };

  const calorieDiff = targetCalories - totals.calories;

  // 3. 健身與肌群恢復狀態數據
  const { workouts } = useWorkoutLogs(selectedDate);
  const { recoverySummary } = useBodyRecovery(selectedDate);

  const stats = useMemo(() => {
    let exerciseCount = 0;
    let setCount = 0;
    let totalVolumeKg = 0;

    for (const w of workouts) {
      exerciseCount += (w.exercises || []).length;
      for (const ex of w.exercises || []) {
        for (const s of ex.sets || []) {
          setCount += 1;
          const weight = s.weight || 0;
          const reps = s.reps || 0;
          totalVolumeKg += weight * reps;
        }
      }
    }

    const displayVolume =
      bodyWeightUnit === 'lbs' ? kgToLbs(totalVolumeKg, 0) : totalVolumeKg;

    return {
      exerciseCount,
      setCount,
      totalVolume: displayVolume,
    };
  }, [workouts, bodyWeightUnit]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20 select-none">
      {/* ========================================================================= */}
      {/* 頂部列：問候語 + 今日體重入口卡片 (點擊跳轉「體態界面」) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pb-0.5">
        <h1 className="text-lg sm:text-xl font-medium tracking-tight text-foreground font-sans truncate pr-2">
          {getGreeting(t, profile.name || 'Noah')}
        </h1>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            navigate('/body');
          }}
          className="h-8 px-3 rounded-full border border-border bg-card hover:bg-hover active:scale-95 transition-all cursor-pointer font-mono text-xs flex items-center gap-1.5 select-none shrink-0"
          aria-label={t('body.title', '體態')}
        >
          <span className="text-muted-foreground">{t('body.weight', '體重')}</span>
          {displayWeight !== null ? (
            <span className="flex items-baseline gap-1">
              <span
                className={cn(
                  'font-normal transition-colors',
                  hasTodayWeight ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {displayWeight}
              </span>
              <span className="text-muted-foreground font-normal">
                {bodyWeightUnit}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground font-normal">-</span>
          )}
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 模組 1：熱量統計卡片 (復刻「飲食界面」熱量統計，無活動/目標膠囊，右上角「>」跳轉) */}
      {/* ========================================================================= */}
      <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground select-none">
        {/* 上半部：熱量統計 (Hero Metric) */}
        <div className="p-4 sm:p-5 relative space-y-3">
          {/* 頂部列：標題居中，右上角配置「>」膠囊按鈕 */}
          <div className="relative flex items-center justify-between">
            {/* 佔位平衡元素保證標題幾何絕對置中 */}
            <div className="size-6 shrink-0 opacity-0 pointer-events-none" />

            <span className="text-xs sm:text-sm font-normal text-muted-foreground select-none">
              {t('diet.calorieStats', '熱量統計')}
            </span>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                navigate('/diet');
              }}
              className="size-6 rounded-full border border-border/80 bg-muted/20 hover:bg-hover text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer select-none active:scale-95 shrink-0"
              aria-label={t('nav.diet', '飲食')}
              title={t('nav.diet', '飲食')}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {/* 核心巨型熱量數值 (居中) */}
          <div className="pt-1 pb-1 text-center">
            <div className="hero-number flex items-baseline justify-center gap-1.5 font-mono">
              <span>{formatEnergy(totals.calories, energyUnit).value.toLocaleString()}</span>
              <span className="text-sm sm:text-base font-normal text-muted-foreground font-mono">
                {energyUnit}
              </span>
            </div>

            {/* 客觀差額事實 */}
            <div className="flex items-center justify-center gap-2 mt-1 text-sm font-mono text-muted-foreground">
              <span>
                {calorieDiff >= 0
                  ? `${t('dietPlan.underBudget', '剩餘')} ${formatEnergy(calorieDiff, energyUnit).value.toLocaleString()} ${energyUnit}`
                  : `${t('dietPlan.overBudget', '超出')} +${formatEnergy(Math.abs(calorieDiff), energyUnit).value.toLocaleString()} ${energyUnit}`}
              </span>
            </div>

            {/* 客觀進度標尺 */}
            <div className="h-2 w-full max-w-[220px] mx-auto bg-track rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{
                  width: `${Math.min(100, targetCalories > 0 ? (totals.calories / targetCalories) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 下半部：三大營養素 (碳水、蛋白質、脂肪) */}
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
          {/* 1. 碳水化合物 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="text-xs font-medium text-carbs truncate whitespace-nowrap">
              {t('dietPlan.carbsShort', '碳水')}
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-normal text-foreground">
                {Math.round(totals.carbs)}g
              </span>
              <span className="text-2xs sm:text-xs font-normal text-muted-foreground">
                /{targetMacros.carbsGrams}g
              </span>
            </div>
            <div className="h-2 w-full bg-carbs-subtle rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-carbs transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    targetMacros.carbsGrams > 0
                      ? (totals.carbs / targetMacros.carbsGrams) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* 2. 蛋白質 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="text-xs font-medium text-protein truncate whitespace-nowrap">
              {t('dietPlan.proteinShort', '蛋白質')}
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-normal text-foreground">
                {Math.round(totals.protein)}g
              </span>
              <span className="text-2xs sm:text-xs font-normal text-muted-foreground">
                /{targetMacros.proteinGrams}g
              </span>
            </div>
            <div className="h-2 w-full bg-protein-subtle rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-protein transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    targetMacros.proteinGrams > 0
                      ? (totals.protein / targetMacros.proteinGrams) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* 3. 脂肪 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="text-xs font-medium text-fat truncate whitespace-nowrap">
              {t('dietPlan.fatShort', '脂肪')}
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-normal text-foreground">
                {Math.round(totals.fat)}g
              </span>
              <span className="text-2xs sm:text-xs font-normal text-muted-foreground">
                /{targetMacros.fatGrams}g
              </span>
            </div>
            <div className="h-2 w-full bg-fat-subtle rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-fat transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    targetMacros.fatGrams > 0
                      ? (totals.fat / targetMacros.fatGrams) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模組 2：肌群恢復狀態卡片 (右上角「>」跳轉，卡片本體保留肌肉交互) */}
      {/* ========================================================================= */}
      <WorkoutRecoveryDashboard
        recoverySummary={recoverySummary}
        exerciseCount={stats.exerciseCount}
        setCount={stats.setCount}
        totalVolume={stats.totalVolume}
        weightUnit={bodyWeightUnit}
        onNavigate={() => {
          triggerHaptic('light');
          navigate('/workout');
        }}
      />
    </div>
  );
}
