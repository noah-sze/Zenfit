import { describe, it, expect } from 'vitest';
import {
  calculateWeightTrend,
  calculateWeeklyChangeRate,
  calculateAgeFromBirth,
  calculateBMI,
  calculateBMR,
  calculateMacrosFromSplit,
  calculateTDEE,
  calculateDailyEnergyGap,
  calculateVTaperRatio,
  calculateWHRatio,
  calculateFatMass,
  calculateFFMI,
} from './weightMath';
import type { BodyMetric } from '@/types';

describe('weightMath utils', () => {
  describe('calculateDailyEnergyGap', () => {
    it('returns null when rate is null or NaN', () => {
      expect(calculateDailyEnergyGap(null)).toBeNull();
      expect(calculateDailyEnergyGap(NaN)).toBeNull();
    });

    it('calculates caloric deficit correctly', () => {
      // -0.35 kg/week * 1100 = -385 kcal/day
      expect(calculateDailyEnergyGap(-0.35)).toBe(-385);
    });

    it('calculates caloric surplus correctly', () => {
      // +0.20 kg/week * 1100 = +220 kcal/day
      expect(calculateDailyEnergyGap(0.2)).toBe(220);
    });

    it('handles zero change rate', () => {
      expect(calculateDailyEnergyGap(0)).toBe(0);
    });
  });

  describe('calculateVTaperRatio', () => {
    it('returns null for zero, negative or missing values', () => {
      expect(calculateVTaperRatio(null, 78)).toBeNull();
      expect(calculateVTaperRatio(100, null)).toBeNull();
      expect(calculateVTaperRatio(0, 78)).toBeNull();
      expect(calculateVTaperRatio(100, 0)).toBeNull();
      expect(calculateVTaperRatio(-10, 78)).toBeNull();
      expect(calculateVTaperRatio(100, -78)).toBeNull();
    });

    it('calculates chest-to-waist ratio accurately rounded to 2 decimals', () => {
      // 100 / 78 = 1.28205... -> 1.28
      expect(calculateVTaperRatio(100, 78)).toBe(1.28);
      // 105 / 75 = 1.4
      expect(calculateVTaperRatio(105, 75)).toBe(1.4);
    });
  });

  describe('calculateWHRatio', () => {
    it('returns null for zero, negative or missing values', () => {
      expect(calculateWHRatio(null, 96)).toBeNull();
      expect(calculateWHRatio(78, null)).toBeNull();
      expect(calculateWHRatio(0, 96)).toBeNull();
      expect(calculateWHRatio(78, 0)).toBeNull();
      expect(calculateWHRatio(-78, 96)).toBeNull();
      expect(calculateWHRatio(78, -96)).toBeNull();
    });

    it('calculates waist-to-hip ratio accurately rounded to 2 decimals', () => {
      // 78 / 96 = 0.8125 -> 0.81
      expect(calculateWHRatio(78, 96)).toBe(0.81);
      // 80 / 100 = 0.8
      expect(calculateWHRatio(80, 100)).toBe(0.8);
    });
  });

  describe('calculateFatMass', () => {
    it('returns null for zero, negative or missing values', () => {
      expect(calculateFatMass(null, 25)).toBeNull();
      expect(calculateFatMass(70, null)).toBeNull();
      expect(calculateFatMass(0, 25)).toBeNull();
      expect(calculateFatMass(70, 0)).toBeNull();
      expect(calculateFatMass(-70, 25)).toBeNull();
      expect(calculateFatMass(70, -25)).toBeNull();
    });

    it('calculates fat mass accurately rounded to 1 decimal', () => {
      // 70 * 0.25 = 17.5 kg
      expect(calculateFatMass(70, 25)).toBe(17.5);
      // 82.4 * 0.18 = 14.832 -> 14.8 kg
      expect(calculateFatMass(82.4, 18)).toBe(14.8);
    });
  });

  describe('calculateFFMI', () => {
    it('returns null for zero, negative or missing values', () => {
      expect(calculateFFMI(null, 175)).toBeNull();
      expect(calculateFFMI(52.5, null)).toBeNull();
      expect(calculateFFMI(0, 175)).toBeNull();
      expect(calculateFFMI(52.5, 0)).toBeNull();
      expect(calculateFFMI(-52.5, 175)).toBeNull();
      expect(calculateFFMI(52.5, -175)).toBeNull();
    });

    it('calculates FFMI accurately rounded to 1 decimal', () => {
      // 52.5 / (1.75 * 1.75) = 17.1428... -> 17.1
      expect(calculateFFMI(52.5, 175)).toBe(17.1);
      // 65 / (1.80 * 1.80) = 20.0617... -> 20.1
      expect(calculateFFMI(65, 180)).toBe(20.1);
    });
  });

  describe('calculateBMI', () => {
    it('returns 0 for non-positive height or weight', () => {
      expect(calculateBMI(0, 175)).toBe(0);
      expect(calculateBMI(70, 0)).toBe(0);
      expect(calculateBMI(70, -175)).toBe(0);
    });

    it('calculates BMI correctly', () => {
      // 70 / (1.75 * 1.75) = 22.857... -> 22.9
      expect(calculateBMI(70, 175)).toBe(22.9);
    });
  });

  describe('calculateBMR', () => {
    it('returns 0 for non-positive inputs', () => {
      expect(calculateBMR(0, 175)).toBe(0);
      expect(calculateBMR(70, 0)).toBe(0);
    });

    it('calculates Mifflin-St Jeor for males', () => {
      // 10 * 70 + 6.25 * 175 - 5 * 25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75 -> 1674
      expect(calculateBMR(70, 175, 'male', 25)).toBe(1674);
    });

    it('calculates Mifflin-St Jeor for females', () => {
      // 10 * 70 + 6.25 * 175 - 5 * 25 - 161 = 700 + 1093.75 - 125 - 161 = 1507.75 -> 1508
      expect(calculateBMR(70, 175, 'female', 25)).toBe(1508);
    });
  });

  describe('calculateTDEE', () => {
    it('returns 0 for bmr <= 0', () => {
      expect(calculateTDEE(0)).toBe(0);
    });

    it('multiplies bmr by activity level', () => {
      expect(calculateTDEE(1674, 1.55)).toBe(2595);
    });
  });

  describe('calculateAgeFromBirth', () => {
    it('returns default 25 if no birth string', () => {
      expect(calculateAgeFromBirth(undefined)).toBe(25);
    });

    it('calculates age correctly based on reference date', () => {
      const ref = new Date('2026-11-05');
      expect(calculateAgeFromBirth('1996-05', ref)).toBe(30);
      expect(calculateAgeFromBirth('1996-12', ref)).toBe(29);
    });
  });

  describe('calculateMacrosFromSplit', () => {
    it('returns zeros for totalCalories <= 0', () => {
      expect(calculateMacrosFromSplit(0, 50, 25, 25)).toEqual({
        carbsGrams: 0,
        proteinGrams: 0,
        fatGrams: 0,
      });
    });

    it('computes gram targets from percentages', () => {
      // 2000 kcal: 50% carbs (1000/4 = 250g), 25% protein (500/4 = 125g), 25% fat (500/9 = 56g)
      expect(calculateMacrosFromSplit(2000, 50, 25, 25)).toEqual({
        carbsGrams: 250,
        proteinGrams: 125,
        fatGrams: 56,
      });
    });
  });

  describe('calculateWeightTrend & calculateWeeklyChangeRate', () => {
    it('returns empty array when records are empty', () => {
      expect(calculateWeightTrend([])).toEqual([]);
    });

    it('computes EWMA points and LBM correctly', () => {
      const records: BodyMetric[] = [
        { id: '1', date: '2026-11-01', weight: 70, bodyFat: 20, createdAt: 1, updatedAt: 1 },
        { id: '2', date: '2026-11-02', weight: 71, bodyFat: 20, createdAt: 2, updatedAt: 2 },
      ];
      const trend = calculateWeightTrend(records, 0.15);
      expect(trend.length).toBe(2);
      expect(trend[0].trendWeight).toBe(70);
      expect(trend[0].leanBodyMass).toBe(56); // 70 * 0.8
      // trend[1] = 0.15 * 71 + 0.85 * 70 = 10.65 + 59.5 = 70.15
      expect(trend[1].trendWeight).toBe(70.15);
    });

    it('calculates weekly rate across days', () => {
      const points = [
        { date: '2026-11-01', trendWeight: 70 },
        { date: '2026-11-08', trendWeight: 69.3 },
      ];
      // diff = -0.7 kg in 7 days -> -0.7 kg/week
      expect(calculateWeeklyChangeRate(points)).toBe(-0.7);
    });

    it('returns null if points < 2 or daysDiff < 2', () => {
      expect(calculateWeeklyChangeRate([])).toBeNull();
      expect(calculateWeeklyChangeRate([{ date: '2026-11-01', trendWeight: 70 }])).toBeNull();
      expect(
        calculateWeeklyChangeRate([
          { date: '2026-11-01', trendWeight: 70 },
          { date: '2026-11-01', trendWeight: 70.1 },
        ])
      ).toBeNull();
    });

    it('correctly filters trend points up to a specific date', () => {
      const records: BodyMetric[] = [
        { id: '1', date: '2026-11-01', weight: 70, createdAt: 1, updatedAt: 1 },
        { id: '2', date: '2026-11-03', weight: 72, createdAt: 2, updatedAt: 2 },
        { id: '3', date: '2026-11-05', weight: 71, createdAt: 3, updatedAt: 3 },
      ];
      const trend = calculateWeightTrend(records, 0.15);

      // On 2026-11-01
      const pointsNov1 = trend.filter((p) => p.date <= '2026-11-01');
      expect(pointsNov1[pointsNov1.length - 1].trendWeight).toBe(70);

      // On 2026-11-02 (between 1st and 3rd)
      const pointsNov2 = trend.filter((p) => p.date <= '2026-11-02');
      expect(pointsNov2[pointsNov2.length - 1].trendWeight).toBe(70);

      // On 2026-11-03
      const pointsNov3 = trend.filter((p) => p.date <= '2026-11-03');
      expect(pointsNov3[pointsNov3.length - 1].trendWeight).toBe(70.3); // 0.15 * 72 + 0.85 * 70 = 10.8 + 59.5 = 70.3

      // On date prior to any records
      const pointsPrior = trend.filter((p) => p.date <= '2026-10-31');
      expect(pointsPrior.length).toBe(0);
    });
  });
});
