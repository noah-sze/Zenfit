import { describe, it, expect } from 'vitest';
import { calculateVisibleBadgeCount } from './badgeLayout';

describe('calculateVisibleBadgeCount', () => {
  const itemWidths = [50, 50, 50, 50, 60]; // 5 個項目
  const gap = 4;
  const moreBadgeWidth = 28;

  it('當可用空間充足時，應全部展開，不進行折疊', () => {
    // 總寬度：50 + 4 + 50 + 4 + 50 + 4 + 50 + 4 + 60 = 276
    const count = calculateVisibleBadgeCount({
      availableWidth: 300,
      itemWidths,
      gap,
      moreBadgeWidth,
    });
    expect(count).toBe(5);
  });

  it('當剛好等於總寬度時，應全部展開', () => {
    const count = calculateVisibleBadgeCount({
      availableWidth: 276,
      itemWidths,
      gap,
      moreBadgeWidth,
    });
    expect(count).toBe(5);
  });

  it('當可用空間不足以放下全部時，應精確折疊並為 "+N" 徽章預留空間', () => {
    // 若放 3 個 + 更多徽章：(50 + 4 + 50 + 4 + 50) + 4 + 28 = 158 + 32 = 190
    // 若放 4 個 + 更多徽章：158 + 4 + 50 + 32 = 244
    const count = calculateVisibleBadgeCount({
      availableWidth: 200,
      itemWidths,
      gap,
      moreBadgeWidth,
    });
    expect(count).toBe(3); // 可容納 3 個，剩下 2 個以 +2 顯示
  });

  it('當可用空間更小時，應進一步折疊為 2 個 +N', () => {
    // 放 2 個 + 更多徽章：(50 + 4 + 50) + 4 + 28 = 104 + 32 = 136
    const count = calculateVisibleBadgeCount({
      availableWidth: 150,
      itemWidths,
      gap,
      moreBadgeWidth,
    });
    expect(count).toBe(2);
  });

  it('當可用空間極端不足時，應遵守 minVisibleCount 保底至少顯示 1 個主要項目', () => {
    const count = calculateVisibleBadgeCount({
      availableWidth: 50,
      itemWidths,
      gap,
      moreBadgeWidth,
      minVisibleCount: 1,
    });
    expect(count).toBe(1);
  });

  it('當 itemWidths 為空時應回傳 0', () => {
    expect(
      calculateVisibleBadgeCount({
        availableWidth: 300,
        itemWidths: [],
      })
    ).toBe(0);
  });

  it('當可用寬度小於等於 0 時應回傳 0', () => {
    expect(
      calculateVisibleBadgeCount({
        availableWidth: 0,
        itemWidths,
      })
    ).toBe(0);
    expect(
      calculateVisibleBadgeCount({
        availableWidth: -10,
        itemWidths,
      })
    ).toBe(0);
  });
});
