import { describe, it, expect } from 'vitest';
import {
  getDetailedMusclesForSlug,
  getSlugsForDetailedMuscle,
  getMuscleIntensity,
  getIntensityAlpha,
  getMuscleHighlightStyle,
  resolveMuscleForSlug,
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

  describe('resolveMuscleForSlug', () => {
    it('returns first detailed muscle when no muscles mapping provided', () => {
      expect(resolveMuscleForSlug('chest', 'anterior')).toBe('mid_lower_chest');
      expect(resolveMuscleForSlug('biceps', 'anterior')).toBe('biceps');
    });

    it('returns undefined for non-muscle body parts', () => {
      expect(resolveMuscleForSlug('head', 'anterior')).toBeUndefined();
      expect(resolveMuscleForSlug('knees', 'anterior')).toBeUndefined();
    });

    it('prioritizes the muscle present in the active exercise muscles map', () => {
      // 若動作只刺激 upper_chest (例如上斜臥推)
      expect(
        resolveMuscleForSlug('chest', 'anterior', { upper_chest: 'primary' })
      ).toBe('upper_chest');

      // 若動作刺激 rear_delts (例如後束飛鳥)
      expect(
        resolveMuscleForSlug('deltoids', 'posterior', { rear_delts: 'primary' })
      ).toBe('rear_delts');
    });

    it('prioritizes higher weight muscle when multiple muscles in that slug are stimulated', () => {
      expect(
        resolveMuscleForSlug('chest', 'anterior', {
          mid_lower_chest: 'secondary',
          upper_chest: 'primary',
        })
      ).toBe('upper_chest');

      expect(
        resolveMuscleForSlug('chest', 'anterior', {
          mid_lower_chest: 'primary',
          upper_chest: 'stabilizer',
        })
      ).toBe('mid_lower_chest');
    });

    it('falls back to first candidate if none of the candidate muscles are in the map', () => {
      expect(
        resolveMuscleForSlug('chest', 'anterior', { quads: 'primary' })
      ).toBe('mid_lower_chest');
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

  describe('getMuscleHighlightStyle', () => {
    describe('赤陶 Design Tokens 體系階梯映射', () => {
      it('high 階梯 (intensity >= 80，主動肌 / primary) 應用正確 Tokens', () => {
        for (const val of [80, 90, 100, 150]) {
          const style = getMuscleHighlightStyle(val);
          expect(style.fill).toBe('var(--muscle-intensity-high-bg)');
          expect(style.stroke).toBe('var(--muscle-intensity-high-text)');
          expect(style.fillOpacity).toBe(1);
          expect(style.strokeOpacity).toBe(1.0);
          expect(style.strokeWidth).toBe(1.0);
        }
      });

      it('med 階梯 (50 <= intensity < 80，協同肌 / secondary) 應用正確 Tokens', () => {
        for (const val of [50, 60, 70, 79]) {
          const style = getMuscleHighlightStyle(val);
          expect(style.fill).toBe('var(--muscle-intensity-med-bg)');
          expect(style.stroke).toBe('var(--muscle-intensity-med-text)');
          expect(style.fillOpacity).toBe(1);
          expect(style.strokeOpacity).toBe(0.95);
          expect(style.strokeWidth).toBe(0.85);
        }
      });

      it('low 階梯 (0 < intensity < 50，穩定肌 / stabilizer) 應用正確 Tokens', () => {
        for (const val of [1, 20, 30, 49]) {
          const style = getMuscleHighlightStyle(val);
          expect(style.fill).toBe('var(--muscle-intensity-low-bg)');
          expect(style.stroke).toBe('var(--muscle-intensity-low-text)');
          expect(style.fillOpacity).toBe(1);
          expect(style.strokeOpacity).toBe(0.85);
          expect(style.strokeWidth).toBe(0.75);
        }
      });
    });

    describe('自訂 highlightColor 顯式覆蓋', () => {
      it('顯式傳入 highlightColor 時優先使用自訂色覆蓋', () => {
        const customColor = '#3b82f6';
        const style = getMuscleHighlightStyle(85, { highlightColor: customColor });
        expect(style.fill).toBe(customColor);
        expect(style.stroke).toBe(customColor);
        expect(style.fillOpacity).toBe(getIntIntensityAlphaExpected(85));
        expect(style.strokeOpacity).toBe(0.4);
      });

      function getIntIntensityAlphaExpected(intensity: number) {
        return 0.35 + (intensity / 100) * 0.65;
      }
    });

    describe('選中狀態 (isSelected)', () => {
      it('選中受刺激肌群時保留對應生理階梯底色，描邊升級為高對比聚焦環', () => {
        // High (主動肌)
        const styleHigh = getMuscleHighlightStyle(100, { isSelected: true });
        expect(styleHigh.fill).toBe('var(--muscle-intensity-high-bg)');
        expect(styleHigh.fillOpacity).toBe(1);
        expect(styleHigh.stroke).toBe('var(--foreground)');
        expect(styleHigh.strokeOpacity).toBe(1);
        expect(styleHigh.strokeWidth).toBe(1.5);

        // Med (協同肌)
        const styleMed = getMuscleHighlightStyle(60, { isSelected: true });
        expect(styleMed.fill).toBe('var(--muscle-intensity-med-bg)');
        expect(styleMed.fillOpacity).toBe(1);
        expect(styleMed.stroke).toBe('var(--foreground)');
        expect(styleMed.strokeWidth).toBe(1.5);

        // Low (穩定肌)
        const styleLow = getMuscleHighlightStyle(30, { isSelected: true });
        expect(styleLow.fill).toBe('var(--muscle-intensity-low-bg)');
        expect(styleLow.fillOpacity).toBe(1);
        expect(styleLow.stroke).toBe('var(--foreground)');
        expect(styleLow.strokeWidth).toBe(1.5);
      });

      it('選中未受刺激肌群時維持中性淡底，絕不偽裝成受刺激赤陶色', () => {
        const styleZero = getMuscleHighlightStyle(0, { isSelected: true });
        expect(styleZero.fill).toBe('currentColor');
        expect(styleZero.fillOpacity).toBe(0.16);
        expect(styleZero.stroke).toBe('var(--foreground)');
        expect(styleZero.strokeOpacity).toBe(1);
        expect(styleZero.strokeWidth).toBe(1.5);
      });

      it('選中時支援自訂 highlightColor 顯式覆蓋', () => {
        const styleCustom = getMuscleHighlightStyle(100, {
          isSelected: true,
          highlightColor: '#10b981',
        });
        expect(styleCustom.fill).toBe('#10b981');
        expect(styleCustom.fillOpacity).toBe(0.35);
        expect(styleCustom.stroke).toBe('#10b981');
        expect(styleCustom.strokeOpacity).toBe(1);
        expect(styleCustom.strokeWidth).toBe(1.5);
      });
    });

    describe('未受刺激與非肌肉部位', () => {
      it('未受刺激部位 (intensity === 0) 傳回清晰可讀線條與淡底色', () => {
        const style = getMuscleHighlightStyle(0);
        expect(style.fill).toBe('currentColor');
        expect(style.fillOpacity).toBe(0.09);
        expect(style.stroke).toBe('currentColor');
        expect(style.strokeOpacity).toBe(0.22);
        expect(style.strokeWidth).toBe(0.75);
      });

      it('未受刺激部位支援傳入自訂 baseColor', () => {
        const style = getMuscleHighlightStyle(0, { baseColor: '#555555' });
        expect(style.fill).toBe('#555555');
        expect(style.fillOpacity).toBe(0.09);
      });

      it('負數強度回退至未受刺激樣式', () => {
        const style = getMuscleHighlightStyle(-20);
        expect(style.fill).toBe('currentColor');
        expect(style.fillOpacity).toBe(0.09);
      });

      it('非肌肉部位即使傳入非零強度亦維持極淡背景定位骨架樣式 (不可訓練/不可點擊)', () => {
        const style = getMuscleHighlightStyle(100, { isNonMuscle: true });
        expect(style.fill).toBe('currentColor');
        expect(style.fillOpacity).toBe(0.03);
        expect(style.strokeOpacity).toBe(0.08);
        expect(style.strokeWidth).toBe(0.5);
      });
    });
  });
});
