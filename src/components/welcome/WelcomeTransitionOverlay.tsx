import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo, BrandText } from '@/components/ui/Logo';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface WelcomeTransitionOverlayProps {
  open: boolean;
  userName?: string;
  onFinish: () => void;
  /** 動畫持續毫秒數，預設 1800ms */
  duration?: number;
}

/**
 * 方案 D：天體經緯線框歡迎過渡動畫組件 (Welcome Transition Overlay · Celestial Dome)
 * 用於使用者完成初次個人資料輸入後，提供儀式感與品牌一脈相承的極簡科技轉場。
 */
export function WelcomeTransitionOverlay({
  open,
  userName,
  onFinish,
  duration = 1800,
}: WelcomeTransitionOverlayProps) {
  const { t } = useTranslation();
  const [activeTickCount, setActiveTickCount] = useState(0);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const totalTicks = 24;
  const displayName = userName?.trim() || t('common.user', '使用者');

  // 刻度進度與計時生命週期（維持不透明覆蓋直到切換路由，避免提前露底頻閃）
  useEffect(() => {
    if (!open) {
      setActiveTickCount(0);
      return;
    }

    triggerHaptic('light');

    // 刻度條逐格遞增
    const tickInterval = Math.max(20, Math.floor((duration - 150) / totalTicks));
    const tickTimer = setInterval(() => {
      setActiveTickCount((prev) => {
        if (prev < totalTicks) {
          return prev + 1;
        }
        clearInterval(tickTimer);
        return prev;
      });
    }, tickInterval);

    // 時間到達後直接觸發路由切換
    const finishTimer = setTimeout(() => {
      onFinishRef.current();
    }, duration);

    return () => {
      clearInterval(tickTimer);
      clearTimeout(finishTimer);
    };
  }, [open, duration, totalTicks]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('welcome.entering', '正在進入 e2Cal ……')}
      className="fixed inset-0 z-[100] bg-background text-foreground flex flex-col items-center justify-center select-none overflow-hidden opacity-100 pointer-events-auto"
    >
      {/* 3D Celestial Wireframe Dome (天體經緯線框球體，以 1px 髮絲線深邃旋轉) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] pointer-events-none opacity-[0.12] dark:opacity-[0.18] text-foreground select-none">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full animate-[spin_40s_linear_infinite]"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="50" cy="50" r="48" vectorEffect="non-scaling-stroke" strokeWidth="1" />
          <ellipse cx="50" cy="50" rx="48" ry="18" vectorEffect="non-scaling-stroke" strokeWidth="1" />
          <ellipse cx="50" cy="50" rx="48" ry="34" vectorEffect="non-scaling-stroke" strokeWidth="1" />
          <ellipse cx="50" cy="50" rx="18" ry="48" vectorEffect="non-scaling-stroke" strokeWidth="1" />
          <ellipse cx="50" cy="50" rx="34" ry="48" vectorEffect="non-scaling-stroke" strokeWidth="1" />
          <line x1="50" y1="2" x2="50" y2="98" vectorEffect="non-scaling-stroke" strokeWidth="1" />
          <line x1="2" y1="50" x2="98" y2="50" vectorEffect="non-scaling-stroke" strokeWidth="1" />
        </svg>
      </div>

      {/* 中央主內容層 */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm animate-in fade-in-50 zoom-in-95 duration-500">
        {/* 中心微縮 Logo 徽章 */}
        <div className="size-12 rounded-full border border-border bg-card flex items-center justify-center mb-6 shadow-none">
          <Logo size={24} className="shrink-0" />
        </div>

        {/* 歡迎問候主標題 */}
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-2">
          {t('welcome.greeting', { name: displayName, defaultValue: `你好，${displayName}。` })}
        </h2>

        {/* 系統進入副標 */}
        <p className="text-xs sm:text-sm font-mono text-muted-foreground tracking-wide">
          <BrandText text={t('welcome.entering', '正在進入 e2Cal ……')} />
        </p>

        {/* 底部微型刻度條波形 (Telemetry Tick Meter) */}
        <div
          className="flex items-center gap-[3px] justify-center mt-7 h-3"
          aria-hidden="true"
        >
          {Array.from({ length: totalTicks }).map((_, index) => {
            const isActive = index < activeTickCount;
            return (
              <span
                key={index}
                className={cn(
                  "w-[2px] rounded-full transition-all duration-200",
                  isActive
                    ? "bg-foreground h-3"
                    : "bg-border h-2"
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
