import { subDays, format } from 'date-fns';
import { calculateE1RM } from './workoutMath';

export type OverviewPeriod = '1w' | '30d' | '3m' | '6m' | '1y' | 'all';

export interface HeatmapDay {
  date: string;
  count: number;
  grams: number;
  calories: number;
  level: number;
  isWithinPast30Days: boolean;
  isMonthMarker?: boolean;
  month?: number;
}

export interface MinimalLog {
  date: string;
  calories?: number;
  quantity?: number;
}

export const TARGET_CELL_SIZE = 14;
export const MATRIX_GAP = 2.5;

/**
 * 依據概覽週期取得對應天數
 */
export function getPeriodDaysCount(period: OverviewPeriod): number {
  switch (period) {
    case '1w':
      return 7;
    case '30d':
      return 30;
    case '3m':
      return 90;
    case '6m':
      return 180;
    case '1y':
      return 365;
    case 'all':
      return Infinity;
    default:
      return 30;
  }
}

/**
 * 計算熱點圖所需之總週數：
 * 預設至少 52 週（1 年），如果有更早歷史打卡則向前動態延伸，
 * 同時保證總欄位數足以填滿容器寬度，絕不留白。
 */
export function calculateTotalWeeks(params: {
  logs?: MinimalLog[] | null;
  matrixContainerWidth?: number;
  baseWeeks?: number;
  now?: Date;
}): number {
  const { logs, matrixContainerWidth = 0, baseWeeks = 52, now = new Date() } = params;
  let weeks = baseWeeks;

  if (logs && logs.length > 0) {
    const dates = logs
      .map((l) => l.date)
      .filter(Boolean)
      .sort();
    if (dates.length > 0) {
      const earliestDate = new Date(dates[0]);
      const diffDays = Math.ceil(
        (now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 0) {
        const recordedWeeks = Math.ceil(diffDays / 7) + 2; // 多留 2 週餘量
        weeks = Math.max(weeks, recordedWeeks);
      }
    }
  }

  const minWeeksForWidth =
    matrixContainerWidth > 0
      ? Math.ceil((matrixContainerWidth + MATRIX_GAP) / (TARGET_CELL_SIZE + MATRIX_GAP))
      : 26;

  return Math.max(weeks, minWeeksForWidth);
}

/**
 * 計算微型熱點圖數據與指定週期之累計指標（純數學函式，無副作用）
 */
export function calculateFootprintData(params: {
  logs?: MinimalLog[] | null;
  overviewPeriod: OverviewPeriod;
  totalWeeks: number;
  now?: Date;
}): {
  heatmapDays: HeatmapDay[];
  periodCalories: number;
  periodCount: number;
  periodMaxGrams: number;
} {
  const { logs, overviewPeriod, totalWeeks, now = new Date() } = params;
  const todayStr = format(now, 'yyyy-MM-dd');
  const totalDays = Math.max(1, totalWeeks * 7);

  const logMap = new Map<string, { count: number; grams: number; calories: number }>();
  if (logs) {
    logs.forEach((log) => {
      const existing = logMap.get(log.date) || { count: 0, grams: 0, calories: 0 };
      existing.count += 1;
      existing.grams += log.quantity || 0;
      existing.calories += log.calories || 0;
      logMap.set(log.date, existing);
    });
  }

  let maxDailyGramsInPeriod = 0;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayData = logMap.get(dateStr);
    if (dayData && dayData.grams > maxDailyGramsInPeriod) {
      maxDailyGramsInPeriod = dayData.grams;
    }
  }

  const days: HeatmapDay[] = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayData = logMap.get(dateStr) || { count: 0, grams: 0, calories: 0 };
    const isMonthMarker = d.getDate() === 1;
    const month = d.getMonth() + 1;

    let level = 0;
    if (dayData.grams > 0) {
      if (maxDailyGramsInPeriod > 0) {
        const ratio = dayData.grams / maxDailyGramsInPeriod;
        if (ratio <= 0.25) level = 1;
        else if (ratio <= 0.5) level = 2;
        else if (ratio <= 0.75) level = 3;
        else level = 4;
      } else {
        level = 1;
      }
    }

    days.push({
      date: dateStr,
      count: dayData.count,
      grams: Math.round(dayData.grams),
      calories: Math.round(dayData.calories),
      level,
      isWithinPast30Days: false,
      isMonthMarker,
      month,
    });
  }

  const periodDaysCount = getPeriodDaysCount(overviewPeriod);
  const startDateStr =
    periodDaysCount === Infinity
      ? ''
      : format(subDays(now, periodDaysCount - 1), 'yyyy-MM-dd');

  let pCal = 0;
  let pCount = 0;
  let pMaxGrams = 0;

  logMap.forEach((dayData, dateStr) => {
    if ((!startDateStr || dateStr >= startDateStr) && dateStr <= todayStr) {
      pCal += dayData.calories;
      pCount += dayData.count;
      if (dayData.grams > pMaxGrams) {
        pMaxGrams = dayData.grams;
      }
    }
  });

  return {
    heatmapDays: days,
    periodCalories: Math.round(pCal),
    periodCount: pCount,
    periodMaxGrams: Math.round(pMaxGrams),
  };
}

export interface ExerciseDayLog {
  date: string;
  sets: { weight?: number; reps?: number; isCompleted?: boolean }[];
}

/**
 * 計算動作訓練微型熱點圖數據與指定週期之累計指標（純數學函式，無副作用）
 */
