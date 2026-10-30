import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDietPlan } from '@/hooks/useDietPlan';
import { Plus } from 'lucide-react';
import type { MealType, FoodLog, FoodItem, FoodRecipe } from '@/types';
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
import { EditFoodLogDialog } from '@/components/diet/EditFoodLogDialog';
import { EditRecipeLogDialog } from '@/components/diet/EditRecipeLogDialog';
import { MealEnergyPopover } from '@/components/diet/MealEnergyPopover';
import { FoodRecipeSelectDialog } from '@/components/food/FoodRecipeSelectDialog';
import { RecipeStagingDialog } from '@/components/food/RecipeStagingDialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { calculateIngredientMacros } from '@/utils/recipeMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { toast } from '@/components/ui/toast';
import {
  calculateBMR,
  calculateTDEE,
  calculateAgeFromBirth,
  calculateMacrosFromSplit,
} from '@/utils/weightMath';
import { triggerHaptic } from '@/lib/haptics';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy, formatFoodServing } from '@/utils/unitMath';
import { evaluateNutritionalHighlight } from '@/utils/nutritionEvaluation';
import { cn, evaluateAmountExpression } from '@/lib/utils';
type GroupedMealEntry =
  | { type: 'single'; log: FoodLog }
  | { type: 'bundle'; bundleId: string; bundleName: string; logs: FoodLog[] };

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
  const { selectedDate } = useAppStore();
  const {
    mealGroups,
    addFoodLog,
    updateFoodLog,
    updateFoodLogBundle,
    deleteFoodLog,
    deleteFoodLogBundle,
    totals,
  } = useFoodLogs(selectedDate);
  const { profile, updateProfile } = useUserProfile();
  const { plan, saveDietPlan } = useDietPlan(selectedDate);
  const { energyUnit, foodWeightUnit, foodVolumeUnit } = useUnitPreferences();
  const confirm = useConfirm();

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingFoodLog, setEditingFoodLog] = useState<FoodLog | null>(null);
  const [editingBundle, setEditingBundle] = useState<{
    bundleId: string;
    bundleName: string;
    logs: FoodLog[];
  } | null>(null);

  // 飲食新增記錄流程專用狀態
  const [targetMealTypeForAdd, setTargetMealTypeForAdd] = useState<MealType | null>(null);
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
  const [selectedFoodForAdd, setSelectedFoodForAdd] = useState<FoodItem | null>(null);
  const [foodQuantityForAdd, setFoodQuantityForAdd] = useState<number>(100);
  const [selectedRecipeForStaging, setSelectedRecipeForStaging] = useState<FoodRecipe | null>(null);

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

  const handleSaveFoodLog = async (
    id: string,
    updates: { quantity: number; calories: number; carbs: number; protein: number; fat: number }
  ) => {
    await updateFoodLog(id, updates);
  };

  const handleDeleteFoodLog = async (id: string) => {
    await deleteFoodLog(id);
  };

  const handleSaveRecipeLog = async (
    bundleId: string,
    items: Array<{
      id?: string;
      foodId?: string;
      foodName: string;
      quantity: number;
      unit: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    }>
  ) => {
    await updateFoodLogBundle(bundleId, items);
  };

  const handleDeleteRecipeBundle = async (bundleId: string) => {
    await deleteFoodLogBundle(bundleId);
  };

  // 開啟新增飲食選擇彈窗
  const handleOpenAddForMeal = (type: MealType) => {
    triggerHaptic('light');
    setTargetMealTypeForAdd(type);
    setIsSelectDialogOpen(true);
  };

  // 選擇食材或食譜回調
  const handleSelectFoodOrRecipe = (
    item: FoodItem | FoodRecipe,
    type: 'food' | 'recipe'
  ) => {
    if (type === 'food') {
      const food = item as FoodItem;
      const initialQty = food.servingSize || (foodWeightUnit === 'oz' ? 1 : 100);
      setSelectedFoodForAdd(food);
      setFoodQuantityForAdd(initialQty);
    } else {
      const recipe = item as FoodRecipe;
      setSelectedRecipeForStaging(recipe);
    }
  };

  // 確認新增單品食材
  const handleConfirmAddFood = async (val: number, unit?: string) => {
    if (!selectedFoodForAdd || !targetMealTypeForAdd) return;
    const finalQuantity = val > 0 ? val : (selectedFoodForAdd.servingSize || 100);
    const finalUnit = unit || selectedFoodForAdd.servingUnit || foodWeightUnit;
    const macros = calculateIngredientMacros(selectedFoodForAdd, finalQuantity);

    await addFoodLog({
      date: selectedDate,
      mealType: targetMealTypeForAdd,
      foodId: selectedFoodForAdd.id,
      foodName: formatFoodDisplayName(selectedFoodForAdd),
      quantity: finalQuantity,
      unit: finalUnit,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    });

    triggerHaptic('success');
    toast.show(t('common.saved', '已儲存'));
    setSelectedFoodForAdd(null);
    setIsSelectDialogOpen(false);
  };

  // 取消新增單品食材 (保留選擇彈窗開啟，方便返回)
  const handleCancelAddFood = () => {
    setSelectedFoodForAdd(null);
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

              <button
                type="button"
                onClick={() => handleOpenAddForMeal(type)}
                className="shrink-0 p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                aria-label={t('common.add')}
              >
                <Plus className="size-4" />
              </button>
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
                        onEditBundle={(bundleId, bundleName, logs) => {
                          setEditingBundle({ bundleId, bundleName, logs });
                        }}
                      />
                    );
                  }

                  const item = entry.log;
                  const evalRes = evaluateNutritionalHighlight({
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                    servingSize: item.quantity,
                    servingUnit: item.unit || 'g',
                  });
                  const isLowCalorie = evalRes.labels.includes('low-calorie');
                  const isHighCalorie = evalRes.labels.includes('high-calorie');

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        triggerHaptic('selection');
                        setEditingFoodLog(item);
                      }}
                      className="min-h-16 py-2.5 px-3.5 sm:px-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
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
                          <span
                            className={cn(
                              isLowCalorie &&
                                'text-emerald-600/90 dark:text-emerald-400/90 px-1 py-0.2 rounded bg-emerald-500/5',
                              isHighCalorie &&
                                'text-rose-600/90 dark:text-rose-400/90 px-1 py-0.2 rounded bg-rose-500/5'
                            )}
                          >
                            {formatEnergy(item.calories, energyUnit).formatted}
                          </span>
                        </div>
                      </div>

                      {/* 右側：MacroSquares 矩陣 (首頁採用方案 A 柔和微光) */}
                      <div className="flex items-center shrink-0">
                        <MacroSquares
                          protein={item.protein}
                          carbs={item.carbs}
                          fat={item.fat}
                          highlights={evalRes.highlights}
                          variant="subtle"
                        />
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

      {/* 單品食物記錄編輯管理 Dialog (方案 3) */}
      <EditFoodLogDialog
        open={!!editingFoodLog}
        onOpenChange={(open) => !open && setEditingFoodLog(null)}
        log={editingFoodLog}
        onSave={handleSaveFoodLog}
        onDelete={handleDeleteFoodLog}
      />

      {/* 菜餚組合記錄編輯管理 Dialog (菜餚方案 1) */}
      <EditRecipeLogDialog
        open={!!editingBundle}
        onOpenChange={(open) => !open && setEditingBundle(null)}
        bundleId={editingBundle?.bundleId || null}
        bundleName={editingBundle?.bundleName || ''}
        logs={editingBundle?.logs || []}
        onSave={handleSaveRecipeLog}
        onDeleteBundle={handleDeleteRecipeBundle}
      />

      {/* 食物/食譜選擇 Dialog (第一層彈窗 zIndex={60}，選擇後保持開啟以便取消返回) */}
      <FoodRecipeSelectDialog
        open={isSelectDialogOpen}
        onOpenChange={setIsSelectDialogOpen}
        mode="all"
        autoCloseOnSelect={false}
        zIndex={60}
        onSelect={handleSelectFoodOrRecipe}
      />

      {/* 選擇食材後的數字輸入鍵盤 Dialog (第二層彈窗 zIndex={80}) */}
      {selectedFoodForAdd && (
        <NumericKeypadDialog
          open={!!selectedFoodForAdd}
          onOpenChange={(open) => {
            if (!open) handleCancelAddFood();
          }}
          title={formatFoodDisplayName(selectedFoodForAdd)}
          value={foodQuantityForAdd}
          unit={selectedFoodForAdd.servingUnit || foodWeightUnit}
          allowDecimals={true}
          maxDecimals={2}
          onLiveChange={(val) => {
            setFoodQuantityForAdd(val);
          }}
          onConfirm={handleConfirmAddFood}
          onCancel={handleCancelAddFood}
          renderContextRow={(valStr, currentU) => {
            let finalValStr = valStr;
            if (/[+-]/.test(valStr.replace(/^[+-]/, ''))) {
              finalValStr = evaluateAmountExpression(valStr, false);
            }
            const qty = parseFloat(finalValStr) || 0;
            const macros = calculateIngredientMacros(selectedFoodForAdd, qty);
            return (
              <div className="h-10 px-3 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-between">
                <span className="text-calories font-bold font-mono text-xs">
                  {formatEnergy(macros.calories, energyUnit).formatted}
                </span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {valStr || '0'}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {currentU}
                  </span>
                </div>
              </div>
            );
          }}
        />
      )}

      {/* 選擇食譜後的構成食材與重量調整 Dialog (RecipeStagingDialog，第二層彈窗 zIndex={70}) */}
      {selectedRecipeForStaging && (
        <RecipeStagingDialog
          open={!!selectedRecipeForStaging}
          onOpenChange={(open) => {
            if (!open) setSelectedRecipeForStaging(null);
          }}
          recipe={selectedRecipeForStaging}
          mealType={targetMealTypeForAdd || 'breakfast'}
          date={selectedDate}
          zIndex={70}
          onSuccess={() => {
            setSelectedRecipeForStaging(null);
            setIsSelectDialogOpen(false);
          }}
        />
      )}
    </div>
  );

}
