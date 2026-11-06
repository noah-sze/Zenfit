import { describe, it, expect } from 'vitest';
import {
  normalizeMuscleRole,
  muscleRoleToNumericWeight,
  getMuscleRoleBadgeClasses,
  getMuscleIntensityBadgeClasses,
  getMuscleIntensityTier,
  getMuscleRoleLabel,
  getMuscleRoleRank,
  sortMuscleEntries,
} from './muscleIntensity';

describe('肌群刺激強度分級純函數測試 (Muscle Intensity & Roles)', () => {
  describe('normalizeMuscleRole', () => {
    it('正確識別 MuscleRole 原始值', () => {
      expect(normalizeMuscleRole('primary')).toBe('primary');
      expect(normalizeMuscleRole('secondary')).toBe('secondary');
      expect(normalizeMuscleRole('stabilizer')).toBe('stabilizer');
    });

    it('平滑相容歷史數字至正確 MuscleRole', () => {
      expect(normalizeMuscleRole(100)).toBe('primary');
      expect(normalizeMuscleRole(85)).toBe('primary');
      expect(normalizeMuscleRole(80)).toBe('primary');

      expect(normalizeMuscleRole(79)).toBe('secondary');
      expect(normalizeMuscleRole(60)).toBe('secondary');
      expect(normalizeMuscleRole(50)).toBe('secondary');

      expect(normalizeMuscleRole(49)).toBe('stabilizer');
      expect(normalizeMuscleRole(30)).toBe('stabilizer');
      expect(normalizeMuscleRole(0)).toBe('stabilizer');
      expect(normalizeMuscleRole(-10)).toBe('stabilizer');
    });

    it('對於未知或未定義值回退至 primary', () => {
      expect(normalizeMuscleRole(undefined)).toBe('primary');
      expect(normalizeMuscleRole(null)).toBe('primary');
      expect(normalizeMuscleRole('invalid_role')).toBe('primary');
    });
  });

  describe('muscleRoleToNumericWeight', () => {
    it('將各角色映射至精準數值權重', () => {
      expect(muscleRoleToNumericWeight('primary')).toBe(100);
      expect(muscleRoleToNumericWeight('secondary')).toBe(60);
      expect(muscleRoleToNumericWeight('stabilizer')).toBe(30);
    });

    it('相容數字輸入轉化為對應層級權重', () => {
      expect(muscleRoleToNumericWeight(90)).toBe(100);
      expect(muscleRoleToNumericWeight(55)).toBe(60);
      expect(muscleRoleToNumericWeight(20)).toBe(30);
    });
  });

  describe('getMuscleRoleBadgeClasses', () => {
    it('各角色均回傳對應之赤陶 Design Token 樣式類名 (不含粗體)', () => {
      const primaryClasses = getMuscleRoleBadgeClasses('primary');
      expect(primaryClasses.container).toContain('--muscle-intensity-high-bg');
      expect(primaryClasses.container).not.toContain('font-semibold');

      const secondaryClasses = getMuscleRoleBadgeClasses('secondary');
      expect(secondaryClasses.container).toContain('--muscle-intensity-med-bg');
      expect(secondaryClasses.container).not.toContain('font-semibold');

      const stabilizerClasses = getMuscleRoleBadgeClasses('stabilizer');
      expect(stabilizerClasses.container).toContain('--muscle-intensity-low-bg');
    });
  });

  describe('getMuscleIntensityBadgeClasses (多型入口)', () => {
    it('支援傳入 MuscleRole 字串或歷史數字', () => {
      expect(getMuscleIntensityBadgeClasses('primary').container).toContain('--muscle-intensity-high-bg');
      expect(getMuscleIntensityBadgeClasses(100).container).toContain('--muscle-intensity-high-bg');

      expect(getMuscleIntensityBadgeClasses('secondary').container).toContain('--muscle-intensity-med-bg');
      expect(getMuscleIntensityBadgeClasses(60).container).toContain('--muscle-intensity-med-bg');

      expect(getMuscleIntensityBadgeClasses('stabilizer').container).toContain('--muscle-intensity-low-bg');
      expect(getMuscleIntensityBadgeClasses(30).container).toContain('--muscle-intensity-low-bg');
    });
  });

  describe('getMuscleIntensityTier (向後相容)', () => {
    it('正確將數值劃分為 high / med / low', () => {
      expect(getMuscleIntensityTier(100)).toBe('high');
      expect(getMuscleIntensityTier(60)).toBe('med');
      expect(getMuscleIntensityTier(30)).toBe('low');
    });
  });

  describe('getMuscleRoleLabel', () => {
    const mockT = ((_key: string, defaultVal: string) => defaultVal) as any;
    it('返回對應的層級多語系標籤', () => {
      expect(getMuscleRoleLabel('primary', mockT)).toBe('主動肌');
      expect(getMuscleRoleLabel('secondary', mockT)).toBe('協同肌');
      expect(getMuscleRoleLabel('stabilizer', mockT)).toBe('穩定肌');
    });
  });

  describe('getMuscleRoleRank (機能學排序優先級)', () => {
    it('主動肌 (1) < 協同肌 (2) < 穩定肌 (3)', () => {
      expect(getMuscleRoleRank('primary')).toBe(1);
      expect(getMuscleRoleRank('secondary')).toBe(2);
      expect(getMuscleRoleRank('stabilizer')).toBe(3);
    });

    it('相容數字強度映射優先級', () => {
      expect(getMuscleRoleRank(100)).toBe(1);
      expect(getMuscleRoleRank(60)).toBe(2);
      expect(getMuscleRoleRank(30)).toBe(3);
    });
  });

  describe('sortMuscleEntries (機能學肌群排序：協同在前，穩定在後)', () => {
    it('嚴格保證協同肌排在穩定肌之前', () => {
      const unsorted = [
        ['forearms', 'stabilizer'],
        ['erector_spinae', 'secondary'],
        ['lats', 'secondary'],
        ['biceps', 'secondary'],
      ] as const;

      const sorted = sortMuscleEntries([...unsorted]);

      expect(sorted.map((item) => item[0])).toEqual([
        'biceps',
        'erector_spinae',
        'lats',
        'forearms',
      ]);
    });

    it('完整階梯排序：主動肌在最前，協同肌在中間，穩定肌在最後', () => {
      const unsorted = [
        ['triceps', 'stabilizer'],
        ['mid_lower_chest', 'primary'],
        ['front_delts', 'secondary'],
      ] as const;

      const sorted = sortMuscleEntries([...unsorted]);

      expect(sorted.map((item) => item[0])).toEqual([
        'mid_lower_chest',
        'front_delts',
        'triceps',
      ]);
    });

    it('同角色內依數值強度由高至低排序', () => {
      const unsorted = [
        ['muscle_a', 55],
        ['muscle_b', 75],
        ['muscle_c', 20],
        ['muscle_d', 40],
      ] as const;

      const sorted = sortMuscleEntries([...unsorted]);

      // 55, 75 are secondary (75 > 55)
      // 20, 40 are stabilizer (40 > 20)
      expect(sorted.map((item) => item[0])).toEqual([
        'muscle_b',
        'muscle_a',
        'muscle_d',
        'muscle_c',
      ]);
    });
  });
});
