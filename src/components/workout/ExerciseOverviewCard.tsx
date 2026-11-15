import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import {
  OverviewPeriodSelector,
  IntakeFootprintHeatmap,
} from '@/components/food/IntakeFootprintHeatmap';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { triggerHaptic } from '@/lib/haptics';
import { convertBodyWeight } from '@/utils/unitMath';
import {
  type OverviewPeriod,
  type HeatmapDay,
  calculateExerciseFootprintData,
} from '@/utils/heatmapMath';
import type { BodyWeightUnit } from '@/types';
import { cn } from '@/lib/utils';

export interface ExerciseOverviewCardProps {
  exerciseName: string;
  equipmentName?: string;
  isArchived?: boolean;
  bestE1RM?: number;
  totalSets?: number;
  totalVolume?: number;
  bodyWeightUnit?: BodyWeightUnit;
  heatmapDays?: HeatmapDay[];
  totalWeeks?: number;
  overviewPeriod?: OverviewPeriod;
  onPeriodChange?: (period: OverviewPeriod) => void;
  onContainerWidthChange?: (width: number) => void;
  className?: string;
  interactive?: boolean;
}

/**
 * 動作歷史指標與訓練足跡卡片 (Single Source of Truth)
 * 供 ExerciseDetails 與 LandingPage 訓練展示共同複用
 */
