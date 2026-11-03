import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BodyHighlighter } from './BodyHighlighter';
import type { BodyRecoverySummary } from '@/utils/recoveryMath';
import type { DetailedMuscle } from '@/types';
import { cn } from '@/lib/utils';

export interface WorkoutRecoveryDashboardProps {
  /** 全身肌肉恢復匯總數據 */
  recoverySummary: BodyRecoverySummary;
  /** 當日動作項目數 */
  exerciseCount: number;
  /** 當日總組數 */
  setCount: number;
  /** 當日訓練總容量 (數值已換算為使用者的目標單位) */
  totalVolume: number;
  /** 重量單位 (kg 或 lbs) */
  weightUnit?: string;
  className?: string;
}

export const WorkoutRecoveryDashboard = memo(function WorkoutRecoveryDashboard({
  recoverySummary,
  exerciseCount,
  setCount,
  totalVolume,
  weightUnit = 'kg',
  className = '',
}: WorkoutRecoveryDashboardProps) {
  const { t } = useTranslation();
  const [selectedMuscle, setSelectedMuscle] = useState<DetailedMuscle | null>(null);

  // 選中肌群的客觀狀態詳情
  const selectedStatus = selectedMuscle ? recoverySummary.muscles[selectedMuscle] : null;

  const getMuscleDisplayName = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')}`;
    return t(key, muscle);
  };

  return (
    <div
      className={cn(
        'border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden',
        className
      )}
    >
      {/* 上半部：人體肌肉恢復熱圖 */}
      <div className="p-3.5 sm:p-5 space-y-3">
        {/* 頂部標頭與摘要膠囊 */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            {t('workout.muscleRecoveryStatus', '肌群恢復狀態')}
          </div>

          <div className="flex items-center gap-1.5">
            {recoverySummary.recoveringCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border border-[var(--muscle-intensity-high-text)]/40 bg-[var(--muscle-intensity-high-bg)]/30 text-[var(--muscle-intensity-high-text)]">
                <span className="size-1.5 rounded-full bg-[var(--muscle-intensity-high-text)] animate-pulse" />
                <span>
                  {recoverySummary.recoveringCount}{' '}
                  {t('workout.musclesRecovering', '個肌群恢復中')}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground">
                <span className="size-1.5 rounded-full bg-foreground/60" />
                <span>{t('workout.allMusclesReady', '全部肌群已就緒')}</span>
              </span>
            )}
          </div>
        </div>

        {/* 人體解剖圖渲染 (前後雙向並排) */}
        <div className="flex flex-col items-center justify-center py-1">
          <BodyHighlighter
            view="both"
            muscles={recoverySummary.intensityMap}
            selectedMuscle={selectedMuscle}
            onMuscleClick={(muscle) => {
              setSelectedMuscle((prev) => (prev === muscle ? null : muscle));
            }}
            onClearSelection={() => setSelectedMuscle(null)}
            interactive={true}
            size="md"
            showLabels={true}
            showHud={false}
            highlightColor="#ef4444"
            className="w-full max-w-[340px] sm:max-w-[400px]"
          />
        </div>

        {/* 底部客觀狀態列 (高度嚴格恆定為 h-7，非全寬膠囊，無關閉鈕，徹底杜絕撐大卡片與高度抖動) */}
        <div className="h-7 flex items-center justify-center select-none shrink-0 overflow-hidden">
          {selectedStatus ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border bg-muted/60 text-[11px] font-mono text-foreground max-w-full truncate animate-in fade-in">
              <span className="font-semibold text-foreground">
                {getMuscleDisplayName(selectedStatus.muscle)}
              </span>
              <span className="text-border">·</span>
              {selectedStatus.hoursElapsed !== null ? (
                <>
                  <span className="text-muted-foreground">
                    {t('workout.hoursElapsedAgo', { count: Math.round(selectedStatus.hoursElapsed) })}
                  </span>
                  <span className="text-border">·</span>
                  <span className="font-medium text-foreground">
                    {t('workout.recoveryPercent', '恢復進度')} {selectedStatus.recoveryPercent}%
                  </span>
                  {selectedStatus.lastExerciseName && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-muted-foreground truncate max-w-[90px] sm:max-w-[140px]">
                        {selectedStatus.lastExerciseName}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">
                  {t('workout.neverTrained', '近期無刺激 · 100% 就緒')}
                </span>
              )}
            </div>
          ) : (
            /* 極簡微型圖例標記 */
            <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--muscle-intensity-high-bg)] border border-[var(--muscle-intensity-high-text)]/40" />
                <span>0-24h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--muscle-intensity-med-bg)] border border-[var(--muscle-intensity-med-text)]/40" />
                <span>24-48h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--muscle-intensity-low-bg)] border border-[var(--muscle-intensity-low-text)]/40" />
                <span>48-72h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted border border-border" />
                <span>&gt;72h</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 下半部：訓練客觀 3 欄指標 (完全對標飲食頁面的碳水、蛋白質、脂肪 3 欄) */}
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border font-mono">
        {/* 1. 動作項目 */}
        <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
          <div className="text-xs font-medium text-muted-foreground truncate whitespace-nowrap">
            {t('workout.exercises', '動作項目')}
          </div>
          <div className="text-sm sm:text-base tracking-tight flex items-baseline truncate whitespace-nowrap">
            <span className="font-bold text-foreground">
              {exerciseCount}
            </span>
            <span className="text-2xs sm:text-xs font-normal text-muted-foreground ml-1">
              {t('common.items', '項')}
            </span>
          </div>
        </div>

        {/* 2. 完成組數 */}
        <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
          <div className="text-xs font-medium text-muted-foreground truncate whitespace-nowrap">
            {t('workout.completedSets', '完成組數')}
          </div>
          <div className="text-sm sm:text-base tracking-tight flex items-baseline truncate whitespace-nowrap">
            <span className="font-bold text-foreground">
              {setCount}
            </span>
            <span className="text-2xs sm:text-xs font-normal text-muted-foreground ml-1">
              {t('workout.set', '組')}
            </span>
          </div>
        </div>

        {/* 3. 訓練總容量 */}
        <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
          <div className="text-xs font-medium text-muted-foreground truncate whitespace-nowrap">
            {t('workout.totalVolume', '訓練容量')}
          </div>
          <div className="text-sm sm:text-base tracking-tight flex items-baseline truncate whitespace-nowrap">
            <span className="font-bold text-foreground">
              {Math.round(totalVolume).toLocaleString()}
            </span>
            <span className="text-2xs sm:text-xs font-normal text-muted-foreground ml-1">
              {weightUnit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
