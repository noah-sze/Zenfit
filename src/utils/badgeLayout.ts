/**
 * 自適應徽章排列與折疊計算純函數
 * 依據可用寬度計算出可完整容納的徽章數量（若超出則保留 "+N" 徽章空間）
 */

export interface BadgeFitOptions {
  /** 容器可用寬度 (px) */
  availableWidth: number;
  /** 各個徽章的實際寬度 (px) */
  itemWidths: number[];
  /** 徽章之間的間距 (px)，預設為 4 (gap-1) */
  gap?: number;
  /** "+N" 折疊計數徽章的預留寬度 (px)，預設為 28 */
  moreBadgeWidth?: number;
  /** 最少保留顯示的可見徽章數量，預設為 1 */
  minVisibleCount?: number;
}

export function calculateVisibleBadgeCount({
  availableWidth,
  itemWidths,
  gap = 4,
  moreBadgeWidth = 28,
  minVisibleCount = 1,
}: BadgeFitOptions): number {
  if (itemWidths.length === 0 || availableWidth <= 0) {
    return 0;
  }

  // 1. 檢查是否能完整放下全部項目
  let totalAll = 0;
  for (let i = 0; i < itemWidths.length; i++) {
    totalAll += itemWidths[i] + (i > 0 ? gap : 0);
  }

  if (totalAll <= availableWidth) {
    return itemWidths.length;
  }

  // 2. 空間不足以放下全部，計算加上 "+N" 徽章時最多可放幾個
  let accumulated = 0;
  let fitCount = 0;

  for (let i = 0; i < itemWidths.length; i++) {
    const nextAccumulated = accumulated + (i > 0 ? gap : 0) + itemWidths[i];
    const withMore = nextAccumulated + gap + moreBadgeWidth;

    if (withMore <= availableWidth) {
      accumulated = nextAccumulated;
      fitCount = i + 1;
    } else {
      break;
    }
  }

  return Math.min(itemWidths.length, Math.max(minVisibleCount, fitCount));
}
