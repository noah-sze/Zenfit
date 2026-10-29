import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { useFoods } from '@/hooks/useFoods';
import { useRecipes } from '@/hooks/useRecipes';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Utensils, Dumbbell, Activity, Layers, UtensilsCrossed, SlidersHorizontal } from 'lucide-react';
import type { MealType, FoodRecipe } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { calculateIngredientMacros, calculateRecipeTotals } from '@/utils/recipeMath';
import { formatFoodDisplayName } from '@/utils/foodNaming';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { RecipeStagingDialog } from '@/components/food/RecipeStagingDialog';
import {
  formatEnergy,
  formatFoodServing,
  convertEnergy,
  kgToLbs,
  lbsToKg,
  cmToIn,
  inToCm,
  mlToFlOz,
  flOzToMl,
} from '@/utils/unitMath';

export function AddQuickModal() {
  const { t } = useTranslation();
  const {
    isAddModalOpen,
    addModalType,
    closeAddModal,
    selectedDate,
  } = useAppStore();
  const {
    foodWeightUnit,
    foodVolumeUnit,
    energyUnit,
    bodyWeightUnit,
    lengthUnit,
  } = useUnitPreferences();

  const [activeTab, setActiveTab] = useState<'food' | 'workout' | 'metric'>(addModalType);

  useEffect(() => {
    if (isAddModalOpen) {
      setActiveTab(addModalType);
    }
  }, [isAddModalOpen, addModalType]);

  // Hooks
  const { addFoodLog, addFoodLogBundle } = useFoodLogs(selectedDate);
  const { addWorkout } = useWorkoutLogs(selectedDate);
  const { saveMetric, metricToday } = useBodyMetrics(selectedDate);
  const { foods, allFoods } = useFoods();
  const { activeRecipes, foodMap } = useRecipes();
  const { exercises } = useExercises();
  const { activeRoutines, exerciseMap } = useRoutines();

  // Workout Form State
  const [workoutEntryMode, setWorkoutEntryMode] = useState<'single' | 'routine'>('single');
  const [selectedRoutineId, setSelectedRoutineId] = useState('');

  // Food Form State
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [foodEntryMode, setFoodEntryMode] = useState<'item' | 'recipe'>('item');
  const [foodName, setFoodName] = useState('');
  const defaultQuantity = foodWeightUnit === 'oz' ? '1' : '100';
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [unit, setUnit] = useState<string>(foodWeightUnit);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // 菜餚組合狀態
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [recipeExcludedIndices, setRecipeExcludedIndices] = useState<number[]>([]);
  const [stagingRecipe, setStagingRecipe] = useState<FoodRecipe | null>(null);

  // 當前選中菜餚物件
  const currentRecipe = activeRecipes.find((r) => r.id === selectedRecipeId);

  // 當切換選中菜餚時，重置排除索引
  const handleSelectRecipe = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedRecipeId(id);
    setRecipeExcludedIndices([]);
  };

  // 切換某食材的選中狀態（主要是可選調味/油）
  const toggleIngredientIndex = (index: number) => {
    setRecipeExcludedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // 菜餚即時總計
  const currentRecipeTotals = currentRecipe
    ? calculateRecipeTotals(currentRecipe, foodMap, {
        excludedIndices: recipeExcludedIndices,
      })
    : { calories: 0, protein: 0, carbs: 0, fat: 0, totalWeightGrams: 0, ingredientCount: 0 };

  // Workout Form State
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [firstSetWeight, setFirstSetWeight] = useState('40');
  const [firstSetReps, setFirstSetReps] = useState('10');

  // Metric Form State
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [waterMl, setWaterMl] = useState('');

  useEffect(() => {
    if (metricToday) {
      if (typeof metricToday.weight === 'number' && metricToday.weight > 0) {
        setWeight(String(bodyWeightUnit === 'lbs' ? kgToLbs(metricToday.weight, 1) : metricToday.weight));
      }
      if (typeof metricToday.bodyFat === 'number') setBodyFat(String(metricToday.bodyFat));
      if (typeof metricToday.waistCm === 'number' && metricToday.waistCm > 0) {
        setWaist(String(lengthUnit === 'in' ? cmToIn(metricToday.waistCm, 1) : metricToday.waistCm));
      }
      if (typeof metricToday.waterMl === 'number' && metricToday.waterMl > 0) {
        setWaterMl(String(foodVolumeUnit === 'fl oz' ? mlToFlOz(metricToday.waterMl, 1) : metricToday.waterMl));
      }
    }
  }, [metricToday, isAddModalOpen, bodyWeightUnit, lengthUnit, foodVolumeUnit]);

  const handleSelectPresetFood = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = foods.find((f) => f.id === e.target.value);
    if (found) {
      setFoodName(formatFoodDisplayName(found));
      const s = formatFoodServing(found.servingSize, found.servingUnit, foodWeightUnit, foodVolumeUnit);
      setQuantity(String(s.size));
      setUnit(s.unit);
      const scaledEnergy = formatEnergy(found.calories, energyUnit);
      setCalories(String(scaledEnergy.value));
      setProtein(String(found.protein));
      setCarbs(String(found.carbs));
      setFat(String(found.fat));
    }
  };

  const handleSaveFood = async () => {
    if (!foodName.trim()) {
      toast.show(t('common.required'));
      return;
    }
    const rawCal = parseFloat(calories) || 0;
    const finalCalKcal = energyUnit === 'kJ' ? convertEnergy(rawCal, 'kJ', 'kcal') : rawCal;

    await addFoodLog({
      date: selectedDate,
      mealType,
      foodName: foodName.trim(),
      quantity: parseFloat(quantity) || (foodWeightUnit === 'oz' ? 1 : 100),
      unit: unit || foodWeightUnit,
      calories: finalCalKcal,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
    });
    toast.show(t('common.saved'));
    resetFoodForm();
    closeAddModal();
  };

  const handleSaveRecipe = async () => {
    if (!currentRecipe) {
      toast.show(t('common.required'));
      return;
    }

    const excludedSet = new Set(recipeExcludedIndices);
    const ingredientsToLog = currentRecipe.ingredients.filter((_, idx) => !excludedSet.has(idx));

    if (ingredientsToLog.length === 0) {
      toast.show(t('diet.noIngredients'));
      return;
    }

    const bundleId = uuidv4();
    const bundleName = currentRecipe.name;

    const logItems = ingredientsToLog.map((ing) => {
      const targetFood = allFoods.find((f) => f.id === ing.foodId);
      const macros = calculateIngredientMacros(targetFood, ing.quantity);
      return {
        date: selectedDate,
        mealType,
        foodId: ing.foodId,
        foodName: ing.foodName,
        quantity: ing.quantity,
        unit: ing.unit || 'g',
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        notes: `[${bundleName}]`,
      };
    });

    await addFoodLogBundle(bundleId, bundleName, logItems);

    toast.show(t('common.saved'));
    setSelectedRecipeId('');
    setRecipeExcludedIndices([]);
    closeAddModal();
  };

  const handleSaveWorkout = async () => {
    const title = workoutTitle.trim() || t('workout.newWorkout');
    const ex = exercises.find((item) => item.id === selectedExerciseId) || exercises[0];
    const rawWeight = parseFloat(firstSetWeight) || (bodyWeightUnit === 'lbs' ? 45 : 20);
    const weightKg = bodyWeightUnit === 'lbs' ? lbsToKg(rawWeight) : rawWeight;
    
    await addWorkout({
      date: selectedDate,
      title,
      exercises: ex
        ? [
            {
              exerciseId: ex.id,
              exerciseName: ex.name,
              category: ex.category,
              sets: [
                {
                  id: uuidv4(),
                  setNumber: 1,
                  weight: weightKg,
                  reps: parseInt(firstSetReps, 10) || 10,
                  isCompleted: false,
                },
              ],
            },
          ]
        : [],
    });
    toast.show(t('common.saved'));
    resetWorkoutForm();
    closeAddModal();
  };

  const currentRoutine = activeRoutines.find((r) => r.id === selectedRoutineId);

  const handleSaveRoutineWorkout = async () => {
    if (!currentRoutine) {
      toast.show(t('common.required'));
      return;
    }

    const exerciseGroups = currentRoutine.exercises.map((item) => {
      const ex = exerciseMap.get(item.exerciseId);
      const setsCount = item.defaultSets || 3;
      const sets = Array.from({ length: setsCount }, (_, i) => ({
        id: uuidv4(),
        setNumber: i + 1,
        weight: 20,
        reps: 10,
        isCompleted: false,
      }));

      return {
        exerciseId: item.exerciseId,
        exerciseName: ex ? ex.name : t('common.unknown'),
        category: ex ? ex.category : 'free_weight',
        sets,
        notes: item.notes,
      };
    });

    await addWorkout({
      date: selectedDate,
      title: currentRoutine.name,
      exercises: exerciseGroups,
      notes: currentRoutine.notes ? `[${currentRoutine.name}] ${currentRoutine.notes}` : `[${currentRoutine.name}]`,
    });

    toast.show(t('workout.routineApplied'));
    setSelectedRoutineId('');
    closeAddModal();
  };

  const handleSaveMetric = async () => {
    const rawWeight = weight ? parseFloat(weight) : undefined;
    const weightKg = rawWeight !== undefined
      ? (bodyWeightUnit === 'lbs' ? lbsToKg(rawWeight) : rawWeight)
      : undefined;

    const rawWaist = waist ? parseFloat(waist) : undefined;
    const waistCm = rawWaist !== undefined
      ? (lengthUnit === 'in' ? inToCm(rawWaist) : rawWaist)
      : undefined;

    const rawWater = waterMl ? parseFloat(waterMl) : undefined;
    const waterMlFinal = rawWater !== undefined
      ? (foodVolumeUnit === 'fl oz' ? flOzToMl(rawWater) : rawWater)
      : undefined;

    await saveMetric({
      weight: weightKg,
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      waistCm: waistCm,
      waterMl: waterMlFinal,
    });
    toast.show(t('common.saved'));
    closeAddModal();
  };

  const resetFoodForm = () => {
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };

  const resetWorkoutForm = () => {
    setWorkoutTitle('');
    setSelectedExerciseId('');
  };

  return (
    <>
      <Dialog open={isAddModalOpen} onOpenChange={(open) => !open && closeAddModal()}>
      <DialogContent className="sm:max-w-md p-5 bg-card text-card-foreground border border-border shadow-none rounded-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {t('quickAdd.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="food" className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 cursor-pointer">
              <Utensils className="size-4" />
              <span>{t('quickAdd.food')}</span>
            </TabsTrigger>
            <TabsTrigger value="workout" className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 cursor-pointer">
              <Dumbbell className="size-4" />
              <span>{t('quickAdd.workout')}</span>
            </TabsTrigger>
            <TabsTrigger value="metric" className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 cursor-pointer">
              <Activity className="size-4" />
              <span>{t('quickAdd.metric')}</span>
            </TabsTrigger>
          </TabsList>

          {/* 記飲食 Tab */}
          <TabsContent value="food" className="space-y-3 mt-0 focus-visible:outline-none">
            {/* 餐別選擇 */}
            <div className="grid grid-cols-4 gap-1.5">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={`py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
                    mealType === type
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/50'
                  }`}
                >
                  {t(`diet.${type}`)}
                </button>
              ))}
            </div>

            {/* 單品食材 vs 菜餚組合 切換 */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-lg">
              <button
                type="button"
                onClick={() => setFoodEntryMode('item')}
                className={`py-1 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  foodEntryMode === 'item'
                    ? 'bg-background text-foreground shadow-none'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UtensilsCrossed className="size-3.5" />
                <span>{t('diet.foodItems')}</span>
              </button>
              <button
                type="button"
                onClick={() => setFoodEntryMode('recipe')}
                className={`py-1 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  foodEntryMode === 'recipe'
                    ? 'bg-background text-foreground shadow-none'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="size-3.5" />
                <span>{t('diet.recipes')}</span>
              </button>
            </div>

            {/* 模式 1：單品食材快速記錄 */}
            {foodEntryMode === 'item' ? (
              <>
                <div>
                  <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                    {t('diet.foodLibrary')}
                  </label>
                  <select
                    onChange={handleSelectPresetFood}
                    value=""
                    className="w-full text-sm h-9 px-3 rounded-lg border border-border bg-background text-foreground outline-none focus:border-foreground transition-colors cursor-pointer"
                  >
                    <option value="" disabled>
                      {t('diet.searchFoodPlaceholder')}
                    </option>
                    {foods.map((f) => (
                      <option key={f.id} value={f.id}>
                        {formatFoodDisplayName(f)} · {t(`diet.foodCategory.${f.category || 'natural'}`)} ({formatEnergy(f.calories, energyUnit).formatted} / {formatFoodServing(f.servingSize, f.servingUnit, foodWeightUnit, foodVolumeUnit).formatted})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                      {t('diet.foodName')} *
                    </label>
                    <Input
                      value={foodName}
                      onChange={(e) => setFoodName(e.target.value)}
                      placeholder="如: 雞胸肉"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                      {t('diet.calories')} ({energyUnit})
                    </label>
                    <Input
                      type="number"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      placeholder="0"
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 mb-1">
                      <span className="size-1.5 rounded-full bg-carbs shrink-0" />
                      <span>{t('diet.carbs')} (g)</span>
                    </label>
                    <Input
                      type="number"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      placeholder="0"
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 mb-1">
                      <span className="size-1.5 rounded-full bg-protein shrink-0" />
                      <span>{t('diet.protein')} (g)</span>
                    </label>
                    <Input
                      type="number"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      placeholder="0"
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 mb-1">
                      <span className="size-1.5 rounded-full bg-fat shrink-0" />
                      <span>{t('diet.fat')} (g)</span>
                    </label>
                    <Input
                      type="number"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      placeholder="0"
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2 flex flex-row items-center justify-between">
                  <Button variant="outline" size="sm" onClick={closeAddModal} className="cursor-pointer">
                    {t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleSaveFood} className="cursor-pointer">
                    {t('common.save')}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              /* 模式 2：菜餚組合（番茄炒蛋拆解原型記錄） */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                    {t('diet.recipes')}
                  </label>
                  <select
                    value={selectedRecipeId}
                    onChange={handleSelectRecipe}
                    className="w-full text-sm h-9 px-3 rounded-lg border border-border bg-background text-foreground outline-none focus:border-foreground transition-colors cursor-pointer"
                  >
                    <option value="" disabled>
                      {t('diet.selectIngredient')}
                    </option>
                    {activeRecipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {currentRecipe ? (
                  <div className="space-y-2.5">
                    {/* 食材構成勾選清單 */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
                        {t('diet.recipeIngredients')}
                      </div>
                      <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden bg-background">
                        {currentRecipe.ingredients.map((ing, idx) => {
                          const isExcluded = recipeExcludedIndices.includes(idx);
                          const targetFood = allFoods.find((f) => f.id === ing.foodId);
                          const ingMacros = calculateIngredientMacros(targetFood, ing.quantity);

                          return (
                            <label
                              key={idx}
                              className={`flex items-center justify-between p-2.5 text-xs transition-colors cursor-pointer select-none ${
                                isExcluded ? 'opacity-50 bg-muted/20 line-through' : 'hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={() => toggleIngredientIndex(idx)}
                                  className="size-3.5 rounded border-border"
                                />
                                <div className="truncate">
                                  <span className="font-medium text-foreground">{ing.foodName}</span>
                                  {ing.isOptional && (
                                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                                      ({t('diet.optionalBadge')})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="font-mono text-right shrink-0 pl-2">
                                <span className="text-foreground font-medium">{formatEnergy(ingMacros.calories, energyUnit).formatted}</span>
                                <span className="text-muted-foreground ml-1">
                                  ({formatFoodServing(ing.quantity, ing.unit, foodWeightUnit, foodVolumeUnit).formatted})
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* 總計預覽卡片 */}
                    <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground uppercase">
                          {t('diet.totalEstimated')}
                        </span>
                        <span className="text-sm font-semibold font-mono text-foreground">
                          {formatEnergy(currentRecipeTotals.calories, energyUnit).formatted}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground flex gap-3 pt-0.5">
                        <span>C: {currentRecipeTotals.carbs} g</span>
                        <span>P: {currentRecipeTotals.protein} g</span>
                        <span>F: {currentRecipeTotals.fat} g</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                    {t('diet.selectIngredient')}
                  </div>
                )}

                <DialogFooter className="pt-2 flex flex-row items-center justify-between">
                  <Button variant="outline" size="sm" onClick={closeAddModal} className="cursor-pointer">
                    {t('common.cancel')}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => currentRecipe && setStagingRecipe(currentRecipe)}
                      disabled={!currentRecipe}
                      className="cursor-pointer gap-1.5"
                    >
                      <SlidersHorizontal className="size-3.5" />
                      <span>{t('common.adjust', '微調')}</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveRecipe}
                      disabled={!currentRecipe}
                      className="cursor-pointer"
                    >
                      {t('diet.logRecipe')}
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            )}
          </TabsContent>

          {/* 記訓練 Tab */}
          <TabsContent value="workout" className="space-y-3 mt-0 focus-visible:outline-none">
            {/* 模式切換：單一動作 vs 訓練組合 */}
            <div className="flex border border-border rounded-lg p-0.5 bg-muted/30 mb-2">
              <button
                type="button"
                onClick={() => setWorkoutEntryMode('single')}
                className={cn(
                  'flex-1 text-xs py-1.5 font-mono font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
                  workoutEntryMode === 'single'
                    ? 'bg-background text-foreground shadow-none'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Dumbbell className="size-3.5" />
                <span>{t('workout.singleExercise')}</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkoutEntryMode('routine')}
                className={cn(
                  'flex-1 text-xs py-1.5 font-mono font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
                  workoutEntryMode === 'routine'
                    ? 'bg-background text-foreground shadow-none'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Layers className="size-3.5" />
                <span>{t('workout.routineTemplate')}</span>
              </button>
            </div>

            {workoutEntryMode === 'single' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                    {t('workout.workoutTitle')}
                  </label>
                  <Input
                    value={workoutTitle}
                    onChange={(e) => setWorkoutTitle(e.target.value)}
                    placeholder="例如：胸與三頭推力訓練"
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                    {t('workout.selectExercise')}
                  </label>
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className="w-full text-sm h-9 px-3 rounded-lg border border-border bg-background text-foreground outline-none focus:border-foreground transition-colors cursor-pointer"
                  >
                    <option value="">{t('workout.selectExercise')}</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                      {t('workout.set')} 1 {t('workout.weight')} ({bodyWeightUnit})
                    </label>
                    <Input
                      type="number"
                      value={firstSetWeight}
                      onChange={(e) => setFirstSetWeight(e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                      {t('workout.set')} 1 {t('workout.reps')}
                    </label>
                    <Input
                      type="number"
                      value={firstSetReps}
                      onChange={(e) => setFirstSetReps(e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2 flex flex-row items-center justify-between">
                  <Button variant="outline" size="sm" onClick={closeAddModal} className="cursor-pointer">
                    {t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleSaveWorkout} className="cursor-pointer bg-foreground text-background">
                    {t('common.save')}
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                    {t('workout.routines')}
                  </label>
                  <select
                    value={selectedRoutineId}
                    onChange={(e) => setSelectedRoutineId(e.target.value)}
                    className="w-full text-sm h-9 px-3 rounded-lg border border-border bg-background text-foreground outline-none focus:border-foreground transition-colors cursor-pointer"
                  >
                    <option value="">{t('workout.selectRoutine')}</option>
                    {activeRoutines.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.exercises.length})
                      </option>
                    ))}
                  </select>
                </div>

                {currentRoutine && (
                  <div className="border border-border rounded-lg p-2.5 bg-muted/20 space-y-1.5">
                    <div className="text-xs font-mono text-muted-foreground">
                      {t('settings.exercises')} ({currentRoutine.exercises.length})
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {currentRoutine.exercises.map((item, idx) => {
                        const ex = exerciseMap.get(item.exerciseId);
                        return (
                          <div key={idx} className="text-xs font-mono flex items-center justify-between">
                            <span className="truncate text-foreground">
                              {ex ? ex.name : t('common.unknown')}
                            </span>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {item.defaultSets} {t('workout.set')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-2 flex flex-row items-center justify-between">
                  <Button variant="outline" size="sm" onClick={closeAddModal} className="cursor-pointer">
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveRoutineWorkout}
                    disabled={!currentRoutine}
                    className="cursor-pointer bg-foreground text-background"
                  >
                    {t('workout.applyRoutine')}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </TabsContent>

          {/* 記體態 Tab */}
          <TabsContent value="metric" className="space-y-3 mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  {t('body.weight')} ({bodyWeightUnit})
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={bodyWeightUnit === 'lbs' ? '如: 160.0' : '如: 72.5'}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  {t('body.bodyFat')} (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="如: 15.0"
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  {t('body.waist')} ({lengthUnit})
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  placeholder={lengthUnit === 'in' ? '如: 30.0' : '如: 78.0'}
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  {t('body.waterIntake')} ({foodVolumeUnit})
                </label>
                <Input
                  type="number"
                  step={foodVolumeUnit === 'fl oz' ? '1' : '50'}
                  value={waterMl}
                  onChange={(e) => setWaterMl(e.target.value)}
                  placeholder={foodVolumeUnit === 'fl oz' ? '如: 64' : '如: 2000'}
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-row items-center justify-between">
              <Button variant="outline" size="sm" onClick={closeAddModal} className="cursor-pointer">
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSaveMetric} className="cursor-pointer">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* 動態活體食材分組檢查台 (可改重量、增刪食材) */}
    <RecipeStagingDialog
      open={!!stagingRecipe}
      onOpenChange={(open) => {
        if (!open) setStagingRecipe(null);
      }}
      recipe={stagingRecipe}
      mealType={mealType}
      date={selectedDate}
      onSuccess={() => {
        setSelectedRecipeId('');
        setRecipeExcludedIndices([]);
        closeAddModal();
      }}
    />
  </>
  );
}
