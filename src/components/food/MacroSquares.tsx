import React, { useMemo } from 'react';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

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
  variant?: 'default' | 'subtle';
  className?: string;
}

/**
 * 領域共用模式：三大元素（碳 / 蛋 / 脂）三列等寬營養素方塊矩陣
 * 嚴格遵循 Design System 規範：
 * - 固定順序：碳水化合物 (碳)、蛋白質 (蛋)、脂肪 (脂)
 * - 等寬 w-11 (44px)
 * - 等寬字體 font-mono
 * - 智能點亮 (amber-500 / sky-500 / purple-500)
 * - 極致輕量化純文字排版，徹底消除 AutoMarquee 造成的強制回流與長任務卡頓
 * - 支援 variant: default (食材管理頁面高飽和) 與 subtle (首頁微光減噪)
 */
export const MacroSquares = React.memo(function MacroSquares({
  protein,
  carbs,
  fat,
  highlights,
  variant = 'default',
  className,
}: MacroSquaresProps) {
  const { t } = useTranslation();
  const isSubtle = variant === 'subtle';

  // 智慧保底自評估：若外部未顯式傳入 highlights，依據三大素數值自動計算客觀點亮狀態
  const resolvedHighlights = useMemo(() => {
    if (highlights !== undefined) return highlights;
    return evaluateNutritionalHighlight({
      calories: carbs * 4 + protein * 4 + fat * 9,
      carbs,
      protein,
      fat,
    }).highlights;
  }, [highlights, carbs, protein, fat]);

  return (
    <div className={cn("shrink-0 flex items-center gap-2 font-mono text-center", className)}>
      {/* 碳水化合物方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          resolvedHighlights?.carbs
            ? isSubtle
              ? "border-carbs-subtle-border bg-carbs-subtle-bg text-foreground shadow-none"
              : "border-carbs bg-carbs-subtle text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider select-none",
            resolvedHighlights?.carbs
              ? isSubtle
                ? "text-carbs/65 font-medium"
                : "text-carbs font-bold"
              : "text-muted-foreground"
          )}
        >
          {t('diet.macroMicro.carbs', '碳')}
        </div>
        <div className="text-xs tabular-nums leading-tight overflow-hidden">
          <span>{carbs}g</span>
        </div>
      </div>

      {/* 蛋白質方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          resolvedHighlights?.protein
            ? isSubtle
              ? "border-protein-subtle-border bg-protein-subtle-bg text-foreground shadow-none"
              : "border-protein bg-protein-subtle text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider select-none",
            resolvedHighlights?.protein
              ? isSubtle
                ? "text-protein/65 font-medium"
                : "text-protein font-bold"
              : "text-muted-foreground"
          )}
        >
          {t('diet.macroMicro.protein', '蛋')}
        </div>
        <div className="text-xs tabular-nums leading-tight overflow-hidden">
          <span>{protein}g</span>
        </div>
      </div>

      {/* 脂肪方塊 */}
      <div
        className={cn(
          "w-11 py-1 px-0.5 rounded border transition-all overflow-hidden",
          resolvedHighlights?.fat
            ? isSubtle
              ? "border-fat-subtle-border bg-fat-subtle-bg text-foreground shadow-none"
              : "border-fat bg-fat-subtle text-foreground shadow-none"
            : "border-border bg-muted/30 text-foreground"
        )}
      >
        <div
          className={cn(
            "text-[9px] uppercase tracking-wider select-none",
            resolvedHighlights?.fat
              ? isSubtle
                ? "text-fat/65 font-medium"
                : "text-fat font-bold"
              : "text-muted-foreground"
          )}
        >
          {t('diet.macroMicro.fat', '脂')}
        </div>
        <div className="text-xs tabular-nums leading-tight overflow-hidden">
          <span>{fat}g</span>
        </div>
      </div>
    </div>
  );
});
