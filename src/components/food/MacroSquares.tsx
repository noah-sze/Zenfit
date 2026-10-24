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
 * 領域共用模式：P / C / F 三列等寬營養素方塊矩陣
 * 嚴格遵循 Design System 規範：
 * - 等寬 w-11 (44px)
 * - 等寬字體 font-mono
 * - 智能點亮 (sky-500 / amber-500 / purple-500)
 * - 支援超長數值 AutoMarquee 平滑往返跑馬燈防溢出
 */
export function MacroSquares({
  protein,
  carbs,
  fat,
  highlights,
  className,
}: MacroSquaresProps) {
  return (
    <div className={cn("shrink-0 flex items-center gap-1 font-mono text-center", className)}>
      {/* P 蛋白質方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          highlights?.protein
            ? "border-sky-500/60 bg-sky-500/10 text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider",
            highlights?.protein ? "text-sky-500 font-bold" : "text-muted-foreground"
          )}
        >
          P
        </div>
        <AutoMarquee align="center" className="text-xs font-semibold tabular-nums">
          <span>{protein}g</span>
        </AutoMarquee>
      </div>

      {/* C 碳水方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          highlights?.carbs
            ? "border-amber-500/60 bg-amber-500/10 text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider",
            highlights?.carbs ? "text-amber-500 font-bold" : "text-muted-foreground"
          )}
        >
          C
        </div>
        <AutoMarquee align="center" className="text-xs font-semibold tabular-nums">
          <span>{carbs}g</span>
        </AutoMarquee>
      </div>

      {/* F 脂肪方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          highlights?.fat
            ? "border-purple-500/60 bg-purple-500/10 text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider",
            highlights?.fat ? "text-purple-500 font-bold" : "text-muted-foreground"
          )}
        >
          F
        </div>
        <AutoMarquee align="center" className="text-xs font-semibold tabular-nums">
          <span>{fat}g</span>
        </AutoMarquee>
      </div>
    </div>
  );
}
