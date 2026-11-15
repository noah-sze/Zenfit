export * from './WeightTrendChart';
export * from './BodyTodayDataCard';
export * from './BodyMetricsOverviewCard';

/**
 * 男性 180cm 69.0kg 深度用戶今日體態數據（單一真理源）
 * - 實測體重：69.0 kg
 * - 體脂率：12.5%
 * - 軀幹圍度：肩寬 46.5cm、胸圍 98.0cm、腰圍 74.5cm、臀圍 92.5cm
 */
export const DEMO_BODY_TODAY_DATA = {
  weight: 69.0,
  bodyWeightUnit: 'kg',
  hasTodayWeight: true,
  bodyFat: 12.5,
  hasTodayBodyFat: true,
  shoulders: 46.5,
  hasTodayShoulders: true,
  chest: 98.0,
  hasTodayChest: true,
  waist: 74.5,
  hasTodayWaist: true,
  hips: 92.5,
  hasTodayHips: true,
  arms: 34.5,
  hasTodayArms: true,
  thighs: 53.5,
  hasTodayThighs: true,
  lengthUnit: 'cm',
  ignoreTorsoCircumferences: false,
  ignoreLimbCircumferences: true,
  hasAnyTodayLog: true,
};

/**
 * 男性 180cm 69.0kg 深度用戶體態指標（單一真理源）
 * - 平滑體重：68.85 kg (7日 EMA 抗噪生理真值)
 * - BMI：21.3 (69.0 / 1.8^2)
 * - FFMI：18.6 (去脂體重指數)
 * - 去脂體重：60.4 kg
 * - 脂肪總重：8.6 kg
 */
export const DEMO_BODY_METRICS_DATA = {
  trendWeight: 68.85,
  bodyWeightUnit: 'kg',
  hasTodayWeight: true,
  bmi: 21.3,
  ffmi: 18.6,
  hasTodayBodyFat: true,
  leanMass: 60.4,
  fatMass: 8.6,
};
