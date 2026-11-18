import { describe, it, expect } from 'vitest';
import {
  APP_ROUTES,
  parseAppSubRoute,
  getHierarchicalFallbackPath,
  isStackNavigation,
  resolveInitialLogicalPath,
  toSingleBrowserUrl,
} from './navigation';

describe('navigation (標準 React Router 路由單一真理源)', () => {
  describe('parseAppSubRoute', () => {
    it('在主頁 /app 與未知路徑應回傳 null', () => {
      expect(parseAppSubRoute('/app')).toBeNull();
      expect(parseAppSubRoute('/app/')).toBeNull();
      expect(parseAppSubRoute('/app/unknown')).toBeNull();
      expect(parseAppSubRoute('/')).toBeNull();
    });

    it('應精準解析設定、個人資料、管理清單與四類詳情頁路徑', () => {
      expect(parseAppSubRoute(APP_ROUTES.settings)).toEqual({ module: 'settings' });
      expect(parseAppSubRoute(APP_ROUTES.profile)).toEqual({ module: 'profile' });
      expect(parseAppSubRoute(APP_ROUTES.foods)).toEqual({ module: 'foods' });
      expect(parseAppSubRoute(APP_ROUTES.foodDetail('food-1'))).toEqual({
        module: 'foods',
        detailKind: 'food',
        id: 'food-1',
      });
      expect(parseAppSubRoute(APP_ROUTES.recipeDetail('recipe-1'))).toEqual({
        module: 'foods',
        detailKind: 'recipe',
        id: 'recipe-1',
      });
      expect(parseAppSubRoute(APP_ROUTES.exercises)).toEqual({ module: 'exercises' });
      expect(parseAppSubRoute(APP_ROUTES.exerciseDetail('ex-1'))).toEqual({
        module: 'exercises',
        detailKind: 'exercise',
        id: 'ex-1',
      });
      expect(parseAppSubRoute(APP_ROUTES.routineDetail('rt-1'))).toEqual({
        module: 'exercises',
        detailKind: 'routine',
        id: 'rt-1',
      });
    });

    it('應正確處理 URL 編碼的實體 ID', () => {
      expect(parseAppSubRoute(APP_ROUTES.foodDetail('a b/c'))).toEqual({
        module: 'foods',
        detailKind: 'food',
        id: 'a b/c',
      });
    });
  });

  describe('getHierarchicalFallbackPath', () => {
    it('詳情頁無歷史時應回退至對應管理清單', () => {
      expect(getHierarchicalFallbackPath('/app/foods/123')).toBe('/app/foods');
      expect(getHierarchicalFallbackPath('/app/recipes/456')).toBe('/app/foods');
      expect(getHierarchicalFallbackPath('/app/exercises/abc')).toBe('/app/exercises');
      expect(getHierarchicalFallbackPath('/app/routines/xyz')).toBe('/app/exercises');
    });

    it('管理清單與個人資料無歷史時應回退至設定頁', () => {
      expect(getHierarchicalFallbackPath('/app/foods')).toBe('/app/settings');
      expect(getHierarchicalFallbackPath('/app/exercises')).toBe('/app/settings');
      expect(getHierarchicalFallbackPath('/app/profile')).toBe('/app/settings');
    });

    it('設定首頁與未知路徑應回退至主應用首頁 /app', () => {
      expect(getHierarchicalFallbackPath('/app/settings')).toBe('/app');
      expect(getHierarchicalFallbackPath('/unknown')).toBe('/app');
      expect(getHierarchicalFallbackPath('/')).toBe('/app');
    });

    it('兼容舊版 /settings/* 路徑推導', () => {
      expect(getHierarchicalFallbackPath('/settings/foods/123')).toBe('/app/foods');
      expect(getHierarchicalFallbackPath('/settings/recipes/456')).toBe('/app/foods');
      expect(getHierarchicalFallbackPath('/settings/exercises/abc')).toBe('/app/exercises');
      expect(getHierarchicalFallbackPath('/settings/foods')).toBe('/app/settings');
    });
  });

  describe('isStackNavigation', () => {
    it('同模組內列表與詳情互跳應為棧內導航 (true)', () => {
      expect(isStackNavigation('/app/foods', '/app/foods/123')).toBe(true);
      expect(isStackNavigation('/app/foods/123', '/app/recipes/456')).toBe(true);
      expect(isStackNavigation('/app/recipes/456', '/app/foods')).toBe(true);
      expect(isStackNavigation('/app/exercises', '/app/exercises/abc')).toBe(true);
      expect(isStackNavigation('/app/exercises/abc', '/app/routines/xyz')).toBe(true);
    });

    it('跨模組導航應為 false', () => {
      expect(isStackNavigation('/app/settings', '/app/foods')).toBe(false);
      expect(isStackNavigation('/app/foods', '/app/settings')).toBe(false);
      expect(isStackNavigation('/app/foods/123', '/app/exercises/abc')).toBe(false);
      expect(isStackNavigation('/app', '/app/settings')).toBe(false);
    });
  });

  describe('resolveInitialLogicalPath & toSingleBrowserUrl (單一 URL /app 映射)', () => {
    it('應正確映射落地頁與 App 內部路徑', () => {
      expect(resolveInitialLogicalPath('/')).toBe('/');
      expect(resolveInitialLogicalPath('/landing')).toBe('/');
      expect(resolveInitialLogicalPath('/app')).toBe('/app');
      expect(resolveInitialLogicalPath('/app/foods/123')).toBe('/app/foods/123');
      expect(resolveInitialLogicalPath('/settings')).toBe('/app/settings');
      expect(resolveInitialLogicalPath('/settings/foods')).toBe('/app/foods');
      expect(resolveInitialLogicalPath('/profile')).toBe('/app/profile');
      expect(resolveInitialLogicalPath('/unknown')).toBe('/app');
    });

    it('除落地頁外，所有 App 內部路徑在瀏覽器網址列一律映射為 /app', () => {
      expect(toSingleBrowserUrl('/')).toBe('/');
      expect(toSingleBrowserUrl('/app')).toBe('/app');
      expect(toSingleBrowserUrl('/app/settings')).toBe('/app');
      expect(toSingleBrowserUrl('/app/foods')).toBe('/app');
      expect(toSingleBrowserUrl('/app/recipes/abc')).toBe('/app');
    });
  });
});
