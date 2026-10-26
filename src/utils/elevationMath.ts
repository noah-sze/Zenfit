/**
 * 液柱升降規 (Liquid Elevation Picker) 純數學計算與單位約束工具
 */

/**
 * 將數值限制在 [min, max] 區間，並按 step 步進嚴格對齊，防範浮點數精度誤差
 */
export function getStepPrecision(step: number): number {
  if (isNaN(step) || step <= 0) return 0
  const stepStr = step.toString()
  const dotIndex = stepStr.indexOf('.')
  return dotIndex >= 0 ? stepStr.length - dotIndex - 1 : 0
}

/**
 * 依據 step 步進進行精確對齊並消除 IEEE 754 浮點數殘差，保證結果永遠是合法的數字
 */
export function alignToStep(val: number, step: number = 1): number {
  if (isNaN(val)) return 0
  const precision = getStepPrecision(step)
  const factor = Math.pow(10, precision)
  // 透過整數域與 Number.EPSILON 規避浮點相除時的微小負溢出 (如 10.85 / 0.1 -> 108.49999999999999)
  const scaledVal = (val + Number.EPSILON * 10) * factor
  const scaledStep = Math.round(step * factor)
  const steppedScaled = Math.round(scaledVal / scaledStep) * scaledStep
  return Number((steppedScaled / factor).toFixed(precision))
}

