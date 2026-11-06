/**
 * 依據當前 URL 路徑推導層級父路由 (Hierarchical Parent Route)
 * 作為無前置站內歷史（如直接在網址列開啟或新標籤頁進入）時的安全 Fallback 唯一真理源
 */
export function getHierarchicalFallbackPath(pathname: string): string {
  // 1. 三級詳情頁 -> 回到對應的二級管理列表
  if (
    pathname.startsWith('/settings/foods/') ||
    pathname.startsWith('/settings/recipes/') ||
    pathname.startsWith('/settings/categories/')
  ) {
    return '/settings/foods';
  }

  if (
    pathname.startsWith('/settings/exercises/') ||
    pathname.startsWith('/settings/routines/')
  ) {
    return '/settings/exercises';
  }

  // 2. 二級管理清單或任何其他 settings 子頁面 -> 回到設定首頁
  if (
    pathname === '/settings/foods' ||
    pathname === '/settings/recipes' ||
    pathname === '/settings/categories' ||
    pathname === '/settings/exercises' ||
    pathname === '/settings/routines' ||
    pathname === '/settings/workouts' ||
    pathname === '/settings/equipments' ||
    pathname.startsWith('/settings/')
  ) {
    return '/settings';
  }

  // 3. 設定首頁與個人資料 -> 回到主應用首頁 (Dashboard)
  if (pathname === '/settings' || pathname === '/profile') {
    return '/';
  }

  // 4. 全域兜底 (預設回首頁)
  return '/';
}

/**
 * 判斷兩次路由跳轉是否屬於「同模組視圖堆疊內部的深入或返回」
 * 若為 true，代表底層列表應該保持保活與滾動位置不變
 * 若為 false，代表跨模組跳轉、全新進入模組或退出模組，外層滾動條應重置回頂部 (scrollTop = 0)
 */
export function isStackNavigation(prevPath: string, currentPath: string): boolean {
  if (prevPath === currentPath) return true;

  // 食物模組視圖棧（包含食材列表、菜餚列表與對應詳情頁）
  const isFoodModule = (path: string) =>
    path === '/settings/foods' ||
    path === '/settings/recipes' ||
    path.startsWith('/settings/foods/') ||
    path.startsWith('/settings/recipes/');

  if (isFoodModule(prevPath) && isFoodModule(currentPath)) {
    return true;
  }

  // 動作模組視圖棧（包含動作列表、組合課表與對應詳情頁）
  const isWorkoutModule = (path: string) =>
    path === '/settings/exercises' ||
    path === '/settings/routines' ||
    path.startsWith('/settings/exercises/') ||
    path.startsWith('/settings/routines/');

  if (isWorkoutModule(prevPath) && isWorkoutModule(currentPath)) {
    return true;
  }

  return false;
}
