import { lazy, Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { Navigate, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useInAppNavigation, type AppMainTab } from '@/store/useInAppNavigation';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { APP_ROUTES, parseAppSubRoute, type AppSubRoute } from '@/utils/navigation';
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
import { InitialSyncModal } from '@/components/sync/InitialSyncModal';
import { SyncStatusPill } from '@/components/sync/SyncStatusPill';
import type { AiExportScope } from '@/services/aiDataExport';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { recordDateSession, shouldResetDateOnForeground, getPhysicalToday } from '@/utils/dateSession';

const CopyDailyDataDialog = lazy(() =>
  import('@/components/common/CopyDailyDataDialog').then((m) => ({
    default: m.CopyDailyDataDialog,
  }))
);

// 4 大主頁面直接靜態直載，實現 DOM 恆定保活 (Keep-Alive)
import Dashboard from '@/pages/Dashboard';
import Diet from '@/pages/Diet';
import Workout from '@/pages/Workout';
import Body from '@/pages/Body';

// 子視圖頁面
import Settings from '@/pages/Settings';
import ProfileSettings from '@/pages/ProfileSettings';
import FoodsPage from '@/pages/FoodsPage';
import ExercisesPage from '@/pages/ExercisesPage';

function getViewKey(tab: AppMainTab, subRoute: AppSubRoute | null): string {
  if (!subRoute) {
    return `tab:${tab}`;
  }
  // 視圖生命週期 Key 收斂至模組級別，確保列表 ⇄ 詳情切換時底層保活容器不卸載
  return `sub:${subRoute.module}`;
}

export function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { goBack } = useSafeNavigate();
  const { activeTab, setActiveTab } = useInAppNavigation();

  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const isHomeRoute = normalizedPath === APP_ROUTES.home;
  const subRoute = useMemo(() => parseAppSubRoute(normalizedPath), [normalizedPath]);
  const isUnknownSubRoute = !isHomeRoute && !subRoute;
  const isSubPage = Boolean(subRoute);

  // 主頁面與模組滾動記憶
  const mainScrollRef = useRef<HTMLElement>(null);
  const currentViewKey = getViewKey(activeTab, subRoute);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const prevViewKeyRef = useRef<string>(currentViewKey);
  const isRestoringScrollRef = useRef<boolean>(false);

  const handleScroll = () => {
    if (isRestoringScrollRef.current || !mainScrollRef.current) return;
    scrollPositionsRef.current[currentViewKey] = mainScrollRef.current.scrollTop;
  };

  useEffect(() => {
    const prevKey = prevViewKeyRef.current;
    if (currentViewKey === prevKey) return;

    isRestoringScrollRef.current = true;
    const isSwitchingMainTabs = prevKey.startsWith('tab:') && currentViewKey.startsWith('tab:');
    const shouldRestore = isSwitchingMainTabs || navigationType === 'POP';

    if (shouldRestore) {
      if (navigationType === 'POP' && prevKey.startsWith('sub:')) {
        delete scrollPositionsRef.current[prevKey];
      }
      const targetScroll = scrollPositionsRef.current[currentViewKey] ?? 0;
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = targetScroll;
      }
      const rafId = requestAnimationFrame(() => {
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTop = targetScroll;
        }
        isRestoringScrollRef.current = false;
      });
      prevViewKeyRef.current = currentViewKey;
      return () => cancelAnimationFrame(rafId);
    }

    // PUSH 進入新模組：重置頂部滾動
    delete scrollPositionsRef.current[currentViewKey];
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    const rafId = requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0;
      }
      isRestoringScrollRef.current = false;
    });
    prevViewKeyRef.current = currentViewKey;
    return () => cancelAnimationFrame(rafId);
  }, [currentViewKey, navigationType]);

  const { selectedDate, setSelectedDate } = useAppStore();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCopyDataOpen, setIsCopyDataOpen] = useState(false);

  // 日期會話快照與前景逾時自動返回今天
  useEffect(() => {
    recordDateSession(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    let lastActiveAt = Date.now();

    const checkAndSyncDate = () => {
      const now = Date.now();
      const currentSelected = useAppStore.getState().selectedDate;
      const isAnyDialogActive =
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
    { key: 'dashboard' as AppMainTab, label: t('nav.dashboard'), icon: LayoutDashboard },
    { key: 'diet' as AppMainTab, label: t('nav.diet'), icon: Utensils },
    { key: 'workout' as AppMainTab, label: t('nav.workout'), icon: Dumbbell },
    { key: 'body' as AppMainTab, label: t('nav.body'), icon: Activity },
  ];

  const subPageTitle = useMemo(() => {
    if (!subRoute) return '';
    if (subRoute.module === 'settings') return t('settings.title');
    if (subRoute.module === 'profile') return t('profileSettings.title');
    if (subRoute.module === 'foods') {
      if (subRoute.detailKind === 'recipe') return t('diet.recipeDetails');
      if (subRoute.detailKind === 'food') return t('diet.foodDetails');
      return t('settings.dietSection');
    }
    if (subRoute.module === 'exercises') {
      if (subRoute.detailKind === 'routine') return t('workout.routineDetails');
      if (subRoute.detailKind === 'exercise') return t('workout.exerciseDetails');
      return t('settings.workoutSection');
    }
    return t('settings.title');
  }, [subRoute, t]);

  if (isUnknownSubRoute) {
    return <Navigate to={APP_ROUTES.home} replace />;
  }

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground select-none overflow-hidden">
      {/* 頂部 Header */}
      <header className="relative flex-none w-full border-b border-border bg-header-bg backdrop-blur-xl z-40 pt-safe">
        <div className="w-full max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          {!isSubPage ? (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full">
              {/* 左上角 Dropbox 同步狀態膠囊 */}
              <div className="flex items-center justify-start min-w-0">
                <SyncStatusPill />
              </div>

              {/* 正中央置中、固定尺寸防抖日期切換器 */}
              <div className="flex items-center h-8 sm:h-9 bg-muted/60 border border-border/80 px-1 rounded-full text-sm shrink-0">
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
              <div className="flex items-center justify-end gap-0.5 -mr-2">
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
                    if (mainScrollRef.current) {
                      scrollPositionsRef.current[currentViewKey] = mainScrollRef.current.scrollTop;
                    }
                    triggerHaptic('light');
                    navigate(APP_ROUTES.settings);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-muted/60"
                  aria-label={t('nav.settings')}
                >
                  <SettingsIcon className="size-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
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
                  {subPageTitle}
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
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar w-full"
      >
        <div className={cn("w-full max-w-xl mx-auto px-4 py-4", !isSubPage ? "pb-20" : "pb-8")}>
          {/* 模式 A：子視圖（模組級別 Key 確保列表 ⇄ 詳情保活不卸載） */}
          {isSubPage && subRoute && (
            <div key={currentViewKey} className="w-full animate-in fade-in-50 duration-150">
              {subRoute.module === 'settings' && <Settings />}
              {subRoute.module === 'profile' && <ProfileSettings />}
              {subRoute.module === 'foods' && <FoodsPage />}
              {subRoute.module === 'exercises' && <ExercisesPage />}
            </div>
          )}

          {/* 模式 B：4 大主頁面原生級保活容器 (Keep-Alive Container，0 卸載、0 秒開延遲) */}
          <div className={cn("w-full", isSubPage && "hidden")}>
            <div className={cn("w-full", activeTab === 'dashboard' ? 'block' : 'hidden')}>
              <Dashboard />
            </div>
            <div className={cn("w-full", activeTab === 'diet' ? 'block' : 'hidden')}>
              <Diet />
            </div>
            <div className={cn("w-full", activeTab === 'workout' ? 'block' : 'hidden')}>
              <Workout />
            </div>
            <div className={cn("w-full", activeTab === 'body' ? 'block' : 'hidden')}>
              <Body />
            </div>
          </div>
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
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (activeTab !== item.key) {
                      if (mainScrollRef.current) {
                        scrollPositionsRef.current[`tab:${activeTab}`] = mainScrollRef.current.scrollTop;
                      }
                      setActiveTab(item.key);
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

      {/* 全域彈窗與提示 */}
      <InitialSyncModal />
      {isCopyDataOpen && (
        <Suspense fallback={null}>
          <CopyDailyDataDialog
            open={isCopyDataOpen}
            onOpenChange={setIsCopyDataOpen}
            date={selectedDate}
            scope={(activeTab === 'dashboard' ? 'all' : activeTab) as AiExportScope}
          />
        </Suspense>
      )}
      <Toaster />
    </div>
  );
}
