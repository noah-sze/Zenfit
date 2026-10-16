import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpringNumber } from '@/components/ui/SpringNumber';
import { Plus, Flame, Droplet, Dumbbell, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedDate, openAddModal } = useAppStore();

  const { profile } = useUserProfile();
  const { totals } = useFoodLogs(selectedDate);
  const { workouts } = useWorkoutLogs(selectedDate);
  const { metricToday, addWater } = useBodyMetrics(selectedDate);

  const calorieTarget = profile.dailyCaloriesTarget || 2000;
  const calorieConsumed = totals.calories || 0;
  const calorieRemaining = Math.max(0, calorieTarget - calorieConsumed);
  const calorieProgress = Math.min(100, Math.round((calorieConsumed / calorieTarget) * 100));

  const proteinTarget = profile.proteinGramsTarget || 140;
  const proteinConsumed = totals.protein || 0;
  const proteinProgress = Math.min(100, Math.round((proteinConsumed / proteinTarget) * 100));

  const carbsTarget = profile.carbsGramsTarget || 220;
  const carbsConsumed = totals.carbs || 0;
  const carbsProgress = Math.min(100, Math.round((carbsConsumed / carbsTarget) * 100));

  const fatTarget = profile.fatGramsTarget || 60;
  const fatConsumed = totals.fat || 0;
  const fatProgress = Math.min(100, Math.round((fatConsumed / fatTarget) * 100));

  const waterTarget = profile.dailyWaterMlTarget || 2500;
  const waterConsumed = metricToday?.waterMl || 0;
  const waterProgress = Math.min(100, Math.round((waterConsumed / waterTarget) * 100));

  // 計算今日訓練總容量與完成組數
  let totalSetsCount = 0;
  let completedSetsCount = 0;
  let totalVolumeKg = 0;

  workouts.forEach((w) => {
    w.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalSetsCount++;
        if (s.isCompleted) {
          completedSetsCount++;
          totalVolumeKg += (s.weight || 0) * (s.reps || 0);
        }
      });
    });
  });

  return (
    <div className="space-y-4">
      {/* 核心熱量儀表卡片 */}
      <Card className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="size-4 sm:size-5 text-foreground" />
            <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
              {t('diet.calories')}
            </CardTitle>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {calorieProgress}%
          </span>
        </CardHeader>

        <CardContent className="px-4 sm:px-5 pb-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-4xl font-bold font-mono tracking-tight flex items-baseline gap-1">
                <SpringNumber value={calorieRemaining} />
                <span className="text-xs font-normal text-muted-foreground font-sans">kcal</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('diet.remaining')}
              </p>
            </div>

            <div className="text-right font-mono text-xs space-y-0.5">
              <div className="text-muted-foreground">
                {t('diet.consumed')}: <span className="text-foreground font-medium">{calorieConsumed}</span>
              </div>
              <div className="text-muted-foreground">
                {t('diet.target')}: <span className="text-foreground">{calorieTarget}</span>
              </div>
            </div>
          </div>

          {/* 單色極簡進度條 */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-500 rounded-full"
              style={{ width: `${calorieProgress}%` }}
            />
          </div>

          {/* 三大營養素 Macros 網格 */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
            {/* 蛋白質 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{t('diet.protein')}</span>
                <span className="font-mono text-muted-foreground">{Math.round(proteinConsumed)}g</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-300"
                  style={{ width: `${proteinProgress}%` }}
                />
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                / {proteinTarget}g
              </div>
            </div>

            {/* 碳水化合物 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{t('diet.carbs')}</span>
                <span className="font-mono text-muted-foreground">{Math.round(carbsConsumed)}g</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/60 rounded-full transition-all duration-300"
                  style={{ width: `${carbsProgress}%` }}
                />
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                / {carbsTarget}g
              </div>
            </div>

            {/* 脂肪 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{t('diet.fat')}</span>
                <span className="font-mono text-muted-foreground">{Math.round(fatConsumed)}g</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/30 rounded-full transition-all duration-300"
                  style={{ width: `${fatProgress}%` }}
                />
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                / {fatTarget}g
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 今日訓練與打卡模組 */}
      <Card className="border border-border bg-card text-card-foreground shadow-none rounded-lg">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-4 sm:size-5 text-foreground" />
            <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
              {t('workout.title')}
            </CardTitle>
          </div>
          <button
            type="button"
            onClick={() => navigate('/workout')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
          >
            {t('common.more')} <ChevronRight className="size-3.5" />
          </button>
        </CardHeader>

        <CardContent className="px-4 sm:px-5 pb-4">
          {workouts.length > 0 ? (
            <div className="space-y-3">
              {workouts.map((w) => (
                <div
                  key={w.id}
                  onClick={() => navigate('/workout')}
                  className="p-3 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border/50 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-medium">{w.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {w.exercises.length} 動作 · {w.exercises.reduce((acc, e) => acc + e.sets.length, 0)} 組
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-medium">{completedSetsCount}</span>
                    <span className="text-muted-foreground">/{totalSetsCount} 完成</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">{t('common.noData')}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddModal('workout')}
                className="text-xs h-9 cursor-pointer rounded-lg"
              >
                <Plus className="size-4 mr-1" />
                {t('workout.newWorkout')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 今日飲水量打卡 */}
      <Card className="border border-border bg-card text-card-foreground shadow-none rounded-lg">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplet className="size-4 sm:size-5 text-foreground" />
            <CardTitle className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
              {t('body.water')}
            </CardTitle>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {waterConsumed} / {waterTarget} ml
          </span>
        </CardHeader>

        <CardContent className="px-4 sm:px-5 pb-4 space-y-3">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-300"
              style={{ width: `${waterProgress}%` }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addWater(250)}
              className="flex-1 text-xs h-9 cursor-pointer rounded-lg"
            >
              +250 ml
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addWater(500)}
              className="flex-1 text-xs h-9 cursor-pointer rounded-lg"
            >
              +500 ml
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
