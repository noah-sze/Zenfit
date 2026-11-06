import { describe, it, expect } from 'vitest';
import {
  LARGE_MUSCLES,
  SMALL_MUSCLES,
  LARGE_MUSCLE_RECOVERY_DAYS,
  SMALL_MUSCLE_RECOVERY_DAYS,
  getMuscleRecoveryWindowDays,
  getMuscleRecoveryWindowHours,
  getMuscleRoleWeight,
  calculateDaysBetweenDates,
  calculateDecayedIntensity,
  getRecoveryTier,
  calculateBodyRecovery,
  getWorkoutLogTimestamp,
} from './recoveryMath';
import type { WorkoutLog, Exercise } from '@/types';

describe('recoveryMath (純粹客觀日曆天數模型 - 方案 A)', () => {
  describe('肌群分層與客觀恢復窗口', () => {
    it('大肌群應返回 3 天 (72 小時)', () => {
      LARGE_MUSCLES.forEach((m) => {
        expect(getMuscleRecoveryWindowDays(m)).toBe(LARGE_MUSCLE_RECOVERY_DAYS);
        expect(getMuscleRecoveryWindowHours(m)).toBe(72);
      });
    });

    it('小肌群應返回 2 天 (48 小時)', () => {
      SMALL_MUSCLES.forEach((m) => {
        expect(getMuscleRecoveryWindowDays(m)).toBe(SMALL_MUSCLE_RECOVERY_DAYS);
        expect(getMuscleRecoveryWindowHours(m)).toBe(48);
      });
    });
  });

  describe('跨日天數客觀計算 (calculateDaysBetweenDates)', () => {
    it('同一天天數差應為 0', () => {
      expect(calculateDaysBetweenDates('2026-10-26', '2026-10-26')).toBe(0);
    });

    it('隔天跨日差應為 1', () => {
      expect(calculateDaysBetweenDates('2026-10-26', '2026-10-27')).toBe(1);
    });

    it('跨月天數差計算正確', () => {
      // 10/26 到 11/04 = 5 (10/26-10/31) + 4 = 9 天
      expect(calculateDaysBetweenDates('2026-10-26', '2026-11-04')).toBe(9);
    });

    it('跨年天數差計算正確', () => {
      expect(calculateDaysBetweenDates('2025-12-31', '2026-01-01')).toBe(1);
    });

    it('若目標日期在參考日期之後應返回負數', () => {
      expect(calculateDaysBetweenDates('2026-10-28', '2026-10-26')).toBe(-2);
    });

    it('邊界防護：空字串或無效日期安全返回 0', () => {
      expect(calculateDaysBetweenDates('', '2026-10-26')).toBe(0);
      expect(calculateDaysBetweenDates('2026-10-26', '')).toBe(0);
      expect(calculateDaysBetweenDates('invalid', '2026-10-26')).toBe(0);
    });
  });

  describe('角色權重計算 (getMuscleRoleWeight)', () => {
    it('primary 權重為 1.0', () => {
      expect(getMuscleRoleWeight('primary')).toBe(1.0);
    });

    it('secondary 權重為 0.6', () => {
      expect(getMuscleRoleWeight('secondary')).toBe(0.6);
    });

    it('stabilizer 權重為 0.3', () => {
      expect(getMuscleRoleWeight('stabilizer')).toBe(0.3);
    });

    it('數字百分比輸入', () => {
      expect(getMuscleRoleWeight(80)).toBe(0.8);
      expect(getMuscleRoleWeight(120)).toBe(1.0);
      expect(getMuscleRoleWeight(-10)).toBe(0);
    });

    it('空值輸入', () => {
      expect(getMuscleRoleWeight(undefined)).toBe(0);
    });
  });

  describe('日曆天數衰減強度計算 (calculateDecayedIntensity)', () => {
    it('Day 0 (當日) 主動肌 100 強度，協同肌依權重衰減', () => {
      expect(calculateDecayedIntensity(0, 3, 1.0)).toBe(100);
      expect(calculateDecayedIntensity(0, 2, 0.6)).toBe(60);
    });

    it('Day 1 大肌群 (3 天窗口) 衰減至 67，小肌群 (2 天窗口) 衰減至 30', () => {
      // 大肌群 (1 - 1/3) * 1.0 = 2/3 ≈ 67
      expect(calculateDecayedIntensity(1, 3, 1.0)).toBe(67);
      // 小肌群 (1 - 1/2) * 0.6 = 0.3 = 30
      expect(calculateDecayedIntensity(1, 2, 0.6)).toBe(30);
    });

    it('Day 2 大肌群衰減至 33，小肌群完全恢復 (0 強度)', () => {
      // 大肌群 (1 - 2/3) * 1.0 = 1/3 ≈ 33
      expect(calculateDecayedIntensity(2, 3, 1.0)).toBe(33);
      // 小肌群 2 >= 2 -> 0
      expect(calculateDecayedIntensity(2, 2, 0.6)).toBe(0);
    });

    it('超過或等於窗口天數時強度應為 0', () => {
      expect(calculateDecayedIntensity(3, 3, 1.0)).toBe(0);
      expect(calculateDecayedIntensity(5, 3, 1.0)).toBe(0);
    });

    it('負天數防護返回 100', () => {
      expect(calculateDecayedIntensity(-1, 3, 1.0)).toBe(100);
    });
  });

  describe('恢復階梯判定 (getRecoveryTier)', () => {
    it('未曾訓練或天數大於等於窗口為 recovered', () => {
      expect(getRecoveryTier(null, 3)).toBe('recovered');
      expect(getRecoveryTier(3, 3)).toBe('recovered');
      expect(getRecoveryTier(2, 2)).toBe('recovered');
    });

    it('Day 0 為 acute (當日急性刺激期)', () => {
      expect(getRecoveryTier(0, 3)).toBe('acute');
      expect(getRecoveryTier(0, 2)).toBe('acute');
    });

    it('Day 1 為 recovering (恢復期)', () => {
      expect(getRecoveryTier(1, 3)).toBe('recovering');
      expect(getRecoveryTier(1, 2)).toBe('recovering');
    });

    it('Day 2 對大肌群 (3 天窗口) 為 near_ready', () => {
      expect(getRecoveryTier(2, 3)).toBe('near_ready');
    });
  });

  describe('時間戳解析 (getWorkoutLogTimestamp)', () => {
    it('優先取用 createdAt', () => {
      const log: WorkoutLog = {
        id: '1',
        date: '2026-11-03',
        exercises: [],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };
      expect(getWorkoutLogTimestamp(log)).toBe(1700000000000);
    });

    it('若無 createdAt 正確解析 YYYY-MM-DD', () => {
      const log: WorkoutLog = {
        id: '1',
        date: '2026-11-03',
        exercises: [],
        createdAt: 0,
        updatedAt: 0,
      };
      const ts = getWorkoutLogTimestamp(log);
      expect(ts).toBeGreaterThan(0);
    });
  });

  describe('全身恢復匯總計算 (calculateBodyRecovery - 方案 A 驗證)', () => {
    it('無訓練記錄時所有肌群強度為 0，恢復度為 100%', () => {
      const res = calculateBodyRecovery([], { referenceDate: '2026-10-26' });
      expect(res.acuteCount).toBe(0);
      expect(res.recoveringCount).toBe(0);
      expect(res.latestWorkoutDaysElapsed).toBeNull();
      expect(res.intensityMap.upper_chest).toBe(0);
      expect(res.muscles.upper_chest.recoveryPercent).toBe(100);
      expect(res.muscles.upper_chest.tier).toBe('recovered');
    });

    describe('使用者反饋之真實臥推案例全程跟蹤 (10/26 記錄槓鈴臥推)', () => {
      const benchPressId = 'ex-bench';
      const exerciseMap = new Map<string, Exercise>([
        [
          benchPressId,
          {
            id: benchPressId,
            name: '槓鈴臥推',
            equipment: 'barbell',
            targetMuscles: {
              mid_lower_chest: 'primary', // 大肌群 3 天窗口，權重 1.0
              front_delts: 'secondary',   // 小肌群 2 天窗口，權重 0.6
              triceps: 'secondary',       // 小肌群 2 天窗口，權重 0.6
            },
            isCustom: false,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      ]);

      // 10/26 做的槓鈴臥推記錄（即使是在 11/04 歷史補錄，createdAt 也不干擾客觀日曆計算）
      const log: WorkoutLog = {
        id: 'log-bench-1026',
        date: '2026-10-26',
        exercises: [
          {
            exerciseId: benchPressId,
            sets: [{ id: 's1', setNumber: 1, weight: 100, reps: 5, isCompleted: true }],
          },
        ],
        createdAt: Date.now(), // 歷史補錄當前的時間戳
        updatedAt: Date.now(),
      };

      it('切換至 10/26 (Day 0)：胸大肌 0% 恢復、100 強度；三頭肌 40% 恢復、60 強度', () => {
        const res = calculateBodyRecovery([log], {
          referenceDate: '2026-10-26',
          exerciseMap,
        });

        expect(res.latestWorkoutDaysElapsed).toBe(0);

        // 中下胸 (大肌群，Day 0)
        const chest = res.muscles.mid_lower_chest;
        expect(chest.daysElapsed).toBe(0);
        expect(chest.intensity).toBe(100);
        expect(chest.recoveryPercent).toBe(0);
        expect(chest.tier).toBe('acute');
        expect(chest.lastExerciseName).toBe('槓鈴臥推');

        // 三頭肌 (小肌群，Day 0，secondary 0.6 權重)
        const triceps = res.muscles.triceps;
        expect(triceps.daysElapsed).toBe(0);
        expect(triceps.intensity).toBe(60);
        expect(triceps.recoveryPercent).toBe(40);
        expect(triceps.tier).toBe('acute');

        // 未刺激的背闊肌
        expect(res.muscles.lats.intensity).toBe(0);
        expect(res.muscles.lats.recoveryPercent).toBe(100);
        expect(res.muscles.lats.tier).toBe('recovered');
      });

      it('切換至 10/27 (Day 1)：胸大肌 33% 恢復、67 強度；三頭肌 70% 恢復、30 強度', () => {
        const res = calculateBodyRecovery([log], {
          referenceDate: '2026-10-27',
          exerciseMap,
        });

        expect(res.latestWorkoutDaysElapsed).toBe(1);

        const chest = res.muscles.mid_lower_chest;
        expect(chest.daysElapsed).toBe(1);
        expect(chest.intensity).toBe(67);
        expect(chest.recoveryPercent).toBe(33);
        expect(chest.tier).toBe('recovering');

        const triceps = res.muscles.triceps;
        expect(triceps.daysElapsed).toBe(1);
        expect(triceps.intensity).toBe(30);
        expect(triceps.recoveryPercent).toBe(70);
        expect(triceps.tier).toBe('recovering');
      });

      it('切換至 10/28 (Day 2)：三頭肌 100% 恢復、0 強度；胸大肌 67% 恢復、33 強度', () => {
        const res = calculateBodyRecovery([log], {
          referenceDate: '2026-10-28',
          exerciseMap,
        });

        expect(res.latestWorkoutDaysElapsed).toBe(2);

        // 胸大肌 (大肌群，Day 2，window = 3)
        const chest = res.muscles.mid_lower_chest;
        expect(chest.daysElapsed).toBe(2);
        expect(chest.intensity).toBe(33);
        expect(chest.recoveryPercent).toBe(67);
        expect(chest.tier).toBe('near_ready');

        // 三頭肌 (小肌群，Day 2，window = 2，已滿窗口)
        const triceps = res.muscles.triceps;
        expect(triceps.daysElapsed).toBe(2);
        expect(triceps.intensity).toBe(0);
        expect(triceps.recoveryPercent).toBe(100);
        expect(triceps.tier).toBe('recovered');
      });

      it('切換至 10/29 (Day 3)：全部肌群 100% 恢復、0 強度', () => {
        const res = calculateBodyRecovery([log], {
          referenceDate: '2026-10-29',
          exerciseMap,
        });

        expect(res.recoveringCount).toBe(0);
        expect(res.acuteCount).toBe(0);

        const chest = res.muscles.mid_lower_chest;
        expect(chest.daysElapsed).toBe(3);
        expect(chest.intensity).toBe(0);
        expect(chest.recoveryPercent).toBe(100);
        expect(chest.tier).toBe('recovered');

        const triceps = res.muscles.triceps;
        expect(triceps.intensity).toBe(0);
        expect(triceps.recoveryPercent).toBe(100);
        expect(triceps.tier).toBe('recovered');
      });
    });
  });
});
