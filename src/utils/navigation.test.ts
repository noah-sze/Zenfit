import { describe, it, expect } from 'vitest';
import { getHierarchicalFallbackPath, isStackNavigation } from './navigation';

describe('getHierarchicalFallbackPath', () => {
  describe('一級頂層設定頁面 -> 回退至 App 首頁 /app', () => {
    it('在 /app/settings 應回退至首頁 /app', () => {
      expect(getHierarchicalFallbackPath('/app/settings')).toBe('/app');
    });

    it('在 /app/profile 應回退至首頁 /app', () => {
      expect(getHierarchicalFallbackPath('/app/profile')).toBe('/app');
    });

    it('兼容舊路徑：在 /settings 應回退至首頁 /app', () => {
      expect(getHierarchicalFallbackPath('/settings')).toBe('/app');
    });

    it('兼容舊路徑：在 /profile 應回退至首頁 /app', () => {
      expect(getHierarchicalFallbackPath('/profile')).toBe('/app');
    });
  });

  describe('二級管理清單 -> 回退至設定首頁', () => {
    it('在 /app/settings/foods 應回退至 /app/settings', () => {
      expect(getHierarchicalFallbackPath('/app/settings/foods')).toBe('/app/settings');
    });

    it('在 /app/settings/exercises 應回退至 /app/settings', () => {
      expect(getHierarchicalFallbackPath('/app/settings/exercises')).toBe('/app/settings');
    });

    it('在 /app/settings/recipes 應回退至 /app/settings', () => {
      expect(getHierarchicalFallbackPath('/app/settings/recipes')).toBe('/app/settings');
    });

    it('在 /app/settings/routines 應回退至 /app/settings', () => {
      expect(getHierarchicalFallbackPath('/app/settings/routines')).toBe('/app/settings');
    });

    it('兼容舊路徑：在 /settings/foods 應回退至 /app/settings', () => {
      expect(getHierarchicalFallbackPath('/settings/foods')).toBe('/app/settings');
    });
  });

  describe('三級詳情頁 -> 回退至對應二級清單', () => {
    it('在 /app/settings/foods/:id 應回退至 /app/settings/foods', () => {
      expect(getHierarchicalFallbackPath('/app/settings/foods/a0bf9893-0f2d-45d7-83db-dd029d3f4b18')).toBe(
        '/app/settings/foods'
      );
    });

    it('在 /app/settings/recipes/:id 應回退至 /app/settings/foods', () => {
      expect(getHierarchicalFallbackPath('/app/settings/recipes/35ed8eca-91d5-49f0-9557-f374301d56a6')).toBe(
        '/app/settings/foods'
      );
    });

    it('在 /app/settings/exercises/:id 應回退至 /app/settings/exercises', () => {
      expect(getHierarchicalFallbackPath('/app/settings/exercises/bench-press-123')).toBe(
        '/app/settings/exercises'
      );
    });

    it('在 /app/settings/routines/:id 應回退至 /app/settings/exercises', () => {
      expect(getHierarchicalFallbackPath('/app/settings/routines/routine-abc')).toBe(
        '/app/settings/exercises'
      );
    });
  });

  describe('其他子路徑與異常兜底', () => {
    it('在未明確列出的 /app/settings/* 應回退至 /app/settings', () => {
      expect(getHierarchicalFallbackPath('/app/settings/some-other-config')).toBe('/app/settings');
    });

    it('在未知路由應兜底回首頁 /app', () => {
      expect(getHierarchicalFallbackPath('/some-unknown-path')).toBe('/app');
      expect(getHierarchicalFallbackPath('/')).toBe('/app');
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
        expect(isStackNavigation('/app/diet', '/app/workout')).toBe(false);
        expect(isStackNavigation('/app', '/app/diet')).toBe(false);
      });

      it('從食物模組切換到動作模組不是棧內導航 (false)', () => {
        expect(isStackNavigation('/settings/foods', '/settings/exercises')).toBe(false);
        expect(isStackNavigation('/app/settings/foods', '/app/settings/exercises')).toBe(false);
      });
    });
  });
});
