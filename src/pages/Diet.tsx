import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useRecipes } from '@/hooks/useRecipes';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDietPlan } from '@/hooks/useDietPlan';
import type { MealType, HydratedFoodLog, FoodItem, FoodRecipe } from '@/types';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DietView } from '@/components/diet/DietView';
import {
  MACRO_SPLIT_TEMPLATES,
  findMatchingTemplate,
} from '@/constants/dietTemplates';
import { DietPlanModal } from '@/components/diet/DietPlanModal';
import { EditFoodLogDialog } from '@/components/diet/EditFoodLogDialog';
import { EditRecipeLogDialog } from '@/components/diet/EditRecipeLogDialog';
import { CopyMealDialog } from '@/components/diet/CopyMealDialog';
import {
  QuickPlaceholderDialog,
  type DiningScenarioId,
} from '@/components/diet/QuickPlaceholderDialog';
import { FoodRecipeSelectDialog } from '@/components/food/FoodRecipeSelectDialog';
import { RecipeStagingDialog } from '@/components/food/RecipeStagingDialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { calculateIngredientMacros } from '@/utils/recipeMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { calculateMealBudget } from '@/utils/nutritionMath';
import { triggerHaptic } from '@/lib/haptics';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { formatEnergy } from '@/utils/unitMath';
import { evaluateAmountExpression } from '@/lib/utils';

