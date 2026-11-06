import { describe, it, expect } from 'vitest';
import { getHierarchicalFallbackPath, isStackNavigation } from './navigation';

describe('getHierarchicalFallbackPath', () => {
  describe('一級頂層設定頁面 -> 回退至首頁', () => {
    it('在 /settings 應回退至首頁 /', () => {
      expect(getHierarchicalFallbackPath('/settings')).toBe('/');
    });

    it('在 /profile 應回退至首頁 /', () => {
      expect(getHierarchicalFallbackPath('/profile')).toBe('/');
    });
  });

  describe('二級管理清單 -> 回退至設定首頁', () => {
    it('在 /settings/foods 應回退至 /settings', () => {
      expect(getHierarchicalFallbackPath('/settings/foods')).toBe('/settings');
    });

    it('在 /settings/exercises 應回退至 /settings', () => {
      expect(getHierarchicalFallbackPath('/settings/exercises')).toBe('/settings');
    });

    it('在 /settings/recipes 應回退至 /settings', () => {
      expect(getHierarchicalFallbackPath('/settings/recipes')).toBe('/settings');
    });

    it('在 /settings/routines 應回退至 /settings', () => {
      expect(getHierarchicalFallbackPath('/settings/routines')).toBe('/settings');
    });
  });

  describe('三級詳情頁 -> 回退至對應二級清單', () => {
    it('在 /settings/foods/:id 應回退至 /settings/foods', () => {
      expect(getHierarchicalFallbackPath('/settings/foods/a0bf9893-0f2d-45d7-83db-dd029d3f4b18')).toBe(
        '/settings/foods'
      );
    });

    it('在 /settings/recipes/:id 應回退至 /settings/foods', () => {
      expect(getHierarchicalFallbackPath('/settings/recipes/35ed8eca-91d5-49f0-9557-f374301d56a6')).toBe(
        '/settings/foods'
      );
    });

    it('在 /settings/exercises/:id 應回退至 /settings/exercises', () => {
      expect(getHierarchicalFallbackPath('/settings/exercises/bench-press-123')).toBe(
        '/settings/exercises'
      );
    });

    it('在 /settings/routines/:id 應回退至 /settings/exercises', () => {
      expect(getHierarchicalFallbackPath('/settings/routines/routine-abc')).toBe(
        '/settings/exercises'
      );
    });
  });

  describe('其他子路徑與異常兜底', () => {
    it('在未明確列出的 /settings/* 應回退至 /settings', () => {
      expect(getHierarchicalFallbackPath('/settings/some-other-config')).toBe('/settings');
    });

    it('在未知路由應兜底回首頁 /', () => {
      expect(getHierarchicalFallbackPath('/some-unknown-path')).toBe('/');
      expect(getHierarchicalFallbackPath('/')).toBe('/');
    });
  });

  describe('isStackNavigation - 視圖堆疊導航分類器', () => {
    it('相同路徑應視為棧內導航 (true)', () => {
      expect(isStackNavigation('/settings/foods', '/settings/foods')).toBe(true);
    });

    describe('食物模組視圖棧 (foods / recipes)', () => {
      it('從列表深入食材詳情應為棧內導航 (true)', () => {
        expect(isStackNavigation('/settings/foods', '/settings/foods/123')).toBe(true);
      });

      it('從食材詳情返回列表應為棧內導航 (true)', () => {
        expect(isStackNavigation('/settings/foods/123', '/settings/foods')).toBe(true);
      });

      it('從列表深入菜餚詳情應為棧內導航 (true)', () => {
        expect(isStackNavigation('/settings/foods', '/settings/recipes/456')).toBe(true);
      });

      it('從菜餚詳情返回列表應為棧內導航 (true)', () => {
        expect(isStackNavigation('/settings/recipes/456', '/settings/foods')).toBe(true);
      });

      it('從 /settings 進入 /settings/foods 不是棧內導航 (false)', () => {
        expect(isStackNavigation('/settings', '/settings/foods')).toBe(false);
      });

      it('從 /settings/foods 退出至 /settings 不是棧內導航 (false)', () => {
        expect(isStackNavigation('/settings/foods', '/settings')).toBe(false);
      });
    });

    describe('動作模組視圖棧 (exercises / routines)', () => {
      it('從列表深入動作詳情應為棧內導航 (true)', () => {
        expect(isStackNavigation('/settings/exercises', '/settings/exercises/abc')).toBe(true);
      });

      it('從動作詳情返回列表應為棧內導航 (true)', () => {
        expect(isStackNavigation('/settings/exercises/abc', '/settings/exercises')).toBe(true);
      });

      it('從列表深入課表詳情應為棧內導航 (true)', () => {
        expect(isStackNavigation('/settings/exercises', '/settings/routines/def')).toBe(true);
      });

      it('從課表詳情返回列表應為棧內導航 (true)', () => {
        expect(isStackNavigation('/settings/routines/def', '/settings/exercises')).toBe(true);
      });

      it('從 /settings 進入 /settings/exercises 不是棧內導航 (false)', () => {
        expect(isStackNavigation('/settings', '/settings/exercises')).toBe(false);
      });

      it('從 /settings/exercises 退出至 /settings 不是棧內導航 (false)', () => {
        expect(isStackNavigation('/settings/exercises', '/settings')).toBe(false);
      });
    });

    describe('跨頁籤與無關路徑', () => {
      it('主頁籤之間切換不是棧內導航 (false)', () => {
        expect(isStackNavigation('/diet', '/workout')).toBe(false);
        expect(isStackNavigation('/', '/diet')).toBe(false);
      });

      it('從食物模組切換到動作模組不是棧內導航 (false)', () => {
        expect(isStackNavigation('/settings/foods', '/settings/exercises')).toBe(false);
      });
    });
  });
});
