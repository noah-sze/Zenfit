import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MealEnergyPopoverProps {
  formattedEnergy: string;
  calories?: number;
  carbs: number;
  protein: number;
  fat: number;
}

/**
 * 方案 3C-2：供能線微箭頭一體化 (Integrated Drop Notch)
 * - 點擊熱量與微箭頭展開三大營養素細節
 * - 嚴格固定三大營養素順序：碳水化合物 (C) ➔ 蛋白質 (P) ➔ 脂肪 (F)
 * - 純客觀數據呈現，文本直接上色，無任何主觀批判
 */
export function MealEnergyPopover({
  formattedEnergy,
  carbs,
  protein,
  fat,
}: MealEnergyPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // 供能比比例推算 (碳水 4kcal/g, 蛋白 4kcal/g, 脂肪 9kcal/g)
  const carbCals = carbs * 4;
  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const totalMacroCal = carbCals + proteinCals + fatCals;

  let cPercent = 0;
  let pPercent = 0;
  let fPercent = 0;

  if (totalMacroCal > 0) {
    cPercent = Math.round((carbCals / totalMacroCal) * 100);
    pPercent = Math.round((proteinCals / totalMacroCal) * 100);
    fPercent = Math.max(0, 100 - cPercent - pPercent);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex flex-col cursor-pointer px-1 py-0.5 -mx-1 rounded hover:bg-muted/80 transition-colors select-none group focus:outline-hidden"
        aria-label={t('common.details', '詳細資訊')}
      >
        {/* 上半部：熱量數值 + 10px 微型箭頭 */}
        <div className="flex items-center justify-between gap-1 font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-none">
          <span>{formattedEnergy}</span>
          <ChevronDown
            className={cn(
              'size-2.5 text-muted-foreground/70 group-hover:text-foreground transition-transform duration-150',
              open && 'rotate-180'
            )}
          />
        </div>

        {/* 下半部：與數值同寬之供能色彩微標尺 (3px 高度) */}
        <div className="w-full h-[3px] rounded-[1.5px] overflow-hidden flex gap-px mt-1 bg-muted">
          <div
            className="bg-carbs transition-all duration-150"
            style={{ width: `${cPercent}%` }}
          />
          <div
            className="bg-protein transition-all duration-150"
            style={{ width: `${pPercent}%` }}
          />
          <div
            className="bg-fat transition-all duration-150"
            style={{ width: `${fPercent}%` }}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-52 p-3 bg-popover text-popover-foreground border border-border shadow-none rounded-lg select-none"
      >
        {/* 三大營養素數值條目 (固定順序：碳水化合物 ➔ 蛋白質 ➔ 脂肪) */}
        <div className="space-y-1.5 font-mono">
          {/* 碳水化合物 (C) */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-carbs font-medium">
              {t('diet.dietPlan.carbs', '碳水化合物')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{Math.round(carbs)}g</span>
              <span className="text-[10px] text-muted-foreground w-7 text-right">
                {cPercent}%
              </span>
            </div>
          </div>

          {/* 蛋白質 (P) */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-protein font-medium">
              {t('diet.dietPlan.protein', '蛋白質')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{Math.round(protein)}g</span>
              <span className="text-[10px] text-muted-foreground w-7 text-right">
                {pPercent}%
              </span>
            </div>
          </div>

          {/* 脂肪 (F) */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-fat font-medium">
              {t('diet.dietPlan.fat', '脂肪')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{Math.round(fat)}g</span>
              <span className="text-[10px] text-muted-foreground w-7 text-right">
                {fPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* 底部完整供能比例條 */}
        <div className="w-full h-1.5 rounded-full overflow-hidden flex gap-px bg-muted mt-2.5">
          <div
            className="bg-carbs transition-all duration-150"
            style={{ width: `${cPercent}%` }}
          />
          <div
            className="bg-protein transition-all duration-150"
            style={{ width: `${pPercent}%` }}
          />
          <div
            className="bg-fat transition-all duration-150"
            style={{ width: `${fPercent}%` }}
          />
        </div>

        {/* 供能比例圖例標籤 */}
        <div className="flex items-center justify-between text-[10px] font-mono mt-1 px-0.5">
          <span className="text-carbs font-medium">C {cPercent}%</span>
          <span className="text-protein font-medium">P {pPercent}%</span>
          <span className="text-fat font-medium">F {fPercent}%</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
