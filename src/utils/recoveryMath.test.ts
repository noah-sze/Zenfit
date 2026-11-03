import { describe, it, expect } from 'vitest';
import {
  LARGE_MUSCLES,
  SMALL_MUSCLES,
  getMuscleRecoveryWindowHours,
  getMuscleRoleWeight,
  calculateDecayedIntensity,
  getRecoveryTier,
  calculateBodyRecovery,
  getWorkoutLogTimestamp,
} from './recoveryMath';
import type { WorkoutLog, Exercise } from '@/types';

describe('recoveryMath', () => {
  describe('肌群分層與恢復窗口', () => {
    it('大肌群應返回 72 小時', () => {
      LARGE_MUSCLES.forEach((m) => {
        expect(getMuscleRecoveryWindowHours(m)).toBe(72);
      });
    });

    it('小肌群應返回 48 小時', () => {
      SMALL_MUSCLES.forEach((m) => {
        expect(getMuscleRecoveryWindowHours(m)).toBe(48);
      });
    });
  });

  describe('角色權重計算', () => {
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

  describe('衰減強度計算 (calculateDecayedIntensity)', () => {
    it('0 小時 (剛練完) 應為 100 強度', () => {
      expect(calculateDecayedIntensity(0, 72, 1.0)).toBe(100);
      expect(calculateDecayedIntensity(0, 48, 1.0)).toBe(100);
    });

    it('協同肌在 0 小時依權重衰減', () => {
      expect(calculateDecayedIntensity(0, 72, 0.6)).toBe(60);
    });

    it('經過半程時強度應折半', () => {
      expect(calculateDecayedIntensity(36, 72, 1.0)).toBe(50);
      expect(calculateDecayedIntensity(24, 48, 1.0)).toBe(50);
    });

    it('超過或等於窗口時強度應為 0', () => {
      expect(calculateDecayedIntensity(72, 72, 1.0)).toBe(0);
      expect(calculateDecayedIntensity(100, 72, 1.0)).toBe(0);
    });

    it('負小時防護', () => {
      expect(calculateDecayedIntensity(-5, 72, 1.0)).toBe(100);
    });
  });

  describe('恢復階梯判定 (getRecoveryTier)', () => {
    it('未曾訓練或超過窗口為 recovered', () => {
      expect(getRecoveryTier(null, 72)).toBe('recovered');
      expect(getRecoveryTier(73, 72)).toBe('recovered');
    });

    it('24h 內為 acute (急性期)', () => {
      expect(getRecoveryTier(0, 72)).toBe('acute');
      expect(getRecoveryTier(24, 72)).toBe('acute');
    });

    it('24~48h 為 recovering (恢復期)', () => {
      expect(getRecoveryTier(25, 72)).toBe('recovering');
      expect(getRecoveryTier(48, 72)).toBe('recovering');
    });

    it('48~72h 為 near_ready', () => {
      expect(getRecoveryTier(50, 72)).toBe('near_ready');
      expect(getRecoveryTier(71, 72)).toBe('near_ready');
    });
  });

  describe('時間戳解析 (getWorkoutLogTimestamp)', () => {
    it('優先取用 createdAt', () => {
      const log: WorkoutLog = {
        id: '1',
        date: '2026-11-03',
        title: '訓練',
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
        title: '訓練',
        exercises: [],
        createdAt: 0,
        updatedAt: 0,
      };
      const ts = getWorkoutLogTimestamp(log);
      expect(ts).toBeGreaterThan(0);
    });
  });

  describe('全身恢復匯總計算 (calculateBodyRecovery)', () => {
    it('無訓練記錄時所有肌群強度為 0，恢復度為 100%', () => {
      const res = calculateBodyRecovery([], { referenceTimestamp: 1000000 });
      expect(res.acuteCount).toBe(0);
      expect(res.recoveringCount).toBe(0);
      expect(res.latestWorkoutHoursElapsed).toBeNull();
      expect(res.intensityMap.upper_chest).toBe(0);
      expect(res.muscles.upper_chest.recoveryPercent).toBe(100);
      expect(res.muscles.upper_chest.tier).toBe('recovered');
    });

    it('單次臥推訓練後的恢復狀態精確推算', () => {
      const benchPressId = 'ex-bench';
      const exerciseMap = new Map<string, Exercise>([
        [
          benchPressId,
          {
            id: benchPressId,
            name: '槓鈴臥推',
            equipment: 'barbell',
            targetMuscles: {
              mid_lower_chest: 'primary',
              front_delts: 'secondary',
              triceps: 'secondary',
            },
            isCustom: false,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      ]);

      const refTime = 1700000000000;
      // 10 小時前做的訓練
      const tenHoursAgo = refTime - 10 * 3600 * 1000;

      const log: WorkoutLog = {
        id: 'log-1',
        date: '2026-11-03',
        title: '胸部推力',
        exercises: [
          {
            exerciseId: benchPressId,
            exerciseName: '槓鈴臥推',
            sets: [{ id: 's1', setNumber: 1, weight: 100, reps: 5, isCompleted: true }],
          },
        ],
        createdAt: tenHoursAgo,
        updatedAt: tenHoursAgo,
      };

      const res = calculateBodyRecovery([log], {
        referenceTimestamp: refTime,
        exerciseMap,
      });

      expect(res.latestWorkoutHoursElapsed).toBe(10);
      // 中下胸（大肌群 72h，經過 10h，primary 1.0 權重）
      // intensity = (1 - 10/72) * 100 ≈ 86
      const chest = res.muscles.mid_lower_chest;
      expect(chest.hoursElapsed).toBe(10);
      expect(chest.intensity).toBeGreaterThanOrEqual(80);
      expect(chest.tier).toBe('acute');
      expect(chest.lastExerciseName).toBe('槓鈴臥推');

      // 前三角（小肌群 48h，經過 10h，secondary 0.6 權重）
      // intensity = (1 - 10/48) * 0.6 * 100 ≈ 47
      const frontDelts = res.muscles.front_delts;
      expect(frontDelts.hoursElapsed).toBe(10);
      expect(frontDelts.intensity).toBeLessThan(60);

      // 未刺激的背闊肌
      expect(res.muscles.lats.intensity).toBe(0);
      expect(res.muscles.lats.tier).toBe('recovered');
    });
  });
});
