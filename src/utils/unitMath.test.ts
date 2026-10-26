import { describe, it, expect } from 'vitest';
import {
  roundTo,
  kgToLbs,
  lbsToKg,
  convertBodyWeight,
  gToOz,
  ozToG,
  convertFoodWeight,
  mlToFlOz,
  flOzToMl,
  convertFoodVolume,
  cmToIn,
  inToCm,
  convertLength,
  kcalToKj,
  kjToKcal,
  convertEnergy,
  formatEnergy,
  formatFoodServing,
} from './unitMath';

describe('unitMath: Precision Metric Tests', () => {
  describe('roundTo', () => {
    it('rounds numbers to specified decimals', () => {
      expect(roundTo(10.556, 2)).toBe(10.56);
      expect(roundTo(10.554, 2)).toBe(10.55);
      expect(roundTo(10.5, 0)).toBe(11);
    });

    it('guards against NaN and Infinity', () => {
      expect(roundTo(NaN)).toBe(0);
      expect(roundTo(Infinity)).toBe(0);
      expect(roundTo(-Infinity)).toBe(0);
    });
  });

  describe('Body Weight (kg <-> lbs)', () => {
    it('converts kg to lbs accurately', () => {
      // 70 kg * 2.20462... = 154.3235... -> 154.32
      expect(kgToLbs(70)).toBe(154.32);
      expect(kgToLbs(100)).toBe(220.46);
    });

    it('converts lbs to kg accurately', () => {
      // 154.32 lbs * 0.45359237 = 69.998... -> 70.0
      expect(lbsToKg(154.32)).toBe(70);
      expect(lbsToKg(220.46)).toBe(100);
    });

    it('guards zero and negative weight', () => {
      expect(kgToLbs(0)).toBe(0);
      expect(kgToLbs(-10)).toBe(0);
      expect(lbsToKg(0)).toBe(0);
      expect(lbsToKg(-50)).toBe(0);
    });

    it('convertBodyWeight handles same units and cross conversions', () => {
      expect(convertBodyWeight(75, 'kg', 'kg')).toBe(75);
      expect(convertBodyWeight(165.35, 'lbs', 'lbs')).toBe(165.35);
      expect(convertBodyWeight(75, 'kg', 'lbs')).toBe(165.35);
      expect(convertBodyWeight(165.35, 'lbs', 'kg')).toBe(75);
    });
  });

  describe('Food Weight (g <-> oz)', () => {
    it('converts g to oz accurately', () => {
      // 100 g / 28.349523125 = 3.527396... -> 3.53
      expect(gToOz(100)).toBe(3.53);
      expect(gToOz(28.35)).toBe(1);
    });

    it('converts oz to g accurately', () => {
      expect(ozToG(1)).toBe(28.35);
      expect(ozToG(3.53)).toBe(100.07);
    });

    it('guards zero and negative food weight', () => {
      expect(gToOz(0)).toBe(0);
      expect(gToOz(-100)).toBe(0);
      expect(ozToG(0)).toBe(0);
      expect(ozToG(-1)).toBe(0);
    });

    it('convertFoodWeight handles unit conversions', () => {
      expect(convertFoodWeight(100, 'g', 'g')).toBe(100);
      expect(convertFoodWeight(100, 'g', 'oz')).toBe(3.53);
      expect(convertFoodWeight(3.5274, 'oz', 'g')).toBe(100);
    });
  });

  describe('Food Volume (ml <-> fl oz)', () => {
    it('converts ml to fl oz accurately', () => {
      // 250 ml / 29.5735295625 = 8.4535... -> 8.45
      expect(mlToFlOz(250)).toBe(8.45);
      expect(mlToFlOz(29.57)).toBe(1);
    });

    it('converts fl oz to ml accurately', () => {
      expect(flOzToMl(1)).toBe(29.57);
      expect(flOzToMl(8.45)).toBe(249.9);
    });

    it('guards zero and negative volume', () => {
      expect(mlToFlOz(0)).toBe(0);
      expect(mlToFlOz(-250)).toBe(0);
      expect(flOzToMl(0)).toBe(0);
      expect(flOzToMl(-1)).toBe(0);
    });

    it('convertFoodVolume handles unit conversions', () => {
      expect(convertFoodVolume(500, 'ml', 'ml')).toBe(500);
      expect(convertFoodVolume(500, 'ml', 'fl oz')).toBe(16.91);
      expect(convertFoodVolume(16.907, 'fl oz', 'ml')).toBe(500);
    });
  });

  describe('Length (cm <-> in)', () => {
    it('converts cm to in accurately', () => {
      // 180 cm / 2.54 = 70.866... -> 70.87
      expect(cmToIn(180)).toBe(70.87);
      expect(cmToIn(2.54)).toBe(1);
    });

    it('converts in to cm accurately', () => {
      expect(inToCm(1)).toBe(2.54);
      expect(inToCm(70.87)).toBe(180.01);
    });

    it('guards zero and negative length', () => {
      expect(cmToIn(0)).toBe(0);
      expect(cmToIn(-180)).toBe(0);
      expect(inToCm(0)).toBe(0);
      expect(inToCm(-1)).toBe(0);
    });

    it('convertLength handles unit conversions', () => {
      expect(convertLength(175, 'cm', 'cm')).toBe(175);
      expect(convertLength(175, 'cm', 'in')).toBe(68.9);
      expect(convertLength(68.8976, 'in', 'cm')).toBe(175);
    });
  });

  describe('Energy (kcal <-> kJ)', () => {
    it('converts kcal to kJ accurately', () => {
      // 100 kcal * 4.184 = 418.4
      expect(kcalToKj(100)).toBe(418.4);
      expect(kcalToKj(2000)).toBe(8368);
    });

    it('converts kJ to kcal accurately', () => {
      // 418.4 kJ / 4.184 = 100
      expect(kjToKcal(418.4)).toBe(100);
      expect(kjToKcal(8368)).toBe(2000);
    });

    it('guards zero and negative energy', () => {
      expect(kcalToKj(0)).toBe(0);
      expect(kcalToKj(-100)).toBe(0);
      expect(kjToKcal(0)).toBe(0);
      expect(kjToKcal(-418.4)).toBe(0);
    });

    it('convertEnergy handles unit conversions', () => {
      expect(convertEnergy(500, 'kcal', 'kcal')).toBe(500);
      expect(convertEnergy(500, 'kcal', 'kJ')).toBe(2092);
      expect(convertEnergy(2092, 'kJ', 'kcal')).toBe(500);
    });
  });

  describe('Presentation Helpers (formatEnergy & formatFoodServing)', () => {
    it('formats energy correctly for kcal and kJ', () => {
      expect(formatEnergy(389, 'kcal')).toEqual({
        value: 389,
        unit: 'kcal',
        formatted: '389 kcal',
      });
      expect(formatEnergy(389, 'kJ')).toEqual({
        value: 1628,
        unit: 'kJ',
        formatted: '1,628 kJ',
      });
      expect(formatEnergy(0, 'kcal')).toEqual({
        value: 0,
        unit: 'kcal',
        formatted: '0 kcal',
      });
    });

    it('formats food serving correctly for g <-> oz', () => {
      // 100g 換算成 oz
      const ozRes = formatFoodServing(100, 'g', 'oz', 'ml');
      expect(ozRes.unit).toBe('oz');
      expect(ozRes.size).toBe(3.53);
      expect(ozRes.formatted).toBe('3.53 oz');

      // 100g 在 g 偏好下維持 100g
      const gRes = formatFoodServing(100, 'g', 'g', 'ml');
      expect(gRes.unit).toBe('g');
      expect(gRes.size).toBe(100);
      expect(gRes.formatted).toBe('100g');

      // 1 oz 換算成 g 偏好
      const ozToGRes = formatFoodServing(1, 'oz', 'g', 'ml');
      expect(ozToGRes.unit).toBe('g');
      expect(ozToGRes.size).toBe(28.3);
      expect(ozToGRes.formatted).toBe('28.3g');
    });

    it('formats food volume correctly for ml <-> fl oz', () => {
      // 250ml 換算成 fl oz
      const flOzRes = formatFoodServing(250, 'ml', 'g', 'fl oz');
      expect(flOzRes.unit).toBe('fl oz');
      expect(flOzRes.size).toBe(8.45);
      expect(flOzRes.formatted).toBe('8.45 fl oz');

      // 250ml 在 ml 偏好下維持 250ml
      const mlRes = formatFoodServing(250, 'ml', 'g', 'ml');
      expect(mlRes.unit).toBe('ml');
      expect(mlRes.size).toBe(250);
      expect(mlRes.formatted).toBe('250ml');
    });

    it('preserves custom units like serving or piece', () => {
      const customRes = formatFoodServing(1, '份', 'oz', 'fl oz');
      expect(customRes.unit).toBe('份');
      expect(customRes.size).toBe(1);
      expect(customRes.formatted).toBe('1 份');
    });
  });
});
