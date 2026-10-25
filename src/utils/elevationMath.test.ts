import { describe, it, expect } from "vitest"
import {
  clampAndStep,
  calculateFillPercentage,
  calculateValueFromBottomDist,
  isUnitDisabled,
  resolveActiveUnit,
  calculateElasticMax,
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
})
