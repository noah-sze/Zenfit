/**
 * 精密度量衡單位換算純函數庫 (Unit Math & Conversion Pure Functions)
 * 遵循 Precision Metric Testing 準則：純函數無副作用，100% 防護 NaN、負數、極端小數與除以零
 * 
 * 國際物理常數基準真理源 (SI Ground Truth)：
 * - 1 lb = 0.45359237 kg
 * - 1 oz = 28.349523125 g
 * - 1 fl oz (US) = 29.5735295625 ml
 * - 1 in = 2.54 cm
 * - 1 kcal = 4.184 kJ
 */

import type {
  BodyWeightUnit,
  FoodWeightUnit,
  FoodVolumeUnit,
  LengthUnit,
  EnergyUnit,
} from '@/types';

export const LB_TO_KG_RATIO = 0.45359237;
export const OZ_TO_G_RATIO = 28.349523125;
export const FL_OZ_TO_ML_RATIO = 29.5735295625;
export const INCH_TO_CM_RATIO = 2.54;
export const KCAL_TO_KJ_RATIO = 4.184;

/**
 * 數值四捨五入至指定小數位數 (防浮點數精度微小誤差)
 */
export function roundTo(val: number, decimals: number = 2): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// ==================== 1. 體重與訓練重量 (kg <-> lbs) ====================

export function kgToLbs(kg: number, decimals: number = 2): number {
  if (kg <= 0 || isNaN(kg) || !isFinite(kg)) return 0;
  return roundTo(kg / LB_TO_KG_RATIO, decimals);
}

export function lbsToKg(lbs: number, decimals: number = 2): number {
  if (lbs <= 0 || isNaN(lbs) || !isFinite(lbs)) return 0;
  return roundTo(lbs * LB_TO_KG_RATIO, decimals);
}

export function convertBodyWeight(
  val: number,
  from: BodyWeightUnit,
  to: BodyWeightUnit,
  decimals: number = 2
): number {
  if (from === to) return roundTo(val, decimals);
  return from === 'kg' ? kgToLbs(val, decimals) : lbsToKg(val, decimals);
}

// ==================== 2. 食材固體重量 (g <-> oz) ====================

export function gToOz(g: number, decimals: number = 2): number {
  if (g <= 0 || isNaN(g) || !isFinite(g)) return 0;
  return roundTo(g / OZ_TO_G_RATIO, decimals);
}

export function ozToG(oz: number, decimals: number = 2): number {
  if (oz <= 0 || isNaN(oz) || !isFinite(oz)) return 0;
  return roundTo(oz * OZ_TO_G_RATIO, decimals);
}

export function convertFoodWeight(
  val: number,
  from: FoodWeightUnit,
  to: FoodWeightUnit,
  decimals: number = 2
): number {
  if (from === to) return roundTo(val, decimals);
  return from === 'g' ? gToOz(val, decimals) : ozToG(val, decimals);
}

// ==================== 3. 食材液體容量 (ml <-> fl oz) ====================

export function mlToFlOz(ml: number, decimals: number = 2): number {
  if (ml <= 0 || isNaN(ml) || !isFinite(ml)) return 0;
  return roundTo(ml / FL_OZ_TO_ML_RATIO, decimals);
}

export function flOzToMl(flOz: number, decimals: number = 2): number {
  if (flOz <= 0 || isNaN(flOz) || !isFinite(flOz)) return 0;
  return roundTo(flOz * FL_OZ_TO_ML_RATIO, decimals);
}

export function convertFoodVolume(
  val: number,
  from: FoodVolumeUnit,
  to: FoodVolumeUnit,
  decimals: number = 2
): number {
  if (from === to) return roundTo(val, decimals);
  return from === 'ml' ? mlToFlOz(val, decimals) : flOzToMl(val, decimals);
}

// ==================== 4. 身高與維度長度 (cm <-> in) ====================

export function cmToIn(cm: number, decimals: number = 2): number {
  if (cm <= 0 || isNaN(cm) || !isFinite(cm)) return 0;
  return roundTo(cm / INCH_TO_CM_RATIO, decimals);
}

export function inToCm(inch: number, decimals: number = 2): number {
  if (inch <= 0 || isNaN(inch) || !isFinite(inch)) return 0;
  return roundTo(inch * INCH_TO_CM_RATIO, decimals);
}

