import { describe, it, expect } from 'vitest';
import {
  normalizeMuscleRole,
  muscleRoleToNumericWeight,
  getMuscleRoleBadgeClasses,
  getMuscleIntensityBadgeClasses,
  getMuscleIntensityTier,
  getMuscleRoleLabel,
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
    it('各角色均回傳對應之赤陶 Design Token 樣式類名', () => {
      const primaryClasses = getMuscleRoleBadgeClasses('primary');
      expect(primaryClasses.container).toContain('--muscle-intensity-high-bg');
      expect(primaryClasses.container).toContain('font-semibold');

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
});
