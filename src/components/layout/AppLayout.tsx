import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import {
  LayoutDashboard,
  Utensils,
  Plus,
  Dumbbell,
  Activity,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Toaster } from '@/components/ui/toast';
import { AddQuickModal } from '@/components/quickAdd/AddQuickModal';
import { AppLockOverlay } from '@/components/security/AppLockOverlay';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useUserProfile } from '@/hooks/useUserProfile';

export function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUserProfile();

  const { selectedDate, setSelectedDate, openAddModal } = useAppStore();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
    { path: '/add', label: t('nav.add'), icon: Plus, isAdd: true },
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
              {/* 左上角用戶個人身體數據入口 */}
              <button
                type="button"
                onClick={() => {
                  navigate('/profile');
                  triggerHaptic('light');
                }}
                className="py-1 px-2 -ml-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer text-left group"
                aria-label={t('profileSettings.title')}
              >
                <span className="font-semibold text-base sm:text-lg tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
                  {profile.name || 'Noah'}
                </span>
              </button>

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

              {/* 右側設定入口 */}
              <button
                type="button"
                onClick={() => {
                  navigate('/settings');
                  triggerHaptic('light');
                }}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-muted/60"
                aria-label={t('nav.settings')}
              >
                <SettingsIcon className="size-5" strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 -ml-2 min-w-0 pr-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    navigate(-1);
                  }}
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
      <main className="flex-1 overflow-y-auto no-scrollbar w-full">
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

              if (item.isAdd) {
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      openAddModal();
                      triggerHaptic('selection');
                    }}
                    className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground outline-none cursor-pointer transition-colors"
                    aria-label={item.label}
                  >
                    <Icon className="size-6" strokeWidth={1.5} />
                  </button>
                );
              }

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    if (location.pathname !== item.path) {
                      navigate(item.path);
                      triggerHaptic('selection');
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
      <Toaster />
    </div>
  );
}
