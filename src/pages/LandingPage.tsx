import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { Sun, Moon, ArrowUpRight } from 'lucide-react';
import { DashboardView, DEMO_DASHBOARD_DATA } from '@/components/dashboard/DashboardView';
import { DietView, DEMO_DIET_DATA } from '@/components/diet/DietView';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById('landing-container');
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
  <header className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
    <div className="w-full flex items-center h-14 divide-x divide-neutral-200 dark:divide-neutral-800">

      {/*  Logo & Identity: Full-bleed Left Cell  */}
      <a href="#hero" className="h-full px-5 sm:px-8 md:px-12 flex-1 min-w-0 md:flex-initial md:min-w-[240px] flex items-center space-x-3 shrink-0 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors group">
        <svg viewBox="0 0 1024 1024" className="w-6 h-6 rounded-[23%] shrink-0 select-none overflow-hidden transition-transform group-hover:scale-105 border border-neutral-200 dark:border-neutral-800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="240" fill="#000000" />
          <g transform="translate(187 187)">
            <g transform="translate(132.031 91.406)">
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743674 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743674 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 0 0)" />
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 40.625 0)" />
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23103 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23103 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 81.25 0)" />
              <path d="M0 0L101.562 0C101.562 0 101.562 55.8594 101.562 55.8594C101.562 86.3281 81.25 106.641 50.7812 106.641C20.3125 106.641 0 86.3281 0 55.8594C0 55.8594 0 0 0 0Z" fill="#FFFFFF" transform="matrix(1 0 0 1 0 111.719)" />
              <path d="M0 28.111L0 14.0555C0 10.1742 1.23946 6.86128 3.71837 4.11676C6.19728 1.37225 9.1896 0 12.6953 0C16.201 0 19.1933 1.37225 21.6722 4.11676C24.1512 6.86128 25.3906 10.1742 25.3906 14.0555L25.3906 261.433C25.3906 265.314 24.1512 268.627 21.6722 271.371C19.1933 274.116 16.201 275.488 12.6953 275.488C9.1896 275.488 6.19728 274.116 3.71837 271.371C1.23946 268.627 0 265.314 0 261.433L0 28.111Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 38.086 191.699)" />
              <path d="M0 20.3125L0 10.1562C0 7.35168 0.991562 4.95783 2.9747 2.9747C4.95782 0.991565 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991565 134.135 2.9747C136.118 4.95783 137.109 7.35168 137.109 10.1562L137.109 55.8594C137.109 58.6639 136.118 61.0578 134.135 63.0409C132.151 65.024 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.0409C0.991562 61.0578 0 58.6639 0 55.8594L0 20.3125Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 248.828 0)" />
              <path d="M0 8.88671L0 5.07812C0 3.67583 0.495789 2.47891 1.48734 1.48735C2.47891 0.495781 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495781 89.9189 1.48735C90.9105 2.47891 91.4063 3.67583 91.4063 5.07812L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88671Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 271.68 66.016)" />
              <path d="M0 17.0418L0 8.52092C0 6.16794 0.743683 4.15953 2.23102 2.49572C3.71838 0.831909 5.51376 0 7.61719 0L27.9297 0C30.0331 0 31.8285 0.831909 33.3159 2.49572C34.8032 4.15953 35.5469 6.16794 35.5469 8.52092L35.5469 326.635C35.5469 328.988 34.8032 330.997 33.3159 332.661C31.8285 334.324 30.0331 335.156 27.9297 335.156L7.61719 335.156C5.51376 335.156 3.71838 334.324 2.23102 332.661C0.743683 330.997 0 328.988 0 326.635L0 17.0418Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 299.609 66.016)" />
              <path d="M0 8.88672L0 5.07813C0 3.67584 0.495789 2.47891 1.48734 1.48734C2.47891 0.495789 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495789 89.9189 1.48734C90.9105 2.47891 91.4063 3.67584 91.4063 5.07813L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88672Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 271.68 383.398)" />
              <path d="M0 20.3125L0 10.1563C0 7.35168 0.991562 4.95782 2.9747 2.9747C4.95782 0.991577 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991577 134.135 2.9747C136.118 4.95782 137.109 7.35168 137.109 10.1563L137.109 55.8594C137.109 58.664 136.118 61.0578 134.135 63.041C132.151 65.0241 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.041C0.991562 61.0578 0 58.664 0 55.8594L0 20.3125Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 248.828 401.172)" />
            </g>
          </g>
        </svg>
        <span className="font-sans text-sm font-semibold tracking-tight text-black dark:text-white">Zenfit</span>
      </a>

      {/*  Navigation Links: Full-width Edge-to-Edge Grid  */}
      <nav className="hidden md:flex items-center h-full flex-1 divide-x divide-neutral-200 dark:divide-neutral-800 font-mono text-xs text-neutral-600 dark:text-neutral-400">
        <a onClick={(e) => { e.preventDefault(); scrollToSection("diet"); }} href="#diet" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">飲食</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("workout"); }} href="#workout" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">訓練</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("body"); }} href="#body" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">體態</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("analytics"); }} href="#analytics" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">分析</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("sync"); }} href="#sync" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">同步</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("non-goals"); }} href="#non-goals" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">原則</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("tech"); }} href="#tech" className="h-full flex-1 flex items-center justify-center hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">技術</a>
      </nav>

      {/*  Action Area: Full-bleed Right Cells (Symmetrical Equal-width Twin Cells)  */}
      <div className="flex items-center h-full shrink-0 ml-auto md:ml-0 divide-x divide-neutral-200 dark:divide-neutral-800 font-mono text-xs">
        <button
          type="button"
          onClick={toggleTheme}
          id="theme-toggle-btn"
          className="h-full w-28 sm:w-36 flex items-center justify-center space-x-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          title="切換淺色/深色模式"
        >
          <span id="theme-icon" className="flex items-center justify-center">
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </span>
          <span id="theme-text">{theme === 'dark' ? '深色' : '淺色'}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-full w-28 sm:w-36 flex items-center justify-center space-x-1.5 bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-semibold transition-colors cursor-pointer"
        >
          <span>開啟應用</span>
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

    </div>
  </header>

  {/*  =========================================================================  */}
  {/*  01. HERO / ABOVE-THE-FOLD MAIN SHOWCASE (主流內容展示)                     */}
  {/*  =========================================================================  */}
  <section id="hero" className="relative border-b border-neutral-200 dark:border-neutral-800 bg-grid-theme overflow-hidden transition-colors duration-200">

    <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:min-h-[calc(100vh-50px)]">
      
      {/*  Left Column: Manifesto & Value Proposition  */}
      <div className="lg:col-span-5 pt-10 pb-8 px-6 sm:p-12 lg:p-16 xl:p-20 border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-center space-y-8 bg-white dark:bg-black transition-colors duration-200">
        
        <div className="space-y-6">
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

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight font-sans text-neutral-900 dark:text-white leading-[1.12]">
              只記數據，<br />
              <span className="text-neutral-500 font-mono font-normal">絕不對你指手畫腳。</span>
            </h1>
          </div>

          <p className="text-neutral-600 dark:text-neutral-400 font-sans text-sm sm:text-base leading-relaxed">
            記錄身體不該帶來壓力。今天吃了多少、練了幾組，軟體只如實告訴你真實數字，絕不批判你吃多吃少，更不強迫打卡斷簽。完全支援離線使用，每一次輸入都乾脆俐落。
          </p>

          {/*  CTAs  */}
          <div className="pt-2 flex flex-wrap items-center gap-3 font-mono text-xs">
            <a onClick={(e) => { e.preventDefault(); scrollToSection("diet"); }} href="#diet" className="px-5 py-3 bg-black text-white dark:bg-white dark:text-black font-semibold rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center space-x-2">
              <span>探索度量系統</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
            <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
              PWA 離線安裝 · 100% 數據私有化
            </div>
          </div>
        </div>

        {/*  Core Characteristics List (一行兩個排版)  */}
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-500 dark:text-neutral-400 grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">100% 本地優先</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">全平台支援</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">Dropbox 同步</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e0533c] shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">客觀無說教</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600 shrink-0"></span>
            <span className="text-neutral-800 dark:text-neutral-200">極簡設計</span>
          </div>
        </div>

      </div>

      
      {/* Right Column: 100% Live Real Component of App Dashboard (Single Source of Truth) */}
      <div className="hidden lg:flex lg:col-span-7 p-4 sm:p-8 lg:p-12 bg-neutral-50 dark:bg-neutral-950 flex-col justify-center items-center transition-colors duration-200">
        
        {/* Window Frame Container (Precision Border, Flat, No Shadow) */}
        <div className="w-full max-w-[330px] sm:max-w-[350px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-hidden select-none pointer-events-none shadow-none">
          
          {/* Mock Window Titlebar / App Status Header */}
          <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between font-mono text-[11px] bg-neutral-50 dark:bg-neutral-950">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
            </div>
            <div className="flex items-center space-x-1 font-sans text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Zenfit</span>
              <span className="text-neutral-400 dark:text-neutral-600">/</span>
              <span>總覽</span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>0.12ms</span>
            </div>
          </div>

          {/* 核心真實 React 總覽元件 (100% 複用真實代碼與模型，內容等比縮放 72%) */}
          <div className="p-3 sm:p-3.5 bg-white dark:bg-black" style={{ zoom: 0.72 }}>
            <DashboardView
              {...DEMO_DASHBOARD_DATA}
              className="pb-0"
              onNavigateBody={() => navigate('/body')}
              onNavigateDiet={() => navigate('/diet')}
              onNavigateWorkout={() => navigate('/workout')}
            />
          </div>

        </div>

      </div>

    </div>
  </section>

  <section id="diet" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      {/*  標題區塊 (單獨成行，居於上方)  */}
      <div className="space-y-4 max-w-3xl">
        <div className="font-mono text-xs text-telemetry-accent uppercase tracking-widest">
          [ 02 / 飲食度量 · EFFORTLESS NUTRITION ]
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-sans text-neutral-900 dark:text-white leading-[1.15]">
          零摩擦記錄飲食。<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">準確食材、一鍵複製、快速估算、滾動均值。</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          記錄飲食不該是繁瑣負擔。Zenfit 針對真實生活打造零阻力記錄流：自煮時依托 420+ 種原型食材準確秤重；規律進餐時一鍵複製昨日餐點；外食聚餐時支援快速粗估；並以 7 天與 30 天滾動均值過濾日常水分與熱量波動，冷靜呈現真實能量平衡。
        </p>
      </div>

      {/*  數據指標看板、四大記錄類型介紹與真實飲食展示視窗 (左側縱向堆疊，右側視窗對齊)  */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-mono">
        
        {/*  左側欄 (7 欄)：四大記錄模式介紹 + 底部三大核心指標  */}
        <div className="lg:col-span-7 space-y-6">
          
          {/*  四大記錄類型介紹單元格 (食材、複製、估算、平均)  */}
          <div className="border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-950 overflow-hidden shadow-none">
            {/*  類型 1: 原型食材  */}
            <div className="p-4 sm:p-4.5 flex flex-col justify-between space-y-1.5 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  01 // 原型食材
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  準確生重
                </span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                自煮秤重基準。內置 420+ 種原型食材未烹生重常數，以物理克數 (g) 錄入，杜絕吸水與出水誤差。
              </div>
            </div>

            {/*  類型 2: 一鍵複製  */}
            <div className="p-4 sm:p-4.5 flex flex-col justify-between space-y-1.5 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider">
                  02 // 一鍵複製
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  昨日餐點
                </span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                規律飲食無摩擦。當進餐內容高度重複時，一鍵帶入昨日或歷史同餐所有食材配方，零重複手動錄入。
              </div>
            </div>

            {/*  類型 3: 快速估算  */}
            <div className="p-4 sm:p-4.5 flex flex-col justify-between space-y-1.5 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                  03 // 快速估算
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  場景粗估
                </span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                社交聚餐零焦慮。外食或無法秤重情境，依連鎖門市與場景秒級預設熱量與三大元素，過濾記錄壓力。
              </div>
            </div>

            {/*  類型 4: 滾動平均  */}
            <div className="p-4 sm:p-4.5 flex flex-col justify-between space-y-1.5 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider">
                  04 // 滾動平均
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  正常吃
                </span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                算我正常吃模式。依 7 日與 30 日歷史攝入自動代入平均預算，客觀平滑水分滯留與單日進食波動。
              </div>
            </div>
          </div>

          {/*  飲食核心數據指標單元格 (下移至記錄模式下方，3 欄水平並列底座)  */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-neutral-200 dark:border-neutral-800 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 dark:divide-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-950 overflow-hidden shadow-none">
            {/*  指標 1: 內置食材數量  */}
            <div className="p-4 flex flex-col justify-between space-y-2 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">
                內置食材庫
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
                420+ <span className="text-xs font-normal text-neutral-500">項</span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                標準原型食材生重常數，杜絕熟重吸水誤差
              </div>
            </div>

            {/*  指標 2: 允許自定食譜  */}
            <div className="p-4 flex flex-col justify-between space-y-2 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">
                複合菜餚
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
                ∞ <span className="text-xs font-normal text-neutral-500">自訂</span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                自由組合單品食材，純 ID 引用無快照漂移
              </div>
            </div>

            {/*  指標 3: 烹調油黑盒歸零  */}
            <div className="p-4 flex flex-col justify-between space-y-2 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">
                烹調黑盒
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
                0 <span className="text-xs font-normal text-neutral-500">隱藏油</span>
              </div>
              <div className="font-sans text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                外食與自煮用油獨立計量，終結熱量盲區
              </div>
            </div>
          </div>

        </div>

        {/*  右側欄 (5 欄)：飲食頁面展示 (100% 調用真實 APP 飲食頁面元件 DietView，落實唯一真理源)  */}
        <div className="lg:col-span-5 flex justify-center lg:justify-start">
          <div className="w-full max-w-[440px] sm:max-w-[480px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-hidden shadow-none transition-colors duration-200">
            
            {/* 模擬視窗狀態列 (Window Chrome Bar) */}
            <div className="px-3.5 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between font-mono text-xs bg-neutral-50 dark:bg-neutral-950 select-none pointer-events-none">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
              </div>
              <div className="flex items-center space-x-1 font-sans text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">Zenfit</span>
                <span className="text-neutral-400 dark:text-neutral-600">/</span>
                <span>飲食度量</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>0.10ms</span>
              </div>
            </div>

            {/* 核心真實 React 飲食頁面元件 (等比縮放 78%，精密緊緻) */}
            <div className="p-3 sm:p-4 bg-background select-none pointer-events-none" style={{ zoom: 0.78 }}>
              <DietView {...DEMO_DIET_DATA} interactive={false} />
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
          [ 03 / STRENGTH & BIOMECHANICS ]
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-sans text-neutral-900 dark:text-white">
          肌力生物力學與組數表。<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">解剖熱圖、有效組數與純數學 e1RM。</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          嚴格區分熱身組與正式組，記錄 RPE 自覺竭盡強度。
          透過成熟的 Brzycki / Epley 公式估算極限力量，自動統計每週有效訓練組數分佈，拒絕未經科學驗證的隨意評分。
        </p>
      </div>

      {/*  Workout Component Elevation  */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-mono text-xs">
        
        {/*  Anatomical Vector Schematic (BodyHighlighter)  */}
        <div className="lg:col-span-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 rounded-lg space-y-4 flex flex-col items-center justify-center shadow-none">
          <div className="flex justify-between items-center w-full text-xs text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 pb-2">
            <span>受力肌群解剖熱圖</span>
            <span className="text-telemetry-accent">股四頭 / 臀大肌</span>
          </div>

          <div className="py-4 flex items-center justify-center space-x-8">
            {/*  Front View  */}
            <div className="text-center">
              <div className="text-[10px] text-neutral-500 mb-1">FRONT</div>
              <svg className="w-20 h-44 stroke-neutral-400 dark:stroke-neutral-700 fill-none" viewBox="0 0 100 200">
                <circle cx="50" cy="20" r="10" strokeWidth="1.5" />
                <path d="M40 32 L60 32 L65 75 L35 75 Z" strokeWidth="1.5" />
                <path d="M35 34 L20 80 L18 110" strokeWidth="1.5" />
                <path d="M65 34 L80 80 L82 110" strokeWidth="1.5" />
                <path d="M36 78 L48 78 L46 130 L32 130 Z" fill="#e0533c" stroke="#e0533c" strokeWidth="1" opacity="0.85" />
                <path d="M52 78 L64 78 L68 130 L54 130 Z" fill="#e0533c" stroke="#e0533c" strokeWidth="1" opacity="0.85" />
                <path d="M32 132 L34 185 L28 190" strokeWidth="1.5" />
                <path d="M68 132 L66 185 L72 190" strokeWidth="1.5" />
              </svg>
            </div>
            {/*  Back View  */}
            <div className="text-center">
              <div className="text-[10px] text-neutral-500 mb-1">BACK</div>
              <svg className="w-20 h-44 stroke-neutral-400 dark:stroke-neutral-700 fill-none" viewBox="0 0 100 200">
                <circle cx="50" cy="20" r="10" strokeWidth="1.5" />
                <path d="M35 32 L65 32 L62 75 L38 75 Z" strokeWidth="1.5" />
                <path d="M35 34 L20 80 L18 110" strokeWidth="1.5" />
                <path d="M65 34 L80 80 L82 110" strokeWidth="1.5" />
                <path d="M38 76 L62 76 L60 100 L40 100 Z" fill="#e0533c" stroke="#e0533c" strokeWidth="1" opacity="0.75" />
                <path d="M36 102 L48 102 L46 135 L34 135 Z" fill="#e0533c" stroke="#e0533c" strokeWidth="1" opacity="0.6" />
                <path d="M52 102 L64 102 L66 135 L54 135 Z" fill="#e0533c" stroke="#e0533c" strokeWidth="1" opacity="0.6" />
                <path d="M34 137 L34 185 L28 190" strokeWidth="1.5" />
                <path d="M66 137 L66 185 L72 190" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          <div className="text-neutral-500 dark:text-neutral-400 text-xs text-center border-t border-neutral-200 dark:border-neutral-800 pt-3 w-full">
            當前動作：低槓深蹲 (Low-bar Squat)
          </div>
        </div>

        {/*  5-Set Log Table  */}
        <div className="lg:col-span-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black rounded-lg overflow-hidden space-y-0 shadow-none">
          <div className="px-5 py-3 bg-neutral-100 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-xs">
            <span className="font-bold text-neutral-900 dark:text-white">低槓深蹲 · 5 組組數計量表</span>
            <span className="text-neutral-500 dark:text-neutral-400">總訓練容量：4,380 kg</span>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase">
                <th className="py-2.5 px-4">組別</th>
                <th className="py-2.5 px-4">類型</th>
                <th className="py-2.5 px-4">重量</th>
                <th className="py-2.5 px-4">次數</th>
                <th className="py-2.5 px-4">RPE</th>
                <th className="py-2.5 px-4">預估 1RM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-300">
              <tr>
                <td className="py-3 px-4">1</td>
                <td className="py-3 px-4"><span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400 text-[10px]">熱身</span></td>
                <td className="py-3 px-4 font-bold text-black dark:text-white">60.0 kg</td>
                <td className="py-3 px-4">10</td>
                <td className="py-3 px-4 text-neutral-500">6.0</td>
                <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400">80.0 kg</td>
              </tr>
              <tr>
                <td className="py-3 px-4">2</td>
                <td className="py-3 px-4"><span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400 text-[10px]">熱身</span></td>
                <td className="py-3 px-4 font-bold text-black dark:text-white">100.0 kg</td>
                <td className="py-3 px-4">5</td>
                <td className="py-3 px-4 text-neutral-500">7.0</td>
                <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400">116.7 kg</td>
              </tr>
              <tr className="bg-neutral-50 dark:bg-neutral-900/40">
                <td className="py-3 px-4 font-bold text-black dark:text-white">3</td>
                <td className="py-3 px-4"><span className="px-1.5 py-0.5 rounded bg-telemetry-accent/20 text-telemetry-accent font-bold text-[10px]">正式</span></td>
                <td className="py-3 px-4 font-bold text-black dark:text-white">130.0 kg</td>
                <td className="py-3 px-4 text-black dark:text-white font-bold">5</td>
                <td className="py-3 px-4 text-black dark:text-white">8.5</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">151.7 kg</td>
              </tr>
              <tr className="bg-neutral-50 dark:bg-neutral-900/40">
                <td className="py-3 px-4 font-bold text-black dark:text-white">4</td>
                <td className="py-3 px-4"><span className="px-1.5 py-0.5 rounded bg-telemetry-accent/20 text-telemetry-accent font-bold text-[10px]">正式</span></td>
                <td className="py-3 px-4 font-bold text-black dark:text-white">130.0 kg</td>
                <td className="py-3 px-4 text-black dark:text-white font-bold">5</td>
                <td className="py-3 px-4 text-black dark:text-white">9.0</td>
                <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400">151.7 kg</td>
              </tr>
              <tr className="bg-neutral-50 dark:bg-neutral-900/40">
                <td className="py-3 px-4 font-bold text-black dark:text-white">5</td>
                <td className="py-3 px-4"><span className="px-1.5 py-0.5 rounded bg-telemetry-accent/20 text-telemetry-accent font-bold text-[10px]">正式</span></td>
                <td className="py-3 px-4 font-bold text-black dark:text-white">130.0 kg</td>
                <td className="py-3 px-4 text-black dark:text-white font-bold">4</td>
                <td className="py-3 px-4 text-black dark:text-white">9.5</td>
                <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400">146.3 kg</td>
              </tr>
            </tbody>
          </table>

          <div className="p-3 bg-neutral-100 dark:bg-neutral-900/40 text-neutral-500 text-[11px] flex justify-between border-t border-neutral-200 dark:border-neutral-800">
            <span>Brzycki 純數學純函數無副作用推算</span>
            <span>100% 單元測試防護覆蓋</span>
          </div>
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
          [ 04 / BODY & PHYSIOLOGICAL NOISE REDUCTION ]
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-sans text-neutral-900 dark:text-white">
          體重抗噪平滑與精密鍵盤。<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">7 日 EMA 曲線、圍度矩陣與 300px 標準彈窗。</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          水分滯留、鹽分攝入與胃腸內容物經常引起每日 1～2kg 的生理噪聲。
          Zenfit 透過指數移動平均 (EMA) 算法提取真實生理組織變化斜率，並配備全站唯一的 300px 標準精密彈窗鍵盤。
        </p>
      </div>

      {/*  Body Telemetry Grid  */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-mono text-xs">
        
        {/*  Left: 64.5kg Reading & EMA Chart & Circumference Matrix  */}
        <div className="lg:col-span-8 space-y-6">
          
          {/*  Reading Block  */}
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 rounded-lg flex flex-wrap items-baseline justify-between gap-4 shadow-none">
            <div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-widest">當前體重過磅 (平滑加權)</div>
              <div className="text-5xl sm:text-6xl font-black text-black dark:text-white tracking-tight mt-1">64.50 <span className="text-lg font-normal text-neutral-500">kg</span></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">7 日 EMA 抗噪真值：64.62 kg</div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5">-0.24 kg / 7天 (客觀代謝斜率)</div>
            </div>
          </div>

          {/*  EMA Vector Chart  */}
          <div className="p-6 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 rounded-lg space-y-3 shadow-none">
            <div className="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span>體重波形與指數平滑 (S_t = α Y_t + (1-α) S_t-1)</span>
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600"></span><span>過磅散點</span></span>
                <span className="flex items-center space-x-1"><span className="w-3 h-0.5 bg-emerald-600 dark:bg-emerald-400"></span><span className="text-emerald-600 dark:text-emerald-400">EMA 實線</span></span>
              </div>
            </div>
            <div className="h-44 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 160">
                <line x1="0" y1="20" x2="600" y2="20" stroke="currentColor" className="text-neutral-200 dark:text-[#1f2028]" strokeDasharray="2 2" />
                <line x1="0" y1="60" x2="600" y2="60" stroke="currentColor" className="text-neutral-200 dark:text-[#1f2028]" strokeDasharray="2 2" />
                <line x1="0" y1="100" x2="600" y2="100" stroke="currentColor" className="text-neutral-200 dark:text-[#1f2028]" strokeDasharray="2 2" />
                <line x1="0" y1="140" x2="600" y2="140" stroke="currentColor" className="text-neutral-200 dark:text-[#1f2028]" strokeDasharray="2 2" />
                
                <circle cx="30" cy="115" r="3" fill="#a1a1aa" />
                <circle cx="110" cy="80" r="3" fill="#a1a1aa" />
                <circle cx="190" cy="130" r="3" fill="#a1a1aa" />
                <circle cx="270" cy="95" r="3" fill="#a1a1aa" />
                <circle cx="350" cy="65" r="3" fill="#a1a1aa" />
                <circle cx="430" cy="110" r="3" fill="#a1a1aa" />
                <circle cx="510" cy="70" r="3" fill="#a1a1aa" />
                <circle cx="570" cy="85" r="3" fill="#a1a1aa" />

                <path d="M30 115 C 80 100, 140 105, 190 108 C 240 110, 300 95, 350 88 C 400 82, 480 85, 570 82" 
                      fill="none" stroke="#059669" strokeWidth="2.5" className="dark:stroke-[#10b981]" />
              </svg>
            </div>
          </div>

          {/*  6 Circumference Metrics (Normal weight font-normal as per standard)  */}
          <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-lg shadow-none">
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-3">6 項身體圍度度量 (FONT-NORMAL 規範)</div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
              <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black rounded">
                <div className="text-neutral-500 text-[10px]">胸圍</div>
                <div className="text-sm font-normal text-neutral-900 dark:text-white mt-1">102.0 cm</div>
              </div>
              <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black rounded">
                <div className="text-neutral-500 text-[10px]">腰圍</div>
                <div className="text-sm font-normal text-neutral-900 dark:text-white mt-1">76.0 cm</div>
              </div>
              <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black rounded">
                <div className="text-neutral-500 text-[10px]">臀圍</div>
                <div className="text-sm font-normal text-neutral-900 dark:text-white mt-1">96.0 cm</div>
              </div>
              <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black rounded">
                <div className="text-neutral-500 text-[10px]">手臂</div>
                <div className="text-sm font-normal text-neutral-900 dark:text-white mt-1">38.5 cm</div>
              </div>
              <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black rounded">
                <div className="text-neutral-500 text-[10px]">大腿</div>
                <div className="text-sm font-normal text-neutral-900 dark:text-white mt-1">58.0 cm</div>
              </div>
              <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black rounded">
                <div className="text-neutral-500 text-[10px]">小腿</div>
                <div className="text-sm font-normal text-neutral-900 dark:text-white mt-1">37.0 cm</div>
              </div>
            </div>
          </div>

        </div>

        {/*  Right: 1:1 Precision Modal Representation (300px Keypad Dialog)  */}
        <div className="lg:col-span-4 flex justify-center">
          <div className="border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4 rounded-lg w-[300px] max-w-[300px] font-mono text-xs space-y-3 shadow-none">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 text-[11px]">
              <button className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400">✕</button>
              <span className="font-bold text-neutral-900 dark:text-white">體重記錄</span>
              <button className="w-6 h-6 rounded bg-black text-white dark:bg-white dark:text-black font-bold flex items-center justify-center">✓</button>
            </div>
            
            <div className="text-center py-2.5 bg-neutral-100 dark:bg-black rounded border border-neutral-200 dark:border-neutral-800">
              <div className="text-[10px] text-neutral-500 uppercase">現時輸入 (kg)</div>
              <div className="text-3xl font-black text-black dark:text-white tracking-tight mt-0.5">64.50</div>
            </div>

            {/*  Keypad Matrix  */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-sm font-semibold">
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">1</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">2</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">3</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">4</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">5</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">6</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">7</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">8</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">9</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">.</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white">0</button>
              <button className="py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500">⌫</button>
            </div>

            <div className="text-[10px] text-neutral-500 text-center pt-1 border-t border-neutral-200 dark:border-neutral-800">
              全端恆定 300px 寬度 · 16px 內邊距防洩漏真理源
            </div>
          </div>
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
          [ 05 / ANALYTICS & DATA SHARING ]
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-sans text-neutral-900 dark:text-white">
          軟體內不接黑盒 AI，<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">但你隨時可以把數據分享給 AI 或朋友。</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          我們拒絕在軟體內部內建黑盒 AI 來評判你的生活。真正的分析應當建立在純數學的客觀事實之上。
          與此同時，你的數據 100% 歸你所有：你可以一鍵複製專為 LLM 結構化優化的 Prompt，或者匯出高密度圖表，隨時與 ChatGPT、Claude 或你的教練、營養師展開深度交流。
        </p>
      </div>

      {/*  Sharing Modes Grid  */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        
        {/*  Mode 1: AI Prompt Export  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 rounded-lg space-y-4 flex flex-col justify-between shadow-none">
          <div className="space-y-3">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">01 // 一鍵複製結構化 AI PROMPT</div>
            <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">隨時與任何前沿大模型對話</h3>
            <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
              將過去 7 天或 30 天的客觀生重宏量素、深蹲組數與 EMA 體重平滑曲線，一鍵格式化為無噪音 Markdown 提示詞，直接發送給 Claude 或 ChatGPT 獲取客製化建議。
            </p>
          </div>
          <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-[11px] text-neutral-700 dark:text-neutral-300">
            [PROMPT PREVIEW]: 包含 C/P/F 生重明細、RPE 負荷矩陣與代謝斜率。
          </div>
        </div>

        {/*  Mode 2: Coach & Friend Sharing  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 rounded-lg space-y-4 flex flex-col justify-between shadow-none">
          <div className="space-y-3">
            <div className="text-sky-600 dark:text-sky-400 font-bold uppercase">02 // 高密度分析長圖匯出</div>
            <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">分享給教練或自律夥伴</h3>
            <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
              無需截取雜亂的螢幕截圖。Zenfit 原生支援一鍵生成高對比、無失真、工程質感的極簡長圖，將每日課表與進食事實客觀交付教練檢閱。
            </p>
          </div>
          <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-[11px] text-neutral-700 dark:text-neutral-300">
            [EXPORT PNG]: 純向量線條，扁平無陰影，直接發送至微信/通訊軟體。
          </div>
        </div>

        {/*  Mode 3: Pure Math Correlation  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 rounded-lg space-y-4 flex flex-col justify-between shadow-none">
          <div className="space-y-3">
            <div className="text-amber-600 dark:text-amber-400 font-bold uppercase">03 // 純數學客觀關聯推演</div>
            <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">只計算數學關係，不給行為指令</h3>
            <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
              透過 EMA 體重平滑變化斜率與飲食攝入差值，客觀推算真實能量盈餘或缺口。不說「你吃多了」，只陳述客觀推論數值。
            </p>
          </div>
          <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-[11px] text-neutral-700 dark:text-neutral-300">
            [PURE MATH]: 無黑盒神經網路，所有計算公式皆在開源代碼中公開。
          </div>
        </div>

      </div>

    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  06. SYNC & UNIVERSAL PWA (Dropbox 同步與 PWA 通用)                          */}
  {/*  =========================================================================  */}
  <section id="sync" className="py-20 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black transition-colors duration-200">
    <div className="max-w-6xl mx-auto space-y-12">
      
      <div className="space-y-4 max-w-3xl">
        <div className="font-mono text-xs text-telemetry-accent uppercase tracking-widest">
          [ 06 / DATA SOVEREIGNTY & UNIVERSAL PWA ]
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-sans text-neutral-900 dark:text-white">
          本地優先、Dropbox 同步與 PWA 全平台。<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">數據完全私有化，斷網依然毫秒響應。</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          你的身體數據不屬於任何科技巨頭的伺服器。Zenfit 全面採用本地 IndexedDB 驅動，搭配 Web Crypto AES-GCM 零知識加密，支援同步至自己的 Dropbox 或本機資料夾。
        </p>
      </div>

      {/*  Architecture Pillars Grid  */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
        
        {/*  Pillar A: Local-First & Dropbox Sync  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-6 sm:p-8 rounded-lg space-y-6 shadow-none">
          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <span className="font-bold text-neutral-900 dark:text-white text-sm">DROPBOX 同步與端到端加密 (E2EE)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">AES-GCM-256</span>
          </div>

          <div className="space-y-3 font-sans text-neutral-700 dark:text-neutral-300 leading-relaxed">
            <p>
              • <strong>零知識架構 (Zero-Knowledge)</strong>：備份檔案在發送至 Dropbox 之前，已經在瀏覽器端使用你的獨立金鑰完成加密。Dropbox 或任何中繼伺服器永遠只看得到密文。
            </p>
            <p>
              • <strong>資料夾直接同步</strong>：支援 File System Access API，直接與本地硬碟資料夾建立鏡像同步，無需任何第三方雲端帳號。
            </p>
            <p>
              • <strong>一鍵完整匯出</strong>：隨時將整份 IndexedDB 匯出為 ZIP 壓縮檔（內含 JSON 與全解析度圖片），告別平台鎖定。
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
            ENCLAVE: PBKDF2 密鑰衍生 · SHA-256 校驗 · 0 遙測外流
          </div>
        </div>

        {/*  Pillar B: Universal PWA  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-6 sm:p-8 rounded-lg space-y-6 shadow-none">
          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <span className="font-bold text-neutral-900 dark:text-white text-sm">PWA 平台通用與持久化存儲</span>
            <span className="text-sky-600 dark:text-sky-400 font-bold">ALL OS READY</span>
          </div>

          <div className="space-y-3 font-sans text-neutral-700 dark:text-neutral-300 leading-relaxed">
            <p>
              • <strong>全平台原生安裝</strong>：支援在 iOS、Android、macOS、Windows 及 Linux 上一鍵「加入主畫面」或安裝為原生獨立視窗應用。
            </p>
            <p>
              • <strong>Cache-First 快取架構</strong>：透過 Workbox Service Worker 實現靜態資源 100% 離線可用，斷網時照常秒開。
            </p>
            <p>
              • <strong>持久化存儲保障</strong>：初始化主動呼叫 <code>navigator.storage.persist()</code>，杜絕設備磁碟吃緊時資料庫被瀏覽器自動逐出的風險。
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
            PLATFORMS: iOS 15+ · Android · Chrome · Safari · Edge
          </div>
        </div>

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
          [ 07 / PRODUCT BOUNDARIES & PHILOSOPHY ]
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-sans text-neutral-900 dark:text-white">
          為什麼我們不做這些功能？<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">界定產品邊界，守護不可侵犯的客觀純粹性。</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          一個偉大產品的靈魂，往往由它「堅決不做什麼」所定義。Zenfit 拒絕隨波逐流的消費主義套路。
        </p>
      </div>

      {/*  4 Non-Goals Pillars  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
        
        {/*  Non-goal 1  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 rounded-lg space-y-3 shadow-none">
          <div className="flex items-center space-x-2 text-telemetry-accent font-bold">
            <span className="w-2 h-2 rounded-full bg-telemetry-accent"></span>
            <span>01 // 不做內建 AI 評分與行為指令</span>
          </div>
          <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">拒絕黑盒說教與主觀評判</h3>
          <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
            我們嚴禁在軟體中指示「你少吃了」、「你吃超標了」或「你退步了」；絕對不設置帶有羞辱感的紅色警報卡片。軟體是冷靜的鏡子，決策權 100% 歸還使用者。
          </p>
        </div>

        {/*  Non-goal 2  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 rounded-lg space-y-3 shadow-none">
          <div className="flex items-center space-x-2 text-telemetry-accent font-bold">
            <span className="w-2 h-2 rounded-full bg-telemetry-accent"></span>
            <span>02 // 不做社交社群與心靈雞湯</span>
          </div>
          <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">拒絕同儕焦慮與動態打擾</h3>
          <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
            Zenfit 沒有動態廣場、沒有點讚排行、沒有同儕比較。自我量化是一場自己與物理事實的嚴肅對話，無須向外界表演自律。
          </p>
        </div>

        {/*  Non-goal 3  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 rounded-lg space-y-3 shadow-none">
          <div className="flex items-center space-x-2 text-telemetry-accent font-bold">
            <span className="w-2 h-2 rounded-full bg-telemetry-accent"></span>
            <span>03 // 不做強制打卡與斷簽懲罰</span>
          </div>
          <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">真正的自律不需要外部羞恥機制</h3>
          <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
            不設置斷簽警告或紅點催促。今天記錄，今天就是事實；今天沒記，明天打開依舊是一把乾淨、隨時待命的測量儀。
          </p>
        </div>

        {/*  Non-goal 4  */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-6 rounded-lg space-y-3 shadow-none">
          <div className="flex items-center space-x-2 text-telemetry-accent font-bold">
            <span className="w-2 h-2 rounded-full bg-telemetry-accent"></span>
            <span>04 // 不做模糊的成品菜熱量估算</span>
          </div>
          <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">拒絕「一碗紅燒牛肉麵 750 大卡」的黑盒謊言</h3>
          <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
            成品菜估算充滿了不可控的烹調油與吸水率偏差。Zenfit 堅持以原子食材生重為唯一真理源，引導使用者建立真正的克數秤重感知。
          </p>
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
        <div className="text-xs text-telemetry-accent uppercase tracking-widest">
          [ 08 / TECHNICAL SPECIFICATION & CODE STANDARDS ]
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-sans text-neutral-900 dark:text-white">
          架構總綱與工程紀律。<br />
          <span className="text-neutral-500 font-mono text-2xl sm:text-4xl font-normal">單一真理源、無副作用純數學與極限型別約束。</span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed font-sans">
          Zenfit 的代碼庫遵循最嚴苛的軟體工程準則。全應用程式維持「一處修改，全域變動，始終統一」的架構紀律。
        </p>
      </div>

      {/*  Technical Architecture Specs Grid  */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-6 rounded-lg space-y-3 shadow-none">
          <div className="text-black dark:text-white font-bold text-sm border-b border-neutral-200 dark:border-neutral-800 pb-2">01 / 前端技術棧與高度管理</div>
          <div className="text-neutral-600 dark:text-neutral-400 font-sans space-y-1.5 leading-relaxed text-xs">
            <div>• <strong>核心棧</strong>：React 19 + TypeScript (Strict Mode, 0 any) + Vite。</div>
            <div>• <strong>CSS 系統</strong>：Tailwind CSS v4 + 全域 Design Tokens 變數控制。</div>
            <div>• <strong>高度防護</strong>：全面採用「樹狀 100% 高度」，嚴禁 <code>100vh</code> 造成行動端工具列遮擋溢出。</div>
          </div>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-6 rounded-lg space-y-3 shadow-none">
          <div className="text-black dark:text-white font-bold text-sm border-b border-neutral-200 dark:border-neutral-800 pb-2">02 / 本地資料庫與遷移紀律</div>
          <div className="text-neutral-600 dark:text-neutral-400 font-sans space-y-1.5 leading-relaxed text-xs">
            <div>• <strong>資料庫引擎</strong>：Dexie.js (IndexedDB v14)，強型別資料模型。</div>
            <div>• <strong>安全防線</strong>：結構變更強制遞增版本並編寫 <code>.upgrade()</code> 腳本，絕對禁止生產環境破壞性清庫。</div>
            <div>• <strong>純 ID 關聯</strong>：關聯實體僅存純 ID，拒絕反正規化快照漂移。</div>
          </div>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-6 rounded-lg space-y-3 shadow-none">
          <div className="text-black dark:text-white font-bold text-sm border-b border-neutral-200 dark:border-neutral-800 pb-2">03 / 純數學演算與 100% 測試</div>
          <div className="text-neutral-600 dark:text-neutral-400 font-sans space-y-1.5 leading-relaxed text-xs">
            <div>• <strong>精密測量純函數</strong>：所有指標推算（e1RM、EMA 平滑、供能比）封裝於無副作用純函數。</div>
            <div>• <strong>測試守護</strong>：Vitest 測試套件，維持 542 項單元測試 100% 通過。</div>
            <div>• <strong>文案極簡</strong>：嚴格遵守五大極簡文案法則與中英數半形空格排版。</div>
          </div>
        </div>

      </div>

      {/*  Terminal Architecture Snapshot  */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-6 rounded-lg space-y-4 shadow-none">
        <div className="flex justify-between items-center text-xs border-b border-neutral-200 dark:border-neutral-800 pb-2 text-neutral-600 dark:text-neutral-400">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">SYSTEM INTEGRITY REPORT // ALL SYSTEMS GO</span>
          <span>VITEST: 542 TESTS PASSING (100%)</span>
        </div>
        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed space-y-1">
          <div>✓ [TYPE CHECK]: TypeScript 5.8 strict compiler check passed with 0 errors.</div>
          <div>✓ [MATH ACCURACY]: Brzycki e1RM, EMA weight filter, and Macro ratio pure functions verified.</div>
          <div>✓ [DATA INTEGRITY]: IndexedDB zero snapshot drift contract active.</div>
          <div>✓ [SECURITY]: Web Crypto AES-GCM-256 E2EE envelope verified.</div>
        </div>
      </div>

    </div>
  </section>

  {/*  =========================================================================  */}
  {/*  FOOTER                                                                     */}
  {/*  =========================================================================  */}
  <footer className="py-12 px-4 sm:px-8 bg-neutral-100 dark:bg-black border-t border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-500 transition-colors duration-200">
    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
      
      <div className="flex items-center space-x-2.5">
        <svg viewBox="0 0 1024 1024" className="w-5 h-5 rounded-[23%] shrink-0 select-none overflow-hidden border border-neutral-200 dark:border-neutral-800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="240" fill="#000000" />
          <g transform="translate(187 187)">
            <g transform="translate(132.031 91.406)">
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743674 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743674 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 0 0)" />
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 40.625 0)" />
              <path d="M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23103 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23103 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 81.25 0)" />
              <path d="M0 0L101.562 0C101.562 0 101.562 55.8594 101.562 55.8594C101.562 86.3281 81.25 106.641 50.7812 106.641C20.3125 106.641 0 86.3281 0 55.8594C0 55.8594 0 0 0 0Z" fill="#FFFFFF" transform="matrix(1 0 0 1 0 111.719)" />
              <path d="M0 28.111L0 14.0555C0 10.1742 1.23946 6.86128 3.71837 4.11676C6.19728 1.37225 9.1896 0 12.6953 0C16.201 0 19.1933 1.37225 21.6722 4.11676C24.1512 6.86128 25.3906 10.1742 25.3906 14.0555L25.3906 261.433C25.3906 265.314 24.1512 268.627 21.6722 271.371C19.1933 274.116 16.201 275.488 12.6953 275.488C9.1896 275.488 6.19728 274.116 3.71837 271.371C1.23946 268.627 0 265.314 0 261.433L0 28.111Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 38.086 191.699)" />
              <path d="M0 20.3125L0 10.1562C0 7.35168 0.991562 4.95783 2.9747 2.9747C4.95782 0.991565 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991565 134.135 2.9747C136.118 4.95783 137.109 7.35168 137.109 10.1562L137.109 55.8594C137.109 58.6639 136.118 61.0578 134.135 63.0409C132.151 65.024 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.0409C0.991562 61.0578 0 58.6639 0 55.8594L0 20.3125Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 248.828 0)" />
              <path d="M0 8.88671L0 5.07812C0 3.67583 0.495789 2.47891 1.48734 1.48735C2.47891 0.495781 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495781 89.9189 1.48735C90.9105 2.47891 91.4063 3.67583 91.4063 5.07812L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88671Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 271.68 66.016)" />
              <path d="M0 17.0418L0 8.52092C0 6.16794 0.743683 4.15953 2.23102 2.49572C3.71838 0.831909 5.51376 0 7.61719 0L27.9297 0C30.0331 0 31.8285 0.831909 33.3159 2.49572C34.8032 4.15953 35.5469 6.16794 35.5469 8.52092L35.5469 326.635C35.5469 328.988 34.8032 330.997 33.3159 332.661C31.8285 334.324 30.0331 335.156 27.9297 335.156L7.61719 335.156C5.51376 335.156 3.71838 334.324 2.23102 332.661C0.743683 330.997 0 328.988 0 326.635L0 17.0418Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 299.609 66.016)" />
              <path d="M0 8.88672L0 5.07813C0 3.67584 0.495789 2.47891 1.48734 1.48734C2.47891 0.495789 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495789 89.9189 1.48734C90.9105 2.47891 91.4063 3.67584 91.4063 5.07813L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88672Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 271.68 383.398)" />
              <path d="M0 20.3125L0 10.1563C0 7.35168 0.991562 4.95782 2.9747 2.9747C4.95782 0.991577 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991577 134.135 2.9747C136.118 4.95782 137.109 7.35168 137.109 10.1563L137.109 55.8594C137.109 58.664 136.118 61.0578 134.135 63.041C132.151 65.0241 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.0241 2.9747 63.041C0.991562 61.0578 0 58.664 0 55.8594L0 20.3125Z" fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 0 1 248.828 401.172)" />
            </g>
          </g>
        </svg>
        <span className="text-neutral-900 dark:text-white font-bold font-sans">Zenfit</span>
        <span>— 客觀事實的度量碑</span>
      </div>

      <div className="flex items-center space-x-6 text-[11px]">
        <a href="#hero" className="hover:text-black dark:hover:text-white transition-colors">回到頂部 ↑</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("diet"); }} href="#diet" className="hover:text-black dark:hover:text-white transition-colors">飲食</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("workout"); }} href="#workout" className="hover:text-black dark:hover:text-white transition-colors">訓練</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("body"); }} href="#body" className="hover:text-black dark:hover:text-white transition-colors">體態</a>
        <a onClick={(e) => { e.preventDefault(); scrollToSection("tech"); }} href="#tech" className="hover:text-black dark:hover:text-white transition-colors">規格</a>
      </div>

      <div>
        MIT License · Local-First Architecture · 2026
      </div>

    </div>
  </footer>

  {/*  =========================================================================  */}
  {/*  JAVASCRIPT CONTROLLERS (LIGHT / DARK THEME MANAGER)                        */}
  {/*  =========================================================================  */}
  


    </div>
  );
}
