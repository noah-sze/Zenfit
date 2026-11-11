import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Copy, Zap, Calculator } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { MealType } from '@/types';

interface MealAddActionPopoverProps {
  mealType: MealType;
  budget: { calories: number; carbs: number; protein: number; fat: number };
  onOpenAddFood: (mealType: MealType) => void;
  onOpenCopyMeal: (mealType: MealType) => void;
  onOpenQuickPlaceholder?: (mealType: MealType) => void;
  onLogAsPlanned?: (mealType: MealType, budget: { calories: number; carbs: number; protein: number; fat: number }) => void;
}

/**
 * 緊貼按鈕的 Popover（方案 A）：
 * 點擊四大餐別橫欄右側的「+」按鈕時，彈出緊貼「+」按鈕下方的 Precision Popover 分流選單。
 * 1. 記錄食材 / 食譜。
 * 2. 複製餐點。
 * 3. 快速估算（整體顏色更淡，低使用場景）。
 * 4. 算我正常吃（整體顏色更淡，低使用場景）。
 * 5. 嚴格禁絕陰影，由 border 與 bg-popover 界定範圍。
 */
export function MealAddActionPopover({
  mealType,
  budget,
  onOpenAddFood,
  onOpenCopyMeal,
  onOpenQuickPlaceholder,
  onLogAsPlanned,
}: MealAddActionPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      triggerHaptic('light');
    }
  };

  const handleSelectAsPlanned = () => {
    setOpen(false);
    triggerHaptic('success');
    if (onLogAsPlanned) {
      onLogAsPlanned(mealType, budget);
    }
    toast.show(t('diet.asPlanned.successToast', '已記錄歷史均值'));
  };

  const handleSelectSearch = () => {
    setOpen(false);
    triggerHaptic('light');
    onOpenAddFood(mealType);
  };

  const handleSelectPlaceholder = () => {
    setOpen(false);
    triggerHaptic('light');
    if (onOpenQuickPlaceholder) {
      onOpenQuickPlaceholder(mealType);
    }
  };

  const handleSelectCopy = () => {
    setOpen(false);
    triggerHaptic('light');
    onOpenCopyMeal(mealType);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        type="button"
        className="shrink-0 p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center rounded focus:outline-hidden"
        aria-label={t('common.add')}
      >
        <Plus className="size-4" />
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={4}
        className="w-64 sm:w-72 p-1.5 bg-popover text-popover-foreground border border-border shadow-none rounded-lg select-none gap-1"
      >
        {/* 極簡純淨表頭：僅顯示餐別名稱 */}
        <div className="px-2 py-1 text-2xs font-mono font-medium text-muted-foreground border-b border-border">
          {t(`diet.${mealType}`)}
        </div>

        {/* 第 1 項：記錄食材 / 食譜 */}
        <button
          type="button"
          onClick={handleSelectSearch}
          className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-hover active:bg-muted/50 transition-colors text-left cursor-pointer group"
        >
          <div className="size-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors mt-0.5">
            <Search className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0 select-none">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xs font-medium text-foreground tracking-tight">
                {t('diet.actionMenu.searchTitle', '記錄食材 / 食譜')}
              </span>
            </div>
            <div className="text-2xs text-muted-foreground leading-normal mt-0.5 truncate">
              {t('diet.actionMenu.searchDesc', '搜尋單品食材或自訂食譜')}
            </div>
          </div>
        </button>

        {/* 第 2 項：複製餐點 */}
        <button
          type="button"
          onClick={handleSelectCopy}
          className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-hover active:bg-muted/50 transition-colors text-left cursor-pointer group"
        >
          <div className="size-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors mt-0.5">
            <Copy className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0 select-none">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xs font-medium text-foreground tracking-tight">
                {t('diet.actionMenu.copyTitle', '複製餐點')}
              </span>
              <span className="px-1 py-0.5 rounded text-[10px] font-mono font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 leading-none">
                {t('diet.actionMenu.copyTag', '省時')}
              </span>
            </div>
            <div className="text-2xs text-muted-foreground leading-normal mt-0.5 truncate">
              {t('diet.actionMenu.copyDesc', '套用昨日或歷史餐點')}
            </div>
          </div>
        </button>

        {/* 分割線 */}
        <div className="h-px bg-border my-0.5" role="separator" />

        {/* 第 3 項：快速估算（整體顏色更淡，因為低使用場景） */}
        <button
          type="button"
          onClick={handleSelectPlaceholder}
          className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-hover active:bg-muted/50 transition-colors text-left cursor-pointer group"
        >
          <div className="size-7 rounded-md bg-muted/40 text-muted-foreground/70 flex items-center justify-center shrink-0 group-hover:text-muted-foreground group-hover:bg-muted/60 transition-colors mt-0.5">
            <Calculator className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0 select-none">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors tracking-tight">
                {t('diet.actionMenu.placeholderTitle', '快速估算')}
              </span>
              <span className="px-1 py-0.5 rounded text-[10px] font-mono font-medium text-blue-500/70 bg-blue-500/5 border border-blue-500/15 leading-none">
                {t('diet.actionMenu.placeholderTag', '佔位')}
              </span>
            </div>
            <div className="text-2xs text-muted-foreground/60 leading-normal mt-0.5 truncate">
              {t('diet.actionMenu.placeholderDesc', '粗估卡路里或自訂三大元素')}
            </div>
          </div>
        </button>

        {/* 第 4 項：算我正常吃（整體顏色更淡，因為低使用場景） */}
        <button
          type="button"
          onClick={handleSelectAsPlanned}
          className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-hover active:bg-muted/50 transition-colors text-left cursor-pointer group"
        >
          <div className="size-7 rounded-md bg-muted/40 text-muted-foreground/70 flex items-center justify-center shrink-0 group-hover:text-muted-foreground group-hover:bg-muted/60 transition-colors mt-0.5">
            <Zap className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0 select-none">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors tracking-tight">
                {t('diet.asPlanned.actionTitle', '歷史均值')}
              </span>
              <span className="px-1 py-0.5 rounded text-[10px] font-mono font-medium text-muted-foreground bg-muted/60 border border-border leading-none">
                {t('diet.asPlanned.badge', '配額')}
              </span>
            </div>
            <div className="text-2xs font-mono text-muted-foreground/60 leading-normal mt-0.5 truncate">
              {t('diet.asPlanned.actionDesc', '套用過去{{meal}}的平均值 · {{calories}} kcal', {
                meal: t(`diet.${mealType}`),
                calories: budget.calories,
              })}
            </div>
          </div>
        </button>
      </PopoverContent>
    </Popover>
  );
}
