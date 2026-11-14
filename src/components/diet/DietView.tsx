import { useTranslation } from 'react-i18next';
import { ChevronRight, Zap } from 'lucide-react';
import type { MealType, HydratedFoodLog, FoodRecipe, EnergyUnit, FoodWeightUnit, FoodVolumeUnit } from '@/types';
import { MealBundleCard } from '@/components/food/MealBundleCard';
import { MacroSquares } from '@/components/food/MacroSquares';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MealEnergyPopover } from '@/components/diet/MealEnergyPopover';
import { MealAddActionPopover } from '@/components/diet/MealAddActionPopover';
import { calculateMealBudget } from '@/utils/nutritionMath';
import { triggerHaptic } from '@/lib/haptics';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { cn } from '@/lib/utils';
import { resolveFoodLogTitle } from '@/utils/foodNaming';
import {
  sortGroupedMealEntriesByWeightDesc,
  type GroupedMealEntry,
} from '@/utils/dietSorting';

export function groupMealLogs(
  logs: HydratedFoodLog[],
  recipeMap: Map<string, FoodRecipe> = new Map()
): GroupedMealEntry[] {
  const result: GroupedMealEntry[] = [];
  const bundleMap = new Map<
    string,
    { type: 'bundle'; bundleId: string; bundleTitle: string; logs: HydratedFoodLog[] }
  >();

  for (const log of logs) {
    if (log.bundleId) {
      const existing = bundleMap.get(log.bundleId);
      if (existing) {
        existing.logs.push(log);
      } else {
        const recipe = recipeMap.get(log.bundleId);
        const bundleTitle = recipe?.name || '菜餚';
        const bundleEntry = {
          type: 'bundle' as const,
          bundleId: log.bundleId,
          bundleTitle,
          logs: [log],
        };
        bundleMap.set(log.bundleId, bundleEntry);
        result.push(bundleEntry);
      }
    } else {
      result.push({
        type: 'single',
        log,
      });
    }
  }

  return sortGroupedMealEntriesByWeightDesc(result);
}

export interface DietViewProps {
  currentActivity?: number;
  consumedEnergy: number;
  targetEnergy: number;
  energyDiff: number;
  energyUnit?: EnergyUnit;
  totals: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  targetMacros: {
    carbsGrams: number;
    proteinGrams: number;
    fatGrams: number;
  };
  targetCalories?: number;
  macroSplitTemplateLabel?: string;
  mealGroups: Record<MealType, HydratedFoodLog[]>;
  recipeMap?: Map<string, FoodRecipe>;
  foodWeightUnit?: FoodWeightUnit;
  foodVolumeUnit?: FoodVolumeUnit;
  className?: string;
  interactive?: boolean;
  onQuickActivityChange?: (val: number) => void;
  onOpenPlanModal?: () => void;
  onOpenAddForMeal?: (type: MealType) => void;
  onOpenCopyForMeal?: (type: MealType) => void;
  onOpenPlaceholderForMeal?: (type: MealType) => void;
  onLogAsPlanned?: (
    mealType: MealType,
    budgetOverride?: { calories: number; carbs: number; protein: number; fat: number }
  ) => void;
  onEditFoodLog?: (log: HydratedFoodLog) => void;
  onEditPlaceholderLog?: (log: HydratedFoodLog) => void;
  onEditBundle?: (bundleId: string, bundleTitle: string, logs: HydratedFoodLog[]) => void;
  onDeleteFoodLog?: (id: string) => void;
  onDeleteBundle?: (bundleId: string) => void;
}

