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
import { formatEnergy, convertBodyWeight, kgToLbs } from '@/utils/unitMath';
import { triggerHaptic } from '@/lib/haptics';
import { DashboardView } from '@/components/dashboard/DashboardView';

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

  const isBinge = dietPlan.activityLevel === 999;
  const targetCalories = isBinge ? 9999 : (dietPlan.caloriesTarget || 2000);
  const targetMacros = {
    carbsGrams: isBinge ? 999 : (dietPlan.carbsTarget || 220),
    proteinGrams: isBinge ? 999 : (dietPlan.proteinTarget || 140),
    fatGrams: isBinge ? 999 : (dietPlan.fatTarget || 60),
  };

  const consumedEnergy = formatEnergy(totals.calories, energyUnit).value;
  const targetEnergy = isBinge
    ? (energyUnit === 'kJ' ? 99999 : 9999)
    : formatEnergy(targetCalories, energyUnit).value;
  const energyDiff = targetEnergy - consumedEnergy;

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
    <DashboardView
      greeting={getGreeting(t, profile.name || 'Noah')}
      displayWeight={displayWeight}
      bodyWeightUnit={bodyWeightUnit}
      hasTodayWeight={hasTodayWeight}
      consumedEnergy={consumedEnergy}
      energyUnit={energyUnit}
      energyDiff={energyDiff}
      targetEnergy={targetEnergy}
      totals={totals}
      targetMacros={targetMacros}
      recoverySummary={recoverySummary}
      stats={stats}
      className="pb-20"
      onNavigateBody={() => {
        triggerHaptic('light');
        navigate('/body');
      }}
      onNavigateDiet={() => {
        triggerHaptic('light');
        navigate('/diet');
      }}
      onNavigateWorkout={() => {
        triggerHaptic('light');
        navigate('/workout');
      }}
    />
  );
}
