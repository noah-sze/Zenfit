import { describe, it, expect } from 'vitest';
import {
  getEntityActivityTimestamp,
  compareByRecentActivityThenName,
  type ActivitySortableItem,
} from './activitySorting';

describe('activitySorting', () => {
  describe('getEntityActivityTimestamp', () => {
    it('未修改且未使用的出廠預設項目應回傳 0（不受種子時間干擾）', () => {
      const preset: ActivitySortableItem = {
        id: 'preset-1',
        name: '大白菜',
        isCustom: false,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };
      expect(getEntityActivityTimestamp(preset)).toBe(0);
    });

    it('已修改的出廠預設項目應回傳 updatedAt', () => {
      const editedPreset: ActivitySortableItem = {
        id: 'preset-2',
        name: '雞胸肉',
        isCustom: false,
        createdAt: 1000,
        updatedAt: 2500,
      };
      expect(getEntityActivityTimestamp(editedPreset)).toBe(2500);
    });

    it('自訂新增項目應取 createdAt 與 updatedAt 較大值', () => {
      const customNew: ActivitySortableItem = {
        id: 'custom-1',
        name: '麻辣花生',
        isCustom: true,
        createdAt: 3000,
        updatedAt: 3000,
      };
      const customEdited: ActivitySortableItem = {
        id: 'custom-2',
        name: '蛋白棒',
        isCustom: true,
        createdAt: 3000,
        updatedAt: 4500,
      };
      expect(getEntityActivityTimestamp(customNew)).toBe(3000);
      expect(getEntityActivityTimestamp(customEdited)).toBe(4500);
    });

    it('最近使用時間若較新，應覆蓋建立與修改時間', () => {
      const item: ActivitySortableItem = {
        id: 'food-1',
        name: '白米',
        isCustom: false,
        createdAt: 1000,
        updatedAt: 2000,
      };
      expect(getEntityActivityTimestamp(item, 5000)).toBe(5000);
      expect(getEntityActivityTimestamp(item, 1500)).toBe(2000);
    });

    it('應安全防護 NaN、負數、Infinity 與缺省值', () => {
      const broken: ActivitySortableItem = {
        id: 'broken',
        name: '異常',
        isCustom: true,
        createdAt: Number.NaN,
        updatedAt: -100,
      };
      expect(getEntityActivityTimestamp(broken, Number.POSITIVE_INFINITY)).toBe(0);
      expect(getEntityActivityTimestamp(broken, -50)).toBe(0);
    });
  });

  describe('compareByRecentActivityThenName', () => {
    it('應將最近使用 / 添加 / 修改的項目嚴格依最新時間排在最上方，其餘依名稱升序', () => {
      const items: ActivitySortableItem[] = [
        { id: 'preset-b', name: 'B 預設', isCustom: false, createdAt: 99999, updatedAt: 99999 },
        { id: 'preset-a', name: 'A 預設', isCustom: false, createdAt: 99999, updatedAt: 99999 },
        { id: 'used-old', name: 'C 最近使用', isCustom: false, createdAt: 1000, updatedAt: 1000 },
        { id: 'custom-add', name: 'D 新添加', isCustom: true, createdAt: 3000, updatedAt: 3000 },
        { id: 'preset-edit', name: 'E 剛修改預設', isCustom: false, createdAt: 1000, updatedAt: 4000 },
        { id: 'used-newest', name: 'F 剛使用', isCustom: false, createdAt: 1000, updatedAt: 1000 },
      ];

      const lastUsedMap = new Map<string, number>([
        ['used-old', 2000],
        ['used-newest', 5000],
      ]);

      const sorted = [...items].sort((a, b) =>
        compareByRecentActivityThenName(a, b, lastUsedMap)
      );

      expect(sorted.map((i) => i.id)).toEqual([
        'used-newest', // 5000 (剛使用)
        'preset-edit', // 4000 (剛修改預設)
        'custom-add',  // 3000 (新添加)
        'used-old',    // 2000 (較早使用)
        'preset-a',    // 0 -> 名稱 A 預設
        'preset-b',    // 0 -> 名稱 B 預設
      ]);
    });

    it('支援自訂名稱解析函式 (getName)', () => {
      const items: ActivitySortableItem[] = [
        { id: 'eq-1', name: 'raw-z', isCustom: false, createdAt: 0, updatedAt: 0 },
        { id: 'eq-2', name: 'raw-a', isCustom: false, createdAt: 0, updatedAt: 0 },
      ];
      const labels: Record<string, string> = { 'eq-1': 'Alpha', 'eq-2': 'Beta' };

      const sorted = [...items].sort((a, b) =>
        compareByRecentActivityThenName(a, b, undefined, (item) => labels[item.id] ?? item.name)
      );

      expect(sorted.map((i) => i.id)).toEqual(['eq-1', 'eq-2']);
    });
  });
});
