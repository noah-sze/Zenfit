import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInAppNavigation } from '@/store/useInAppNavigation';
import { DashboardView, getDemoDashboardData } from '@/components/dashboard/DashboardView';
import { DietView, getDemoDietData } from '@/components/diet/DietView';
import { BrandWordmark } from '@/components/ui/Logo';

function DeckWindowChrome({
  moduleLabel,
  syncedLabel,
}: {
  moduleLabel: string;
  syncedLabel: string;
}) {
  return (
    <div className="px-4 py-2 border-b border-border flex items-center justify-between font-mono text-xs bg-muted">
      <div className="flex items-center space-x-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-border"></span>
        <span className="w-2.5 h-2.5 rounded-full bg-border"></span>
        <span className="w-2.5 h-2.5 rounded-full bg-border"></span>
      </div>
      <div className="flex items-center space-x-1 font-sans text-xs text-muted-foreground">
        <BrandWordmark className="text-foreground" />
        <span className="text-muted-foreground">/</span>
        <span>{moduleLabel}</span>
      </div>
      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full border border-border bg-card text-xs font-sans text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
        <span className="font-medium">{syncedLabel}</span>
      </div>
    </div>
  );
}

/**
 * Hero 區塊多卡片立體階梯堆疊展示組件 (Hero Showcase Deck)
 * 總覽在最前方 (Z: 30)，後面依次堆疊「飲食頁面」(Z: 20) 與「食物詳情頁面」(Z: 10)
 * 嚴格遵循扁平化設計 (Flat Design，零陰影，僅依賴 border-border 與 bg-card 實色分層)
 */