export function convertLength(
  val: number,
  from: LengthUnit,
  to: LengthUnit,
  decimals: number = 2
): number {
  if (from === to) return roundTo(val, decimals);
  return from === 'cm' ? cmToIn(val, decimals) : inToCm(val, decimals);
}

// ==================== 5. 熱量能量 (kcal <-> kJ) ====================

export function kcalToKj(kcal: number, decimals: number = 2): number {
  if (kcal <= 0 || isNaN(kcal) || !isFinite(kcal)) return 0;
  return roundTo(kcal * KCAL_TO_KJ_RATIO, decimals);
}

export function kjToKcal(kj: number, decimals: number = 2): number {
  if (kj <= 0 || isNaN(kj) || !isFinite(kj)) return 0;
  return roundTo(kj / KCAL_TO_KJ_RATIO, decimals);
}

export function convertEnergy(
  val: number,
  from: EnergyUnit,
  to: EnergyUnit,
  decimals: number = 2
): number {
  if (from === to) return roundTo(val, decimals);
  return from === 'kcal' ? kcalToKj(val, decimals) : kjToKcal(val, decimals);
}

// ==================== 6. 展示層動態格式化 (Presentation Helpers) ====================

/**
 * 熱量動態展示格式化：
 * 輸入一律為以 kcal 為基準之物理數值，依據 targetUnit 轉換為對應數值與單位
 */
export function formatEnergy(
  kcal: number,
  targetUnit: EnergyUnit
): { value: number; unit: string; formatted: string } {
  if (isNaN(kcal) || !isFinite(kcal) || kcal <= 0) {
    return { value: 0, unit: targetUnit, formatted: `0 ${targetUnit}` };
  }
  const val = targetUnit === 'kJ' ? Math.round(kcal * KCAL_TO_KJ_RATIO) : Math.round(kcal);
  return {
    value: val,
    unit: targetUnit,
    formatted: `${val.toLocaleString()} ${targetUnit}`,
  };
}

/**
 * 食物份量/容量動態展示格式化：
 * 輸入為原始食材記錄的數值與單位，依據使用者的固體重量與液體容量偏好進行動態無損換算
 */
export function formatFoodServing(
  size: number,
  rawUnit: string = 'g',
  weightUnit: FoodWeightUnit = 'g',
  volumeUnit: FoodVolumeUnit = 'ml'
): { size: number; unit: string; formatted: string } {
  if (isNaN(size) || !isFinite(size) || size <= 0) {
    const defaultUnit = rawUnit.toLowerCase().includes('ml') ? volumeUnit : weightUnit;
    return { size: 0, unit: defaultUnit, formatted: `0${defaultUnit}` };
  }

  const u = rawUnit.trim().toLowerCase();

  // 固體重量：g 與 oz 互相換算
  if (u === 'g' || u === 'oz') {
    if (weightUnit === 'oz' && u === 'g') {
      const converted = gToOz(size, 2);
      return { size: converted, unit: 'oz', formatted: `${converted} oz` };
    }
    if (weightUnit === 'g' && u === 'oz') {
      const converted = ozToG(size, 1);
      return { size: converted, unit: 'g', formatted: `${converted}g` };
    }
    return { size, unit: rawUnit, formatted: `${size}${rawUnit === 'g' ? 'g' : ' ' + rawUnit}` };
  }

  // 液體容量：ml 與 fl oz 互相換算
  if (u === 'ml' || u === 'fl oz' || u === 'floz') {
    if (volumeUnit === 'fl oz' && u === 'ml') {
      const converted = mlToFlOz(size, 2);
      return { size: converted, unit: 'fl oz', formatted: `${converted} fl oz` };
    }
    if (volumeUnit === 'ml' && (u === 'fl oz' || u === 'floz')) {
      const converted = flOzToMl(size, 1);
      return { size: converted, unit: 'ml', formatted: `${converted}ml` };
    }
    return { size, unit: rawUnit, formatted: `${size}${rawUnit === 'ml' ? 'ml' : ' ' + rawUnit}` };
  }

  // 其他自定義單位（如份、片、匙）原樣保留
  return { size, unit: rawUnit, formatted: `${size} ${rawUnit}` };
}