export function ExerciseOverviewCard({
  exerciseName,
  equipmentName,
  isArchived = false,
  bestE1RM = 0,
  totalSets = 0,
  totalVolume = 0,
  bodyWeightUnit = 'kg',
  heatmapDays = [],
  totalWeeks = 52,
  overviewPeriod: controlledPeriod,
  onPeriodChange,
  onContainerWidthChange,
  className = '',
  interactive = true,
}: ExerciseOverviewCardProps) {
  const { t } = useTranslation();

  // 內部週期切換狀態 (受控與非受控模式相容)
  const [internalPeriod, setInternalPeriod] = useState<OverviewPeriod>('30d');
  const currentPeriod = controlledPeriod ?? internalPeriod;

  const handlePeriodChange = (period: OverviewPeriod) => {
    if (onPeriodChange) {
      onPeriodChange(period);
    } else {
      setInternalPeriod(period);
    }
  };

  // 最佳 e1RM 說明 Popover 狀態
  const [isE1rmPopoverOpen, setIsE1rmPopoverOpen] = useState(false);
  const [e1rmAnchorEl, setE1rmAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpenE1rmPopover = (target: HTMLElement) => {
    if (!interactive) return;
    triggerHaptic('selection');
    setE1rmAnchorEl(target);
    setIsE1rmPopoverOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          'border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-none font-mono',
          !interactive && 'pointer-events-none select-none',
          className
        )}
      >
        {/* 第 1 層：動作名稱與器材規格 (高度 68px 與指標區塊一致) */}
        <div className="h-[68px] px-3.5 sm:px-4 border-b border-border flex items-center justify-between gap-2.5 bg-card overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate font-sans">
              {exerciseName}
            </h3>
            {isArchived && (
              <span className="text-[10px] font-mono text-destructive border border-destructive/30 px-1.5 py-0.5 rounded shrink-0">
                {t('common.archived', '已歸檔')}
              </span>
            )}
          </div>
          {equipmentName && (
            <div className="flex items-center shrink-0">
              <EquipmentBadge
                name={equipmentName}
                className="text-[11px] px-2 py-0.5 font-normal"
              />
            </div>
          )}
        </div>

        {/* 第 2 層：客觀指標分割卡片 (支援 1w/30d/3m/6m/1y 切換，各行高度 68px 一致) */}
        <div className="border-b border-border bg-card divide-y divide-border">
          {/* 上排：2 欄 (最佳 e1RM 與 累計完成組數) */}
          <div className="grid grid-cols-2 divide-x divide-border h-[68px]">
            {/* 1. 最佳 e1RM (點擊呼出說明 Popover) */}
            <div
              onClick={(e) => handleOpenE1rmPopover(e.currentTarget)}
              className={cn(
                'h-[68px] px-3.5 sm:px-4 py-2.5 flex flex-col justify-between overflow-hidden group select-none transition-colors',
                interactive ? 'cursor-pointer hover:bg-hover' : 'cursor-default'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-normal text-muted-foreground truncate font-sans',
                    interactive &&
                      'group-hover:text-foreground group-hover:decoration-foreground underline decoration-dotted underline-offset-2 decoration-muted-foreground/40'
                  )}
                >
                  {t('workout.bestE1RM', '最佳 e1RM')}
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  <OverviewPeriodSelector
                    value={currentPeriod}
                    onChange={handlePeriodChange}
                  />
                </div>
              </div>
              <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
                <span className="font-bold text-foreground tabular-nums">
                  {convertBodyWeight(bestE1RM, 'kg', bodyWeightUnit, 1)}
                </span>
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {bodyWeightUnit}
                </span>
              </div>
            </div>

            {/* 2. 累計組數 */}
            <div className="h-[68px] px-3.5 sm:px-4 py-2.5 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-muted-foreground truncate font-sans">
                  {t('workout.totalCompletedSets', '累計完成組數')}
                </span>
                <OverviewPeriodSelector
                  value={currentPeriod}
                  onChange={handlePeriodChange}
                />
              </div>
              <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
                <span className="font-bold text-foreground tabular-nums">
                  {totalSets.toLocaleString()}
                </span>
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {t('workout.set', '組')}
                </span>
              </div>
            </div>
          </div>

          {/* 下排：單獨一行 (累計訓練總容量) */}
          <div className="h-[68px] px-3.5 sm:px-4 py-2.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground truncate font-sans">
                {t('workout.totalLifetimeVolume', '累計訓練總容量')}
              </span>
              <OverviewPeriodSelector
                value={currentPeriod}
                onChange={handlePeriodChange}
              />
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-bold text-foreground tabular-nums">
                {convertBodyWeight(totalVolume, 'kg', bodyWeightUnit, 1)}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {bodyWeightUnit}
              </span>
            </div>
          </div>
        </div>

        {/* 第 3 層：微型訓練足跡熱點矩陣 (可左右滾動查看更早歷史，預設對齊今天) */}
        <IntakeFootprintHeatmap
          title={t('workout.footprint', '訓練足跡')}
          heatmapDays={heatmapDays}
          totalWeeks={totalWeeks}
          onContainerWidthChange={onContainerWidthChange}
          getTooltipText={(day) =>
            `${day.date}: ${day.count} ${t('workout.set', '組')} · ${convertBodyWeight(day.grams, 'kg', bodyWeightUnit, 1)}${bodyWeightUnit}`
          }
          renderSelectedDetails={(day) => (
            <div className="flex items-center tabular-nums text-xs font-mono">
              <span
                className={day.count === 0 ? 'text-muted-foreground' : 'text-foreground'}
              >
                {day.count} {t('workout.set', '組')}
              </span>
              <span className="text-border mx-1.5 select-none">·</span>
              <span
                className={day.count === 0 ? 'text-muted-foreground' : 'text-foreground'}
              >
                {convertBodyWeight(day.grams, 'kg', bodyWeightUnit, 1)}
                {bodyWeightUnit}
              </span>
            </div>
          )}
        />
      </div>

      {/* 最佳 e1RM 指標說明 Popover 浮層 */}
      <Popover
        open={isE1rmPopoverOpen}
        onOpenChange={(isOpen) => {
          setIsE1rmPopoverOpen(isOpen);
          if (!isOpen) {
            setE1rmAnchorEl(null);
          }
        }}
      >
        {e1rmAnchorEl && (
          <PopoverContent
            anchor={e1rmAnchorEl}
            align="start"
            side="bottom"
            sideOffset={6}
            className="w-80 sm:w-88 max-w-[calc(100vw-24px)] p-3.5 bg-popover text-popover-foreground border border-border shadow-none rounded-lg select-none font-mono focus:outline-hidden"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="text-xs font-semibold text-foreground">
                  {t('workout.e1rmExplanation.title', '最佳 e1RM 說明')}
                </div>
                <div className="text-xs font-mono text-foreground tabular-nums">
                  {convertBodyWeight(bestE1RM, 'kg', bodyWeightUnit, 1)}
                  {bodyWeightUnit}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono flex flex-wrap items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded leading-relaxed">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 shrink-0">
                  {t('workout.e1rmExplanation.formulaLabel', '推算公式')}:
                </span>
                <span className="text-foreground whitespace-normal break-words font-mono">
                  {t('workout.e1rmExplanation.formula', '重量 × (1 + 次數 / 30)')}
                </span>
              </div>

              <div className="text-xs text-muted-foreground font-sans leading-relaxed pt-0.5 break-words">
                {t(
                  'workout.e1rmExplanation.desc',
                  'e1RM（Estimated 1RM）為純數學預估單次極限力量。'
                )}
              </div>

              <div className="text-[11px] text-muted-foreground/80 font-sans leading-relaxed border-t border-border/60 pt-2 break-words">
                {t(
                  'workout.e1rmExplanation.accuracy',
                  '次數越接近 1~5 次，推算結果越具備高度參考價值。'
                )}
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </>
  );
}

/** 落地頁與預覽展示用的標準動作概覽數據（對標真實 APP 啞鈴臥推詳情頁，展現高自律訓練軌跡） */
export function getDemoExerciseOverviewData(
  bodyWeightUnit: BodyWeightUnit = 'kg',
  t?: (key: string, fallback?: string) => string
) {
  const tr = (key: string, fallback: string) => (t ? t(key, fallback) : fallback);
  // 生成高自律擬真訓練日誌 (近 30d 累計 8 次訓練、32 組，總容量 6,688kg，最佳 e1RM 30.0kg)
  const demoWorkoutLogs = [
    // 近 30 天高自律規律訓練 (每週 2 次，每次 4 組，穩定漸進超負荷)
    {
      date: '2026-11-14',
      sets: [
        { weight: 20, reps: 15, isCompleted: true },
        { weight: 20, reps: 12, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
      ],
    },
    {
      date: '2026-11-10',
      sets: [
        { weight: 20, reps: 12, isCompleted: true },
        { weight: 20, reps: 12, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
      ],
    },
    {
      date: '2026-11-07',
      sets: [
        { weight: 20, reps: 12, isCompleted: true },
        { weight: 20, reps: 12, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
      ],
    },
    {
      date: '2026-11-03',
      sets: [
        { weight: 20, reps: 12, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
      ],
    },
    {
      date: '2026-10-30',
      sets: [
        { weight: 20, reps: 11, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 9, isCompleted: true },
      ],
    },
    {
      date: '2026-10-26',
      sets: [
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
        { weight: 20, reps: 10, isCompleted: true },
      ],
    },
    {
      date: '2026-10-22',
      sets: [
        { weight: 18, reps: 12, isCompleted: true },
        { weight: 18, reps: 12, isCompleted: true },
        { weight: 18, reps: 10, isCompleted: true },
        { weight: 18, reps: 10, isCompleted: true },
      ],
    },
    {
      date: '2026-10-18',
      sets: [
        { weight: 18, reps: 12, isCompleted: true },
        { weight: 18, reps: 10, isCompleted: true },
        { weight: 18, reps: 10, isCompleted: true },
        { weight: 18, reps: 10, isCompleted: true },
      ],
    },
    // 歷史規律足跡 (52 週全年分佈，深淺交錯，完全填滿橫向寬度無空白)
    { date: '2026-10-14', sets: [{ weight: 18, reps: 10, isCompleted: true }, { weight: 18, reps: 10, isCompleted: true }] },
    { date: '2026-10-07', sets: [{ weight: 18, reps: 12, isCompleted: true }, { weight: 18, reps: 10, isCompleted: true }] },
    { date: '2026-09-28', sets: [{ weight: 16, reps: 10, isCompleted: true }, { weight: 16, reps: 10, isCompleted: true }] },
    { date: '2026-09-21', sets: [{ weight: 16, reps: 10, isCompleted: true }, { weight: 16, reps: 10, isCompleted: true }] },
    { date: '2026-09-14', sets: [{ weight: 16, reps: 10, isCompleted: true }] },
    { date: '2026-09-07', sets: [{ weight: 16, reps: 10, isCompleted: true }] },
    { date: '2026-08-25', sets: [{ weight: 14, reps: 10, isCompleted: true }] },
    { date: '2026-08-18', sets: [{ weight: 14, reps: 10, isCompleted: true }] },
    { date: '2026-08-11', sets: [{ weight: 14, reps: 10, isCompleted: true }] },
    { date: '2026-07-28', sets: [{ weight: 14, reps: 10, isCompleted: true }] },
    { date: '2026-07-21', sets: [{ weight: 12, reps: 10, isCompleted: true }] },
    { date: '2026-07-07', sets: [{ weight: 12, reps: 10, isCompleted: true }] },
    { date: '2026-06-23', sets: [{ weight: 12, reps: 10, isCompleted: true }] },
    { date: '2026-06-09', sets: [{ weight: 12, reps: 10, isCompleted: true }] },
    { date: '2026-05-26', sets: [{ weight: 10, reps: 10, isCompleted: true }] },
    { date: '2026-05-12', sets: [{ weight: 10, reps: 10, isCompleted: true }] },
    { date: '2026-04-28', sets: [{ weight: 10, reps: 10, isCompleted: true }] },
    { date: '2026-04-14', sets: [{ weight: 10, reps: 10, isCompleted: true }] },
    { date: '2026-03-24', sets: [{ weight: 9, reps: 10, isCompleted: true }] },
    { date: '2026-03-10', sets: [{ weight: 9, reps: 10, isCompleted: true }] },
    { date: '2026-02-24', sets: [{ weight: 8, reps: 10, isCompleted: true }] },
    { date: '2026-02-10', sets: [{ weight: 8, reps: 10, isCompleted: true }] },
    { date: '2026-01-20', sets: [{ weight: 8, reps: 10, isCompleted: true }] },
  ];

  const totalWeeks = 52;
  const footprint = calculateExerciseFootprintData({
    logs: demoWorkoutLogs,
    overviewPeriod: '30d',
    totalWeeks,
  });

  return {
    exerciseName: tr('landing.demoData.dumbbellBenchPress', '啞鈴臥推'),
    equipmentName: tr('landing.demoData.dumbbell', '啞鈴'),
    isArchived: false,
    bestE1RM: footprint.periodBestE1RM || 30.0,
    totalSets: footprint.periodSets || 32,
    totalVolume: footprint.periodVolume || 6688,
    bodyWeightUnit,
    heatmapDays: footprint.heatmapDays,
    totalWeeks,
    overviewPeriod: '30d' as OverviewPeriod,
  };
}