export default function Diet() {
  const { t } = useTranslation();
  const { selectedDate } = useAppStore();
  const {
    mealGroups,
    addFoodLog,
    addQuickPlaceholder,
    addAsPlannedMeal,
    updateFoodLog,
    updateFoodLogBundle,
    deleteFoodLog,
    deleteFoodLogBundle,
    totals,
  } = useFoodLogs(selectedDate);
  const { allRecipes } = useRecipes();
  const recipeMap = useMemo(() => {
    const map = new Map<string, FoodRecipe>();
    allRecipes.forEach((r) => map.set(r.id, r));
    return map;
  }, [allRecipes]);
  const { profile } = useUserProfile();
  const {
    plan,
    saveDietPlan,
    activityLevel: currentActivity,
  } = useDietPlan(selectedDate);
  const { energyUnit, foodWeightUnit, foodVolumeUnit } = useUnitPreferences();
  const confirm = useConfirm();

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingFoodLog, setEditingFoodLog] = useState<HydratedFoodLog | null>(null);
  const [editingBundle, setEditingBundle] = useState<{
    bundleId: string;
    bundleTitle: string;
    logs: HydratedFoodLog[];
  } | null>(null);

  // 飲食新增記錄流程專用狀態
  const [targetMealTypeForAdd, setTargetMealTypeForAdd] = useState<MealType | null>(null);
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
  const [selectedFoodForAdd, setSelectedFoodForAdd] = useState<FoodItem | null>(null);
  const [foodQuantityForAdd, setFoodQuantityForAdd] = useState<number>(100);
  const [selectedRecipeForStaging, setSelectedRecipeForStaging] = useState<FoodRecipe | null>(null);

  // 複製餐點流程專用狀態
  const [copyMealType, setCopyMealType] = useState<MealType | null>(null);

  // 快速粗估 / 營養佔位符專用狀態
  const [placeholderMealType, setPlaceholderMealType] = useState<MealType | null>(null);
  const [editingPlaceholderLog, setEditingPlaceholderLog] = useState<HydratedFoodLog | null>(null);

  // 目標熱量與宏量營養素優先取用當日獨立之 DietPlan (由 useDietPlan 純數學即時動態推算)
  const isBinge = currentActivity === 999 || plan.activityLevel === 999;
  const targetCalories = plan.caloriesTarget;
  const targetMacros = {
    carbsGrams: isBinge ? 999 : plan.carbsTarget,
    proteinGrams: isBinge ? 999 : plan.proteinTarget,
    fatGrams: isBinge ? 999 : plan.fatTarget,
  };

  const consumedEnergy = formatEnergy(totals.calories, energyUnit).value;
  const targetEnergy = isBinge
    ? (energyUnit === 'kJ' ? 99999 : 9999)
    : formatEnergy(targetCalories, energyUnit).value;
  const energyDiff = targetEnergy - consumedEnergy;

  // 快捷切換活動係數（寫入當日專屬 DietPlan，由 saveDietPlan 自主處理今日後續沿用）
  const handleQuickActivityChange = async (newLevel: number) => {
    triggerHaptic('selection');
    await saveDietPlan({
      activityLevel: newLevel,
    });
  };

  // 供能比模板短標籤（例如「均衡」、「高蛋白」、「低碳」、「生酮」、「耐力」、「備賽」、「充碳」、「自定義」）
  const macroSplitTemplateLabel = useMemo(() => {
    const split = plan.macroSplit || profile.macroSplit || { carbs: 40, protein: 30, fat: 30 };
    const matchedId = findMatchingTemplate(split);
    const matched = MACRO_SPLIT_TEMPLATES.find((item) => item.id === matchedId);
    if (matched) {
      return t(matched.shortLabelKey);
    }
    return t('dietPlan.custom', '自定義');
  }, [plan.macroSplit, profile.macroSplit, t]);

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
    updates: {
      quantity?: number;
      calories?: number;
      carbs?: number;
      protein?: number;
      fat?: number;
      foodName?: string;
      scenario?: string;
      customTitle?: string;
    }
  ) => {
    await updateFoodLog(id, updates);
  };

  const handleDeleteFoodLog = async (id: string) => {
    await deleteFoodLog(id);
  };

  // 算我正常吃（A+B 雙軌並行寫入）
  const handleLogAsPlanned = async (
    mealType: MealType,
    budgetOverride?: { calories: number; carbs: number; protein: number; fat: number }
  ) => {
    const budget =
      budgetOverride ||
      calculateMealBudget(mealType, {
        calories: targetCalories,
        carbsGrams: targetMacros.carbsGrams,
        proteinGrams: targetMacros.proteinGrams,
        fatGrams: targetMacros.fatGrams,
      });
    const foodName = t('diet.asPlanned.defaultName', '歷史均值');
    await addAsPlannedMeal(mealType, budget, {
      foodName,
    });
  };

  // 快速粗估彈窗操作
  const handleOpenPlaceholderForMeal = (mealType: MealType) => {
    setEditingPlaceholderLog(null);
    setPlaceholderMealType(mealType);
  };

  const handleConfirmPlaceholder = async (data: {
    scenario: DiningScenarioId;
    customTitle?: string;
    calories: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    foodName?: string;
  }) => {
    if (editingPlaceholderLog) {
      await updateFoodLog(editingPlaceholderLog.id, {
        entryType: 'estimate',
        scenario: data.scenario,
        customTitle: data.customTitle,
        foodName: data.foodName,
        calories: data.calories,
        carbs: data.carbs,
        protein: data.protein,
        fat: data.fat,
      });
      setEditingPlaceholderLog(null);
    } else if (placeholderMealType) {
      await addQuickPlaceholder({
        mealType: placeholderMealType,
        scenario: data.scenario,
        customTitle: data.customTitle,
        foodName: data.foodName,
        calories: data.calories,
        carbs: data.carbs,
        protein: data.protein,
        fat: data.fat,
      });
    }
    setPlaceholderMealType(null);
  };

  const handleDeletePlaceholder = async (id: string) => {
    await deleteFoodLog(id);
    setEditingPlaceholderLog(null);
    setPlaceholderMealType(null);
  };

  const handleSaveRecipeLog = async (
    bundleId: string,
    items: Array<{
      id?: string;
      foodId?: string;
      quantity: number;
      unit: string;
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

  // 開啟複製餐點彈窗
  const handleOpenCopyForMeal = (type: MealType) => {
    triggerHaptic('light');
    setCopyMealType(type);
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
    const foodToAdd = selectedFoodForAdd;
    const mealType = targetMealTypeForAdd;
    const finalQuantity = val > 0 ? val : (foodToAdd.servingSize || 100);
    const finalUnit = unit || foodToAdd.servingUnit || foodWeightUnit;

    // 立即同步關閉彈窗，0 延遲消失，絕不等待 DB I/O
    setSelectedFoodForAdd(null);
    setIsSelectDialogOpen(false);
    triggerHaptic('success');

    await addFoodLog({
      date: selectedDate,
      mealType,
      foodId: foodToAdd.id,
      quantity: finalQuantity,
      unit: finalUnit,
    });
  };

  // 取消新增單品食材 (保留選擇彈窗開啟，方便返回)
  const handleCancelAddFood = () => {
    setSelectedFoodForAdd(null);
  };

  return (
    <>
      <DietView
        currentActivity={currentActivity}
        consumedEnergy={consumedEnergy}
        targetEnergy={targetEnergy}
        energyDiff={energyDiff}
        energyUnit={energyUnit}
        totals={totals}
        targetMacros={targetMacros}
        targetCalories={targetCalories}
        macroSplitTemplateLabel={macroSplitTemplateLabel}
        mealGroups={mealGroups}
        recipeMap={recipeMap}
        foodWeightUnit={foodWeightUnit}
        foodVolumeUnit={foodVolumeUnit}
        onQuickActivityChange={handleQuickActivityChange}
        onOpenPlanModal={() => setIsPlanModalOpen(true)}
        onOpenAddForMeal={handleOpenAddForMeal}
        onOpenCopyForMeal={handleOpenCopyForMeal}
        onOpenPlaceholderForMeal={handleOpenPlaceholderForMeal}
        onLogAsPlanned={handleLogAsPlanned}
        onEditFoodLog={setEditingFoodLog}
        onEditPlaceholderLog={(item) => {
          setEditingPlaceholderLog(item);
          setPlaceholderMealType(item.mealType);
        }}
        onEditBundle={(bundleId, bundleTitle, logs) =>
          setEditingBundle({ bundleId, bundleTitle, logs })
        }
        onDeleteFoodLog={handleDeleteFoodLog}
        onDeleteBundle={handleDeleteBundle}
      />

      {/* 完整飲食計劃設定彈窗 (包含活動係數與供能比微調) */}
      <DietPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        date={selectedDate}
        currentPlan={plan}
        onSavePlan={saveDietPlan}
        profile={profile}
      />

      {/* 單品食物記錄編輯管理 Dialog (方案 3) */}
      <EditFoodLogDialog
        open={!!editingFoodLog}
        onOpenChange={(open) => !open && setEditingFoodLog(null)}
        log={editingFoodLog}
        onSave={handleSaveFoodLog}
        onDelete={handleDeleteFoodLog}
      />

      {/* 快速粗估 / 營養佔位符 Dialog */}
      <QuickPlaceholderDialog
        open={Boolean(placeholderMealType)}
        onOpenChange={(open) => {
          if (!open) {
            setPlaceholderMealType(null);
            setEditingPlaceholderLog(null);
          }
        }}
        targetMealType={placeholderMealType || 'lunch'}
        targetDate={selectedDate}
        initialData={
          editingPlaceholderLog
            ? {
                id: editingPlaceholderLog.id,
                scenario: editingPlaceholderLog.scenario,
                customTitle: editingPlaceholderLog.customTitle,
                foodName: editingPlaceholderLog.foodName,
                calories: editingPlaceholderLog.calories,
                carbs: editingPlaceholderLog.carbs,
                protein: editingPlaceholderLog.protein,
                fat: editingPlaceholderLog.fat,
              }
            : null
        }
        onConfirm={handleConfirmPlaceholder}
        onDelete={editingPlaceholderLog ? handleDeletePlaceholder : undefined}
      />

      {/* 菜餚組合記錄編輯管理 Dialog (菜餚方案 1) */}
      <EditRecipeLogDialog
        open={!!editingBundle}
        onOpenChange={(open) => !open && setEditingBundle(null)}
        bundleId={editingBundle?.bundleId || null}
        bundleTitle={editingBundle?.bundleTitle || ''}
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

      {/* 複製餐點 Dialog (方案 A Precision Modal) */}
      {Boolean(copyMealType) && (
        <CopyMealDialog
          open={!!copyMealType}
          onOpenChange={(open) => {
            if (!open) setCopyMealType(null);
          }}
          targetMealType={copyMealType || 'lunch'}
          targetDate={selectedDate}
        />
      )}
    </>
  );

}
