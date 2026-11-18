import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Categories from './Categories';
import CategoryDetails from './CategoryDetails';
import RecipeDetails from './RecipeDetails';
import { cn } from '@/lib/utils';
import { useBrowserStateStore } from '@/store/useBrowserStateStore';
import { DetailOverlayContainer } from '@/components/layout/DetailOverlayContainer';
import { parseAppSubRoute } from '@/utils/navigation';

/**
 * 食物與食譜管理模組 - 視圖堆疊保活容器 (Keep-Alive Container)
 * 1. 底層列表 (Categories) 按需掛載並恆定保活，進入/返回詳情頁時 0 卸載、0 重新查詢、滾動位置零丟失
 * 2. 若直接開啟詳情 URL，首幀不掛載底層清單，實現 0ms 秒開
 * 3. 頂層詳情 (CategoryDetails / RecipeDetails) 作為全屏覆蓋層獨立滾動
 */
export default function FoodsPage() {
  const { pathname } = useLocation();
  const subRoute = parseAppSubRoute(pathname);

  const activeId = subRoute?.module === 'foods' ? subRoute.id : undefined;
  const isFoodDetail = subRoute?.module === 'foods' && subRoute.detailKind === 'food' && Boolean(activeId);
  const isRecipeDetail = subRoute?.module === 'foods' && subRoute.detailKind === 'recipe' && Boolean(activeId);
  const isDetailOpen = isFoodDetail || isRecipeDetail;

  const [hasVisitedList, setHasVisitedList] = useState(!isDetailOpen);

  useEffect(() => {
    if (!isDetailOpen && !hasVisitedList) {
      // oxlint-disable-next-line react/set-state-in-effect
      setHasVisitedList(true);
    }
  }, [isDetailOpen, hasVisitedList]);

  const shouldMountList = !isDetailOpen || hasVisitedList;

  // 模組退出銷毀合約：當使用者真正離開食物管理模組時重置過濾狀態
  useEffect(() => {
    return () => {
      useBrowserStateStore.getState().resetFoodBrowserState();
    };
  }, []);

  return (
    <div className="relative w-full">
      {shouldMountList && (
        <div className={cn(isDetailOpen && 'pointer-events-none select-none')}>
          <Categories isDetailOpen={isDetailOpen} />
        </div>
      )}

      {isDetailOpen && activeId && (
        <DetailOverlayContainer>
          {isFoodDetail && <CategoryDetails key={activeId} id={activeId} />}
          {isRecipeDetail && <RecipeDetails key={activeId} id={activeId} />}
        </DetailOverlayContainer>
      )}
    </div>
  );
}