export function calculateExerciseFootprintData(params: {
  logs?: ExerciseDayLog[] | null;
  overviewPeriod: OverviewPeriod;
  totalWeeks: number;
  now?: Date;
}): {
  heatmapDays: HeatmapDay[];
  periodBestE1RM: number;
  periodSets: number;
  periodVolume: number;
  lifetimeBestE1RM: number;
  lifetimeSets: number;
  lifetimeVolume: number;
} {
  const { logs, overviewPeriod, totalWeeks, now = new Date() } = params;
  const todayStr = format(now, 'yyyy-MM-dd');
  const totalDays = Math.max(1, totalWeeks * 7);

  // 匯總每天的組數、容量與單日最佳 e1RM
  const dayStatsMap = new Map<string, { count: number; volume: number; bestE1RM: number }>();
  let lifetimeBestE1RM = 0;
  let lifetimeSets = 0;
  let lifetimeVolume = 0;

  if (logs) {
    logs.forEach((log) => {
      const existing = dayStatsMap.get(log.date) || { count: 0, volume: 0, bestE1RM: 0 };
      if (Array.isArray(log.sets)) {
        log.sets.forEach((set) => {
          if (set.isCompleted) {
            existing.count += 1;
            lifetimeSets += 1;

            const w = typeof set.weight === 'number' && !isNaN(set.weight) && set.weight > 0 ? set.weight : 0;
            const r = typeof set.reps === 'number' && !isNaN(set.reps) && set.reps > 0 ? set.reps : 0;
            const vol = w * r;
            existing.volume += vol;
            lifetimeVolume += vol;

            const e1rm = calculateE1RM(w, r);
            if (e1rm > existing.bestE1RM) {
              existing.bestE1RM = e1rm;
            }
            if (e1rm > lifetimeBestE1RM) {
              lifetimeBestE1RM = e1rm;
            }
          }
        });
      }
      dayStatsMap.set(log.date, existing);
    });
  }

  // 找出近 totalDays 內最大單日容量與組數，用於微型熱點圖等級分階
  let maxDailyVol = 0;
  let maxDailySets = 0;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayData = dayStatsMap.get(dateStr);
    if (dayData) {
      if (dayData.volume > maxDailyVol) {
        maxDailyVol = dayData.volume;
      }
      if (dayData.count > maxDailySets) {
        maxDailySets = dayData.count;
      }
    }
  }

  const days: HeatmapDay[] = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayData = dayStatsMap.get(dateStr) || { count: 0, volume: 0, bestE1RM: 0 };
    const isMonthMarker = d.getDate() === 1;
    const month = d.getMonth() + 1;

    let level = 0;
    if (dayData.count > 0) {
      if (maxDailyVol > 0 && dayData.volume > 0) {
        const ratio = dayData.volume / maxDailyVol;
        if (ratio <= 0.25) level = 1;
        else if (ratio <= 0.5) level = 2;
        else if (ratio <= 0.75) level = 3;
        else level = 4;
      } else if (maxDailySets > 0) {
        // 自重無負重訓練 (volume = 0)
        const ratio = dayData.count / maxDailySets;
        if (ratio <= 0.25) level = 1;
        else if (ratio <= 0.5) level = 2;
        else if (ratio <= 0.75) level = 3;
        else level = 4;
      } else {
        level = 1;
      }
    }

    days.push({
      date: dateStr,
      count: dayData.count,
      grams: Math.round(dayData.volume * 10) / 10,
      calories: Math.round(dayData.bestE1RM * 10) / 10,
      level,
      isWithinPast30Days: false,
      isMonthMarker,
      month,
    });
  }

  // 計算指定週期內的數據 (1w / 30d / 3m / 6m / 1y / all)
  const periodDaysCount = getPeriodDaysCount(overviewPeriod);
  const startDateStr =
    periodDaysCount === Infinity
      ? ''
      : format(subDays(now, periodDaysCount - 1), 'yyyy-MM-dd');

  let periodBestE1RM = 0;
  let periodSets = 0;
  let periodVolume = 0;

  dayStatsMap.forEach((dayData, dateStr) => {
    if ((!startDateStr || dateStr >= startDateStr) && dateStr <= todayStr) {
      periodSets += dayData.count;
      periodVolume += dayData.volume;
      if (dayData.bestE1RM > periodBestE1RM) {
        periodBestE1RM = dayData.bestE1RM;
      }
    }
  });

  return {
    heatmapDays: days,
    periodBestE1RM: Math.round(periodBestE1RM * 10) / 10,
    periodSets,
    periodVolume: Math.round(periodVolume * 10) / 10,
    lifetimeBestE1RM: Math.round(lifetimeBestE1RM * 10) / 10,
    lifetimeSets,
    lifetimeVolume: Math.round(lifetimeVolume * 10) / 10,
  };
}

/**
 * 熱點圖等級對應之顏色樣式
 */
export function getHeatmapColorClass(level: number): string {
  switch (level) {
    case 0:
      return 'bg-muted/40 border border-border/40';
    case 1:
      return 'bg-emerald-500/25 border border-emerald-500/30';
    case 2:
      return 'bg-emerald-500/50 border border-emerald-500/60';
    case 3:
      return 'bg-emerald-500/80 border border-emerald-500/90';
    case 4:
      return 'bg-emerald-400 border border-emerald-300';
    default:
      return 'bg-muted/40 border border-border/40';
  }
}
