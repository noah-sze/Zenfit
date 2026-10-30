import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { AutoMarquee } from '@/components/ui/AutoMarquee';

export interface MacroHighlights {
  protein?: boolean;
  carbs?: boolean;
  fat?: boolean;
}

export interface MacroSquaresProps {
  protein: number;
  carbs: number;
  fat: number;
  highlights?: MacroHighlights;
  className?: string;
}

/**
 * 領域共用模式：三大元素（碳 / 蛋 / 脂）三列等寬營養素方塊矩陣
 * 嚴格遵循 Design System 規範：
 * - 固定順序：碳水化合物 (碳)、蛋白質 (蛋)、脂肪 (脂)
 * - 等寬 w-11 (44px)
 * - 等寬字體 font-mono
 * - 智能點亮 (amber-500 / sky-500 / purple-500)
 * - 支援超長數值 AutoMarquee 平滑往返跑馬燈防溢出
 */
export function MacroSquares({
  protein,
  carbs,
  fat,
  highlights,
  className,
}: MacroSquaresProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("shrink-0 flex items-center gap-2 font-mono text-center", className)}>
      {/* 碳水化合物方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          highlights?.carbs
            ? "border-carbs bg-carbs-subtle text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider",
            highlights?.carbs ? "text-carbs font-bold" : "text-muted-foreground"
          )}
        >
          {t('diet.macroMicro.carbs', '碳')}
        </div>
        <AutoMarquee align="center" className="text-xs font-semibold tabular-nums">
          <span>{carbs}g</span>
        </AutoMarquee>
      </div>

      {/* 蛋白質方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          highlights?.protein
            ? "border-protein bg-protein-subtle text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider",
            highlights?.protein ? "text-protein font-bold" : "text-muted-foreground"
          )}
        >
          {t('diet.macroMicro.protein', '蛋')}
        </div>
        <AutoMarquee align="center" className="text-xs font-semibold tabular-nums">
          <span>{protein}g</span>
        </AutoMarquee>
      </div>

      {/* 脂肪方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          highlights?.fat
            ? "border-fat bg-fat-subtle text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider",
            highlights?.fat ? "text-fat font-bold" : "text-muted-foreground"
          )}
        >
          {t('diet.macroMicro.fat', '脂')}
        </div>
        <AutoMarquee align="center" className="text-xs font-semibold tabular-nums">
          <span>{fat}g</span>
        </AutoMarquee>
      </div>
    </div>
  );
}
