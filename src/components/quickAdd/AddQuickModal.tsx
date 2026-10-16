import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { useFoods } from '@/hooks/useFoods';
import { useExercises } from '@/hooks/useExercises';
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
import { Utensils, Dumbbell, Activity } from 'lucide-react';
import type { MealType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/toast';

export function AddQuickModal() {
  const { t } = useTranslation();
  const {
    isAddModalOpen,
    addModalType,
    closeAddModal,
    selectedDate,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'food' | 'workout' | 'metric'>(addModalType);

  useEffect(() => {
    if (isAddModalOpen) {
      setActiveTab(addModalType);
    }
  }, [isAddModalOpen, addModalType]);

  // Hooks
  const { addFoodLog } = useFoodLogs(selectedDate);
  const { addWorkout } = useWorkoutLogs(selectedDate);
  const { saveMetric, metricToday } = useBodyMetrics(selectedDate);
  const { foods } = useFoods();
  const { exercises } = useExercises();

  // Food Form State
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('份');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

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
      if (metricToday.weight) setWeight(String(metricToday.weight));
      if (metricToday.bodyFat) setBodyFat(String(metricToday.bodyFat));
      if (metricToday.waistCm) setWaist(String(metricToday.waistCm));
      if (metricToday.waterMl) setWaterMl(String(metricToday.waterMl));
    }
  }, [metricToday, isAddModalOpen]);

  const handleSelectPresetFood = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = foods.find((f) => f.id === e.target.value);
    if (found) {
      setFoodName(found.name);
      setQuantity(String(found.servingSize));
      setUnit(found.servingUnit);
      setCalories(String(found.calories));
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
    await addFoodLog({
      date: selectedDate,
      mealType,
      foodName: foodName.trim(),
      quantity: parseFloat(quantity) || 1,
      unit: unit || '份',
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
    });
    toast.show(t('common.saved'));
    resetFoodForm();
    closeAddModal();
  };

  const handleSaveWorkout = async () => {
    const title = workoutTitle.trim() || t('workout.newWorkout');
    const ex = exercises.find((item) => item.id === selectedExerciseId) || exercises[0];
    
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
                  weight: parseFloat(firstSetWeight) || 20,
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

  const handleSaveMetric = async () => {
    await saveMetric({
      weight: weight ? parseFloat(weight) : undefined,
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      waistCm: waist ? parseFloat(waist) : undefined,
      waterMl: waterMl ? parseFloat(waterMl) : undefined,
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
    <Dialog open={isAddModalOpen} onOpenChange={(open) => !open && closeAddModal()}>
      <DialogContent className="sm:max-w-md p-5 bg-card text-card-foreground border border-border shadow-none rounded-xl">
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
                    {f.name} ({f.calories} kcal)
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
                  placeholder="如: 香煎雞胸肉"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  {t('diet.calories')} (kcal)
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
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  {t('diet.protein')} (g)
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
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  {t('diet.carbs')} (g)
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
                <label className="text-xs font-mono text-muted-foreground block mb-1">
                  {t('diet.fat')} (g)
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
          </TabsContent>

          {/* 記訓練 Tab */}
          <TabsContent value="workout" className="space-y-3 mt-0 focus-visible:outline-none">
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
                <option value="">選擇第一個動作...</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({t(`workout.${ex.category}`)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  第 1 組重量 (kg)
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
                  第 1 組次數 (reps)
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
              <Button size="sm" onClick={handleSaveWorkout} className="cursor-pointer">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* 記體態 Tab */}
          <TabsContent value="metric" className="space-y-3 mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  {t('body.weight')} (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="如: 72.5"
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
                  {t('body.waist')} (cm)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  placeholder="如: 78.0"
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  {t('body.waterIntake')} (ml)
                </label>
                <Input
                  type="number"
                  step="50"
                  value={waterMl}
                  onChange={(e) => setWaterMl(e.target.value)}
                  placeholder="如: 2000"
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
  );
}