export function clampAndStep(val: number, min: number, max: number, step: number = 1): number {
  if (isNaN(val)) return alignToStep(min, step)
  const clamped = Math.max(min, Math.min(max, val))
  return alignToStep(clamped, step)
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
 */
export function calculateValueFromBottomDist(
  bottomDistance: number,
  totalHeight: number,
  min: number,
  max: number,
  step: number = 1
): number {
  if (totalHeight <= 0) return alignToStep(min, step)
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

export interface ElevationWindow {
  windowMin: number
  windowMax: number
  macroMax: number
}

export interface ElevationTicks {
  top: number
  q3: number
  mid: number
  q1: number
  bottom: number
}

/**
 * 依據 step 判定是否有小數點 (小數步進)
 */
export function hasDecimalStep(step: number = 1): boolean {
  return getStepPrecision(step) > 0 || step < 1
}

/**
 * 依據 step 取得降低上限/量程時的最低下限 (Macro Max Floor)
 * 1. 無小數：最低是 10
 * 2. 有小數：最低是 1
 */
export function getMacroMaxFloor(step: number = 1): number {
  return hasDecimalStep(step) ? 1 : 10
}

/**
 * 依據數值向上取整到簡潔優雅的量程階梯（如 1, 2, 5, 10, 20, 50, 100, 200, 500 等）
 * - 無小數：最低階梯為 10
 * - 有小數：最低階梯為 1
 */
export function roundToNiceMax(val: number, step: number = 1): number {
  if (val <= 0) return 100
  const hasDecimal = hasDecimalStep(step)
  if (hasDecimal) {
    if (val <= 1) return 1
    if (val <= 2) return 2
    if (val <= 5) return 5
    if (val <= 10) return 10
    if (val <= 20) return 20
    if (val <= 50) return Math.ceil(val / 10) * 10
    if (val <= 200) return Math.ceil(val / 20) * 20
    if (val <= 500) return Math.ceil(val / 50) * 50
    if (val <= 2000) return Math.ceil(val / 100) * 100
    return Math.ceil(val / 500) * 500
  }

  // 無小數步進 (最低階梯為 10)
  if (val <= 10) return 10
  if (val <= 20) return 20
  if (val <= 50) return Math.ceil(val / 10) * 10
  if (val <= 200) return Math.ceil(val / 20) * 20
  if (val <= 500) return Math.ceil(val / 50) * 50
  if (val <= 2000) return Math.ceil(val / 100) * 100
  return Math.ceil(val / 500) * 500
}

/**
 * 依據 step 取得聚焦半徑的下限 (Floor)
 * - 若 step >= 1 (個位數或整數步進)：上下限為 +- 5 (半徑 = 5，跨度 = 10)
 * - 若 step < 1 (帶一位小數點，如 0.1)：上下限為 +- 0.5 (半徑 = 0.5，跨度 = 1.0)
 */
export function getFocusRadiusFloor(step: number = 1): number {
  if (step >= 1) return 5
  return 0.5
}

/**
 * 升降條視窗結算函數 (Release-to-Settle 抬手結算)
 *
 * 核心機制：
 * 1. 增加上限機制：選中數字達到「總上限」90% 以上 (val >= currentWindowMax * 0.9 或 val >= macroMax * 0.9)
 * 2. 降低上限機制：選中數字是「總上限」10% 以下 (val <= currentWindowMax * 0.1)
 *    - 降低的最低下限：無小數最低 10，有小數最低 1。
 * 3. 聚焦機制（支援多次聚焦與合法步進保證）：
 *    - 若尚未聚焦：以宏觀跨度的 30% 聚焦 (半徑 15%)，例如 0~100 選 51 -> [36, 66]，51 居中。
 *    - 若已處於聚焦狀態（多次聚焦）：半徑進一步收斂減半，但絕不低於聚焦下限 (個位數 +-5，小數點 +-0.5)。
 *    - 邊界平移防護 (Window Shift)：保證下限 >= baseMin，上限 <= macroMax，且永遠為合法步進數值。
 */
export function settleElevationWindow(
  val: number,
  currentWindowMin: number,
  currentWindowMax: number,
  macroMax: number,
  baseMin: number = 0,
  baseMax: number = 100,
  step: number = 1
): ElevationWindow {
  const safeBaseMin = alignToStep(isNaN(baseMin) ? 0 : baseMin, step)
  const minMacroFloor = Math.max(safeBaseMin + (hasDecimalStep(step) ? 1 : 10), getMacroMaxFloor(step))
  const safeBaseMax = alignToStep(isNaN(baseMax) || baseMax < minMacroFloor ? minMacroFloor : baseMax, step)
  const safeMacroMax = alignToStep(isNaN(macroMax) || macroMax < minMacroFloor ? safeBaseMax : macroMax, step)

  if (isNaN(val) || val < safeBaseMin) {
    return {
      windowMin: safeBaseMin,
      windowMax: safeMacroMax,
      macroMax: safeMacroMax,
    }
  }

  const safeVal = alignToStep(val, step)

  const isFocused = currentWindowMin !== safeBaseMin || currentWindowMax !== safeMacroMax
  const currentSpan = currentWindowMax - currentWindowMin

  // 1. 判定「總上限 90% 以上」與聚焦視窗碰頂
  const isAtMacroTop = safeVal >= safeMacroMax * 0.9
  const isAtWindowTop = isFocused && currentSpan > 0 && (safeVal - currentWindowMin) >= currentSpan * 0.9

  if (isAtMacroTop) {
    // 達到總上限 90% 以上：增加上限機制，擴展 macroMax，使 safeVal 位於約 50% 量程
    const candidateMax = alignToStep(roundToNiceMax(safeVal * 2, step), step)
    const newMacroMax = Math.max(safeMacroMax, candidateMax)
    return {
      windowMin: safeBaseMin,
      windowMax: newMacroMax,
      macroMax: newMacroMax,
    }
  }

  if (isAtWindowTop) {
    // 聚焦視窗碰頂但未達總上限 90%：解開聚焦回歸當前宏觀視野
    return {
      windowMin: safeBaseMin,
      windowMax: safeMacroMax,
      macroMax: safeMacroMax,
    }
  }

  // 2. 判定「總上限 10% 以下」與聚焦視窗碰底 (降低上限機制，最低下限：無小數 10 / 有小數 1)
  const isAtMacroBottom = safeVal <= safeMacroMax * 0.1
  const isAtWindowBottom = isFocused && currentSpan > 0 && (safeVal - currentWindowMin) <= currentSpan * 0.1

  if (isAtMacroBottom && safeMacroMax > minMacroFloor) {
    // 達到總上限 10% 以下 (包含用戶選擇 0)：縮減上限 macroMax，保底 minMacroFloor (無小數 10 / 有小數 1)
    const candidateMax = safeVal <= safeBaseMin
      ? minMacroFloor
      : alignToStep(roundToNiceMax(safeVal * 2.5, step), step)
    const newMacroMax = Math.min(safeMacroMax, Math.max(minMacroFloor, candidateMax))
    if (newMacroMax < safeMacroMax) {
      return {
        windowMin: safeBaseMin,
        windowMax: newMacroMax,
        macroMax: newMacroMax,
      }
    }
  }

  if (isAtWindowBottom) {
    // 聚焦視窗碰底但未達總上限 10%：解開聚焦回歸當前宏觀視野
    return {
      windowMin: safeBaseMin,
      windowMax: safeMacroMax,
      macroMax: safeMacroMax,
    }
  }

  // 如果在宏觀視野下，且數值 <= 10% 且 macroMax 已經是 minMacroFloor：維持底部宏觀
  if (!isFocused && isAtMacroBottom) {
    return {
      windowMin: safeBaseMin,
      windowMax: safeMacroMax,
      macroMax: safeMacroMax,
    }
  }

  // 3. 聚焦機制 (僅在未觸發「增加上限」與「降低上限」時觸發)
  const radiusFloor = getFocusRadiusFloor(step)
  let radius: number

  if (!isFocused) {
    // 第一次聚焦 (從宏觀視野進入)：跨度為宏觀跨度的 30%，半徑為 15%
    const macroSpan = safeMacroMax - safeBaseMin
    const initialRadius = alignToStep(macroSpan * 0.15, step)
    radius = Math.max(radiusFloor, initialRadius)
  } else {
    // 多次聚焦機制 (已處於聚焦狀態，再次操作放手)：進一步收斂半徑，但絕不低於 radiusFloor
    const currentRadius = (currentWindowMax - currentWindowMin) / 2
    const nextRadius = alignToStep(currentRadius * 0.5, step)
    radius = Math.max(radiusFloor, nextRadius)
  }

  const focusSpan = alignToStep(radius * 2, step)
  let idealMin = alignToStep(safeVal - radius, step)
  let idealMax = alignToStep(safeVal + radius, step)

  // 邊界防護與視窗平移 (Window Shift)，保證永遠是合法數字
  if (idealMin < safeBaseMin) {
    idealMin = safeBaseMin
    idealMax = alignToStep(Math.min(safeMacroMax, safeBaseMin + focusSpan), step)
  } else if (idealMax > safeMacroMax) {
    idealMax = safeMacroMax
    idealMin = alignToStep(Math.max(safeBaseMin, safeMacroMax - focusSpan), step)
  }

  return {
    windowMin: idealMin,
    windowMax: idealMax,
    macroMax: safeMacroMax,
  }
}

/**
 * 微調或滾輪更新數值並同步修正視窗邊界，確保新數值始終在當前可見視窗內且永遠合法
 */
export function shiftWindowToFitValue(
  nextVal: number,
  windowMin: number,
  windowMax: number,
  macroMax: number,
  baseMin: number = 0,
  step: number = 1
): { windowMin: number; windowMax: number } {
  const safeVal = alignToStep(nextVal, step)
  let wMin = alignToStep(windowMin, step)
  let wMax = alignToStep(windowMax, step)
  const span = alignToStep(windowMax - windowMin, step)

  if (safeVal > wMax) {
    wMax = alignToStep(Math.min(macroMax, safeVal), step)
    wMin = alignToStep(Math.max(baseMin, wMax - span), step)
  } else if (safeVal < wMin) {
    wMin = alignToStep(Math.max(baseMin, safeVal), step)
    wMax = alignToStep(Math.min(macroMax, wMin + span), step)
  }

  return { windowMin: wMin, windowMax: wMax }
}

/**
 * 計算液柱 5 道等距刻度數值，保證全部精確對齊 step，杜絕怪異殘留小數
 */
export function calculateElevationTicks(
  windowMin: number,
  windowMax: number,
  step: number = 1
): ElevationTicks {
  const safeMin = alignToStep(windowMin, step)
  const safeMax = alignToStep(windowMax, step)
  const span = alignToStep(safeMax - safeMin, step)
  return {
    top: safeMax,
    q3: alignToStep(safeMin + span * 0.75, step),
    mid: alignToStep(safeMin + span * 0.5, step),
    q1: alignToStep(safeMin + span * 0.25, step),
    bottom: safeMin,
  }
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

/**
 * 計算升降條初始化/再次打開時的重置視窗
 *
 * 核心心智模型：
 * 1. 若用戶之前已經選擇數值並保存 (val > baseMin，例如已選 10)：
 *    再次打開時重置狀態，上限設定為 20 (10 x 2)，使升降條位置恰好精確居中於 50% 位置，
 *    為使用者提供對稱舒適的向上增量與向下減量空間。
 * 2. 若數值未設置或為底座值 (val <= baseMin，例如 0)：
 *    使用調用方設置的 defaultMax (如 100)，數值位於底端 0%。
 */
export function calculateInitialElevationWindow(
  val: number | undefined,
  baseMin: number = 0,
  defaultMax: number = 100,
  step: number = 1
): ElevationWindow {
  const safeBaseMin = alignToStep(isNaN(baseMin) ? 0 : baseMin, step)
  const minMacroFloor = Math.max(safeBaseMin + (hasDecimalStep(step) ? 1 : 10), getMacroMaxFloor(step))
  const safeDefaultMax = alignToStep(isNaN(defaultMax) || defaultMax < minMacroFloor ? minMacroFloor : defaultMax, step)

  if (val === undefined || isNaN(val) || val <= safeBaseMin) {
    return {
      windowMin: safeBaseMin,
      windowMax: safeDefaultMax,
      macroMax: safeDefaultMax,
    }
  }

  const safeVal = alignToStep(val, step)
  // 數值居中機制：上限預設為 val * 2 (跨度為 (safeVal - safeBaseMin) * 2)
  // 最高優先級約束：無小數最低上限為 10，有小數最低上限為 1 (minMacroFloor)
  const span = alignToStep((safeVal - safeBaseMin) * 2, step)
  const candidateMax = alignToStep(safeBaseMin + span, step)
  const targetMax = Math.max(minMacroFloor, candidateMax)

  return {
    windowMin: safeBaseMin,
    windowMax: targetMax,
    macroMax: targetMax,
  }
}




