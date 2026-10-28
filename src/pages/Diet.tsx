import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDietPlan } from '@/hooks/useDietPlan';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { MealType, FoodLog } from '@/types';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { MealBundleCard } from '@/components/food/MealBundleCard';
import { MacroSquares } from '@/components/food/MacroSquares';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DietPlanModal } from '@/components/diet/DietPlanModal';
import {
  calculateBMR,
  calculateTDEE,
  calculateAgeFromBirth,
  calculateMacrosFromSplit,
} from '@/utils/weightMath';
import { triggerHaptic } from '@/lib/haptics';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';
type GroupedMealEntry =
  | { type: 'single'; log: FoodLog }
  | { type: 'bundle'; bundleId: string; bundleName: string; logs: FoodLog[] };

function getLogHighlights(log: { protein: number; carbs: number; fat: number; calories?: number }) {
  const totalCal = log.calories || (log.protein * 4 + log.carbs * 4 + log.fat * 9) || 1;
  return {
    protein: (log.protein * 4) / totalCal >= 0.35 && log.protein >= 10,
    carbs: (log.carbs * 4) / totalCal >= 0.5 && log.carbs >= 15,
    fat: (log.fat * 9) / totalCal >= 0.5 && log.fat >= 8,
  };
}

function groupMealLogs(logs: FoodLog[]): GroupedMealEntry[] {
  const result: GroupedMealEntry[] = [];
  const bundleMap = new Map<string, { type: 'bundle'; bundleId: string; bundleName: string; logs: FoodLog[] }>();

  for (const log of logs) {
    if (log.bundleId) {
      const existing = bundleMap.get(log.bundleId);
      if (existing) {
        existing.logs.push(log);
      } else {
        const bundleEntry = {
          type: 'bundle' as const,
          bundleId: log.bundleId,
          bundleName: log.bundleName || (log.notes ? log.notes.replace(/^\[|\]$/g, '') : '食譜組合'),
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

  return result;
}

export default function Diet() {
  const { t } = useTranslation();
  const { selectedDate, openAddModal } = useAppStore();
  const { mealGroups, deleteFoodLog, deleteFoodLogBundle, totals } = useFoodLogs(selectedDate);
  const { profile, updateProfile } = useUserProfile();
  const { plan, saveDietPlan } = useDietPlan(selectedDate);
  const { energyUnit, foodWeightUnit, foodVolumeUnit } = useUnitPreferences();
  const confirm = useConfirm();

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  // 計算客觀生理常數與飲食目標
  const age = profile.birthDate
    ? calculateAgeFromBirth(profile.birthDate)
    : profile.age || 25;
  const currentBMR = calculateBMR(
    profile.currentWeightKg,
    profile.heightCm,
    profile.gender,
    age
  );
  const currentActivity = profile.activityLevel || 1.55;

  // 目標熱量與宏量營養素優先取用當日獨立之 DietPlan
  const targetCalories = plan.caloriesTarget;
  const targetMacros = {
    carbsGrams: plan.carbsTarget,
    proteinGrams: plan.proteinTarget,
    fatGrams: plan.fatTarget,
  };

  const currentSplit = profile.macroSplit || { carbs: 40, protein: 30, fat: 30 };
  const calorieDiff = targetCalories - totals.calories;

  // 快捷切換活動係數（寫入當日專屬 DietPlan）
  const handleQuickActivityChange = async (newLevel: number) => {
    triggerHaptic('selection');
    const newTDEE = calculateTDEE(currentBMR, newLevel);
    const newMacros = calculateMacrosFromSplit(
      newTDEE,
      currentSplit.carbs,
      currentSplit.protein,
      currentSplit.fat
    );
    await saveDietPlan({
      caloriesTarget: newTDEE,
      proteinTarget: newMacros.proteinGrams,
      carbsTarget: newMacros.carbsGrams,
      fatTarget: newMacros.fatGrams,
    });
    await updateProfile({
      activityLevel: newLevel,
    });
  };

  // 活動係數短標籤（純膠囊顯示）
  const getActivityShortLabel = (level: number) => {
    switch (level) {
      case 1.2:
        return t('dietPlan.sedentaryShort', '久坐辦公');
      case 1.375:
        return t('dietPlan.lightShort', '輕度活動');
      case 1.55:
        return t('dietPlan.moderateShort', '中度活動');
      case 1.725:
        return t('dietPlan.heavyShort', '高強度活動');
      case 1.9:
        return t('dietPlan.athleteShort', '極重度活動');
      default:
        return String(level);
    }
  };

  const handleDelete = async (item: FoodLog) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${item.foodName}?`,
      variant: 'destructive',
    });
    if (ok) {
      await deleteFoodLog(item.id);
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: t('common.confirmDelete', '確認刪除此分組記錄？'),
      variant: 'destructive',
    });
    if (ok) {
      await deleteFoodLogBundle(bundleId);
    }
  };

  return (
    <div className="space-y-4">
      {/* 頂部全日總計卡片 (對齊財務儀表板經典雙層排版：1. 熱量統計 2. 碳水、蛋白質、脂肪) */}
      <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground">
        {/* 上半部：熱量統計 (Hero Metric) */}
        <div className="p-4 sm:p-5 relative space-y-3">
          {/* 頂部列：左側活動係數純膠囊、中間熱量統計標籤、右側目標純膠囊 */}
          <div className="relative flex items-center justify-between">
            {/* 左側：活動係數純膠囊快捷切換 */}
            <div className="shrink-0 z-10">
              <Select
                value={String(currentActivity)}
                onValueChange={(val) => val && handleQuickActivityChange(parseFloat(val))}
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
                  <SelectItem value="1.55">{t('dietPlan.moderate')}</SelectItem>
                  <SelectItem value="1.725">{t('dietPlan.heavy')}</SelectItem>
                  <SelectItem value="1.9">{t('dietPlan.athlete')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 中間：熱量統計標籤 (幾何絕對居中，與下方熱量巨型數值 1:1 垂直對齊) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs sm:text-sm font-normal text-muted-foreground select-none">
                {t('diet.calorieStats')}
              </span>
            </div>

            {/* 右側：目標純膠囊 (點擊可開啟飲食計劃設定) */}
            <div className="shrink-0 z-10">
              <button
                type="button"
                onClick={() => {
                  setIsPlanModalOpen(true);
                  triggerHaptic('light');
                }}
                className="h-6 px-2.5 rounded-full border border-border/80 bg-muted/20 hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer select-none active:scale-95"
                title={t('dietPlan.title')}
              >
                <span>{t('diet.target')}</span>
              </button>
            </div>
          </div>

          {/* 核心巨型熱量數值 (居中) */}
          <div className="pt-2 pb-1 text-center">
            <div className="hero-number flex items-baseline justify-center gap-1.5">
              <span>{formatEnergy(totals.calories, energyUnit).value.toLocaleString()}</span>
              <span className="text-sm sm:text-base font-normal text-muted-foreground font-mono">
                {energyUnit}
              </span>
            </div>

            {/* 客觀差額事實 */}
            <div className="flex items-center justify-center gap-2 mt-1 text-sm font-mono text-muted-foreground">
              <span>
                {calorieDiff >= 0
                  ? `${t('dietPlan.underBudget')} ${formatEnergy(calorieDiff, energyUnit).value.toLocaleString()} ${energyUnit}`
                  : `${t('dietPlan.overBudget')} +${formatEnergy(Math.abs(calorieDiff), energyUnit).value.toLocaleString()} ${energyUnit}`}
              </span>

            </div>

            {/* 客觀進度標尺 */}
            <div className="h-2 w-full max-w-[220px] mx-auto bg-track rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{
                  width: `${Math.min(100, targetCalories > 0 ? (totals.calories / targetCalories) * 100 : 0)}%`,
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
              <span className="font-bold text-foreground">
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
              <span className="font-bold text-foreground">
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
              <span className="font-bold text-foreground">
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
        const items = mealGroups[type];
        const groupCalories = items.reduce((acc, curr) => acc + (curr.calories || 0), 0);
        const groupProtein = items.reduce((acc, curr) => acc + (curr.protein || 0), 0);
        const groupCarbs = items.reduce((acc, curr) => acc + (curr.carbs || 0), 0);
        const groupFat = items.reduce((acc, curr) => acc + (curr.fat || 0), 0);

        return (
          <div key={type} className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden">
            {/* 灰底表頭橫欄 (強層級感，內嵌三大營養素微彙總) */}
            <div className="h-10 px-3.5 sm:px-4 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
                <span className="font-semibold text-sm tracking-tight text-foreground">
                  {t(`diet.${type}`)}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {formatEnergy(groupCalories, energyUnit).formatted}
                  </span>
                  {items.length > 0 && (
                    <>
                      <span className="text-border">/</span>
                      <span>
                        <span className="text-protein font-medium">{t('diet.macroMicro.protein', '蛋')}</span>{' '}
                        {Math.round(groupProtein)}g
                      </span>
                      <span className="text-border">·</span>
                      <span>
                        <span className="text-carbs font-medium">{t('diet.macroMicro.carbs', '碳')}</span>{' '}
                        {Math.round(groupCarbs)}g
                      </span>
                      <span className="text-border">·</span>
                      <span>
                        <span className="text-fat font-medium">{t('diet.macroMicro.fat', '脂')}</span>{' '}
                        {Math.round(groupFat)}g
                      </span>
                    </>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAddModal('food')}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              >
                <Plus className="size-3.5 mr-1" />
                {t('common.add')}
              </Button>
            </div>

            {/* 食物條目列表 (沿用食物管理頁面 MacroSquares 矩陣) */}
            {items.length > 0 ? (
              <div className="divide-y divide-border">
                {groupMealLogs(items).map((entry) => {
                  if (entry.type === 'bundle') {
                    return (
                      <MealBundleCard
                        key={entry.bundleId}
                        bundleId={entry.bundleId}
                        bundleName={entry.bundleName}
                        logs={entry.logs}
                        onDeleteBundle={handleDeleteBundle}
                        onDeleteSingle={handleDelete}
                      />
                    );
                  }

                  const item = entry.log;
                  return (
                    <div
                      key={item.id}
                      className="min-h-16 py-2.5 px-3.5 sm:px-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      {/* 左側：品名與份量熱量副標 */}
                      <div className="flex-1 min-w-0 pr-3 select-none">
                        <div className="truncate text-foreground font-medium text-sm">
                          {item.foodName}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                          <span>
                            {formatFoodServing(item.quantity, item.unit, foodWeightUnit, foodVolumeUnit).formatted}
                          </span>
                          <span className="text-border">·</span>
                          <span className="font-medium text-foreground">
                            {formatEnergy(item.calories, energyUnit).formatted}
                          </span>
                        </div>
                      </div>

                      {/* 右側：MacroSquares 矩陣 + 微刪除按鈕 */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <MacroSquares
                          protein={item.protein}
                          carbs={item.carbs}
                          fat={item.fat}
                          highlights={getLogHighlights(item)}
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-mono text-muted-foreground/60">
                {t('diet.noFoodLogs', '無記錄')}
              </div>
            )}
          </div>
        );
      })}

      {/* 完整飲食計劃設定彈窗 (包含供能比與客觀代謝常數微調) */}
      <DietPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        date={selectedDate}
        currentPlan={plan}
        onSavePlan={saveDietPlan}
        profile={profile}
        onSave={updateProfile}
      />
    </div>
  );

}
