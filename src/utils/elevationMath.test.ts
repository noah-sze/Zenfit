import { describe, it, expect } from "vitest"
import {
  clampAndStep,
  calculateFillPercentage,
  calculateValueFromBottomDist,
  isUnitDisabled,
  resolveActiveUnit,
  calculateElasticMax,
  settleElevationWindow,
  roundToNiceMax,
  shiftWindowToFitValue,
  getStepPrecision,
  alignToStep,
  getFocusRadiusFloor,
  calculateElevationTicks,
  getMacroMaxFloor,
  hasDecimalStep,
  calculateInitialElevationWindow,
} from "./elevationMath"

describe("elevationMath", () => {
  describe("clampAndStep", () => {
    it("should clamp values below min to min", () => {
      expect(clampAndStep(-10, 0, 100, 1)).toBe(0)
    })

    it("should clamp values above max to max", () => {
      expect(clampAndStep(150, 0, 100, 1)).toBe(100)
    })

    it("should align values to step", () => {
      expect(clampAndStep(53, 0, 100, 5)).toBe(55)
      expect(clampAndStep(51, 0, 100, 5)).toBe(50)
      expect(clampAndStep(52.4, 0, 100, 1)).toBe(52)
      expect(clampAndStep(52.6, 0, 100, 1)).toBe(53)
    })

    it("should handle min offset with step", () => {
      expect(clampAndStep(23, 10, 100, 5)).toBe(25)
      expect(clampAndStep(12, 10, 100, 5)).toBe(10)
    })

    it("should return min when val is NaN", () => {
      expect(clampAndStep(NaN, 0, 100, 1)).toBe(0)
    })
  })

  describe("calculateFillPercentage", () => {
    it("should return 0 when at min", () => {
      expect(calculateFillPercentage(0, 0, 200)).toBe(0)
    })

    it("should return 100 when at max", () => {
      expect(calculateFillPercentage(200, 0, 200)).toBe(100)
    })

    it("should return correct percentage in between", () => {
      expect(calculateFillPercentage(50, 0, 200)).toBe(25)
      expect(calculateFillPercentage(100, 0, 200)).toBe(50)
      expect(calculateFillPercentage(150, 0, 200)).toBe(75)
    })

    it("should clamp below 0 or above 100", () => {
      expect(calculateFillPercentage(-20, 0, 200)).toBe(0)
      expect(calculateFillPercentage(300, 0, 200)).toBe(100)
    })

    it("should handle range <= 0 gracefully", () => {
      expect(calculateFillPercentage(50, 100, 100)).toBe(0)
    })
  })

  describe("calculateValueFromBottomDist", () => {
    it("should calculate correct value based on bottom distance", () => {
      // 總高 200px, 距離底端 100px = 50%
      expect(calculateValueFromBottomDist(100, 200, 0, 200, 1)).toBe(100)
      // 總高 200px, 距離底端 50px = 25% => 50
      expect(calculateValueFromBottomDist(50, 200, 0, 200, 1)).toBe(50)
      // 總高 200px, 距離底端 200px = 100% => 200
      expect(calculateValueFromBottomDist(200, 200, 0, 200, 1)).toBe(200)
      // 總高 200px, 距離底端 0px = 0% => 0
      expect(calculateValueFromBottomDist(0, 200, 0, 200, 1)).toBe(0)
    })

    it("should clamp out-of-bound pointer drags", () => {
      // 手指拖到柱體上方 250px
      expect(calculateValueFromBottomDist(250, 200, 0, 200, 1)).toBe(200)
      // 手指拖到柱體下方 -50px
      expect(calculateValueFromBottomDist(-50, 200, 0, 200, 1)).toBe(0)
    })

    it("should align to step", () => {
      // 33px / 200px = 16.5% of 200 = 33g, step 5 => 35g
      expect(calculateValueFromBottomDist(33, 200, 0, 200, 5)).toBe(35)
    })

    it("should handle totalHeight <= 0", () => {
      expect(calculateValueFromBottomDist(50, 0, 0, 200, 1)).toBe(0)
    })
  })

  describe("isUnitDisabled", () => {
    it("should identify disabled units correctly", () => {
      expect(isUnitDisabled("ml", ["ml"])).toBe(true)
      expect(isUnitDisabled("g", ["ml"])).toBe(false)
      expect(isUnitDisabled("kg", [])).toBe(false)
    })
  })

  describe("resolveActiveUnit", () => {
    it("should keep currentUnit if not disabled", () => {
      expect(resolveActiveUnit(["g", "ml"], "ml", [])).toBe("ml")
    })

    it("should switch to fallback if currentUnit is disabled", () => {
      expect(resolveActiveUnit(["g", "ml"], "ml", ["ml"])).toBe("g")
    })

    it("should return first available if currentUnit not specified", () => {
      expect(resolveActiveUnit(["kg", "g"], undefined, ["kg"])).toBe("g")
    })
  })

  describe("calculateElasticMax", () => {
    it("should expand max to val * 3 when val >= 75% of max (user example: 175 with max 200 -> 525)", () => {
      // 175 >= 200 * 0.75 (150) -> 175 * 3 = 525
      expect(calculateElasticMax(175, 200, 200)).toBe(525)
      // 驗證 175 在 525 中恰好處於 1/3 (33.33%)
      expect(175 / 525).toBeCloseTo(1 / 3, 4)
    })

    it("should expand max at exact 75% threshold", () => {
      // 150 = 200 * 0.75 -> 150 * 3 = 450
      expect(calculateElasticMax(150, 200, 200)).toBe(450)
      expect(150 / 450).toBeCloseTo(1 / 3, 4)
    })

    it("should maintain currentMax when val is in the deadband (between 20% and 75%)", () => {
      // 在 initialMax (200) 時，149 < 150 不會擴容，也不會低於 200
      expect(calculateElasticMax(149, 200, 200)).toBe(200)
      expect(calculateElasticMax(100, 200, 200)).toBe(200)
      expect(calculateElasticMax(50, 200, 200)).toBe(200)
      expect(calculateElasticMax(0, 200, 200)).toBe(200)

      // 在已擴容狀態 525 時，死區為 20% (105) ~ 75% (393.75)
      // 175 處於死區內，上限維持 525
      expect(calculateElasticMax(175, 525, 200)).toBe(525)
      expect(calculateElasticMax(200, 525, 200)).toBe(525)
      expect(calculateElasticMax(300, 525, 200)).toBe(525)
      expect(calculateElasticMax(110, 525, 200)).toBe(525)
    })

    it("should shrink max when val <= 20% of max, but never below initialMax", () => {
      // 525 下限閾值: 525 * 0.20 = 105
      // 數值降到 100 (<= 105) -> 縮小至 100 * 2 = 200 (恰好等於 initialMax)
      expect(calculateElasticMax(100, 525, 200)).toBe(200)

      // 數值降到 50 (<= 105) -> 50 * 2 = 100，但有 initialMax (200) 保底下限
      expect(calculateElasticMax(50, 525, 200)).toBe(200)

      // 數值降到 0 -> 保底 initialMax 200
      expect(calculateElasticMax(0, 525, 200)).toBe(200)

      // 已處於 initialMax (200) 時，無論數值多小都不會再縮小
      expect(calculateElasticMax(20, 200, 200)).toBe(200)
      expect(calculateElasticMax(0, 200, 200)).toBe(200)
    })

    it("should support continuous multi-level expansion and shrink", () => {
      // 1. 擴容第 1 級：175 -> 525
      const max1 = calculateElasticMax(175, 200, 200)
      expect(max1).toBe(525)

      // 2. 擴容第 2 級：400 (>= 525 * 0.75 = 393.75) -> 400 * 3 = 1200
      const max2 = calculateElasticMax(400, max1, 200)
      expect(max2).toBe(1200)

      // 3. 縮容第 1 級：數值降至 200 (<= 1200 * 0.20 = 240) -> 縮小至 200 * 2 = 400
      const max3 = calculateElasticMax(200, max2, 200)
      expect(max3).toBe(400)
      expect(200 / 400).toBeCloseTo(0.5, 4) // 處於縮小後量程的 50%

      // 4. 縮容第 2 級：數值再降至 70 (<= 400 * 0.20 = 80) -> 70 * 2 = 140 -> 保底 200
      const max4 = calculateElasticMax(70, max3, 200)
      expect(max4).toBe(200)
    })

    it("should handle edge cases (negative, NaN, 0)", () => {
      expect(calculateElasticMax(-10, 200, 200)).toBe(200)
      expect(calculateElasticMax(NaN, 200, 200)).toBe(200)
      // currentMax 為 0 或 NaN 時回退到 safeInitialMax (200)
      // safeVal = 150 >= 200 * 0.75 (150) -> 150 * 3 = 450
      expect(calculateElasticMax(150, 0, 200)).toBe(450)
      expect(calculateElasticMax(150, NaN, 200)).toBe(450)
    })
  })

  describe("roundToNiceMax", () => {
    it("should round numbers into clean UI steps", () => {
      expect(roundToNiceMax(35)).toBe(40)
      expect(roundToNiceMax(48)).toBe(50)
      expect(roundToNiceMax(92)).toBe(100)
      expect(roundToNiceMax(184)).toBe(200)
      expect(roundToNiceMax(350)).toBe(350)
      expect(roundToNiceMax(420)).toBe(450)
      expect(roundToNiceMax(720)).toBe(800)
      expect(roundToNiceMax(0)).toBe(100)
    })
  })

  describe("settleElevationWindow", () => {
    describe("用戶範例與聚焦機制 (10% < val < 90%)", () => {
      it("應該完全匹配用戶範例：下限 0 上限 100 選擇 51 -> 聚焦後下限 36 上限 66，51 居中", () => {
        const result = settleElevationWindow(51, 0, 100, 100, 0, 100)
        expect(result.windowMin).toBe(36)
        expect(result.windowMax).toBe(66)
        expect(result.macroMax).toBe(100)
        // 驗證 51 恰好在正中間 (50%)
        expect((result.windowMin + result.windowMax) / 2).toBe(51)
        expect(result.windowMax - result.windowMin).toBe(30)
      })

      it("支援任意外部傳入的初始上限 (例如 initialMax = 200，選中 100 -> 聚焦 [70, 130])", () => {
        // 200 跨度，30% = 60，半徑 = 30
        const result = settleElevationWindow(100, 0, 200, 200, 0, 200)
        expect(result.windowMin).toBe(70)
        expect(result.windowMax).toBe(130)
        expect((result.windowMin + result.windowMax) / 2).toBe(100)
      })

      it("邊界平移防護 (靠近底端)：選中 12，下限平移對齊 0，上限為 30，下限不小於 0", () => {
        // 12 介於 10 與 90 之間，未觸發 10% 且未觸發 90%
        // idealMin = 12 - 15 = -3 < 0 -> 平移為 [0, 30]
        const result = settleElevationWindow(12, 0, 100, 100, 0, 100)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(30)
        expect(result.windowMax - result.windowMin).toBe(30)
      })

      it("邊界平移防護 (靠近頂端)：選中 88，上限平移對齊 100，下限為 70，上限不大於 100", () => {
        // 88 < 90，未觸發 90% 增加上限
        // idealMax = 88 + 15 = 103 > 100 -> 平移為 [70, 100]
        const result = settleElevationWindow(88, 0, 100, 100, 0, 100)
        expect(result.windowMin).toBe(70)
        expect(result.windowMax).toBe(100)
        expect(result.windowMax - result.windowMin).toBe(30)
      })

      it("支援多次聚焦機制：在聚焦視窗內再次操作會進一步收斂半徑，個位數最終下限為上下 +- 5", () => {
        // 第 1 級聚焦：0~100 選中 51 -> [36, 66] (跨度 30, 半徑 15)
        const stage1 = settleElevationWindow(51, 0, 100, 100, 0, 100, 1)
        expect(stage1.windowMin).toBe(36)
        expect(stage1.windowMax).toBe(66)

        // 第 2 級聚焦：在 [36, 66] 再次選中 51 -> 半徑從 15 減半收斂為 8 -> [43, 59]
        const stage2 = settleElevationWindow(51, stage1.windowMin, stage1.windowMax, 100, 0, 100, 1)
        expect(stage2.windowMin).toBe(43)
        expect(stage2.windowMax).toBe(59)
        expect((stage2.windowMin + stage2.windowMax) / 2).toBe(51)

        // 第 3 級聚焦：在 [43, 59] 再次選中 51 -> 半徑從 8 收斂觸發個位數下限 +- 5 -> [46, 56]
        const stage3 = settleElevationWindow(51, stage2.windowMin, stage2.windowMax, 100, 0, 100, 1)
        expect(stage3.windowMin).toBe(46)
        expect(stage3.windowMax).toBe(56)
        expect(stage3.windowMax - stage3.windowMin).toBe(10) // 跨度 10 (上下 +- 5)

        // 第 4 級聚焦：達到下限 +- 5 後持續保持最小下限跨度，隨新選中值 (如 52) 居中平移
        const stage4 = settleElevationWindow(52, stage3.windowMin, stage3.windowMax, 100, 0, 100, 1)
        expect(stage4.windowMin).toBe(47)
        expect(stage4.windowMax).toBe(57)
        expect((stage4.windowMin + stage4.windowMax) / 2).toBe(52)
      })

      it("小數點精度與合法數字保障：step=0.1 時上下限永遠為合法一位小數，聚焦下限為上下 +- 0.5", () => {
        // 用戶提出案例：合法單位是 11.1，嚴格杜絕如 1.0222313 的不合法數字
        // 初次聚焦：0~50 選中 11.1
        const stage1 = settleElevationWindow(11.1, 0, 50, 50, 0, 50, 0.1)
        expect(stage1.windowMin).toBe(3.6)
        expect(stage1.windowMax).toBe(18.6)
        expect(alignToStep((stage1.windowMin + stage1.windowMax) / 2, 0.1)).toBe(11.1)

        // 連續聚焦收斂至達到小數點下限 +- 0.5 (即半徑 0.5, 跨度 1.0)
        let current = stage1
        for (let i = 0; i < 5; i++) {
          current = settleElevationWindow(11.1, current.windowMin, current.windowMax, 50, 0, 50, 0.1)
        }

        // 驗證最終觸發小數點下限 +- 0.5 -> [10.6, 11.6]
        expect(current.windowMin).toBe(10.6)
        expect(current.windowMax).toBe(11.6)
        expect(alignToStep(current.windowMax - current.windowMin, 0.1)).toBe(1.0)
        expect(alignToStep((current.windowMin + current.windowMax) / 2, 0.1)).toBe(11.1)

        // 驗證所有數值絕無多餘無窮小數 (例如 1.0222313)
        expect(Number.isInteger(current.windowMin * 10)).toBe(true)
        expect(Number.isInteger(current.windowMax * 10)).toBe(true)
      })
    })

    describe("增加上限機制 (選擇數字達到總上限 90% 以上)", () => {
      it("宏觀視野下達到 90% 以上 (如 92 >= 90)：下限回歸 0，上限擴充至 200", () => {
        const result = settleElevationWindow(92, 0, 100, 100, 0, 100)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(200)
        expect(result.macroMax).toBe(200)
      })

      it("精確在 90% 門檻時觸發增加上限", () => {
        const result = settleElevationWindow(90, 0, 100, 100, 0, 100)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(180)
        expect(result.macroMax).toBe(180)
      })

      it("在聚焦視窗內達到頂端 90% (如在 [36, 66] 選中 64)：解開聚焦回到宏觀視野", () => {
        // 64 >= 36 + 30 * 0.9 = 63
        const result = settleElevationWindow(64, 36, 66, 100, 0, 100)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(100)
        expect(result.macroMax).toBe(100)
      })
    })

    describe("降低上限機制 (選擇數字是總上限 10% 以下，最低下限規範：無小數 10 / 有小數 1)", () => {
      it("getMacroMaxFloor: 無小數最低是 10，有小數最低是 1", () => {
        expect(getMacroMaxFloor(1)).toBe(10)
        expect(getMacroMaxFloor(5)).toBe(10)
        expect(getMacroMaxFloor(0.1)).toBe(1)
        expect(getMacroMaxFloor(0.5)).toBe(1)
        expect(hasDecimalStep(1)).toBe(false)
        expect(hasDecimalStep(0.1)).toBe(true)
      })

      it("roundToNiceMax: 支援小數與整數階梯，小數保底1，整數保底10", () => {
        // 無小數
        expect(roundToNiceMax(3, 1)).toBe(10)
        expect(roundToNiceMax(10, 1)).toBe(10)
        expect(roundToNiceMax(15, 1)).toBe(20)
        expect(roundToNiceMax(35, 1)).toBe(40)

        // 有小數
        expect(roundToNiceMax(0.5, 0.1)).toBe(1)
        expect(roundToNiceMax(1.0, 0.1)).toBe(1)
        expect(roundToNiceMax(1.5, 0.1)).toBe(2)
        expect(roundToNiceMax(3.0, 0.1)).toBe(5)
      })

      it("無小數情境：初始 100，數值降至 10% 以下 (如選 3 <= 10)，縮減上限至最低下限 10", () => {
        const result = settleElevationWindow(3, 0, 100, 100, 0, 100, 1)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(10) // 3 * 2.5 = 7.5 -> roundToNiceMax(7.5, 1) = 10
        expect(result.macroMax).toBe(10)
      })

      it("無小數情境：當用戶選擇 0 也會觸發降低下限機制，上限縮減為最低下限 10", () => {
        const result = settleElevationWindow(0, 0, 100, 100, 0, 100, 1)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(10)
        expect(result.macroMax).toBe(10)
      })

      it("無小數情境：當已經達到最低下限 10，數值即使更小 (如選 1 <= 1 或 0)，維持最低下限 10，不再降低", () => {
        const result = settleElevationWindow(1, 0, 10, 10, 0, 100, 1)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(10)
        expect(result.macroMax).toBe(10)

        const result0 = settleElevationWindow(0, 0, 10, 10, 0, 100, 1)
        expect(result0.windowMin).toBe(0)
        expect(result0.windowMax).toBe(10)
        expect(result0.macroMax).toBe(10)
      })

      it("有小數情境：step=0.1，當用戶選擇 0 也會觸發降低下限機制，上限縮減為最低下限 1", () => {
        const result = settleElevationWindow(0, 0, 50, 50, 0, 50, 0.1)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(1)
        expect(result.macroMax).toBe(1)
      })

      it("有小數情境：step=0.1，初始 50，數值降至 10% 以下 (如選 0.2 <= 5)，縮減上限至最低下限 1", () => {
        const result = settleElevationWindow(0.2, 0, 50, 50, 0, 50, 0.1)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(1) // 0.2 * 2.5 = 0.5 -> roundToNiceMax(0.5, 0.1) = 1
        expect(result.macroMax).toBe(1)
      })

      it("有小數情境：step=0.1，當已經達到最低下限 1，數值即使更小 (如選 0.05 <= 0.1)，維持最低下限 1，不再降低", () => {
        const result = settleElevationWindow(0.05, 0, 1, 1, 0, 50, 0.1)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(1)
        expect(result.macroMax).toBe(1)
      })

      it("在聚焦視窗內達到低端 10% (如在 [36, 66] 選中 38)：解開聚焦回到宏觀視野", () => {
        // 38 <= 36 + 30 * 0.1 = 39
        const result = settleElevationWindow(38, 36, 66, 100, 0, 100, 1)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(100)
        expect(result.macroMax).toBe(100)
      })
    })

    describe("異常與邊界保護", () => {
      it("處理 NaN 或負數輸入", () => {
        const result = settleElevationWindow(NaN, 0, 100, 100, 0, 100)
        expect(result.windowMin).toBe(0)
        expect(result.windowMax).toBe(100)

        const resultNeg = settleElevationWindow(-10, 0, 100, 100, 0, 100)
        expect(resultNeg.windowMin).toBe(0)
      })
    })
  })

  describe("shiftWindowToFitValue", () => {
    it("當數值在視窗內時不改變視窗", () => {
      expect(shiftWindowToFitValue(50, 36, 66, 100, 0, 1)).toEqual({
        windowMin: 36,
        windowMax: 66,
      })
    })

    it("當數值大於 windowMax 時推移視窗包含新數值", () => {
      // 點擊 +1 到了 67，跨度為 30，新視窗為 [37, 67]
      expect(shiftWindowToFitValue(67, 36, 66, 100, 0, 1)).toEqual({
        windowMin: 37,
        windowMax: 67,
      })
    })

    it("當數值小於 windowMin 時推移視窗包含新數值", () => {
      // 點擊 -1 到了 35，跨度為 30，新視窗為 [35, 65]
      expect(shiftWindowToFitValue(35, 36, 66, 100, 0, 1)).toEqual({
        windowMin: 35,
        windowMax: 65,
      })
    })
  })

  describe("calculateElevationTicks", () => {
    it("整數 step 刻度完全合法", () => {
      const ticks = calculateElevationTicks(36, 66, 1)
      expect(ticks).toEqual({
        bottom: 36,
        q1: 44,
        mid: 51,
        q3: 59,
        top: 66,
      })
    })

    it("小數 step=0.1 刻度完全合法且杜絕奇異小數殘留", () => {
      const ticks = calculateElevationTicks(10.6, 11.6, 0.1)
      expect(ticks).toEqual({
        bottom: 10.6,
        q1: 10.9,
        mid: 11.1,
        q3: 11.4,
        top: 11.6,
      })
    })
  })

  describe("alignToStep & getFocusRadiusFloor", () => {
    it("正確返回小數精度位數", () => {
      expect(getStepPrecision(1)).toBe(0)
      expect(getStepPrecision(0.1)).toBe(1)
      expect(getStepPrecision(0.01)).toBe(2)
    })

    it("嚴格校準小數精度", () => {
      expect(alignToStep(1.0222313, 0.1)).toBe(1)
      expect(alignToStep(11.100000000004, 0.1)).toBe(11.1)
      expect(alignToStep(1.0222313, 1)).toBe(1)
    })

    it("正確返回聚焦半徑下限", () => {
      expect(getFocusRadiusFloor(1)).toBe(5)
      expect(getFocusRadiusFloor(2)).toBe(5)
      expect(getFocusRadiusFloor(0.1)).toBe(0.5)
      expect(getFocusRadiusFloor(0.2)).toBe(0.5)
    })
  })

  describe("calculateInitialElevationWindow (再次打開重置視窗且數值置中)", () => {
    it("用戶範例：之前已經選擇 10 並保存，再次打開重置狀態，上限為 20 (10 x 2)，升降條位置恰好居中 (50%)", () => {
      const result = calculateInitialElevationWindow(10, 0, 100, 1)
      expect(result).toEqual({
        windowMin: 0,
        windowMax: 20,
        macroMax: 20,
      })
      // 驗證 10 在 [0, 20] 中恰好為 50%
      expect(calculateFillPercentage(10, result.windowMin, result.windowMax)).toBe(50)
    })

    it("最高優先級約束：沒小數點用戶選擇 1，上限保底為 10 (絕不變為 2)", () => {
      const result = calculateInitialElevationWindow(1, 0, 100, 1)
      expect(result).toEqual({
        windowMin: 0,
        windowMax: 10,
        macroMax: 10,
      })
      expect(result.windowMax).toBe(10) // 1 * 2 = 2，但無小數最低上限 10 為最高優先級
    })

    it("最高優先級約束：有小數點 (step=0.1) 用戶選擇 0.2，上限保底為 1 (絕不變為 0.4)", () => {
      const result = calculateInitialElevationWindow(0.2, 0, 50, 0.1)
      expect(result).toEqual({
        windowMin: 0,
        windowMax: 1,
        macroMax: 1,
      })
      expect(result.windowMax).toBe(1) // 0.2 * 2 = 0.4，但有小數最低上限 1 為最高優先級
    })

    it("整數數值居中：之前選擇了 50，再次打開上限為 100 (50 x 2)，液柱居中 50%", () => {
      const result = calculateInitialElevationWindow(50, 0, 200, 1)
      expect(result).toEqual({
        windowMin: 0,
        windowMax: 100,
        macroMax: 100,
      })
      expect(calculateFillPercentage(50, result.windowMin, result.windowMax)).toBe(50)
    })

    it("小數數值居中：step=0.1，之前選擇了 2.5，再次打開上限為 5.0 (2.5 x 2)，液柱居中 50%", () => {
      const result = calculateInitialElevationWindow(2.5, 0, 50, 0.1)
      expect(result).toEqual({
        windowMin: 0,
        windowMax: 5.0,
        macroMax: 5.0,
      })
      expect(calculateFillPercentage(2.5, result.windowMin, result.windowMax)).toBe(50)
    })

    it("未設置或數值為 0 (<= baseMin)：使用 defaultMax (如 100)，數值位於底端 0%", () => {
      const result0 = calculateInitialElevationWindow(0, 0, 100, 1)
      expect(result0).toEqual({
        windowMin: 0,
        windowMax: 100,
        macroMax: 100,
      })
      expect(calculateFillPercentage(0, result0.windowMin, result0.windowMax)).toBe(0)

      const resultUndef = calculateInitialElevationWindow(undefined, 0, 100, 1)
      expect(resultUndef.macroMax).toBe(100)
    })

    it("異常邊界輸入保護 (NaN / 負數輸入)", () => {
      const resultNaN = calculateInitialElevationWindow(NaN, 0, 100, 1)
      expect(resultNaN.windowMin).toBe(0)
      expect(resultNaN.windowMax).toBe(100)

      const resultNeg = calculateInitialElevationWindow(-5, 0, 100, 1)
      expect(resultNeg.windowMin).toBe(0)
      expect(resultNeg.windowMax).toBe(100)
    })
  })
})