export function DietView({
  currentActivity = 1.55,
  consumedEnergy,
  targetEnergy,
  energyDiff,
  energyUnit = 'kcal',
  totals,
  targetMacros,
  targetCalories = 2000,
  macroSplitTemplateLabel = '均衡',
  mealGroups,
  recipeMap = new Map(),
  foodWeightUnit = 'g',
  foodVolumeUnit = 'ml',
  className = '',
  interactive = true,
  onQuickActivityChange,
  onOpenPlanModal,
  onOpenAddForMeal,
  onOpenCopyForMeal,
  onOpenPlaceholderForMeal,
  onLogAsPlanned,
  onEditFoodLog,
  onEditPlaceholderLog,
  onEditBundle,
  onDeleteFoodLog,
  onDeleteBundle,
}: DietViewProps) {
  const { t } = useTranslation();
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  const getActivityShortLabel = (level: number) => {
    switch (level) {
      case 1.2:
        return t('dietPlan.sedentaryShort', '久坐辦公');
      case 1.375:
        return t('dietPlan.lightShort', '輕度活動');
      case 1.45:
        return t('dietPlan.lightExerciseShort', '輕度運動');
      case 1.55:
        return t('dietPlan.moderateShort', '中度活動');
      case 1.725:
        return t('dietPlan.heavyShort', '高強度活動');
      case 1.8:
        return t('dietPlan.intenseExerciseShort', '高強度訓練');
      case 1.9:
        return t('dietPlan.athleteShort', '極重度活動');
      case 2.0:
        return t('dietPlan.extremeShort', '極限體能');
      case 999:
        return t('dietPlan.bingeShort', '放縱');
      default:
        return `${level}x`;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 頂部全日總計卡片 (對齊財務儀表板經典雙層排版：1. 熱量統計 2. 碳水、蛋白質、脂肪) */}
      <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground">
        {/* 上半部：熱量統計 (Hero Metric) */}
        <div className="p-4 sm:p-5 relative space-y-3">
          {/* 頂部列：左側活動係數純膠囊、中間熱量統計標籤、右側目標純膠囊 */}
          <div className="relative flex items-center justify-between">
            {/* 左側：活動係數純膠囊快捷切換 */}
            <div className="shrink-0 z-10">
              {interactive ? (
                <Select
                  value={String(currentActivity)}
                  onValueChange={(val) => val && onQuickActivityChange?.(parseFloat(val))}
                >
                  <SelectTrigger
                    size="custom"
                    className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer select-none active:scale-95"
                  >
                    <SelectValue className="flex-none">
                      {getActivityShortLabel(currentActivity)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="1.2">{t('dietPlan.sedentary')}</SelectItem>
                    <SelectItem value="1.375">{t('dietPlan.light')}</SelectItem>
                    <SelectItem value="1.45">{t('dietPlan.lightExercise')}</SelectItem>
                    <SelectItem value="1.55">{t('dietPlan.moderate')}</SelectItem>
                    <SelectItem value="1.725">{t('dietPlan.heavy')}</SelectItem>
                    <SelectItem value="1.8">{t('dietPlan.intenseExercise')}</SelectItem>
                    <SelectItem value="1.9">{t('dietPlan.athlete')}</SelectItem>
                    <SelectItem value="2.0">{t('dietPlan.extreme')}</SelectItem>
                    <SelectItem value="999">{t('dietPlan.binge')}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-center select-none font-mono">
                  {getActivityShortLabel(currentActivity)}
                </div>
              )}
            </div>

            {/* 中間：熱量統計標籤 (幾何絕對居中，與下方熱量巨型數值 1:1 垂直對齊) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs sm:text-sm font-normal text-muted-foreground select-none">
                {t('diet.calorieStats')}
              </span>
            </div>

            {/* 右側：供能比模板膠囊 (點擊可開啟供能比設定) */}
            <div className="shrink-0 z-10">
              {interactive ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPlanModal?.();
                    triggerHaptic('light');
                  }}
                  className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer select-none active:scale-95"
                  title={t('dietPlan.title', '供能比')}
                >
                  <span>{macroSplitTemplateLabel}</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0 -ml-0.5" />
                </button>
              ) : (
                <div className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-center gap-1 select-none font-mono">
                  <span>{macroSplitTemplateLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* 核心巨型熱量數值 (居中) */}
          <div className="pt-2 pb-1 text-center">
            <div className="hero-number flex items-baseline justify-center gap-1.5">
              <span>{consumedEnergy.toLocaleString()}</span>
              <span className="text-sm sm:text-base font-normal text-muted-foreground font-mono">
                {energyUnit}
              </span>
            </div>

            {/* 客觀差額事實 */}
            <div className="flex items-center justify-center gap-2 mt-1 text-sm font-mono text-muted-foreground">
              <span>
                {energyDiff >= 0
                  ? `${t('dietPlan.underBudget')} ${energyDiff.toLocaleString()}${energyUnit}`
                  : `${t('dietPlan.overBudget')} +${Math.abs(energyDiff).toLocaleString()}${energyUnit}`}
              </span>
            </div>

            {/* 客觀進度標尺 */}
            <div className="h-2 w-full max-w-[220px] mx-auto bg-track rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{
                  width: `${Math.min(100, targetEnergy > 0 ? (consumedEnergy / targetEnergy) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 下半部：三大營養素 (2. 碳水、蛋白質、脂肪) */}
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
          {/* 1. 碳水化合物 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="text-xs font-medium text-carbs truncate whitespace-nowrap">
              {t('dietPlan.carbsShort')}
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-normal text-foreground">
                {Math.round(totals.carbs)}g
              </span>
              <span className="text-2xs sm:text-xs font-normal text-muted-foreground">
                /{targetMacros.carbsGrams}g
              </span>
            </div>
            <div className="h-2 w-full bg-carbs-subtle rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-carbs transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    targetMacros.carbsGrams > 0
                      ? (totals.carbs / targetMacros.carbsGrams) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* 2. 蛋白質 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="text-xs font-medium text-protein truncate whitespace-nowrap">
              {t('dietPlan.proteinShort')}
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-normal text-foreground">
                {Math.round(totals.protein)}g
              </span>
              <span className="text-2xs sm:text-xs font-normal text-muted-foreground">
                /{targetMacros.proteinGrams}g
              </span>
            </div>
            <div className="h-2 w-full bg-protein-subtle rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-protein transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    targetMacros.proteinGrams > 0
                      ? (totals.protein / targetMacros.proteinGrams) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* 3. 脂肪 */}
          <div className="p-2.5 sm:p-4 space-y-1 overflow-hidden">
            <div className="text-xs font-medium text-fat truncate whitespace-nowrap">
              {t('dietPlan.fatShort')}
            </div>
            <div className="text-sm sm:text-base font-mono tracking-tight flex items-baseline truncate whitespace-nowrap">
              <span className="font-normal text-foreground">
                {Math.round(totals.fat)}g
              </span>
              <span className="text-2xs sm:text-xs font-normal text-muted-foreground">
                /{targetMacros.fatGrams}g
              </span>
            </div>
            <div className="h-2 w-full bg-fat-subtle rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-fat transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    targetMacros.fatGrams > 0
                      ? (totals.fat / targetMacros.fatGrams) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 四大餐別列表 */}
      {mealTypes.map((type) => {
        const items = mealGroups[type] || [];
        const groupCalories = items.reduce((acc, curr) => acc + (curr.calories || 0), 0);
        const groupProtein = items.reduce((acc, curr) => acc + (curr.protein || 0), 0);
        const groupCarbs = items.reduce((acc, curr) => acc + (curr.carbs || 0), 0);
        const groupFat = items.reduce((acc, curr) => acc + (curr.fat || 0), 0);

        const mealBudget = calculateMealBudget(type, {
          calories: targetCalories,
          carbsGrams: targetMacros.carbsGrams,
          proteinGrams: targetMacros.proteinGrams,
          fatGrams: targetMacros.fatGrams,
        });

        return (
          <div key={type} className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden">
            {/* 灰底表頭橫欄 (單行 40px 高度：左側餐別名稱 + 3C-2 供能微線微箭頭 Popover，右側圓形「+」圖標按鈕) */}
            <div className="h-10 px-3.5 sm:px-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3 text-xs font-mono text-muted-foreground shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm tracking-tight text-foreground shrink-0">
                  {t(`diet.${type}`)}
                </span>
                {items.length > 0 && groupCalories > 0 && (
                  <>
                    <span className="text-border select-none shrink-0">·</span>
                    <MealEnergyPopover
                      formattedEnergy={formatEnergy(groupCalories, energyUnit).formatted}
                      calories={groupCalories}
                      carbs={groupCarbs}
                      protein={groupProtein}
                      fat={groupFat}
                    />
                  </>
                )}
              </div>

              {interactive ? (
                <MealAddActionPopover
                  mealType={type}
                  budget={mealBudget}
                  onOpenAddFood={onOpenAddForMeal || (() => {})}
                  onOpenCopyMeal={onOpenCopyForMeal || (() => {})}
                  onOpenQuickPlaceholder={onOpenPlaceholderForMeal || (() => {})}
                  onLogAsPlanned={onLogAsPlanned || (() => {})}
                />
              ) : (
                <div className="text-[11px] font-mono text-muted-foreground/80">
                  {formatEnergy(groupCalories, energyUnit).formatted}
                </div>
              )}
            </div>

            {/* 食物條目列表 (沿用食物管理頁面 MacroSquares 矩陣) */}
            {items.length > 0 ? (
              <div className="divide-y divide-border">
                {groupMealLogs(items, recipeMap).map((entry) => {
                  if (entry.type === 'bundle') {
                    return (
                      <MealBundleCard
                        key={entry.bundleId}
                        bundleId={entry.bundleId}
                        bundleTitle={entry.bundleTitle}
                        logs={entry.logs}
                        onDeleteBundle={onDeleteBundle || (() => {})}
                        onDeleteSingle={onDeleteFoodLog ? (log) => onDeleteFoodLog(log.id) : () => {}}
                        onEditBundle={onEditBundle}
                      />
                    );
                  }

                  const item = entry.log;
                  const evalRes = evaluateNutritionalHighlight({
                    calories: item.calories || 0,
                    protein: item.protein || 0,
                    carbs: item.carbs || 0,
                    fat: item.fat || 0,
                    servingSize: item.quantity,
                    servingUnit: item.unit || 'g',
                  });
                  const isLowCalorie = evalRes.labels.includes('low-calorie');
                  const isHighCalorie = evalRes.labels.includes('high-calorie');

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!interactive) return;
                        triggerHaptic('selection');
                        if (item.entryType === 'estimate' || item.isPlaceholder) {
                          onEditPlaceholderLog?.(item);
                        } else {
                          onEditFoodLog?.(item);
                        }
                      }}
                      className={cn(
                        'min-h-16 py-2.5 px-3.5 sm:px-4 flex items-center justify-between transition-colors',
                        interactive ? 'hover:bg-hover cursor-pointer' : 'cursor-default'
                      )}
                    >
                      {/* 左側：品名與份量熱量副標 */}
                      <div className="flex-1 min-w-0 pr-3 select-none">
                        <div className="truncate text-foreground font-medium text-sm flex items-center gap-1.5">
                          {(item.entryType === 'estimate' || item.isPlaceholder) && (
                            <span className="px-1.5 py-0.5 rounded-md border border-border bg-muted/60 text-muted-foreground text-[10px] font-mono font-medium shrink-0 leading-none flex items-center gap-1 shadow-none select-none">
                              <Zap className="size-2.5 stroke-[2.2]" />
                              <span>{t('diet.placeholder.badge', '估算')}</span>
                            </span>
                          )}
                          {(item.entryType === 'as_planned' || item.isAsPlanned) && (
                            <span className="px-1.5 py-0.5 rounded-md border border-border bg-muted/60 text-muted-foreground text-[10px] font-mono font-medium shrink-0 leading-none flex items-center gap-1 shadow-none select-none">
                              <Zap className="size-2.5 stroke-[2.2]" />
                              <span>{t('diet.asPlanned.badge', '配額')}</span>
                            </span>
                          )}
                          <span className="truncate">
                            {resolveFoodLogTitle(item, t)}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                          {item.entryType === 'estimate' || item.entryType === 'as_planned' || item.isPlaceholder || item.isAsPlanned ? (
                            <span>{formatEnergy(item.calories || 0, energyUnit).formatted}</span>
                          ) : (
                            <>
                              <span>
                                {formatFoodServing(item.quantity || 0, item.unit || 'g', foodWeightUnit, foodVolumeUnit).formatted}
                              </span>
                              <span className="text-border">·</span>
                              <span
                                className={cn(
                                  isLowCalorie &&
                                    'text-emerald-600/90 dark:text-emerald-400/90 px-1 py-0.5 rounded bg-emerald-500/5',
                                  isHighCalorie &&
                                    'text-rose-600/90 dark:text-rose-400/90 px-1 py-0.5 rounded bg-rose-500/5'
                                )}
                              >
                                {formatEnergy(item.calories || 0, energyUnit).formatted}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 右側：MacroSquares 矩陣 (首頁採用方案 A 柔和微光) */}
                      <div className="flex items-center shrink-0">
                        <MacroSquares
                          protein={item.protein || 0}
                          carbs={item.carbs || 0}
                          fat={item.fat || 0}
                          highlights={evalRes.highlights}
                          variant="subtle"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-mono text-muted-foreground/60 select-none">
                {t('diet.noFoodLogs', '無記錄')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const DEMO_DIET_DATA: DietViewProps = {
  currentActivity: 1.55,
  consumedEnergy: 1840,
  targetEnergy: 2000,
  energyDiff: 160,
  energyUnit: 'kcal',
  totals: {
    calories: 1840,
    carbs: 205,
    protein: 142,
    fat: 52,
  },
  targetMacros: {
    carbsGrams: 220,
    proteinGrams: 140,
    fatGrams: 60,
  },
  targetCalories: 2000,
  macroSplitTemplateLabel: '均衡',
  foodWeightUnit: 'g',
  foodVolumeUnit: 'ml',
  recipeMap: new Map([
    [
      'recipe-tomato-beef',
      {
        id: 'recipe-tomato-beef',
        name: '番茄牛肉糙米飯',
        isCustom: true,
        ingredients: [],
        createdAt: 0,
        updatedAt: 0,
      },
    ],
  ]),
  mealGroups: {
    breakfast: [
      {
        id: 'demo-log-b1',
        mealType: 'breakfast',
        date: '2026-11-14',
        foodId: 'food-chicken-breast',
        foodName: '去皮雞胸肉',
        quantity: 150,
        unit: 'g',
        calories: 195,
        protein: 45,
        carbs: 0,
        fat: 2,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'demo-log-b2',
        mealType: 'breakfast',
        date: '2026-11-14',
        foodId: 'food-oats',
        foodName: '傳統燕麥片',
        quantity: 60,
        unit: 'g',
        calories: 220,
        protein: 8,
        carbs: 40,
        fat: 4,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'demo-log-b3',
        mealType: 'breakfast',
        date: '2026-11-14',
        foodId: 'food-egg',
        foodName: '全雞蛋',
        quantity: 50,
        unit: 'g',
        calories: 75,
        protein: 6,
        carbs: 1,
        fat: 5,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    lunch: [
      {
        id: 'demo-log-l1',
        mealType: 'lunch',
        date: '2026-11-14',
        foodId: 'food-beef-flank',
        foodName: '牛里肌',
        bundleId: 'recipe-tomato-beef',
        quantity: 200,
        unit: 'g',
        calories: 260,
        protein: 44,
        carbs: 0,
        fat: 8,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'demo-log-l2',
        mealType: 'lunch',
        date: '2026-11-14',
        foodId: 'food-brown-rice',
        foodName: '糙米',
        bundleId: 'recipe-tomato-beef',
        quantity: 100,
        unit: 'g',
        calories: 350,
        protein: 8,
        carbs: 75,
        fat: 3,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'demo-log-l3',
        mealType: 'lunch',
        date: '2026-11-14',
        foodId: 'food-olive-oil',
        foodName: '橄欖油',
        bundleId: 'recipe-tomato-beef',
        quantity: 8,
        unit: 'g',
        calories: 70,
        protein: 0,
        carbs: 0,
        fat: 8,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    snack: [
      {
        id: 'demo-log-s1',
        mealType: 'snack',
        date: '2026-11-14',
        entryType: 'estimate',
        scenario: 'cafe',
        customTitle: '燕麥拿鐵 (大杯 · 無糖)',
        foodName: '外食粗估',
        quantity: 1,
        unit: '杯',
        calories: 230,
        protein: 10,
        carbs: 28,
        fat: 8,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    dinner: [
      {
        id: 'demo-log-d1',
        mealType: 'dinner',
        date: '2026-11-14',
        entryType: 'as_planned',
        customTitle: '日常規律晚餐',
        foodName: '歷史均值',
        quantity: 1,
        unit: '份',
        calories: 465,
        protein: 35,
        carbs: 55,
        fat: 16,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
  },
  interactive: false,
};
