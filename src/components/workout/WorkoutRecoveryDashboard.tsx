import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { ChevronRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { BodyHighlighter } from './BodyHighlighter';
import type { BodyRecoverySummary, MuscleRecoveryTier } from '@/utils/recoveryMath';
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
  /** 點擊右上方導航膠囊跳轉回調 (例如在總覽首頁跳轉至訓練頁面) */
  onNavigate?: () => void;
  /** 是否允許肌肉點擊互動彈窗，預設 true */
  interactive?: boolean;
  /** 是否展示左上角「肌群恢復狀態」標題，預設 true */
  showTitle?: boolean;
}

export const WorkoutRecoveryDashboard = memo(function WorkoutRecoveryDashboard({
  recoverySummary,
  exerciseCount,
  setCount,
  totalVolume,
  weightUnit = 'kg',
  className = '',
  onNavigate,
  interactive = true,
  showTitle = true,
}: WorkoutRecoveryDashboardProps) {
  const { t } = useTranslation();
  const [selectedMuscle, setSelectedMuscle] = useState<DetailedMuscle | null>(null);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  // 選中肌群的客觀狀態詳情
  const selectedStatus = selectedMuscle ? recoverySummary.muscles[selectedMuscle] : null;

  const handleMuscleClick = (
    muscle: DetailedMuscle,
    _slug: unknown,
    _view: unknown,
    event?: React.MouseEvent<SVGPathElement>
  ) => {
    if (selectedMuscle === muscle) {
      setSelectedMuscle(null);
      setAnchorEl(null);
    } else {
      setSelectedMuscle(muscle);
      setAnchorEl(event?.currentTarget ?? null);
    }
  };

  const handleClearSelection = () => {
    setSelectedMuscle(null);
    setAnchorEl(null);
  };

  const getMuscleDisplayName = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')}`;
    return t(key, muscle);
  };

  const getTierDisplayName = (tier: MuscleRecoveryTier) => {
    switch (tier) {
      case 'acute':
        return t('workout.tierAcute', '急性疲勞');
      case 'recovering':
        return t('workout.tierRecovering', '修復中');
      case 'near_ready':
        return t('workout.tierNearReady', '即將就緒');
      case 'recovered':
      default:
        return t('workout.tierRecovered', '已就緒');
    }
  };

  const getTierTextColor = (tier: MuscleRecoveryTier) => {
    switch (tier) {
      case 'acute':
        return 'text-destructive';
      case 'recovering':
        return 'text-amber-500';
      case 'near_ready':
        return 'text-blue-500';
      case 'recovered':
      default:
        return 'text-foreground';
    }
  };

  return (
    <>
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
            {showTitle && (
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {t('workout.muscleRecoveryStatus', '肌群恢復狀態')}
              </div>
            )}

            <div className={cn('flex items-center gap-1.5', !showTitle && 'ml-auto')}>
              {recoverySummary.recoveringCount > 0 ? (
                <span className="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border border-[var(--muscle-intensity-high-text)]/40 bg-[var(--muscle-intensity-high-bg)]/30 text-[var(--muscle-intensity-high-text)]">
                  <span>
                    {recoverySummary.recoveringCount}{' '}
                    {t('workout.musclesRecovering', '個肌群恢復中')}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground">
                  <span>{t('workout.allMusclesReady', '全部肌群已就緒')}</span>
                </span>
              )}
              {onNavigate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    onNavigate();
                  }}
                  className="size-6 rounded-full border border-border/80 bg-muted/20 hover:bg-hover text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer select-none active:scale-95 shrink-0"
                  aria-label={t('nav.workout', '健身')}
                  title={t('nav.workout', '健身')}
                >
                  <ChevronRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 人體解剖圖渲染 (前後雙向並排) */}
          <div className="flex flex-col items-center justify-center py-1">
            <BodyHighlighter
              view="both"
              muscles={recoverySummary.intensityMap}
              selectedMuscle={selectedMuscle}
              onMuscleClick={interactive ? handleMuscleClick : undefined}
              onClearSelection={interactive ? handleClearSelection : undefined}
              interactive={interactive}
              size="md"
              showLabels={true}
              showHud={false}
              highlightColor="#ef4444"
              className="w-full max-w-[340px] sm:max-w-[400px]"
            />
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

      {/* 肌群恢復詳情 Popover 浮層提示 (平級兄弟節點宣告，徹底杜絕 Portal 守衛節點受 space-y 影響撐開卡片高度) */}
      <Popover
        open={Boolean(selectedMuscle && anchorEl && selectedStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMuscle(null);
            setAnchorEl(null);
          }
        }}
      >
        {anchorEl && selectedStatus && (
          <PopoverContent
            anchor={anchorEl}
            side="top"
            sideOffset={6}
            align="center"
            className="p-0 border-none bg-transparent shadow-none flex flex-col items-center animate-none w-auto z-[90]"
          >
            {/* 專案統計資訊分欄卡片 */}
            <div className="w-[176px] rounded-lg border border-border bg-popover/98 backdrop-blur-md text-popover-foreground shadow-none font-mono select-none overflow-hidden">
              {/* 頂部標題列 */}
              <div className="px-2.5 py-1.5 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="font-bold text-foreground text-[13px] sm:text-sm leading-tight truncate">
                  {getMuscleDisplayName(selectedStatus.muscle)}
                </span>
              </div>

              {/* 下方雙欄分割統計行 */}
              <div className="grid grid-cols-2 divide-x divide-border bg-card/40">
                {/* 左欄（狀態） */}
                <div className="p-2 flex flex-col items-start gap-0.5 overflow-hidden">
                  <span className="text-[10px] text-muted-foreground font-normal leading-none truncate">
                    {t('workout.status', '狀態')}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-bold leading-tight truncate mt-0.5',
                      getTierTextColor(selectedStatus.tier)
                    )}
                  >
                    {getTierDisplayName(selectedStatus.tier)}
                  </span>
                </div>

                {/* 右欄（上次刺激） */}
                <div className="p-2 flex flex-col items-start gap-0.5 overflow-hidden">
                  <span className="text-[10px] text-muted-foreground font-normal leading-none truncate">
                    {t('workout.lastStimulus', '上次刺激')}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-mono leading-tight truncate mt-0.5',
                      selectedStatus.daysElapsed !== null
                        ? 'font-bold text-foreground'
                        : 'font-normal text-muted-foreground'
                    )}
                  >
                    {selectedStatus.daysElapsed !== null
                      ? selectedStatus.daysElapsed === 0
                        ? t('workout.trainedToday', '今天')
                        : selectedStatus.daysElapsed === 1
                        ? t('workout.trainedYesterday', '昨天')
                        : t('workout.daysElapsedAgo', { count: selectedStatus.daysElapsed })
                      : t('workout.none', '無')}
                  </span>
                </div>
              </div>
            </div>

            {/* 微型倒三角指針 */}
            <div className="w-0 h-0 border-x-[4px] border-x-transparent border-t-[4.5px] border-t-border mx-auto -mb-1 mt-0.5" />
          </PopoverContent>
        )}
      </Popover>
    </>
  );
});
