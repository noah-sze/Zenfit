import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import {
  LayoutDashboard,
  Utensils,
  Dumbbell,
  Activity,
  ChevronLeft,
  ChevronRight,
  Share2,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Toaster } from '@/components/ui/toast';
import { AddQuickModal } from '@/components/quickAdd/AddQuickModal';
import { AppLockOverlay } from '@/components/security/AppLockOverlay';
import { InitialSyncModal } from '@/components/sync/InitialSyncModal';
import { SyncStatusPill } from '@/components/sync/SyncStatusPill';
import { CopyDailyDataDialog } from '@/components/common/CopyDailyDataDialog';
import { getAiExportScopeByPath } from '@/services/aiDataExport';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { getHierarchicalFallbackPath } from '@/utils/navigation';
import { recordDateSession, shouldResetDateOnForeground, getPhysicalToday } from '@/utils/dateSession';

export function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { goBack } = useSafeNavigate();
  const mainScrollRef = useRef<HTMLElement>(null);
  const prevPathRef = useRef<string>(location.pathname);
  // 路徑滾動座標快照字典：用於跨層級返回時精確還原先前閱讀位置 (Scroll Restoration)
  const scrollPositionsRef = useRef<Record<string, number>>({});
  // 滾動還原進行中標記：避免還原過渡期觸發 onScroll 污染目標座標
  const isRestoringScrollRef = useRef<boolean>(false);

  // 視圖棧滾動生命週期合約 (Navigation Stack Scroll Contract)：
  // 1. 返回上級路由 (Pop)：精確還原上級滾動座標，並徹底銷毀下級子路由的座標快照
  // 2. 深入下級路由或全新導航 (Push)：下級視為全新實例，滾動條強制置頂 (scrollTop = 0)，清除殘留
  useEffect(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;

    if (prevPath === currentPath) return;

    // 判斷是否為「返回上級」操作：
    // 條件 A: 瀏覽器觸發原生 POP（歷史後退）
    // 條件 B: 當前路徑正好是離開路徑的層級父路由 (Hierarchical Parent)
    const isPop =
      navigationType === 'POP' ||
      getHierarchicalFallbackPath(prevPath) === currentPath;

    if (isPop) {
      // 1. 銷毀被退出的下級子路由（及所有其子路徑）的滾動紀錄
      delete scrollPositionsRef.current[prevPath];
      Object.keys(scrollPositionsRef.current).forEach((key) => {
        if (key.startsWith(prevPath + '/')) {
          delete scrollPositionsRef.current[key];
        }
      });

      // 2. 還原上級路由先前保留的滾動座標
      const savedPosition = scrollPositionsRef.current[currentPath];
      if (typeof savedPosition === 'number' && savedPosition > 0) {
        isRestoringScrollRef.current = true;
        requestAnimationFrame(() => {
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTop = savedPosition;
          }
        });
        // 應對部分依賴 IndexedDB liveQuery 或異步渲染的區塊，補正確保高度就緒後完全還原
        const timer = setTimeout(() => {
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTop = savedPosition;
          }
          isRestoringScrollRef.current = false;
        }, 50);

        prevPathRef.current = currentPath;
        return () => clearTimeout(timer);
      } else if (mainScrollRef.current) {
        isRestoringScrollRef.current = true;
        mainScrollRef.current.scrollTop = 0;
        requestAnimationFrame(() => {
          isRestoringScrollRef.current = false;
        });
      }
    } else {
      // 進入下級路由或全新頁面 (Push)：
      // 1. 銷毀目標路徑可能存在的任何舊座標快照
      delete scrollPositionsRef.current[currentPath];

      // 2. 強制重置滾動容器至頂部 (scrollTop = 0)
      if (mainScrollRef.current) {
        isRestoringScrollRef.current = true;
        mainScrollRef.current.scrollTop = 0;
        requestAnimationFrame(() => {
          isRestoringScrollRef.current = false;
        });
      }
    }

    prevPathRef.current = currentPath;
  }, [location.pathname, navigationType]);

  const { selectedDate, setSelectedDate } = useAppStore();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCopyDataOpen, setIsCopyDataOpen] = useState(false);

  // 日期會話快照與前景逾時自動返回今天：
  // 1. 短暫切窗（< 10 分鐘）：100% 保留當前日期上下文，不強制跳轉
  // 2. 長時間離開（>= 10 分鐘）：判定會話逾時，切回前景時自動回歸今天
  // 3. 正在編輯或彈窗開啟中：防竄改保護鎖生效，絕對不重置日期
  useEffect(() => {
    recordDateSession(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    let lastActiveAt = Date.now();

    const checkAndSyncDate = () => {
      const now = Date.now();
      const currentSelected = useAppStore.getState().selectedDate;
      const modalOpen = useAppStore.getState().isAddModalOpen;
      const isAnyDialogActive =
        modalOpen ||
        isCalendarOpen ||
        isCopyDataOpen ||
        (typeof document !== 'undefined' &&
          (document.querySelector('[role="dialog"]') !== null ||
            document.querySelector('[role="alertdialog"]') !== null ||
            document.querySelector('div[data-state="open"]') !== null));

      const shouldReset = shouldResetDateOnForeground({
        lastActiveTimestamp: lastActiveAt,
        isModalOpen: isAnyDialogActive,
        currentDate: currentSelected,
        now,
      });

      if (shouldReset) {
        const todayStr = getPhysicalToday(new Date(now));
        setSelectedDate(todayStr);
      }

      lastActiveAt = now;
      recordDateSession(useAppStore.getState().selectedDate, now);
    };

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        lastActiveAt = now;
        recordDateSession(useAppStore.getState().selectedDate, now);
      } else if (document.visibilityState === 'visible') {
        checkAndSyncDate();
      }
    };

    const handleWindowFocus = () => {
      if (document.visibilityState === 'visible') {
        checkAndSyncDate();
      }
    };

    const handleWindowBlur = () => {
      lastActiveAt = Date.now();
      recordDateSession(useAppStore.getState().selectedDate, lastActiveAt);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [setSelectedDate, isCalendarOpen, isCopyDataOpen]);

  const currentDateObj = parseISO(selectedDate);

  const handlePrevDay = () => {
    const prev = subDays(currentDateObj, 1);
    setSelectedDate(format(prev, 'yyyy-MM-dd'));
    triggerHaptic('light');
  };

  const handleNextDay = () => {
    const next = addDays(currentDateObj, 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
    triggerHaptic('light');
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(format(date, 'yyyy-MM-dd'));
      setIsCalendarOpen(false);
      triggerHaptic('selection');
    }
  };

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/diet', label: t('nav.diet'), icon: Utensils },
    { path: '/workout', label: t('nav.workout'), icon: Dumbbell },
    { path: '/body', label: t('nav.body'), icon: Activity },
  ];

  const isSubPage = location.pathname.startsWith('/settings') || location.pathname === '/profile';

  const getSubPageTitle = () => {
    if (location.pathname === '/settings') return t('settings.title');
    if (location.pathname === '/profile') return t('profileSettings.title');
    if (
      location.pathname === '/settings/foods/archived' ||
      location.pathname === '/settings/categories/archived'
    ) {
      return t('settings.archivedFoods');
    }
    if (
      location.pathname.startsWith('/settings/foods/') ||
      location.pathname.startsWith('/settings/categories/')
    ) {
      return t('diet.foodDetails');
    }
    if (location.pathname.startsWith('/settings/recipes/')) {
      return t('diet.recipeDetails');
    }
    if (location.pathname === '/settings/recipes') {
      return t('diet.recipes');
    }
    if (location.pathname === '/settings/exercises/archived') {
      return t('workout.archivedExercises');
    }
    if (location.pathname.startsWith('/settings/exercises/')) {
      return t('workout.exerciseDetails');
    }
    if (
      location.pathname === '/settings/exercises' ||
      location.pathname === '/settings/routines' ||
      location.pathname === '/settings/equipments' ||
      location.pathname === '/settings/workouts'
    ) {
      return t('settings.workoutSection');
    }
    if (location.pathname.startsWith('/settings/routines/')) {
      return t('workout.routineDetails');
    }
    if (
      location.pathname === '/settings/foods' ||
      location.pathname === '/settings/categories'
    ) {
      return t('settings.dietSection');
    }
    return t('settings.title');
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground select-none overflow-hidden">
      {/* 頂部 Header */}
      <header className="relative flex-none w-full border-b border-border bg-header-bg backdrop-blur-xl z-40 pt-safe">
        <div className="w-full max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          {!isSubPage ? (
            <>
              {/* 左上角 Dropbox 同步狀態膠囊 */}
              <div className="flex items-center">
                <SyncStatusPill />
              </div>

              {/* 正中央絕對幾何置中、固定尺寸防抖日期切換器 */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-8 sm:h-9 bg-muted/60 border border-border/80 px-1 rounded-full text-sm">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="size-7 flex items-center justify-center hover:text-foreground text-muted-foreground transition-colors cursor-pointer rounded-full shrink-0"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger className="w-[74px] h-full text-xs sm:text-sm font-mono font-medium hover:text-foreground text-foreground flex items-center justify-center cursor-pointer select-none">
                    <span>
                      {isToday(currentDateObj)
                        ? t('common.today')
                        : format(currentDateObj, 'MM/dd')}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 border-0 bg-transparent shadow-none rounded-none outline-none"
                    align="center"
                  >
                    <Calendar
                      selected={currentDateObj}
                      onSelect={handleDateSelect}
                      onClose={() => setIsCalendarOpen(false)}
                    />
                  </PopoverContent>
                </Popover>

                <button
                  type="button"
                  onClick={handleNextDay}
                  className="size-7 flex items-center justify-center hover:text-foreground text-muted-foreground transition-colors cursor-pointer rounded-full shrink-0"
                  aria-label="Next day"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* 右側操作區：一鍵複製當日數據 + 設定入口 */}
              <div className="flex items-center gap-0.5 -mr-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCopyDataOpen(true);
                    triggerHaptic('light');
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-muted/60"
                  aria-label={t('aiExport.triggerAriaLabel')}
                  title={t('aiExport.triggerAriaLabel')}
                >
                  <Share2 className="size-4.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    scrollPositionsRef.current['/settings'] = 0;
                    navigate('/settings');
                    triggerHaptic('light');
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-muted/60"
                  aria-label={t('nav.settings')}
                >
                  <SettingsIcon className="size-5" strokeWidth={1.5} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 -ml-2 min-w-0 pr-2">
                <button
                  type="button"
                  onClick={() => goBack()}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                  aria-label={t('common.back')}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <h2 className="text-lg font-medium tracking-tight text-foreground truncate">
                  {getSubPageTitle()}
                </h2>
              </div>
              <div id="subpage-header-action" className="flex items-center -mr-2 shrink-0" />
            </div>
          )}
        </div>
      </header>

      {/* 核心滾動內容區 */}
      <main
        ref={mainScrollRef}
        onScroll={(e) => {
          if (!isRestoringScrollRef.current) {
            scrollPositionsRef.current[location.pathname] = e.currentTarget.scrollTop;
          }
        }}
        className="flex-1 overflow-y-auto no-scrollbar w-full"
      >
        <div className={cn("w-full max-w-xl mx-auto px-4 py-4", !isSubPage ? "pb-20" : "pb-8")}>
          <Outlet />
        </div>
      </main>

      {/* 底部導覽列 (僅在主頁籤顯示，子頁面隱藏) */}
      {!isSubPage && (
        <nav
          id="bottom-nav"
          className="flex-none w-full bg-header-bg backdrop-blur-xl border-t border-border z-40 pb-[env(safe-area-inset-bottom,0px)]"
        >

          <div
            id="bottom-nav-inner"
            className="w-full max-w-xl mx-auto flex justify-around items-center h-14 sm:h-16"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    if (location.pathname !== item.path) {
                      scrollPositionsRef.current[item.path] = 0;
                      navigate(item.path);
                      triggerHaptic('selection');
                    } else if (mainScrollRef.current) {
                      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full outline-none transition-colors cursor-pointer",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label={item.label}
                >
                  <Icon className="size-6" strokeWidth={isActive ? 2.5 : 1.5} />
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* 快捷彈窗與全域提示 */}
      <AddQuickModal />
      <AppLockOverlay />
      <InitialSyncModal />
      {isCopyDataOpen && (
        <CopyDailyDataDialog
          open={isCopyDataOpen}
          onOpenChange={setIsCopyDataOpen}
          date={selectedDate}
          scope={getAiExportScopeByPath(location.pathname)}
        />
      )}
      <Toaster />
    </div>
  );
}
