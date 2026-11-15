import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { HoldToDeleteIconButton } from '@/components/ui/HoldToDeleteIconButton';
import { cn } from '@/lib/utils';
import { kgToLbs } from '@/utils/unitMath';
import type { WorkoutSet } from '@/types';

export interface WorkoutExerciseCardProps {
  exerciseId?: string;
  exerciseName: string;
  sets: Array<Partial<WorkoutSet> & { weight?: number; reps?: number }>;
  bodyWeightUnit?: string;
  className?: string;
  interactive?: boolean;
  onOpenKeypad?: (setIdx: number, field: 'weight' | 'reps', val: number) => void;
  onAddSet?: () => void;
  onDeleteExercise?: () => void;
}

/**
 * 健身動作記錄卡片 (Single Source of Truth)
 * 供 Workout 主頁面與 LandingPage 訓練展示共同複用
 */
export function WorkoutExerciseCard({
  exerciseId,
  exerciseName,
  sets,
  bodyWeightUnit = 'kg',
  className = '',
  interactive = true,
  onOpenKeypad,
  onAddSet,
  onDeleteExercise,
}: WorkoutExerciseCardProps) {
  const { t } = useTranslation();

  const groupVolumeKg = sets.reduce(
    (sum, s) => sum + (s.weight || 0) * (s.reps || 0),
    0
  );
  const displayGroupVolume =
    bodyWeightUnit === 'lbs' ? kgToLbs(groupVolumeKg, 0) : groupVolumeKg;

  return (
    <div
      className={cn(
        'border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-visible font-mono',
        className
      )}
    >
      {/* 灰底表頭橫欄 (單行 40px 高度：動作名稱 · 組數 · 容量) */}
      <div className="h-10 px-3.5 sm:px-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3 text-xs font-mono text-muted-foreground shrink-0 rounded-t-lg">
        <div className="flex items-center gap-1.5 min-w-0">
          {exerciseId && interactive ? (
            <Link
              to={`/settings/exercises/${exerciseId}`}
              className="font-semibold text-sm tracking-tight text-foreground truncate px-1.5 py-0.5 -mx-1.5 rounded-full border border-transparent hover:border-border/80 hover:bg-hover transition-all cursor-pointer select-none shrink-0"
            >
              {exerciseName}
            </Link>
          ) : (
            <span className="font-semibold text-sm tracking-tight text-foreground truncate shrink-0">
              {exerciseName}
            </span>
          )}
          <span className="text-border select-none shrink-0">·</span>
          <span className="shrink-0">
            {sets.length} {t('workout.set', '組')}
          </span>
          {displayGroupVolume > 0 && (
            <>
              <span className="text-border select-none shrink-0">·</span>
              <span className="text-muted-foreground shrink-0 truncate">
                {Math.round(displayGroupVolume).toLocaleString()}
                {bodyWeightUnit}
              </span>
            </>
          )}
        </div>

        {onDeleteExercise && interactive && (
          <div className="flex items-center gap-1 shrink-0">
            <HoldToDeleteIconButton
              onConfirm={onDeleteExercise}
              title={t('common.delete', '刪除')}
              aria-label={t('common.delete', '刪除')}
            />
          </div>
        )}
      </div>

      {/* 每組數值列表 (點擊膠囊即刻呼出數字鍵盤) */}
      <div className="divide-y divide-border/40 bg-muted/10">
        {sets.map((set, setIdx) => {
          const hasWeight = typeof set.weight === 'number' && set.weight > 0;
          const displayWeight = hasWeight
            ? bodyWeightUnit === 'lbs'
              ? kgToLbs(set.weight || 0, 1)
              : set.weight || 0
            : '-';

          return (
            <div
              key={set.id || setIdx}
              className="min-h-10 py-1.5 px-3.5 sm:px-4 flex items-center justify-between gap-3 text-xs font-mono"
            >
              <span className="text-muted-foreground text-xs w-14 shrink-0">
                {t('workout.set', '組')} {setIdx + 1}
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* 重量膠囊 (固定寬度 78px，內部數字右對齊，未填入時顯示 - kg，保證多組垂直對齊) */}
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() =>
                    onOpenKeypad &&
                    onOpenKeypad(setIdx, 'weight', set.weight || 0)
                  }
                  className={cn(
                    'h-7 w-[78px] px-2 rounded-full border border-border/80 bg-background font-mono text-xs flex items-center justify-center gap-1 transition-colors select-none shrink-0',
                    interactive
                      ? 'hover:bg-hover cursor-pointer active:scale-95'
                      : 'cursor-default'
                  )}
                >
                  <span
                    className={cn(
                      'tabular-nums min-w-[20px] text-right',
                      hasWeight ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {displayWeight}
                  </span>
                  <span className="text-muted-foreground text-[10px] shrink-0">
                    {bodyWeightUnit}
                  </span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0 -ml-0.5" />
                </button>

                <span className="text-muted-foreground text-xs select-none w-3 text-center shrink-0">
                  ×
                </span>

                {/* 次數膠囊 (固定寬度 70px，內部數字右對齊，未填入時顯示 - 次，保證多組垂直對齊) */}
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() =>
                    onOpenKeypad &&
                    onOpenKeypad(setIdx, 'reps', set.reps || 0)
                  }
                  className={cn(
                    'h-7 w-[70px] px-2 rounded-full border border-border/80 bg-background font-mono text-xs flex items-center justify-center gap-1 transition-colors select-none shrink-0',
                    interactive
                      ? 'hover:bg-hover cursor-pointer active:scale-95'
                      : 'cursor-default'
                  )}
                >
                  <span
                    className={cn(
                      'tabular-nums min-w-[14px] text-right',
                      typeof set.reps === 'number' && set.reps > 0
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {typeof set.reps === 'number' && set.reps > 0
                      ? set.reps
                      : '-'}
                  </span>
                  <span className="text-muted-foreground text-[10px] shrink-0">
                    {t('common.times', '次')}
                  </span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0 -ml-0.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* 動作底部快速增加一組按鈕 */}
        <div className="py-1.5 px-3.5 sm:px-4 flex justify-center bg-card/60 rounded-b-lg">
          <button
            type="button"
            disabled={!interactive}
            onClick={onAddSet}
            className={cn(
              'text-[11px] font-mono text-muted-foreground inline-flex items-center gap-1 transition-colors select-none py-0.5',
              interactive
                ? 'hover:text-foreground cursor-pointer'
                : 'cursor-default opacity-80'
            )}
          >
            <Plus className="size-3" />
            <span>{t('workout.addSet', '增加一組')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** 落地頁與預覽展示用的標準動作組列表（工廠函式，完整支援多語系 i18n） */
export function getDemoWorkoutExercisesData(
  t?: (key: string, fallback?: string) => string
) {
  const tr = (key: string, fallback: string) => (t ? t(key, fallback) : fallback);
  return [
    {
      exerciseName: tr('landing.demoData.dumbbellBenchPress', '啞鈴臥推'),
      bodyWeightUnit: 'kg',
      sets: [
        { weight: 20, reps: 15 },
        { weight: 20, reps: 12 },
        { weight: 20, reps: 10 },
      ],
    },
    {
      exerciseName: tr('landing.demoData.dumbbellReverseFly', '啞鈴俯身飛鳥'),
      bodyWeightUnit: 'kg',
      sets: [
        { weight: 20, reps: 15 },
        { weight: 20, reps: 12 },
        { weight: 20, reps: 10 },
      ],
    },
  ];
}

/** 落地頁與預覽展示用的標準動作組列表（單一真理源） */
export const DEMO_WORKOUT_EXERCISES_DATA = getDemoWorkoutExercisesData();

/** 向後相容單一動作常數 */
export const DEMO_WORKOUT_EXERCISE_DATA = DEMO_WORKOUT_EXERCISES_DATA[0];