export function HeroShowcaseDeck() {
  const navigate = useNavigate();
  const { setActiveTab } = useInAppNavigation();
  const { t } = useTranslation();
  const tr = (k: string, fb?: string) => (fb !== undefined ? t(k, fb) : t(k));

  const demoDietData = useMemo(() => getDemoDietData(tr), [t]);
  const demoDashboardData = useMemo(() => getDemoDashboardData(tr), [t]);
  const syncedLabel = t('landing.deck.synced', '已同步');

  // 模擬 7 行 x 16 列的微型攝入足跡熱點矩陣分佈 (0: 空, 1: 輕, 2: 中, 3: 高)
  const heatmapPattern = [
    [0, 1, 0, 2, 0, 0, 3, 0, 1, 0, 0, 2, 0, 1, 0, 2],
    [1, 0, 2, 0, 1, 0, 2, 0, 0, 3, 0, 1, 0, 0, 3, 0],
    [0, 2, 0, 3, 0, 1, 0, 2, 0, 0, 2, 0, 3, 0, 1, 0],
    [2, 0, 1, 0, 2, 0, 0, 1, 0, 2, 0, 1, 0, 2, 0, 3],
    [0, 3, 0, 1, 0, 3, 0, 2, 0, 1, 0, 0, 2, 0, 1, 0],
    [1, 0, 0, 2, 0, 0, 1, 0, 3, 0, 1, 0, 0, 3, 0, 1],
    [0, 2, 0, 0, 3, 0, 1, 0, 0, 2, 0, 3, 0, 1, 0, 2],
  ];

  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-emerald-200 dark:bg-emerald-950/80';
      case 2:
        return 'bg-emerald-400 dark:bg-emerald-800';
      case 3:
        return 'bg-emerald-600 dark:bg-emerald-600';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="relative w-full max-w-[500px] xl:max-w-[540px] h-[610px] select-none pointer-events-none translate-x-8 xl:translate-x-12 -translate-y-8 xl:-translate-y-12">
      
      {/* ========================================================================= */}
      {/* 3. 最底層 / 最背後 (Card 3, Z-index: 10): 食物詳情頁面                    */}
      {/* ========================================================================= */}
      <div className="absolute left-[140px] xl:left-[160px] top-0 w-[310px] xl:w-[335px] rounded-xl border border-border bg-card overflow-hidden shadow-none z-10">
        
        <DeckWindowChrome
          moduleLabel={t('landing.deck.foodDetails', '食材詳情')}
          syncedLabel={syncedLabel}
        />

        {/* 食物詳情真實佈局 (縮放 75%) */}
        <div className="p-3 bg-card space-y-3 font-sans" style={{ zoom: 0.75 }}>
          
          {/* 規格卡片一體化容器 */}
          <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
            
            {/* 第 1 層：HUD 規格條 */}
            <div className="h-7 px-3 bg-muted flex items-center justify-between text-xs font-mono">
              <span className="uppercase tracking-widest text-xs text-muted-foreground font-medium">
                {t('landing.deck.rawFoodHud', '天然原型食材 · 生重')}
              </span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 tracking-wide font-medium">
                {t('landing.deck.active', '使用中')}
              </span>
            </div>

            {/* 第 2 層：品名帶與高蛋白微徽章 */}
            <div className="h-14 px-4 flex items-center justify-between gap-2 bg-card">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {t('landing.deck.chickenBreast', '雞胸肉')}
              </h2>
              <span className="text-xs font-mono border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium bg-emerald-50/50 dark:bg-emerald-950/30">
                {t('landing.deck.highProtein', '高蛋白')}
              </span>
            </div>

            {/* 第 3 層：三大指標 3 欄分割 */}
            <div className="grid grid-cols-3 divide-x divide-border bg-card">
              <div className="p-3 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground">{t('landing.deck.totalIntake', '總攝入')}</span>
                <div className="font-mono text-xs font-semibold tabular-nums text-foreground mt-1">
                  3,240 <span className="text-xs font-normal text-muted-foreground">kcal</span>
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground">{t('landing.deck.frequency', '頻率')}</span>
                <div className="font-mono text-xs font-semibold tabular-nums text-foreground mt-1">
                  18 <span className="text-xs font-normal text-muted-foreground">{t('landing.deck.timesUnit', '次')}</span>
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground">{t('landing.deck.singleDayMax', '單日最高')}</span>
                <div className="font-mono text-xs font-semibold tabular-nums text-foreground mt-1">
                  250 <span className="text-xs font-normal text-muted-foreground">g</span>
                </div>
              </div>
            </div>

            {/* 第 4 層：微型足跡熱點矩陣 */}
            <div className="p-3 bg-muted">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                {t('landing.deck.matrixTitle', '攝入足跡矩陣 (7 週趨勢)')}
              </div>
              <div className="grid grid-rows-7 grid-flow-col gap-1 w-fit">
                {heatmapPattern.map((row, rIdx) =>
                  row.map((val, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`w-2.5 h-2.5 rounded-[2px] transition-colors ${getHeatmapColor(val)}`}
                    />
                  ))
                )}
              </div>
            </div>

          </div>

          {/* 每 100g 生重基準營養素 (嚴格遵循 C / P / F 順序) */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-1">
              {t('landing.deck.benchmarkTitle', '基準物理常數 (每 100g 生重)')}
            </div>
            <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-xs font-mono">
              <div className="h-8 px-3 flex items-center justify-between">
                <span className="text-muted-foreground">{t('landing.deck.calories', '熱量')}</span>
                <span className="font-bold text-foreground">110 kcal</span>
              </div>
              <div className="h-8 px-3 flex items-center justify-between">
                <span className="text-muted-foreground">{t('landing.deck.carbs', '碳水化合物')}</span>
                <span className="font-semibold text-foreground">0.0 g</span>
              </div>
              <div className="h-8 px-3 flex items-center justify-between bg-emerald-50/30 dark:bg-emerald-950/20">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t('landing.deck.protein', '蛋白質')}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">23.1 g</span>
              </div>
              <div className="h-8 px-3 flex items-center justify-between">
                <span className="text-muted-foreground">{t('landing.deck.fat', '脂肪')}</span>
                <span className="font-semibold text-foreground">1.2 g</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. 中間層 (Card 2, Z-index: 20): 飲食頁面                                 */}
      {/* ========================================================================= */}
      <div className="absolute left-[70px] xl:left-[80px] top-[36px] w-[310px] xl:w-[335px] rounded-xl border border-border bg-card overflow-hidden shadow-none z-20">
        
        <DeckWindowChrome
          moduleLabel={t('landing.deck.dietMetrics', '飲食')}
          syncedLabel={syncedLabel}
        />

        {/* 核心真實 React 飲食頁面元件 (縮放 72%) */}
        <div className="p-3 bg-card" style={{ zoom: 0.72 }}>
          <DietView {...demoDietData} interactive={false} />
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 1. 最前方 / 主角 (Card 1, Z-index: 30): 總覽頁面                          */}
      {/* ========================================================================= */}
      <div className="absolute left-0 top-[72px] w-[310px] xl:w-[335px] rounded-xl border border-border bg-card overflow-hidden shadow-none z-30">
        
        <DeckWindowChrome
          moduleLabel={t('landing.deck.dashboard', '總覽')}
          syncedLabel={syncedLabel}
        />

        {/* 核心真實 React 總覽元件 (100% 複用真實代碼與模型，內容等比縮放 72%) */}
        <div className="p-3 bg-card" style={{ zoom: 0.72 }}>
          <DashboardView
            {...demoDashboardData}
            className="pb-0"
            onNavigateBody={() => {
              setActiveTab('body');
              navigate('/app');
            }}
            onNavigateDiet={() => {
              setActiveTab('diet');
              navigate('/app');
            }}
            onNavigateWorkout={() => {
              setActiveTab('workout');
              navigate('/app');
            }}
          />
        </div>

      </div>

    </div>
  );
}
