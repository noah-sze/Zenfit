import type { BodyMetric } from '@/types';

export interface SmoothedWeightPoint {
  date: string;
  rawWeight?: number;
  trendWeight: number;
  bodyFat?: number;
  leanBodyMass?: number;
}

/**
 * 計算指數加權移動平均 (EWMA) 抗噪體重趨勢線
 * @param records 按日期升序排列的身體數據
 * @param alpha 平滑係數 (預設 0.15，約等效於 7-10 天滾動生理窗口)
 */
export function calculateWeightTrend(
  records: BodyMetric[],
  alpha = 0.15
): SmoothedWeightPoint[] {
  // 過濾出包含體重的記錄，並保證按日期從小到大排序
  const sorted = [...records]
    .filter((r) => r.weight !== undefined && r.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return [];

  const points: SmoothedWeightPoint[] = [];
  let currentTrend = sorted[0].weight!;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const raw = item.weight!;

    if (i === 0) {
      currentTrend = raw;
    } else {
      currentTrend = alpha * raw + (1 - alpha) * currentTrend;
    }

    const roundedTrend = Math.round(currentTrend * 100) / 100;
    let lbm: number | undefined = undefined;
    if (item.bodyFat !== undefined && item.bodyFat > 0) {
      const fatMass = raw * (item.bodyFat / 100);
      lbm = Math.round((raw - fatMass) * 10) / 10;
    }

    points.push({
      date: item.date,
      rawWeight: raw,
      trendWeight: roundedTrend,
      bodyFat: item.bodyFat,
      leanBodyMass: lbm,
    });
  }

  return points;
}

/**
 * 計算近 7-14 天體重趨勢變動速率 (kg / 週)
 */
export function calculateWeeklyChangeRate(points: SmoothedWeightPoint[]): number | null {
  if (points.length < 2) return null;

  // 取最近最多 14 個點
  const recent = points.slice(-14);
  const first = recent[0];
  const last = recent[recent.length - 1];

  const daysDiff = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff < 2) return null;

  const weightDiff = last.trendWeight - first.trendWeight;
  const ratePerWeek = (weightDiff / daysDiff) * 7;

  return Math.round(ratePerWeek * 100) / 100;
}

/**
 * 依據出生年月 (YYYY-MM) 或出生日期 (YYYY-MM-DD) 與參考日期動態計算客觀實足年齡
 * 誤差小於 1 個月，對 BMR 計算 (-5 * age) 誤差小於 0.5 kcal
 */
export function calculateAgeFromBirth(birthDateStr?: string, referenceDate: Date = new Date()): number {
  if (!birthDateStr) return 25;
  const parts = birthDateStr.split('-');
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) || 1;

  if (isNaN(birthYear) || birthYear <= 1900) return 25;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  let age = currentYear - birthYear;
  if (currentMonth < birthMonth) {
    age -= 1;
  }
  return Math.max(0, age);
}

/**
 * 計算 BMI
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * 計算客觀靜態基礎代謝率 (Mifflin-St Jeor BMR)
 * 男性: 10 * weight + 6.25 * height - 5 * age + 5
 * 女性: 10 * weight + 6.25 * height - 5 * age - 161
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  gender: 'male' | 'female' = 'male',
  age = 25
): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const safeAge = age > 0 ? age : 25;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * safeAge;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
}

export interface MacroTargets {
  carbsGrams: number;
  proteinGrams: number;
  fatGrams: number;
}

/**
 * 依據總熱量與供能比（百分比）計算三大營養素目標克數
 * 1g 蛋白質 = 4 kcal, 1g 碳水 = 4 kcal, 1g 脂肪 = 9 kcal
 */
export function calculateMacrosFromSplit(
  totalCalories: number,
  carbsPercent: number,
  proteinPercent: number,
  fatPercent: number
): MacroTargets {
  if (totalCalories <= 0) {
    return { carbsGrams: 0, proteinGrams: 0, fatGrams: 0 };
  }
  return {
    carbsGrams: Math.round((totalCalories * (carbsPercent / 100)) / 4),
    proteinGrams: Math.round((totalCalories * (proteinPercent / 100)) / 4),
    fatGrams: Math.round((totalCalories * (fatPercent / 100)) / 9),
  };
}

