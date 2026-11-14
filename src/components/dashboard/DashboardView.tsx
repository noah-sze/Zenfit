import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { WorkoutRecoveryDashboard } from '@/components/workout/WorkoutRecoveryDashboard';
import type { BodyRecoverySummary } from '@/utils/recoveryMath';

export interface DashboardViewProps {
  greeting: string;
  displayWeight: number | null;
  bodyWeightUnit: string;
  hasTodayWeight: boolean;
  consumedEnergy: number;
  energyUnit: string;
  energyDiff: number;
  targetEnergy: number;
  totals: {
    carbs: number;
    protein: number;
    fat: number;
  };
  targetMacros: {
    carbsGrams: number;
    proteinGrams: number;
    fatGrams: number;
  };
  recoverySummary: BodyRecoverySummary;
  stats: {
    exerciseCount: number;
    setCount: number;
    totalVolume: number;
  };
  className?: string;
  onNavigateBody?: () => void;
  onNavigateDiet?: () => void;
  onNavigateWorkout?: () => void;
  interactive?: boolean;
}

export function DashboardView({
  greeting,
  displayWeight,
  bodyWeightUnit,
  hasTodayWeight,
  consumedEnergy,
  energyUnit,
  energyDiff,
  targetEnergy,
  totals,
  targetMacros,
  recoverySummary,
  stats,
  className = '',
  onNavigateBody,
  onNavigateDiet,
  onNavigateWorkout,
  interactive = true,
}: DashboardViewProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full max-w-xl mx-auto space-y-4 select-none", className)}>
      {/* ========================================================================= */}
      {/* 頂部列：問候語 + 今日體重入口卡片 (點擊跳轉「體態界面」) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pb-0.5">
        <h1 className="text-lg sm:text-xl font-medium tracking-tight text-foreground font-sans truncate pr-2">
          {greeting}
        </h1>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigateBody?.();
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
      {/* 模組 1：熱量統計卡片 (復刻「飲食界面」熱量統計，右上角「>」跳轉) */}
      {/* ========================================================================= */}
      <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground select-none">
        {/* 上半部：熱量統計 (Hero Metric) */}
        <div className="p-4 sm:p-5 relative space-y-3">
          {/* 頂部列：標題居中，右上角配置「>」膠囊按鈕 */}
          <div className="relative flex items-center justify-between">
            <div className="size-6 shrink-0 opacity-0 pointer-events-none" />

            <span className="text-xs sm:text-sm font-normal text-muted-foreground select-none">
              {t('diet.calorieStats', '熱量統計')}
            </span>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onNavigateDiet?.();
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
              <span>{consumedEnergy.toLocaleString()}</span>
              <span className="text-sm sm:text-base font-normal text-muted-foreground font-mono">
                {energyUnit}
              </span>
            </div>

            {/* 客觀差額事實 */}
            <div className="flex items-center justify-center gap-2 mt-1 text-sm font-mono text-muted-foreground">
              <span>
                {energyDiff >= 0
                  ? `${t('dietPlan.underBudget', '剩餘')} ${energyDiff.toLocaleString()}${energyUnit}`
                  : `${t('dietPlan.overBudget', '超出')} +${Math.abs(energyDiff).toLocaleString()}${energyUnit}`}
              </span>
            </div>

            {/* 客觀進度標尺 */}
            <div className="h-2 w-full max-w-[220px] mx-auto bg-track rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{
                  width: `${Math.min(100, targetEnergy > 0 ? (consumedEnergy / targetEnergy) * 100 : 0)}%`,
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
        interactive={interactive}
        onNavigate={onNavigateWorkout}
      />
    </div>
  );
}

/** 落地頁與預覽展示用的標準展示數據（單一真理源） */
export const DEMO_DASHBOARD_DATA: DashboardViewProps = {
  greeting: '晚上好，Noah',
  displayWeight: 64.5,
  bodyWeightUnit: 'kg',
  hasTodayWeight: true,
  consumedEnergy: 1840,
  energyUnit: 'kcal',
  energyDiff: 160,
  targetEnergy: 2000,
  totals: {
    carbs: 205,
    protein: 142,
    fat: 52,
  },
  targetMacros: {
    carbsGrams: 220,
    proteinGrams: 140,
    fatGrams: 60,
  },
  recoverySummary: {
    muscles: {
      upper_chest: {
        muscle: 'upper_chest',
        hoursElapsed: 12,
        daysElapsed: 0,
        recoveryPercent: 35,
        intensity: 85,
        tier: 'acute',
        lastTrainedDate: '2026-11-14',
        lastTrainedTimestamp: 1794640000000,
        lastExerciseName: '上斜槓鈴臥推',
      },
      mid_lower_chest: {
        muscle: 'mid_lower_chest',
        hoursElapsed: 12,
        daysElapsed: 0,
        recoveryPercent: 35,
        intensity: 85,
        tier: 'acute',
        lastTrainedDate: '2026-11-14',
        lastTrainedTimestamp: 1794640000000,
        lastExerciseName: '平板啞鈴臥推',
      },
      lats: {
        muscle: 'lats',
        hoursElapsed: 36,
        daysElapsed: 1,
        recoveryPercent: 60,
        intensity: 70,
        tier: 'recovering',
        lastTrainedDate: '2026-11-13',
        lastTrainedTimestamp: 1794550000000,
        lastExerciseName: '引體向上',
      },
      upper_back_traps: {
        muscle: 'upper_back_traps',
        hoursElapsed: 36,
        daysElapsed: 1,
        recoveryPercent: 65,
        intensity: 65,
        tier: 'recovering',
        lastTrainedDate: '2026-11-13',
        lastTrainedTimestamp: 1794550000000,
        lastExerciseName: '槓鈴划船',
      },
      lower_back: { muscle: 'lower_back', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      front_delts: { muscle: 'front_delts', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      side_delts: { muscle: 'side_delts', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      rear_delts: { muscle: 'rear_delts', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      biceps: { muscle: 'biceps', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      triceps: { muscle: 'triceps', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      forearms: { muscle: 'forearms', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      quads: { muscle: 'quads', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      hamstrings: { muscle: 'hamstrings', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      glutes: { muscle: 'glutes', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      calves: { muscle: 'calves', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      abs: { muscle: 'abs', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
      obliques: { muscle: 'obliques', hoursElapsed: 96, daysElapsed: 4, recoveryPercent: 100, intensity: 0, tier: 'recovered', lastTrainedDate: null, lastTrainedTimestamp: null, lastExerciseName: null },
    },
    intensityMap: {
      upper_chest: 85,
      mid_lower_chest: 85,
      lats: 70,
    },
    acuteCount: 1,
    recoveringCount: 2,
    latestWorkoutDaysElapsed: 0,
    latestWorkoutHoursElapsed: 12,
  },
  stats: {
    exerciseCount: 3,
    setCount: 12,
    totalVolume: 4820,
  },
  interactive: true,
};
