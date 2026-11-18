/**
 * 全站路由與導航輔助 (Single Source of Truth)
 * 基於標準 React Router 路徑結構，零查詢參數污染 (?tab=...)，零手寫歷史橋接。
 */

export const APP_ROUTES = {
  home: '/app',
  settings: '/app/settings',
  profile: '/app/profile',
  foods: '/app/foods',
  foodDetail: (id: string) => `/app/foods/${encodeURIComponent(id)}`,
  recipeDetail: (id: string) => `/app/recipes/${encodeURIComponent(id)}`,
  exercises: '/app/exercises',
  exerciseDetail: (id: string) => `/app/exercises/${encodeURIComponent(id)}`,
  routineDetail: (id: string) => `/app/routines/${encodeURIComponent(id)}`,
} as const;

export type AppSubRoute =
  | { module: 'settings' }
  | { module: 'profile' }
  | { module: 'foods'; detailKind?: 'food' | 'recipe'; id?: string }
  | { module: 'exercises'; detailKind?: 'exercise' | 'routine'; id?: string };

function safeDecodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * 將當前 URL pathname 解析為強型別子視圖結構；位於主頁 (/app) 或未知路徑時回傳 null
 */
export function parseAppSubRoute(pathname: string): AppSubRoute | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/app/settings') {
    return { module: 'settings' };
  }
  if (normalized === '/app/profile') {
    return { module: 'profile' };
  }
  if (normalized === '/app/foods') {
    return { module: 'foods' };
  }
  if (normalized.startsWith('/app/foods/')) {
    const id = normalized.slice('/app/foods/'.length);
    if (id && !id.includes('/')) {
      return { module: 'foods', detailKind: 'food', id: safeDecodeSegment(id) };
    }
  }
  if (normalized.startsWith('/app/recipes/')) {
    const id = normalized.slice('/app/recipes/'.length);
    if (id && !id.includes('/')) {
      return { module: 'foods', detailKind: 'recipe', id: safeDecodeSegment(id) };
    }
  }
  if (normalized === '/app/exercises') {
    return { module: 'exercises' };
  }
  if (normalized.startsWith('/app/exercises/')) {
    const id = normalized.slice('/app/exercises/'.length);
    if (id && !id.includes('/')) {
      return { module: 'exercises', detailKind: 'exercise', id: safeDecodeSegment(id) };
    }
  }
  if (normalized.startsWith('/app/routines/')) {
    const id = normalized.slice('/app/routines/'.length);
    if (id && !id.includes('/')) {
      return { module: 'exercises', detailKind: 'routine', id: safeDecodeSegment(id) };
    }
  }

  return null;
}

/**
 * 依據當前 URL 路徑推導層級父路由 (Hierarchical Parent Route)
 * 作為無前置站內歷史（如直接在網址列開啟或新標籤頁進入）時的安全 Fallback 唯一真理源
 */
export function getHierarchicalFallbackPath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  // 1. 三級詳情頁 -> 回到對應的二級管理列表
  if (
    normalized.startsWith('/app/foods/') ||
    normalized.startsWith('/app/recipes/') ||
    normalized.startsWith('/app/settings/foods/') ||
    normalized.startsWith('/app/settings/recipes/') ||
    normalized.startsWith('/settings/foods/') ||
    normalized.startsWith('/settings/recipes/')
  ) {
    return APP_ROUTES.foods;
  }

  if (
    normalized.startsWith('/app/exercises/') ||
    normalized.startsWith('/app/routines/') ||
    normalized.startsWith('/app/settings/exercises/') ||
    normalized.startsWith('/app/settings/routines/') ||
    normalized.startsWith('/settings/exercises/') ||
    normalized.startsWith('/settings/routines/')
  ) {
    return APP_ROUTES.exercises;
  }

  // 2. 二級管理清單或個人資料 -> 回到設定首頁
  if (
    normalized === '/app/foods' ||
    normalized === '/app/exercises' ||
    normalized === '/app/profile' ||
    normalized.startsWith('/app/settings/') ||
    normalized === '/settings/foods' ||
    normalized === '/settings/exercises' ||
    normalized.startsWith('/settings/')
  ) {
    return APP_ROUTES.settings;
  }

  // 3. 設定首頁與其他未知路徑 -> 回到主應用首頁 (/app)
  return APP_ROUTES.home;
}

/**
 * 判斷兩次路由跳轉是否屬於「同模組視圖堆疊內部的深入或返回」
 * 若為 true，代表底層列表應該保持保活與滾動位置不變
 */
export function isStackNavigation(prevPath: string, currentPath: string): boolean {
  if (prevPath === currentPath) return true;

  const prev = parseAppSubRoute(prevPath);
  const curr = parseAppSubRoute(currentPath);

  if (!prev || !curr) return false;
  return (
    (prev.module === 'foods' && curr.module === 'foods') ||
    (prev.module === 'exercises' && curr.module === 'exercises')
  );
}

/**
 * 將瀏覽器初始網址正規化為內部邏輯路徑（相容舊版連結與重定向規則）
 */
export function resolveInitialLogicalPath(rawPathname: string): string {
  const normalized = rawPathname.replace(/\/+$/, '') || '/';

  if (normalized === '/' || normalized === '/landing') {
    return '/';
  }
  if (normalized === APP_ROUTES.home || parseAppSubRoute(normalized)) {
    return normalized;
  }
  if (normalized === '/settings' || normalized.startsWith('/settings/')) {
    if (normalized === '/settings/foods') return APP_ROUTES.foods;
    if (normalized === '/settings/exercises') return APP_ROUTES.exercises;
    return APP_ROUTES.settings;
  }
  if (normalized === '/profile') {
    return APP_ROUTES.profile;
  }
  return APP_ROUTES.home;
}

/**
 * 單一 URL 映射：落地頁使用 '/'，App 內所有視圖在瀏覽器網址列一律維持 '/app'
 */
export function toSingleBrowserUrl(logicalPathname: string): string {
  const normalized = logicalPathname.replace(/\/+$/, '') || '/';
  return normalized === '/' ? '/' : APP_ROUTES.home;
}
