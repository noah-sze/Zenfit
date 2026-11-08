import { describe, it, expect } from 'vitest';
import {
  getPeriodDaysCount,
  calculateTotalWeeks,
  calculateFootprintData,
  calculateExerciseFootprintData,
  getHeatmapColorClass,
} from './heatmapMath';

describe('heatmapMath', () => {
  describe('getPeriodDaysCount', () => {
    it('應正確回傳各週期的天數', () => {
      expect(getPeriodDaysCount('1w')).toBe(7);
      expect(getPeriodDaysCount('30d')).toBe(30);
      expect(getPeriodDaysCount('3m')).toBe(90);
      expect(getPeriodDaysCount('6m')).toBe(180);
      expect(getPeriodDaysCount('1y')).toBe(365);
      expect(getPeriodDaysCount('all')).toBe(Infinity);
    });
  });

  describe('calculateTotalWeeks', () => {
    it('無記錄且無容器寬度時應預設 52 週', () => {
      const weeks = calculateTotalWeeks({});
      expect(weeks).toBe(52);
    });

    it('容器特別寬時應向上補足欄數絕不留白', () => {
      // 假設寬度 1000px，約需 61 欄
      const weeks = calculateTotalWeeks({ matrixContainerWidth: 1000 });
      expect(weeks).toBeGreaterThanOrEqual(60);
    });

    it('歷史記錄超過 1 年時應動態向前延伸週數', () => {
      const now = new Date('2026-11-03');
      const oldDateStr = '2025-01-01'; // 約 670 天前，近 95 週
      const weeks = calculateTotalWeeks({
        logs: [{ date: oldDateStr }],
        now,
      });
      expect(weeks).toBeGreaterThan(90);
    });
  });

  describe('calculateFootprintData', () => {
    it('無打卡資料時應回傳全 0 與等級 0 的天數清單', () => {
      const now = new Date('2026-11-03');
      const res = calculateFootprintData({
        logs: [],
        overviewPeriod: '30d',
        totalWeeks: 52,
        now,
      });

      expect(res.heatmapDays.length).toBe(52 * 7);
      expect(res.periodCalories).toBe(0);
      expect(res.periodCount).toBe(0);
      expect(res.periodMaxGrams).toBe(0);
      expect(res.heatmapDays[res.heatmapDays.length - 1].date).toBe('2026-11-03');
      expect(res.heatmapDays[res.heatmapDays.length - 1].level).toBe(0);
    });

    it('有打卡記錄時應精確累加週期數據並計算正確等級', () => {
      const now = new Date('2026-11-03');
      const logs = [
        { date: '2026-11-03', calories: 500, quantity: 200 },
        { date: '2026-11-02', calories: 300, quantity: 100 },
        { date: '2026-09-01', calories: 800, quantity: 400 }, // 超過 30d，但在 52 週內
      ];

      const res = calculateFootprintData({
        logs,
        overviewPeriod: '30d',
        totalWeeks: 52,
        now,
      });

      // 30d 內累加：500 + 300 = 800 kcal, count = 2, maxGrams = 200
      expect(res.periodCalories).toBe(800);
      expect(res.periodCount).toBe(2);
      expect(res.periodMaxGrams).toBe(200);

      const todayItem = res.heatmapDays[res.heatmapDays.length - 1];
      expect(todayItem.date).toBe('2026-11-03');
      expect(todayItem.count).toBe(1);
      expect(todayItem.grams).toBe(200);
      expect(todayItem.calories).toBe(500);
      expect(todayItem.level).toBeGreaterThan(0);
    });
  });

  describe('calculateExerciseFootprintData', () => {
    it('無訓練日誌時應回傳全 0 與等級 0 的天數清單', () => {
      const now = new Date('2026-11-03');
      const res = calculateExerciseFootprintData({
        logs: [],
        overviewPeriod: '30d',
        totalWeeks: 52,
        now,
      });

      expect(res.heatmapDays.length).toBe(52 * 7);
      expect(res.periodBestE1RM).toBe(0);
      expect(res.periodSets).toBe(0);
      expect(res.periodVolume).toBe(0);
      expect(res.lifetimeBestE1RM).toBe(0);
      expect(res.lifetimeSets).toBe(0);
      expect(res.lifetimeVolume).toBe(0);
    });

    it('有打卡記錄時應精確累加週期組數、容量與最高 e1RM', () => {
      const now = new Date('2026-11-03');
      const logs = [
        {
          date: '2026-11-03',
          sets: [
            { weight: 100, reps: 5, isCompleted: true }, // vol 500, e1RM 100*(36/32)=112.5
            { weight: 100, reps: 5, isCompleted: true }, // vol 500
            { weight: 120, reps: 3, isCompleted: false }, // 未完成不計
          ],
        },
        {
          date: '2026-11-02',
          sets: [
            { weight: 80, reps: 10, isCompleted: true }, // vol 800, e1RM 80*(36/27)=106.7
          ],
        },
        {
          date: '2025-05-01', // 超過 30d，但在生涯累積內
          sets: [
            { weight: 150, reps: 1, isCompleted: true }, // vol 150, e1RM 150
          ],
        },
      ];

      const res = calculateExerciseFootprintData({
        logs,
        overviewPeriod: '30d',
        totalWeeks: 52,
        now,
      });

      // 30d 內累加：vol = 1000 + 800 = 1800; sets = 2 + 1 = 3; best e1RM = 112.5
      expect(res.periodSets).toBe(3);
      expect(res.periodVolume).toBe(1800);
      expect(res.periodBestE1RM).toBe(112.5);

      // 歷史生涯累加
      expect(res.lifetimeSets).toBe(4);
      expect(res.lifetimeVolume).toBe(1950);
      expect(res.lifetimeBestE1RM).toBe(150);

      // 當選擇 'all' 時，週期指標應等於歷史生涯累計
      const resAll = calculateExerciseFootprintData({
        logs,
        overviewPeriod: 'all',
        totalWeeks: 52,
        now,
      });
      expect(resAll.periodSets).toBe(4);
      expect(resAll.periodVolume).toBe(1950);
      expect(resAll.periodBestE1RM).toBe(150);

      const todayItem = res.heatmapDays[res.heatmapDays.length - 1];
      expect(todayItem.date).toBe('2026-11-03');
      expect(todayItem.count).toBe(2);
      expect(todayItem.grams).toBe(1000);
      expect(todayItem.level).toBeGreaterThan(0);
    });

    it('自重訓練 (weight = 0) 也應依組數正確分階點亮熱點圖', () => {
      const now = new Date('2026-11-03');
      const logs = [
        {
          date: '2026-11-03',
          sets: [
            { weight: 0, reps: 15, isCompleted: true },
            { weight: 0, reps: 12, isCompleted: true },
          ],
        },
      ];

      const res = calculateExerciseFootprintData({
        logs,
        overviewPeriod: '30d',
        totalWeeks: 52,
        now,
      });

      const todayItem = res.heatmapDays[res.heatmapDays.length - 1];
      expect(todayItem.count).toBe(2);
      expect(todayItem.grams).toBe(0);
      expect(todayItem.level).toBe(4); // 僅有此天，比例為 100%，level 4
    });
  });

  describe('getHeatmapColorClass', () => {
    it('應正確映射等級顏色', () => {
      expect(getHeatmapColorClass(0)).toContain('bg-muted/40');
      expect(getHeatmapColorClass(1)).toContain('bg-emerald-500/25');
      expect(getHeatmapColorClass(4)).toContain('bg-emerald-400');
    });
  });
});
