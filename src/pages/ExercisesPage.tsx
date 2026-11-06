import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Exercises from './Exercises';
import ExerciseDetails from './ExerciseDetails';
import RoutineDetails from './RoutineDetails';
import { cn } from '@/lib/utils';
import { useBrowserStateStore } from '@/store/useBrowserStateStore';

/**
 * 動作、組合與器械管理模組 - 視圖堆疊保活容器 (View Stack Container)
 * 1. 底層列表 (Exercises) 恆定保活，DOM 節點與滾動座標一分一毫都不會變動
 * 2. 頂層詳情 (ExerciseDetails / RoutineDetails) 作為全屏覆蓋層渲染，獨立滾動
 */
export default function ExercisesPage() {
  const location = useLocation();
  const { id } = useParams();

  const isExerciseDetail =
    location.pathname.startsWith('/settings/exercises/') &&
    Boolean(id) &&
    !location.pathname.endsWith('/archived');

  const isRoutineDetail =
    location.pathname.startsWith('/settings/routines/') &&
    Boolean(id) &&
    !location.pathname.endsWith('/archived');

  const isDetailOpen = isExerciseDetail || isRoutineDetail;

  // 模組退出銷毀合約：當使用者真正退出動作管理模組（如返回 /settings）時，徹底銷毀其狀態
  useEffect(() => {
    return () => {
      useBrowserStateStore.getState().resetWorkoutBrowserState();
    };
  }, []);

  return (
    <div className="relative w-full">
      {/* 底層列表頁：恆定保活，0 卸載、0 重新查詢、0 滾動計算 */}
      <div className={cn(isDetailOpen && 'pointer-events-none select-none')}>
        <Exercises />
      </div>

      {/* 頂層詳情頁：覆蓋於列表頁上方，擁有獨立全屏滾動上下文 */}
      {isDetailOpen && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-30 bg-background overflow-y-auto no-scrollbar">
          <div className="w-full max-w-xl mx-auto px-4 py-4 pb-8">
            {isExerciseDetail && <ExerciseDetails />}
            {isRoutineDetail && <RoutineDetails />}
          </div>
        </div>
      )}
    </div>
  );
}
