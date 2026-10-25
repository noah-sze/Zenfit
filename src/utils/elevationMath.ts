/**
 * 液柱升降規 (Liquid Elevation Picker) 純數學計算與單位約束工具
 */

/**
 * 將數值限制在 [min, max] 區間，並按 step 步進嚴格對齊，防範浮點數精度誤差
 */
export function clampAndStep(val: number, min: number, max: number, step: number = 1): number {
  if (isNaN(val)) return min
  const clamped = Math.max(min, Math.min(max, val))
  const stepped = Math.round((clamped - min) / step) * step + min
  return Math.round(stepped * 1000) / 1000
}

/**
 * 依據當前數值計算自底向上充滿的百分比 [0, 100]
 */
export function calculateFillPercentage(val: number, min: number, max: number): number {
  const range = max - min
  if (range <= 0) return 0
  const clamped = Math.max(min, Math.min(max, val))
  const pct = ((clamped - min) / range) * 100
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100))
}

/**
 * 依據手指/指針自底向上的物理高度距離計算對應的刻度數值
 * @param bottomDistance 指針相對於柱體底部的距離 (px)
 * @param totalHeight 柱體總高度 (px)
 * @param min 最小值
 * @param max 最大值
 * @param step 步進值
 */
export function calculateValueFromBottomDist(
  bottomDistance: number,
  totalHeight: number,
  min: number,
  max: number,
  step: number = 1
): number {
  if (totalHeight <= 0) return min
  const pct = Math.max(0, Math.min(1, bottomDistance / totalHeight))
  const raw = min + pct * (max - min)
  return clampAndStep(raw, min, max, step)
}

/**
 * 判定單位是否處於反灰禁用狀態
 */
export function isUnitDisabled(unit: string, disabledUnits: string[] = []): boolean {
  return disabledUnits.includes(unit)
}

/**
 * 解析可用單位列表與當前激活單位
 */
export function resolveActiveUnit(
  allowedUnits: string[] = ['g'],
  currentUnit?: string,
  disabledUnits: string[] = []
): string {
  if (currentUnit && !isUnitDisabled(currentUnit, disabledUnits)) {
    return currentUnit
  }
  const firstAvailable = allowedUnits.find((u) => !isUnitDisabled(u, disabledUnits))
  return firstAvailable || allowedUnits[0] || 'g'
}

/**
 * 自適應動態量程上限計算 (支援無上限擴容與有下限縮容)
 *
 * 1. 擴容機制 (Expansion):
 *    當數值達到或超過當前上限的 75% 時，提升上限使當前數值處於新量程的 1/3 (即 val * 3)。
 *    例如：initialMax = 200, val = 175 (>= 150) -> newMax = 525 (175 處於 1/3)。
 *
 * 2. 縮容機制 (Shrink):
 *    當數值降低至當前上限的 20% 或以下，且當前上限高於初始下限 (initialMax) 時，
 *    適度縮小上限使當前數值處於約 50% 量程 (即 val / 0.5 = val * 2)。
 *    上限絕不低於初始下限 (initialMax，例如 200)。
 *
 * @param val 當前選中數值
 * @param currentMax 當前上限
 * @param initialMax 初始下限 (預設: 200，縮容時的最低保護極限)
 * @param expandThreshold 擴容閾值 (預設: 0.75，即 75%)
 * @param shrinkThreshold 縮容閾值 (預設: 0.20，即 20%)
 * @returns 計算後的動態上限
 */
export function calculateElasticMax(
  val: number,
  currentMax: number,
  initialMax: number = 200,
  expandThreshold: number = 0.75,
  shrinkThreshold: number = 0.20
): number {
  const safeInitialMax = isNaN(initialMax) || initialMax <= 0 ? 200 : initialMax
  const safeCurrentMax = isNaN(currentMax) || currentMax <= 0 ? safeInitialMax : currentMax
  const safeVal = isNaN(val) ? 0 : Math.max(0, val)

  // 1. 擴容判定：safeVal >= safeCurrentMax * expandThreshold
  if (safeVal >= safeCurrentMax * expandThreshold) {
    const rawNewMax = safeVal * 3
    return Math.max(safeInitialMax, Math.round(rawNewMax))
  }

  // 2. 縮容判定：safeVal <= safeCurrentMax * shrinkThreshold 且當前已處於擴容狀態 (safeCurrentMax > safeInitialMax)
  if (safeCurrentMax > safeInitialMax && safeVal <= safeCurrentMax * shrinkThreshold) {
    // 縮容目標：讓 safeVal 處於新量程約 50% (safeVal * 2)
    // 但絕對不低於初始下限 safeInitialMax (例如 200)
    const candidateMax = Math.round(safeVal * 2)
    return Math.max(safeInitialMax, candidateMax)
  }

  // 3. 維持現狀 (處於 20% ~ 75% 的安全遲滯滯後區間，確保防抖無跳躍)
  return Math.max(safeInitialMax, safeCurrentMax)
}


