import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/components/ThemeProvider';
import {
  Sun,
  Moon,
  ArrowUpRight,
  Globe,
  AlertTriangle,
  BarChart2,
  Flame,
  CircleDot,
  Trophy,
  Lock,
  Utensils,
  Scale,
} from 'lucide-react';
import { SetupProfileDialog } from '@/components/welcome/SetupProfileDialog';
import { WelcomeTransitionOverlay } from '@/components/welcome/WelcomeTransitionOverlay';
import { getDemoDashboardData, DEMO_DASHBOARD_DATA } from '@/components/dashboard/DashboardView';
import {
  WorkoutRecoveryDashboard,
  WorkoutExerciseCard,
  getDemoWorkoutExercisesData,
  ExerciseOverviewCard,
  getDemoExerciseOverviewData,
} from '@/components/workout';
import type { BodyWeightUnit } from '@/types';
import { DietView, getDemoDietData } from '@/components/diet/DietView';
import {
  WeightTrendChart,
  DEMO_WEIGHT_TREND_DATA,
  BodyTodayDataCard,
  DEMO_BODY_TODAY_DATA,
  BodyMetricsOverviewCard,
  DEMO_BODY_METRICS_DATA,
} from '@/components/body';
import { ShareShowcaseCards } from '@/components/common/ShareShowcaseCards';
import { SyncTopologyDiagram } from '@/components/common/SyncTopologyDiagram';
import { HeroShowcaseDeck } from '@/components/common/HeroShowcaseDeck';
import { WireframeGlobe } from '@/components/welcome/WireframeGlobe';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState('');

  const handleOpenApp = () => {
    if (!isProfileLoading && profile.isSetupCompleted) {
      setWelcomeUserName(profile.name || '');
      setIsTransitionOpen(true);
    } else {
      setIsSetupDialogOpen(true);
    }
  };

  const currentLang = i18n.language?.startsWith('zh-CN')
    ? 'zh-CN'
    : i18n.language?.startsWith('en')
      ? 'en'
      : 'zh-TW';

  const toggleLanguage = () => {
    const nextLang =
      currentLang === 'zh-TW'
        ? 'en'
        : currentLang === 'en'
          ? 'zh-CN'
          : 'zh-TW';
    i18n.changeLanguage(nextLang);
  };

  const languageLabel =
    currentLang === 'zh-TW'
      ? '繁中'
      : currentLang === 'zh-CN'
        ? '简中'
        : 'EN';

  useEffect(() => {
    const prevTitle = document.title;
    document.title = t('landing.metaTitle', 'e2Cal - 飲食、訓練記錄');
    return () => {
      document.title = prevTitle;
    };
  }, [t]);

  const tr = (k: string, fb?: string) => (fb !== undefined ? t(k, fb) : t(k));
  const demoDashboardData = useMemo(() => getDemoDashboardData(tr), [t]);
  const demoDietData = useMemo(() => getDemoDietData(tr), [t]);
  const demoWorkoutExercisesData = useMemo(() => getDemoWorkoutExercisesData(tr), [t]);

  const demoExerciseOverview = useMemo(
    () =>
      getDemoExerciseOverviewData(
        (DEMO_DASHBOARD_DATA.bodyWeightUnit as BodyWeightUnit) || 'kg',
        tr
      ),
    [t]
  );

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const scrollToSection = (id: string) => {
    const container = document.getElementById('landing-container');
    if (id === 'hero' && container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el && container) {
      const top = el.offsetTop - 56;
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    } else if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      id="landing-container"
      className="fixed inset-0 h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-background text-foreground antialiased selection:bg-foreground selection:text-background font-sans"
    >
      

  {/*  =========================================================================  */}
  {/*  TOP NAVIGATION HEADER                                                      */}
  {/*  =========================================================================  */}
  <header className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-md border-y border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
    <div className="w-full flex items-center h-14 divide-x divide-neutral-200 dark:divide-neutral-800">

      {/*  Logo & Identity: Full-bleed Left Cell  */}
      <a
        href="#hero"
        onClick={(e) => {
          e.preventDefault();
          scrollToSection("hero");
        }}
        className="h-full px-5 sm:px-8 md:px-12 flex-1 min-w-0 md:flex-initial md:min-w-[240px] flex items-center space-x-2.5 shrink-0 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors group cursor-pointer"
      >
        <svg viewBox="0 0 1024 1024" className="w-7 h-7 rounded-lg shrink-0 select-none overflow-hidden border border-transparent dark:border-neutral-800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="240" fill="#000000" />
          <g transform="translate(187 187)">
            <g transform="translate(132.031 91.406)">
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743674 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743674 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 0 0)" />
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 40.625 0)" />
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23103 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23103 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 81.25 0)" />
              <path d="M0 0L101.562 0C101.562 0 101.562 55.8594 101.562 55.8594C101.562 86.3281 81.25 106.641 50.7812 106.641C20.3125 106.641 0 86.3281 0 55.8594C0 55.8594 0 0 0 0Z" fill="#FFFFFF" transform="matrix(1 0 0 1 0 111.719)" />
              <path d="M0 28.111L0 14.0555C0 10.1742 1.23946 6.86128 3.71837 4.11676C6.19728 1.37225 9.1896 0 12.6953 0C16.201 0 19.1933 1.37225 21.6722 4.11676C24.1512 6.86128 25.3906 10.1742 25.3906 14.0555L25.3906 261.433C25.3906 265.314 24.1512 268.627 21.6722 271.371C19.1933 274.116 16.201 275.488 12.6953 275.488C9.1896 275.488 6.19728 274.116 3.71837 271.371C1.23946 268.627 0 265.314 0 261.433L0 28.111Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 38.086 191.699)" />
              <path d="M0 20.3125L0 10.1562C0 7.35168 0.991562 4.95783 2.9747 2.9747C4.95782 0.991565 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991565 134.135 2.9747C136.118 4.95783 137.109 7.35168 137.109 10.1562L137.109 55.8594C137.109 58.6639 136.118 61.0578 134.135 63.0409C132.151 65.024 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.0409C0.991562 61.0578 0 58.6639 0 55.8594L0 20.3125Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 248.828 0)" />
              <path d="M0 8.88671L0 5.07812C0 3.67583 0.495789 2.47891 1.48734 1.48735C2.47891 0.495781 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495781 89.9189 1.48735C90.9105 2.47891 91.4063 3.67583 91.4063 5.07812L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88671Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 271.68 66.016)" />
              <path d="M0 17.0418L0 8.52092C0 6.16794 0.743683 4.15953 2.23102 2.49572C3.71838 0.831909 5.51376 0 7.61719 0L27.9297 0C30.0331 0 31.8285 0.831909 33.3159 2.49572C34.8032 4.15953 35.5469 6.16794 35.5469 8.52092L35.5469 326.635C35.5469 328.988 34.8032 330.997 33.3159 332.661C31.8285 334.324 30.0331 335.156 27.9297 335.156L7.61719 335.156C5.51376 335.156 3.71838 334.324 2.23102 332.661C0.743683 330.997 0 328.988 0 326.635L0 17.0418Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 299.609 66.016)" />
              <path d="M0 8.88672L0 5.07813C0 3.67584 0.495789 2.47891 1.48734 1.48734C2.47891 0.495789 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495789 89.9189 1.48734C90.9105 2.47891 91.4063 3.67584 91.4063 5.07813L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88672Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 271.68 383.398)" />
              <path d="M0 20.3125L0 10.1563C0 7.35168 0.991562 4.95782 2.9747 2.9747C4.95782 0.991577 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991577 134.135 2.9747C136.118 4.95782 137.109 7.35168 137.109 10.1563L137.109 55.8594C137.109 58.664 136.118 61.0578 134.135 63.041C132.151 65.0241 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.041C0.991562 61.0578 0 58.664 0 55.8594L0 20.3125Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 248.828 401.172)" />
            </g>
          </g>
        </svg>
        <span className="font-sans text-base font-semibold tracking-tight text-black dark:text-white leading-none">e2Cal</span>
      </a>

      {/*  Navigation Links: Full-width Edge-to-Edge Grid  */}
      <nav className="hidden md:flex items-center h-full flex-1 divide-x divide-neutral-200 dark:divide-neutral-800 font-mono text-xs text-neutral-600 dark:text-neutral-400">
        <a onClick={(e) => { e.preventDefault(); scrollToSection("diet"); }} href="#diet" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">{t('landing.nav.diet', '飲食')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("workout"); }} href="#workout" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">{t('landing.nav.workout', '訓練')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("body"); }} href="#body" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">{t('landing.nav.body', '體態')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("analytics"); }} href="#analytics" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">{t('landing.nav.analytics', '分析')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("sync"); }} href="#sync" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">{t('landing.nav.sync', '同步')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("non-goals"); }} href="#non-goals" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">{t('landing.nav.principles', '原則')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("tech"); }} href="#tech" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">{t('landing.nav.tech', '技術')}</a>
      </nav>

      {/*  Action Area: Full-bleed Right Cells (Symmetrical Equal-width Twin Cells)  */}
      <div className="flex items-center h-full shrink-0 ml-auto md:ml-0 divide-x divide-neutral-200 dark:divide-neutral-800 font-mono text-xs">
        <button
          type="button"
          onClick={toggleLanguage}
          id="language-toggle-btn"
          className="h-full px-3 sm:px-0 sm:w-28 md:w-32 flex items-center justify-center space-x-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          title={t('settings.language', '語言設定')}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>{languageLabel}</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          id="theme-toggle-btn"
          className="h-full px-3 sm:px-0 sm:w-28 md:w-32 flex items-center justify-center space-x-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          title={t('landing.themeToggle', '切換淺色/深色模式')}
        >
          <span id="theme-icon" className="flex items-center justify-center">
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </span>
          <span id="theme-text">{theme === 'dark' ? t('settings.themeDark', '深色') : t('settings.themeLight', '淺色')}</span>
        </button>

        <button
          type="button"
          onClick={handleOpenApp}
          className="relative -my-[1px] h-[calc(100%+2px)] px-3.5 sm:px-0 sm:w-28 md:w-32 flex items-center justify-center space-x-1.5 bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-semibold transition-colors cursor-pointer !border border-black dark:!border-white z-10"
        >
          <span>{t('common.openApp', '開啟應用')}</span>
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

    </div>
  </header>

  {/*  =========================================================================  */}
  {/*  01. HERO / ABOVE-THE-FOLD MAIN SHOWCASE (主流內容展示)                     */}
  {/*  =========================================================================  */}
  <section id="hero" className="relative border-b border-neutral-200 dark:border-neutral-800 bg-grid-theme overflow-hidden transition-colors duration-200">

    <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:min-h-[calc(100vh-56px)]">
      
      {/*  Left Column: Manifesto & Value Proposition  */}
      <div className="relative overflow-hidden lg:col-span-5 pt-36 pb-8 px-6 sm:p-12 lg:p-16 xl:p-20 border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-center space-y-8 bg-white dark:bg-black transition-colors duration-200">
        <WireframeGlobe
          centerXRatio={0.68}
          centerYRatio={0.42}
          radiusRatio={1.44}
          desktopRadiusRatio={1.44}
        />
        
        <div className="relative z-10 space-y-6">
          <div>
            <div className="mb-3 sm:mb-4">
              <svg viewBox="0 0 1024 1024" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl shrink-0 select-none overflow-hidden shadow-none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="1024" height="1024" rx="240" fill="#000000" />
                <g transform="translate(187 187)">
                  <g transform="translate(132.031 91.406)">
                    <path d="M0 15.2344L0 7.61719C0 5.51376 0.743674 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743674 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 0 0)" />
                    <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 40.625 0)" />
                    <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23103 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23103 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 81.25 0)" />
                    <path d="M0 0L101.562 0C101.562 0 101.562 55.8594 101.562 55.8594C101.562 86.3281 81.25 106.641 50.7812 106.641C20.3125 106.641 0 86.3281 0 55.8594C0 55.8594 0 0 0 0Z" fill="#FFFFFF" transform="matrix(1 0 0 1 0 111.719)" />
                    <path d="M0 28.111L0 14.0555C0 10.1742 1.23946 6.86128 3.71837 4.11676C6.19728 1.37225 9.1896 0 12.6953 0C16.201 0 19.1933 1.37225 21.6722 4.11676C24.1512 6.86128 25.3906 10.1742 25.3906 14.0555L25.3906 261.433C25.3906 265.314 24.1512 268.627 21.6722 271.371C19.1933 274.116 16.201 275.488 12.6953 275.488C9.1896 275.488 6.19728 274.116 3.71837 271.371C1.23946 268.627 0 265.314 0 261.433L0 28.111Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 38.086 191.699)" />
                    <path d="M0 20.3125L0 10.1562C0 7.35168 0.991562 4.95783 2.9747 2.9747C4.95782 0.991565 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991565 134.135 2.9747C136.118 4.95783 137.109 7.35168 137.109 10.1562L137.109 55.8594C137.109 58.6639 136.118 61.0578 134.135 63.0409C132.151 65.024 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.0409C0.991562 61.0578 0 58.6639 0 55.8594L0 20.3125Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 248.828 0)" />
                    <path d="M0 8.88671L0 5.07812C0 3.67583 0.495789 2.47891 1.48734 1.48735C2.47891 0.495781 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495781 89.9189 1.48735C90.9105 2.47891 91.4063 3.67583 91.4063 5.07812L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88671Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 271.68 66.016)" />
                    <path d="M0 17.0418L0 8.52092C0 6.16794 0.743683 4.15953 2.23102 2.49572C3.71838 0.831909 5.51376 0 7.61719 0L27.9297 0C30.0331 0 31.8285 0.831909 33.3159 2.49572C34.8032 4.15953 35.5469 6.16794 35.5469 8.52092L35.5469 326.635C35.5469 328.988 34.8032 330.997 33.3159 332.661C31.8285 334.324 30.0331 335.156 27.9297 335.156L7.61719 335.156C5.51376 335.156 3.71838 334.324 2.23102 332.661C0.743683 330.997 0 328.988 0 326.635L0 17.0418Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 299.609 66.016)" />
                    <path d="M0 8.88672L0 5.07813C0 3.67584 0.495789 2.47891 1.48734 1.48734C2.47891 0.495789 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495789 89.9189 1.48734C90.9105 2.47891 91.4063 3.67584 91.4063 5.07813L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88672Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 271.68 383.398)" />
                    <path d="M0 20.3125L0 10.1563C0 7.35168 0.991562 4.95782 2.9747 2.9747C4.95782 0.991577 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991577 134.135 2.9747C136.118 4.95782 137.109 7.35168 137.109 10.1563L137.109 55.8594C137.109 58.664 136.118 61.0578 134.135 63.041C132.151 65.0241 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.041C0.991562 61.0578 0 58.664 0 55.8594L0 20.3125Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 248.828 401.172)" />
                  </g>
                </g>
              </svg>
            </div>

            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight font-sans text-neutral-900 dark:text-white leading-[1.12]">
              {t('landing.hero.titleLine1', '只記數據，')}<br />
              <span className="text-neutral-500 font-mono font-normal">{t('landing.hero.titleLine2', '絕不對你指手畫腳')}</span>
            </h1>
          </div>

          <p className="text-neutral-600 dark:text-neutral-400 font-sans text-sm sm:text-base leading-relaxed">
            {t('landing.hero.desc', '記錄身體不該帶來壓力。今天吃了多少、練了幾組，軟體只如實告訴你真實數字，絕不批判你吃多吃少，更不強迫打卡斷簽。完全支援離線使用，每一次輸入都乾脆俐落。')}
          </p>

          {/*  CTAs  */}
          <div className="pt-2 flex flex-wrap items-center gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={handleOpenApp}
              className="px-5 py-3 bg-black text-white dark:bg-white dark:text-black font-semibold rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <span>{t('common.openApp', '開啟應用')}</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </button>
            <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
              {t('landing.hero.ctaPwa', 'PWA 離線安裝 · 100% 數據私有化')}
            </div>
          </div>
        </div>

        {/*  Core Characteristics List (一行兩個排版)  */}
        <div className="relative z-10 pt-6 border-t border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-500 dark:text-neutral-400 grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">{t('landing.hero.traits.localFirst', '100% 本地優先')}</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">{t('landing.hero.traits.crossPlatform', '全平台支援')}</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">{t('landing.hero.traits.dropboxSync', 'Dropbox 同步')}</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-telemetry-accent shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">{t('landing.hero.traits.nonPreachy', '客觀無說教')}</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600 shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">{t('landing.hero.traits.minimalDesign', '極簡設計')}</span>
          </div>
        </div>

      </div>

      
      {/* Right Column: 100% Live Real Component of App Dashboard (Single Source of Truth) */}
      <div className="hidden lg:flex lg:col-span-7 p-4 sm:p-6 lg:p-8 xl:p-12 bg-neutral-50 dark:bg-neutral-950 flex-col justify-center items-center transition-colors duration-200 overflow-hidden">
        <HeroShowcaseDeck />
      </div>

    </div>
  </section>

  <section id="diet" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      {/*  標題區塊 (單獨成行，居於上方)  */}
      <div className="space-y-4 max-w-3xl">
        <div className="font-mono text-xs text-telemetry-accent uppercase tracking-widest">
          {t('landing.diet.tag', '[ 01 / 飲食]')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight font-sans text-neutral-900 dark:text-white leading-[1.15]">
          {t('landing.diet.titleLine1', '零摩擦記錄飲食')}<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">{t('landing.diet.titleLine2', '準確食材、一鍵複製、快速估算、滾動均值')}</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          {t('landing.diet.desc', '記錄飲食不該是繁瑣負擔。e2Cal 針對真實生活打造零阻力記錄流：自煮時依托 420+ 種原型食材準確秤重；規律進餐時一鍵複製昨日餐點；外食聚餐時支援快速粗估。')}
        </p>
      </div>

      {/*  數據指標看板、四大記錄類型介紹與真實飲食展示視窗 (手機版橫向滑動查看，桌面版並列排版)  */}
      <div className="flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth items-start gap-4 sm:gap-6 lg:gap-10 font-mono pb-4 -mr-4 pr-4 sm:-mr-8 sm:pr-8 lg:mr-0 lg:pr-0 lg:pb-0 lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/*  左側欄：四大記錄模式介紹 + 底部三大核心指標 (手機端橫向吸附，桌面端緊湊精緻)  */}
        <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] lg:w-[400px] shrink-0 snap-start space-y-4">
          
          {/*  四大記錄類型介紹單元格 (食材、複製、估算、平均)  */}
          <div className="border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 rounded-lg bg-white dark:bg-black overflow-hidden shadow-none">
            {/*  類型 1: 原型食材  */}
            <div className="p-3.5 flex flex-col justify-between space-y-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider">
                  {t('landing.diet.types.raw.tag', '01 // 原型食材')}
                </span>
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  {t('landing.diet.types.raw.title', '自煮精準記錄')}
                </span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('landing.diet.types.raw.desc', '自煮秤重基準。內置 420+ 種原型食材未烹生重常數，以物理克數 (g) 錄入，杜絕吸水與出水誤差。')}
              </div>
            </div>

            {/*  類型 2: 一鍵複製  */}
            <div className="p-3.5 flex flex-col justify-between space-y-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider">
                  {t('landing.diet.types.copy.tag', '02 // 一鍵複製')}
                </span>
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  {t('landing.diet.types.copy.title', '複用記錄')}
                </span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('landing.diet.types.copy.desc', '規律飲食無摩擦。當進餐內容高度重複時，一鍵帶入昨日或歷史同餐所有食材配方，零重複手動錄入。')}
              </div>
            </div>

            {/*  類型 3: 快速估算  */}
            <div className="p-3.5 flex flex-col justify-between space-y-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider">
                  {t('landing.diet.types.estimate.tag', '03 // 快速估算')}
                </span>
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  {t('landing.diet.types.estimate.title', '外賣、聚餐')}
                </span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('landing.diet.types.estimate.desc', '社交聚餐零焦慮。外食或無法秤重情境，依連鎖門市與場景秒級預設熱量與三大元素，過濾記錄壓力。')}
              </div>
            </div>

            {/*  類型 4: 滾動平均  */}
            <div className="p-3.5 flex flex-col justify-between space-y-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider">
                  {t('landing.diet.types.average.tag', '04 // 滾動平均')}
                </span>
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  {t('landing.diet.types.average.title', '懶得記')}
                </span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('landing.diet.types.average.desc', '算我正常吃模式。依 7 日與 30 日歷史攝入自動代入平均預算，客觀平滑水分滯留與單日進食波動。')}
              </div>
            </div>
          </div>

          {/*  飲食核心數據指標單元格 (3 欄水平並列底座)  */}
          <div className="grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-black overflow-hidden shadow-none">
            {/*  指標 1: 內置食材數量  */}
            <div className="p-3 bg-white dark:bg-black flex flex-col space-y-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider h-4 flex items-center">
                {t('landing.diet.metrics.foodDb.label', '內置食材庫')}
              </div>
              <div className="h-7 sm:h-8 flex items-baseline gap-1 text-xl sm:text-2xl font-semibold tabular-nums text-black dark:text-white font-mono">
                {t('landing.diet.metrics.foodDb.value', '420+')} <span className="text-[11px] font-normal text-neutral-500 font-sans">{t('landing.diet.metrics.foodDb.unit', '項')}</span>
              </div>
              <div className="font-sans text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                {t('landing.diet.metrics.foodDb.desc', '標準原型生重，杜絕熟重偏差')}
              </div>
            </div>

            {/*  指標 2: 允許自定食譜  */}
            <div className="p-3 bg-white dark:bg-black flex flex-col space-y-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider h-4 flex items-center">
                {t('landing.diet.metrics.recipes.label', '複合菜餚')}
              </div>
              <div className="h-7 sm:h-8 flex items-baseline gap-1 text-xl sm:text-2xl font-semibold tabular-nums text-black dark:text-white font-mono">
                {t('landing.diet.metrics.recipes.value', '∞')} <span className="text-[11px] font-normal text-neutral-500 font-sans">{t('landing.diet.metrics.recipes.unit', '自訂')}</span>
              </div>
              <div className="font-sans text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                {t('landing.diet.metrics.recipes.desc', '自由組合食材，純 ID 引用無漂移')}
              </div>
            </div>

            {/*  指標 3: 烹調油黑盒歸零  */}
            <div className="p-3 bg-white dark:bg-black flex flex-col space-y-1 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider h-4 flex items-center">
                {t('landing.diet.metrics.oil.label', '烹調黑盒')}
              </div>
              <div className="h-7 sm:h-8 flex items-baseline gap-1 text-xl sm:text-2xl font-semibold tabular-nums text-black dark:text-white font-mono">
                {t('landing.diet.metrics.oil.value', '0')} <span className="text-[11px] font-normal text-neutral-500 font-sans">{t('landing.diet.metrics.oil.unit', '隱藏油')}</span>
              </div>
              <div className="font-sans text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                {t('landing.diet.metrics.oil.desc', '用油獨立計量，終結熱量盲區')}
              </div>
            </div>
          </div>

        </div>

        {/*  右側欄：飲食頁面展示 (手機端橫向吸附，桌面端保持原有寬度)  */}
        <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] lg:w-[440px] lg:max-w-[440px] shrink-0 snap-start">
          <div className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-hidden shadow-none transition-colors duration-200">
            
            {/* 模擬視窗狀態列 (Window Chrome Bar) */}
            <div className="px-3.5 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between font-mono text-xs bg-neutral-50 dark:bg-neutral-950 select-none pointer-events-none">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
              </div>
              <div className="flex items-center space-x-1 font-sans text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">e2Cal</span>
                <span className="text-neutral-400 dark:text-neutral-600">/</span>
                <span>{t('landing.diet.windowBar.module', '飲食')}</span>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-[11px] font-sans text-neutral-700 dark:text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-medium">{t('landing.diet.windowBar.synced', '已同步')}</span>
              </div>
            </div>

            {/* 核心真實 React 飲食頁面元件 (等比縮放 78%，早餐展開飲食分流選單) */}
            <div className="p-3 sm:p-4 bg-background select-none pointer-events-none" style={{ zoom: 0.78 }}>
              <DietView {...demoDietData} interactive={false} expandedMealPopover="breakfast" />
            </div>

          </div>
        </div>

      </div>

    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  03. STRENGTH & BIOMECHANICS (訓練記錄)                                     */}
  {/*  =========================================================================  */}
  <section id="workout" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      <div className="space-y-4 max-w-3xl">
        <div className="font-mono text-xs text-telemetry-accent uppercase tracking-widest">
          {t('landing.workout.tag', '[ 02 / 訓練]')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight font-sans text-neutral-900 dark:text-white">
          {t('landing.workout.titleLine1', '肌力生物力學與組數表')}<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">{t('landing.workout.titleLine2', '解剖熱圖、有效組數與純數學 e1RM')}</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          {t('landing.workout.desc', '嚴格區分熱身組與正式組，真實記錄重量與次數。透過成熟的 Brzycki / Epley 公式估算極限力量，自動統計每週有效訓練組數分佈，拒絕未經科學驗證的隨意評分。')}
        </p>
      </div>

      {/*  數據指標看板、動作組數記錄與動作歷史詳情 (縮放至真實 App 尺度 78%)  */}
      <div className="flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth items-start gap-4 sm:gap-6 lg:grid lg:grid-cols-3 lg:gap-6 xl:gap-8 font-mono text-xs pb-4 -mr-4 pr-4 sm:-mr-8 sm:pr-8 lg:mr-0 lg:pr-0 lg:pb-0 lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/*  卡片 1：真實肌群恢復狀態看板 (100% 複用真實 APP 元件 WorkoutRecoveryDashboard，單一真理源)  */}
        <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] lg:w-full shrink-0 snap-start" style={{ zoom: 0.78 }}>
          <WorkoutRecoveryDashboard
            recoverySummary={demoDashboardData.recoverySummary}
            exerciseCount={demoDashboardData.stats.exerciseCount}
            setCount={demoDashboardData.stats.setCount}
            totalVolume={demoDashboardData.stats.totalVolume}
            weightUnit={demoDashboardData.bodyWeightUnit}
            interactive={true}
          />
        </div>

        {/*  卡片 2：真實動作組數計量卡片 (100% 複用真實 APP 元件 WorkoutExerciseCard，單一真理源)  */}
        <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] lg:w-full shrink-0 snap-start space-y-4" style={{ zoom: 0.78 }}>
          {demoWorkoutExercisesData.map((ex) => (
            <WorkoutExerciseCard
              key={ex.exerciseName}
              exerciseName={ex.exerciseName}
              sets={ex.sets}
              bodyWeightUnit={ex.bodyWeightUnit}
              interactive={false}
            />
          ))}
        </div>

        {/*  卡片 3：真實動作詳情看板與訓練足跡 (100% 複用真實 APP 元件 ExerciseOverviewCard，單一真理源)  */}
        <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] lg:w-full shrink-0 snap-start" style={{ zoom: 0.78 }}>
          <ExerciseOverviewCard
            exerciseName={demoExerciseOverview.exerciseName}
            equipmentName={demoExerciseOverview.equipmentName}
            isArchived={demoExerciseOverview.isArchived}
            bestE1RM={demoExerciseOverview.bestE1RM}
            totalSets={demoExerciseOverview.totalSets}
            totalVolume={demoExerciseOverview.totalVolume}
            bodyWeightUnit={demoExerciseOverview.bodyWeightUnit}
            heatmapDays={demoExerciseOverview.heatmapDays}
            totalWeeks={demoExerciseOverview.totalWeeks}
            overviewPeriod={demoExerciseOverview.overviewPeriod}
            interactive={false}
          />
        </div>

      </div>

    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  04. BODY & PHYSIOLOGICAL EMA FILTER (體態記錄)                             */}
  {/*  =========================================================================  */}
  <section id="body" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      <div className="space-y-4 max-w-3xl">
        <div className="font-mono text-xs text-telemetry-accent uppercase tracking-widest">
          {t('landing.body.tag', '[ 03 / 體態]')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight font-sans text-neutral-900 dark:text-white">
          {t('landing.body.titleLine1', '過濾水分波動，看懂真實體態')}<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">{t('landing.body.titleLine2', '7 天平滑曲線、身體圍度追蹤與客觀進展')}</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          {t('landing.body.desc', '喝水多寡與重鹹飲食，常讓單日體重上下跳動 1～2 公斤。e2Cal 自動過濾水分干擾，幫你算出身體的真實增減趨勢；同步支援胸圍、腰圍等圍度追蹤，只擺客觀事實，告別體重焦慮。')}
        </p>
      </div>

      {/* 體態時序趨勢、今日數據與體態指標看板 (縮放至真實 App 尺度 78%) */}
      <div className="flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth items-start gap-4 sm:gap-6 lg:grid lg:grid-cols-3 lg:gap-6 xl:gap-8 font-mono text-xs pb-4 -mr-4 pr-4 sm:-mr-8 sm:pr-8 lg:mr-0 lg:pr-0 lg:pb-0 lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* 卡片 1：真實平滑體重時序趨勢折線圖 (100% 複用真實 APP 元件 WeightTrendChart，單一真理源) */}
        <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] lg:w-full shrink-0 snap-start" style={{ zoom: 0.78 }}>
          <WeightTrendChart
            data={DEMO_WEIGHT_TREND_DATA}
            unit={demoDashboardData.bodyWeightUnit}
            interactive={false}
          />
        </div>

        {/* 卡片 2：真實今日數據卡片 (100% 複用真實 APP 元件 BodyTodayDataCard，單一真理源) */}
        <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] lg:w-full shrink-0 snap-start" style={{ zoom: 0.78 }}>
          <BodyTodayDataCard
            {...DEMO_BODY_TODAY_DATA}
            interactive={false}
          />
        </div>

        {/* 卡片 3：真實體態指標看板 (100% 複用真實 APP 元件 BodyMetricsOverviewCard，單一真理源) */}
        <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] lg:w-full shrink-0 snap-start" style={{ zoom: 0.78 }}>
          <BodyMetricsOverviewCard
            {...DEMO_BODY_METRICS_DATA}
            interactive={false}
          />
        </div>

      </div>

    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  05. ANALYTICS & DATA SHARING (分析功能：不接黑盒 AI，數據自由給外部)            */}
  {/*  =========================================================================  */}
  <section id="analytics" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      <div className="space-y-4 max-w-3xl">
        <div className="font-mono text-xs text-telemetry-accent uppercase tracking-widest">
          {t('landing.analytics.tag', '[ 04 / 分析]')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight font-sans text-neutral-900 dark:text-white">
          {t('landing.analytics.titleLine1', '內部零黑盒 AI')}<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">{t('landing.analytics.titleLine2', '外部開放自由分析')}</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          {t('landing.analytics.desc', '我們不在軟體裡塞入未經科學驗證的 AI 評分機制。e2Cal 的職責是提供毫秒級的客觀事實，並主動幫你整理好格式：一鍵導出為適合 ChatGPT 與 Claude 的對話文字，或一張精緻的長圖。分析的自由與決策權，始終 100% 握在你手裡。')}
        </p>
      </div>

      {/* 數據分享模式展示 (100% 複用真實分享界面的圖片、純文本、JSON 三大模式) */}
      <ShareShowcaseCards />

    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  06. SYNC & UNIVERSAL PWA (Dropbox 同步與 PWA 通用)                          */}
  {/*  =========================================================================  */}
  <section id="sync" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      <div className="space-y-4 max-w-3xl">
        <div className="font-mono text-xs text-telemetry-accent uppercase tracking-widest">
          {t('landing.sync.tag', '[ 05 / 同步]')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight font-sans text-neutral-900 dark:text-white">
          {t('landing.sync.titleLine1', '數據完全歸你，斷網也能秒開記錄')}<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">{t('landing.sync.titleLine2', '離線可用、個人 Dropbox 私密同步與一鍵打包匯出')}</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          {t('landing.sync.desc', '你的身體數據不經過任何第三方雲端伺服器，直接保存在手機與電腦中。需要多設備同步時直連你的個人 Dropbox，斷網依然流暢好用，隨時都能一鍵完整打包帶走。')}
        </p>
      </div>

      {/* 多設備 Dropbox 同步線路圖 (以上方文本 max-w-3xl 中心區域對齊) */}
      <div className="max-w-3xl">
        <SyncTopologyDiagram />
      </div>
    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  07. WHY WE DON'T DO XX (為什麼我們不做 xx)                                  */}
  {/*  =========================================================================  */}
  <section id="non-goals" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      <div className="space-y-4 max-w-3xl">
        <div className="font-mono text-xs text-telemetry-accent uppercase tracking-widest">
          {t('landing.principles.tag', '[ 06 / 原則]')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight font-sans text-neutral-900 dark:text-white">
          {t('landing.principles.titleLine1', '拒絕製造焦慮')}<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">{t('landing.principles.titleLine2', '不搞社交、不催打卡、不給指令、不做成品黑盒')}</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          {t('landing.principles.desc', '你不需要一個軟體每天催你打卡、對你說教，或是逼你跟別人比較。e2Cal 刻意拿掉所有惱人的套路：今天記錄，今天就是事實；今天沒記，明天打開依舊是一把乾淨、安靜待命的記錄工具。')}
        </p>
      </div>

      {/*  4 Non-Goals Pillars (手機端兩欄可橫向滑動加寬卡片：初始顯示 01/03，右滑顯示 02/04；桌面端 2 欄並列等高排版)  */}
      <div className="flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth gap-3 sm:gap-6 pb-4 -mr-4 pr-4 sm:mr-0 sm:pr-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 font-mono text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/*  左欄：01 與 03 (手機端初始顯露卡片組，寬度加寬至 84vw)  */}
        <div className="w-[84vw] max-w-[350px] sm:w-full sm:max-w-none shrink-0 snap-start flex flex-col gap-3 sm:gap-6">
          {/*  Non-goal 1  */}
          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5 sm:p-6 rounded-lg space-y-5 shadow-none flex flex-col justify-between flex-1">
            <div className="space-y-3">
              <div className="flex items-center text-neutral-900 dark:text-white font-bold text-xs pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <span>{t('landing.principles.items.item1.tag', '01 // 不做評分和行為指令')}</span>
              </div>
              <h3 className="text-neutral-900 dark:text-white text-sm sm:text-base font-sans font-bold leading-snug">{t('landing.principles.items.item1.title', '拒絕黑盒說教與主觀評判')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
                {t('landing.principles.items.item1.desc', '我們嚴禁在軟體中指示「你少吃了」、「你吃超標了」或「你退步了」；絕對不設置帶有羞辱感的紅色警報卡片。軟體是冷靜的鏡子，決策權 100% 歸還使用者。')}
              </p>
            </div>

            {/* 視覺微型 UI 對比 */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs select-none pt-1">
              <div className="rounded border border-red-200 dark:border-red-950/50 bg-red-50/50 dark:bg-red-950/20 text-[11px] overflow-hidden flex flex-col justify-between">
                <div className="px-2.5 py-1.5 border-b border-red-200 dark:border-red-900/50 flex items-center space-x-1.5 text-red-600 dark:text-red-400 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 stroke-[1.5]" />
                  <span>{t('landing.principles.items.item1.legacyTitle', '傳統評分')}</span>
                </div>
                <div className="p-2.5 line-through text-neutral-400 text-[11px] leading-tight flex-1 flex items-center">
                  {t('landing.principles.items.item1.legacyBad', '今天碳水太高了，明天多跑 40 分鐘消耗。')}
                </div>
              </div>

              <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-[11px] overflow-hidden flex flex-col justify-between">
                <div className="px-2.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center space-x-1.5 text-neutral-900 dark:text-white font-semibold text-[11px]">
                  <BarChart2 className="w-3.5 h-3.5 shrink-0 stroke-[1.5] text-neutral-500 dark:text-neutral-400" />
                  <span>{t('landing.principles.items.item1.factTitle', '客觀事實')}</span>
                </div>
                <div className="p-2.5 font-mono text-[11px] text-neutral-900 dark:text-white flex-1 flex flex-col justify-center gap-1">
                  <div className="font-semibold tabular-nums leading-tight">
                    {t('landing.principles.items.item1.factGood', '2,180 / 2,000 kcal · 超出 +180 kcal')}
                  </div>
                  <div className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    {t('landing.principles.items.item1.factNote', '只會根據你的記錄呈現客觀事實。多吃少吃，多動少動，完全取決於你自己。')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/*  Non-goal 3  */}
          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5 sm:p-6 rounded-lg space-y-5 shadow-none flex flex-col justify-between flex-1">
            <div className="space-y-3">
              <div className="flex items-center text-neutral-900 dark:text-white font-bold text-xs pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <span>{t('landing.principles.items.item3.tag', '03 // 不做強制打卡與斷簽懲罰')}</span>
              </div>
              <h3 className="text-neutral-900 dark:text-white text-sm sm:text-base font-sans font-bold leading-snug">{t('landing.principles.items.item3.title', '真正的自律不需要外部羞恥機制')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
                {t('landing.principles.items.item3.desc', '不設置斷簽警告或紅點催促。今天記錄，今天就是事實；今天沒記，明天打開依舊是一把乾淨、隨時待命的記錄工具。')}
              </p>
            </div>

            {/* 視覺微型 UI 對比 */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs select-none pt-1">
              <div className="rounded border border-amber-200 dark:border-amber-950/50 bg-amber-50/50 dark:bg-amber-950/20 text-[11px] overflow-hidden flex flex-col justify-between">
                <div className="px-2.5 py-1.5 border-b border-amber-200 dark:border-amber-900/50 flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                  <Flame className="w-3.5 h-3.5 shrink-0 stroke-[1.5]" />
                  <span>{t('landing.principles.items.item3.legacyTitle', '連續打卡中斷')}</span>
                </div>
                <div className="p-2.5 line-through text-neutral-400 text-[11px] leading-tight flex-1 flex items-center">
                  {t('landing.principles.items.item3.legacyBad', '已斷簽，看廣告或花費 50 鑽石補簽。')}
                </div>
              </div>

              <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-[11px] overflow-hidden flex flex-col justify-between">
                <div className="px-2.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <CircleDot className="w-3.5 h-3.5 shrink-0 stroke-[1.5] text-neutral-500 dark:text-neutral-400" />
                    <span className="font-semibold text-neutral-900 dark:text-white">{t('landing.principles.items.item3.factTitle', '隨時安靜待命')}</span>
                  </div>
                </div>
                <div className="p-2.5 font-sans text-[11px] leading-snug text-neutral-900 dark:text-white flex-1 flex items-center">
                  {t('landing.principles.items.item3.factGood', '記或不記，都是事實。你的身體和生活才是重點所在，不需要為斷續感到羞恥。')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*  右欄：02 與 04 (手機端需向右滑動顯露卡片組，寬度加寬至 84vw)  */}
        <div className="w-[84vw] max-w-[350px] sm:w-full sm:max-w-none shrink-0 snap-start flex flex-col gap-3 sm:gap-6">
          {/*  Non-goal 2  */}
          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5 sm:p-6 rounded-lg space-y-5 shadow-none flex flex-col justify-between flex-1">
            <div className="space-y-3">
              <div className="flex items-center text-neutral-900 dark:text-white font-bold text-xs pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <span>{t('landing.principles.items.item2.tag', '02 // 不做社交社群與心靈雞湯')}</span>
              </div>
              <h3 className="text-neutral-900 dark:text-white text-sm sm:text-base font-sans font-bold leading-snug">{t('landing.principles.items.item2.title', '拒絕同儕焦慮與動態打擾')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
                {t('landing.principles.items.item2.desc', '沒有動態廣場、沒有點讚排行、沒有同儕比較。自我量化是一場自己與物理事實的嚴肅對話，無須向外界表演自律。')}
              </p>
            </div>

            {/* 視覺微型 UI 對比 */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs select-none pt-1">
              <div className="rounded border border-sky-200 dark:border-sky-950/50 bg-sky-50/50 dark:bg-sky-950/20 text-[11px] overflow-hidden flex flex-col justify-between">
                <div className="px-2.5 py-1.5 border-b border-sky-200 dark:border-sky-900/50 flex items-center space-x-1.5 text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                  <Trophy className="w-3.5 h-3.5 shrink-0 stroke-[1.5]" />
                  <span>{t('landing.principles.items.item2.legacyTitle', '好友動態')}</span>
                </div>
                <div className="p-2.5 line-through text-neutral-400 text-[11px] leading-tight flex-1 flex items-center">
                  {t('landing.principles.items.item2.legacyBad', '小陳的體脂高於 90% 同齡人，努力加油超越他吧。')}
                </div>
              </div>

              <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-[11px] overflow-hidden flex flex-col justify-between">
                <div className="px-2.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0 stroke-[1.5] text-neutral-500 dark:text-neutral-400" />
                    <span className="font-semibold text-neutral-900 dark:text-white">{t('landing.principles.items.item2.factTitle', '自我量化')}</span>
                  </div>
                </div>
                <div className="p-2.5 font-sans text-[11px] leading-snug text-neutral-900 dark:text-white flex-1 flex items-center">
                  {t('landing.principles.items.item2.factGood', '僅儲存於本機 IndexedDB · 無公開動態。拒絕製造焦慮，無需向外界表演自律。')}
                </div>
              </div>
            </div>
          </div>

          {/*  Non-goal 4  */}
          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5 sm:p-6 rounded-lg space-y-5 shadow-none flex flex-col justify-between flex-1">
            <div className="space-y-3">
              <div className="flex items-center text-neutral-900 dark:text-white font-bold text-xs pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <span>{t('landing.principles.items.item4.tag', '04 // 不做模糊的成品菜熱量估算')}</span>
              </div>
              <h3 className="text-neutral-900 dark:text-white text-sm sm:text-base font-sans font-bold leading-snug">{t('landing.principles.items.item4.title', '拒絕「一碗紅燒牛肉麵 = 750 大卡」的黑盒謊言')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
                {t('landing.principles.items.item4.desc', '成品菜估算充滿了不可控的烹調油與吸水率偏差。e2Cal 堅持以原子食材生重為唯一真理源，引導使用者建立真正的克數秤重感知。')}
              </p>
            </div>

            {/* 視覺微型 UI 對比 */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs select-none pt-1">
              <div className="rounded border border-violet-200 dark:border-violet-950/50 bg-violet-50/50 dark:bg-violet-950/20 text-[11px] overflow-hidden flex flex-col justify-between">
                <div className="px-2.5 py-1.5 border-b border-violet-200 dark:border-violet-900/50 flex items-center space-x-1.5 text-[11px] text-violet-600 dark:text-violet-400 font-semibold">
                  <Utensils className="w-3.5 h-3.5 shrink-0 stroke-[1.5]" />
                  <span>{t('landing.principles.items.item4.legacyTitle', '成品菜資料庫')}</span>
                </div>
                <div className="p-2.5 line-through text-neutral-400 text-[11px] leading-tight flex-1 flex items-center">
                  {t('landing.principles.items.item4.legacyBad', '固定計算：紅燒牛肉麵 1 碗 = 750 大卡')}
                </div>
              </div>

              <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-[11px] overflow-hidden flex flex-col justify-between">
                <div className="px-2.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center space-x-1.5 text-[11px] font-semibold text-neutral-900 dark:text-white">
                  <Scale className="w-3.5 h-3.5 shrink-0 stroke-[1.5] text-neutral-500 dark:text-neutral-400" />
                  <span>{t('landing.principles.items.item4.factTitle', '食材拆解')}</span>
                </div>
                <div className="p-2.5 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 space-y-0.5 flex-1 flex flex-col justify-center">
                  <div>{t('landing.principles.items.item4.factLine1', '牛腱 150g · 麵 80g')}</div>
                  <div className="text-telemetry-accent font-semibold">{t('landing.principles.items.item4.factLine2', '+ 橄欖油 8g')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  08. TECHNICAL ARCHITECTURE & RIGOR (技術細節)                              */}
  {/*  =========================================================================  */}
  <section id="tech" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black font-mono text-xs transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      <div className="space-y-4 max-w-3xl">
        <div className="text-xs text-telemetry-accent uppercase tracking-widest font-mono">
          {t('landing.tech.tag', '[ 07 / 技術]')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight font-sans text-neutral-900 dark:text-white">
          {t('landing.tech.titleLine1', '可靠，源自極致克制')}<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">{t('landing.tech.titleLine2', '零外部依賴、純本地計算、永不損毀數據')}</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          {t('landing.tech.desc', '拒絕臃腫的第三方追蹤與肥大框架。e2Cal 透過無副作用純數學純函數與 100% 單元測試防線，保證你的每一次點擊都獲得毫秒級的確定性。')}
        </p>
      </div>

      {/*  Technical Architecture Specs Grid (手機端支援左右滾動橫向吸附，桌面端 3 欄等分網格)  */}
      <div className="flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mr-4 pr-4 sm:-mr-8 sm:pr-8 md:mr-0 md:pr-0 md:pb-0 md:overflow-visible md:grid md:grid-cols-3 gap-4 sm:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/*  卡片 1  */}
        <div className="w-[84vw] max-w-[350px] md:w-full md:max-w-none shrink-0 snap-start border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-5 sm:p-6 rounded-lg space-y-3 shadow-none flex flex-col justify-between">
          <div>
            <div className="text-black dark:text-white font-bold text-sm border-b border-neutral-200 dark:border-neutral-800 pb-2">{t('landing.tech.cards.speed.title', '01 // 極致速度與流暢')}</div>
            <div className="text-neutral-600 dark:text-neutral-400 font-sans space-y-1.5 leading-relaxed text-xs mt-3">
              <div>• <strong>{t('landing.tech.cards.speed.point1Title', '零等待時間')}</strong>：{t('landing.tech.cards.speed.point1Desc', '代碼與數據皆在本地運行，徹底告別傳統 App 轉圈等待。')}</div>
              <div>• <strong>{t('landing.tech.cards.speed.point2Title', '極度穩定防護')}</strong>：{t('landing.tech.cards.speed.point2Desc', 'TypeScript 嚴格型別約束，杜絕隱藏閃退與突發錯誤。')}</div>
              <div>• <strong>{t('landing.tech.cards.speed.point3Title', '專注手機體驗')}</strong>：{t('landing.tech.cards.speed.point3Desc', '介面深度適配行動端，鍵盤彈出不遮擋、滾動不跳動。')}</div>
            </div>
          </div>
        </div>

        {/*  卡片 2  */}
        <div className="w-[84vw] max-w-[350px] md:w-full md:max-w-none shrink-0 snap-start border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-5 sm:p-6 rounded-lg space-y-3 shadow-none flex flex-col justify-between">
          <div>
            <div className="text-black dark:text-white font-bold text-sm border-b border-neutral-200 dark:border-neutral-800 pb-2">{t('landing.tech.cards.safety.title', '02 // 永不損毀的數據')}</div>
            <div className="text-neutral-600 dark:text-neutral-400 font-sans space-y-1.5 leading-relaxed text-xs mt-3">
              <div>• <strong>{t('landing.tech.cards.safety.point1Title', '原生本地儲存')}</strong>：{t('landing.tech.cards.safety.point1Desc', '數據直接留在設備內部，享有專屬防清理保護。')}</div>
              <div>• <strong>{t('landing.tech.cards.safety.point2Title', '無感平滑升級')}</strong>：{t('landing.tech.cards.safety.point2Desc', '軟體升級時自動安全遷移，永遠不覆蓋或丟失歷史記錄。')}</div>
              <div>• <strong>{t('landing.tech.cards.safety.point3Title', '數據始終一致')}</strong>：{t('landing.tech.cards.safety.point3Desc', '食材與動作採純 ID 引用，改動一處全域同步，拒絕資料錯亂。')}</div>
            </div>
          </div>
        </div>

        {/*  卡片 3  */}
        <div className="w-[84vw] max-w-[350px] md:w-full md:max-w-none shrink-0 snap-start border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-5 sm:p-6 rounded-lg space-y-3 shadow-none flex flex-col justify-between">
          <div>
            <div className="text-black dark:text-white font-bold text-sm border-b border-neutral-200 dark:border-neutral-800 pb-2">{t('landing.tech.cards.math.title', '03 // 純數學與精準驗證')}</div>
            <div className="text-neutral-600 dark:text-neutral-400 font-sans space-y-1.5 leading-relaxed text-xs mt-3">
              <div>• <strong>{t('landing.tech.cards.math.point1Title', '透明科學算法')}</strong>：{t('landing.tech.cards.math.point1Desc', '力量極限、體重去噪趨勢、供能比皆由客觀純數學推算。')}</div>
              <div>• <strong>{t('landing.tech.cards.math.point2Title', '540+ 項測試守護')}</strong>：{t('landing.tech.cards.math.point2Desc', '覆蓋所有邊界狀況，維持 100% 單元測試通過保證。')}</div>
              <div>• <strong>{t('landing.tech.cards.math.point3Title', '拒絕主觀干涉')}</strong>：{t('landing.tech.cards.math.point3Desc', '只呈現冷靜物理事實，不對你的自律妄加評分。')}</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  FOOTER                                                                     */}
  {/*  =========================================================================  */}
  <footer className="py-12 px-4 sm:px-8 bg-neutral-100 dark:bg-black border-t border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-500 transition-colors duration-200">
    <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
      
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 1024 1024" className="w-6 h-6 rounded-md shrink-0 select-none overflow-hidden border border-transparent dark:border-neutral-800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="240" fill="#000000" />
          <g transform="translate(187 187)">
            <g transform="translate(132.031 91.406)">
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743674 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743674 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 0 0)" />
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 40.625 0)" />
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23103 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23103 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 81.25 0)" />
              <path d="M0 0L101.562 0C101.562 0 101.562 55.8594 101.562 55.8594C101.562 86.3281 81.25 106.641 50.7812 106.641C20.3125 106.641 0 86.3281 0 55.8594C0 55.8594 0 0 0 0Z" fill="#FFFFFF" transform="matrix(1 0 0 1 0 111.719)" />
              <path d="M0 28.111L0 14.0555C0 10.1742 1.23946 6.86128 3.71837 4.11676C6.19728 1.37225 9.1896 0 12.6953 0C16.201 0 19.1933 1.37225 21.6722 4.11676C24.1512 6.86128 25.3906 10.1742 25.3906 14.0555L25.3906 261.433C25.3906 265.314 24.1512 268.627 21.6722 271.371C19.1933 274.116 16.201 275.488 12.6953 275.488C9.1896 275.488 6.19728 274.116 3.71837 271.371C1.23946 268.627 0 265.314 0 261.433L0 28.111Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 38.086 191.699)" />
              <path d="M0 20.3125L0 10.1562C0 7.35168 0.991562 4.95783 2.9747 2.9747C4.95782 0.991565 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991565 134.135 2.9747C136.118 4.95783 137.109 7.35168 137.109 10.1562L137.109 55.8594C137.109 58.6639 136.118 61.0578 134.135 63.0409C132.151 65.024 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.0409C0.991562 61.0578 0 58.6639 0 55.8594L0 20.3125Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 248.828 0)" />
              <path d="M0 8.88671L0 5.07812C0 3.67583 0.495789 2.47891 1.48734 1.48735C2.47891 0.495781 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495781 89.9189 1.48735C90.9105 2.47891 91.4063 3.67583 91.4063 5.07812L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88671Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 271.68 66.016)" />
              <path d="M0 17.0418L0 8.52092C0 6.16794 0.743683 4.15953 2.23102 2.49572C3.71838 0.831909 5.51376 0 7.61719 0L27.9297 0C30.0331 0 31.8285 0.831909 33.3159 2.49572C34.8032 4.15953 35.5469 6.16794 35.5469 8.52092L35.5469 326.635C35.5469 328.988 34.8032 330.997 33.3159 332.661C31.8285 334.324 30.0331 335.156 27.9297 335.156L7.61719 335.156C5.51376 335.156 3.71838 334.324 2.23102 332.661C0.743683 330.997 0 328.988 0 326.635L0 17.0418Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 299.609 66.016)" />
              <path d="M0 8.88672L0 5.07813C0 3.67584 0.495789 2.47891 1.48734 1.48734C2.47891 0.495789 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495789 89.9189 1.48734C90.9105 2.47891 91.4063 3.67584 91.4063 5.07813L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88672Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 271.68 383.398)" />
              <path d="M0 20.3125L0 10.1563C0 7.35168 0.991562 4.95782 2.9747 2.9747C4.95782 0.991577 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991577 134.135 2.9747C136.118 4.95782 137.109 7.35168 137.109 10.1563L137.109 55.8594C137.109 58.664 136.118 61.0578 134.135 63.041C132.151 65.0241 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.0241 2.9747 63.041C0.991562 61.0578 0 58.664 0 55.8594L0 20.3125Z" fill="#FFFFFF" fillRule="evenodd" transform="matrix(1 0 0 1 248.828 401.172)" />
            </g>
          </g>
        </svg>
        <span className="text-neutral-900 dark:text-white font-semibold text-sm tracking-tight font-sans leading-none">e2Cal</span>
      </div>

      <div className="flex items-center space-x-6 text-[11px]">
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("hero");
          }}
          className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
        >
          {t('landing.nav.backToTop', '回到頂部 ↑')}
        </a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("diet"); }} href="#diet" className="hover:text-black dark:hover:text-white transition-colors">{t('landing.nav.diet', '飲食')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("workout"); }} href="#workout" className="hover:text-black dark:hover:text-white transition-colors">{t('landing.nav.workout', '訓練')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("body"); }} href="#body" className="hover:text-black dark:hover:text-white transition-colors">{t('landing.nav.body', '體態')}</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("tech"); }} href="#tech" className="hover:text-black dark:hover:text-white transition-colors">{t('landing.nav.specs', '規格')}</a>
      </div>

      <div>
        {t('landing.footer.license', 'MIT License · Local-First Architecture · 2026')}
      </div>

    </div>
  </footer>

  <SetupProfileDialog
    open={isSetupDialogOpen}
    onOpenChange={setIsSetupDialogOpen}
    onComplete={(name) => {
      setIsSetupDialogOpen(false);
      setWelcomeUserName(name || profile.name || '');
      setIsTransitionOpen(true);
    }}
  />

  <WelcomeTransitionOverlay
    open={isTransitionOpen}
    userName={welcomeUserName}
    onFinish={() => navigate('/app')}
  />

  {/*  =========================================================================  */}
  {/*  JAVASCRIPT CONTROLLERS (LIGHT / DARK THEME MANAGER)                        */}
  {/*  =========================================================================  */}
  


    </div>
  );
}
