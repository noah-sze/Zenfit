import { describe, it, expect } from 'vitest';
import {
  getDetailedMusclesForSlug,
  getSlugsForDetailedMuscle,
  getMuscleIntensity,
  getIntensityAlpha,
} from './muscleHighlight';
import type { DetailedMuscle } from '@/types';

describe('muscleHighlight pure functions', () => {
  describe('getDetailedMusclesForSlug', () => {
    it('correctly maps anterior chest to mid_lower_chest and upper_chest', () => {
      expect(getDetailedMusclesForSlug('chest', 'anterior')).toEqual([
        'mid_lower_chest',
        'upper_chest',
      ]);
    });

    it('distinguishes anterior vs posterior deltoids', () => {
      expect(getDetailedMusclesForSlug('deltoids', 'anterior')).toEqual([
        'front_delts',
        'side_delts',
      ]);
      expect(getDetailedMusclesForSlug('deltoids', 'posterior')).toEqual([
        'rear_delts',
        'side_delts',
      ]);
    });

    it('returns empty array for non-muscle body parts', () => {
      expect(getDetailedMusclesForSlug('head', 'anterior')).toEqual([]);
      expect(getDetailedMusclesForSlug('hair', 'posterior')).toEqual([]);
      expect(getDetailedMusclesForSlug('knees', 'anterior')).toEqual([]);
    });
  });

  describe('getSlugsForDetailedMuscle', () => {
    it('covers all 17 DetailedMuscle types', () => {
      const allMuscles: DetailedMuscle[] = [
        'upper_chest',
        'mid_lower_chest',
        'lats',
        'upper_back_traps',
        'lower_back',
        'front_delts',
        'side_delts',
        'rear_delts',
        'biceps',
        'triceps',
        'forearms',
        'quads',
        'hamstrings',
        'glutes',
        'calves',
        'abs',
        'obliques',
      ];

      for (const m of allMuscles) {
        const mapping = getSlugsForDetailedMuscle(m);
        expect(mapping.length).toBeGreaterThan(0);
      }
    });

    it('returns both views for multi-view muscles like triceps and forearms', () => {
      expect(getSlugsForDetailedMuscle('triceps')).toEqual([
        { slug: 'triceps', view: 'anterior' },
        { slug: 'triceps', view: 'posterior' },
      ]);
      expect(getSlugsForDetailedMuscle('forearms')).toEqual([
        { slug: 'forearm', view: 'anterior' },
        { slug: 'forearm', view: 'posterior' },
      ]);
    });
  });

  describe('getMuscleIntensity', () => {
    it('returns 0 when muscles input is undefined or empty', () => {
      expect(getMuscleIntensity(undefined, 'chest', 'anterior')).toBe(0);
      expect(getMuscleIntensity({}, 'chest', 'anterior')).toBe(0);
    });

    it('returns maximum intensity among covered detailed muscles', () => {
      expect(
        getMuscleIntensity(
          { mid_lower_chest: 60, upper_chest: 90 },
          'chest',
          'anterior'
        )
      ).toBe(90);
    });

    it('clamps intensity between 0 and 100', () => {
      expect(
        getMuscleIntensity({ abs: 150 }, 'abs', 'anterior')
      ).toBe(100);
      expect(
        getMuscleIntensity({ abs: -20 }, 'abs', 'anterior')
      ).toBe(0);
    });

    it('returns 0 for non-muscle slugs', () => {
      expect(
        getMuscleIntensity({ abs: 100 }, 'head', 'anterior')
      ).toBe(0);
    });
  });

  describe('getIntensityAlpha', () => {
    it('returns 0.15 for 0 or negative intensity', () => {
      expect(getIntensityAlpha(0)).toBe(0.15);
      expect(getIntensityAlpha(-50)).toBe(0.15);
    });

    it('returns 1.0 for 100 or higher intensity', () => {
      expect(getIntensityAlpha(100)).toBe(1.0);
      expect(getIntensityAlpha(200)).toBe(1.0);
    });

    it('returns progressive alpha between 0.35 and 1.0 for positive intensity', () => {
      const alpha50 = getIntensityAlpha(50);
      expect(alpha50).toBeCloseTo(0.35 + 0.5 * 0.65, 4);
    });
  });
});
