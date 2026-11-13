import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';
import type {
  BodyMetric,
  BodyWeightUnit,
  DetailedMuscle,
  DietPlan,
  EnergyUnit,
  Equipment,
  Exercise,
  FoodItem,
  FoodLog,
  FoodRecipe,
  FoodVolumeUnit,
  FoodWeightUnit,
  LengthUnit,
  MacroSplit,
  MealType,
  MuscleRole,
  WorkoutLog,
  WorkoutRoutine,
} from '@/types';
import { formatFoodDisplayName, resolveFoodLogTitle } from '@/utils/foodNaming';
import { calculateFoodLogNutrients } from '@/utils/nutritionMath';
import {
  cmToIn,
  convertBodyWeight,
  formatEnergy,
  formatFoodServing,
  kgToLbs,
  roundTo,
} from '@/utils/unitMath';
import {
  calculateMacrosFromSplit,
  calculateWeightTrend,
} from '@/utils/weightMath';
import { normalizeMuscleRole, sortMuscleEntries } from '@/utils/muscleIntensity';
import { PREDEFINED_EQUIPMENT_DEFINITIONS } from '@/constants/muscles';
import type { BodyRecoverySummary } from '@/utils/recoveryMath';

export type AiExportScope = 'diet' | 'workout' | 'body' | 'all';
export type AiExportFormat = 'text' | 'json' | 'image';

export interface ExportNutrientSummary {
  calories: number;
  energyUnit: EnergyUnit;
  carbs: number;
  protein: number;
  fat: number;
}

export interface ExportRecipeIngredientItem {
  name: string;
  amount: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export type ExportDietEntry =
  | {
      type: 'food';
      name: string;
      amount: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    }
  | {
      type: 'recipe';
      name: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
      ingredients: ExportRecipeIngredientItem[];
    }
  | {
      type: 'estimate';
      name: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    }
  | {
      type: 'as_planned';
      name: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    };

export interface ExportMealGroup {
  mealType: MealType;
  mealLabel: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  items: ExportDietEntry[];
}

export interface ExportDietSection {
  activityLevel: number;
  activityLabel: string;
  macroSplit: MacroSplit;
  target: ExportNutrientSummary;
  actual: ExportNutrientSummary;
  calorieDiff: number;
  meals: ExportMealGroup[];
}

export interface ExportWorkoutSet {
  setNumber: number;
  weight: number;
  unit: BodyWeightUnit;
  reps: number;
  rpe?: number;
}

export interface ExportWorkoutExercise {
  name: string;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  sets: ExportWorkoutSet[];
}

export interface ExportWorkoutSession {
  routineTitle?: string;
  durationMinutes?: number;
  exercises: ExportWorkoutExercise[];
}

export interface ExportWorkoutSection {
  summary: {
    totalExercises: number;
    totalSets: number;
    totalVolume: number;
    weightUnit: BodyWeightUnit;
  };
  sessions: ExportWorkoutSession[];
  recovery?: {
    recoveringCount: number;
    intensityMap: Partial<Record<DetailedMuscle, number>>;
  };
}

export interface ExportBodyCircumference {
  key: 'shoulders' | 'chest' | 'waist' | 'hips' | 'arms' | 'thighs' | 'calves';
  label: string;
  value: number;
  unit: LengthUnit;
}

export interface ExportBodySection {
  weight?: number;
  trendWeight?: number;
  weightUnit: BodyWeightUnit;
  bodyFat?: number;
  circumferences: ExportBodyCircumference[];
}

export interface DailyExportPayload {
  date: string;
  scope: AiExportScope;
  diet?: ExportDietSection;
  workout?: ExportWorkoutSection;
  body?: ExportBodySection;
}

export interface BuildDailyExportInput {
  date: string;
  scope: AiExportScope;
  t?: TFunction;
  unitPreferences?: {
    bodyWeight?: BodyWeightUnit;
    foodWeight?: FoodWeightUnit;
    foodVolume?: FoodVolumeUnit;
    length?: LengthUnit;
    energy?: EnergyUnit;
  };
  // Diet inputs
  foodLogs?: FoodLog[];
  foods?: FoodItem[];
  recipes?: FoodRecipe[];
  dietPlan?: Partial<DietPlan> & {
    activityLevel?: number;
    macroSplit?: MacroSplit;
    caloriesTarget?: number;
    carbsTarget?: number;
    proteinTarget?: number;
    fatTarget?: number;
  };
  // Workout inputs
  workoutLogs?: WorkoutLog[];
  exercises?: Exercise[];
  routines?: Array<WorkoutRoutine & { title?: string }>;
  equipments?: Equipment[];
  recoverySummary?: BodyRecoverySummary | null;
  // Body inputs
  bodyMetric?: Partial<BodyMetric> | null;
  allBodyMetrics?: BodyMetric[];
  trendWeightKg?: number | null;
}

/**
 * 依據當前頁面路由自動判定匯出範圍
 */
export function getAiExportScopeByPath(pathname: string): AiExportScope {
  if (pathname.startsWith('/diet')) return 'diet';
  if (pathname.startsWith('/workout')) return 'workout';
  if (pathname.startsWith('/body')) return 'body';
  return 'all';
}

function getTranslator(t?: TFunction): TFunction {
  return (t || i18n.t.bind(i18n)) as TFunction;
}

function getActivityLabel(level: number, t: TFunction): string {
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
}

function getDetailedMuscleLabel(muscle: DetailedMuscle, t: TFunction): string {
  const camel = muscle
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return t(`workout.muscle${camel}`, muscle);
}

function resolveEquipmentLabel(
  equipmentId: string | undefined,
  equipmentMap: Map<string, Equipment>,
  t: TFunction
): string {
  if (!equipmentId) return t('equipment.other', '其他');
  const predefined = PREDEFINED_EQUIPMENT_DEFINITIONS.find(
    (p) => p.id === equipmentId || p.slug === equipmentId
  );
  if (predefined) {
    return t(predefined.nameKey, equipmentId);
  }
  const custom = equipmentMap.get(equipmentId);
  if (custom) {
    return custom.name;
  }
  if (equipmentId === 'machine') {
    return t('equipment.pin_loaded_machine', '插銷式器械');
  }
  return equipmentId;
}

function buildDietSection(
  input: BuildDailyExportInput,
  t: TFunction
): ExportDietSection {
  const energyUnit: EnergyUnit = input.unitPreferences?.energy || 'kcal';
  const foodWeightUnit: FoodWeightUnit = input.unitPreferences?.foodWeight || 'g';
  const foodVolumeUnit: FoodVolumeUnit = input.unitPreferences?.foodVolume || 'ml';

  const activityLevel = input.dietPlan?.activityLevel ?? 1.55;
  const isBinge = activityLevel === 999;
  const macroSplit: MacroSplit = input.dietPlan?.macroSplit ?? {
    carbs: 40,
    protein: 30,
    fat: 30,
  };
  const rawTargetKcal = isBinge ? 9999 : (input.dietPlan?.caloriesTarget ?? 2000);
  const computedMacros = isBinge
    ? { carbsGrams: 999, proteinGrams: 999, fatGrams: 999 }
    : calculateMacrosFromSplit(
        rawTargetKcal,
        macroSplit.carbs,
        macroSplit.protein,
        macroSplit.fat
      );

  const targetEnergy = isBinge
    ? (energyUnit === 'kJ' ? 99999 : 9999)
    : formatEnergy(rawTargetKcal, energyUnit).value;
  const targetCarbs = isBinge ? 999 : (input.dietPlan?.carbsTarget ?? computedMacros.carbsGrams);
  const targetProtein = isBinge ? 999 : (input.dietPlan?.proteinTarget ?? computedMacros.proteinGrams);
  const targetFat = isBinge ? 999 : (input.dietPlan?.fatTarget ?? computedMacros.fatGrams);

  const foodMap = new Map<string, FoodItem>(
    (input.foods || []).map((f) => [f.id, f])
  );
  const recipeMap = new Map<string, FoodRecipe>(
    (input.recipes || []).map((r) => [r.id, r])
  );

  const rawLogs = input.foodLogs || [];

  const hydratedEntries = rawLogs.map((log) => {
    const rawEntryType = (log as FoodLog & { entryType?: string }).entryType;
    const isSystemEntry =
      rawEntryType === 'estimate' ||
      rawEntryType === 'as_planned' ||
      Boolean(log.isPlaceholder) ||
      Boolean(log.isAsPlanned);
    const food = !isSystemEntry && log.foodId ? foodMap.get(log.foodId) : undefined;

    const nutrients = food
      ? calculateFoodLogNutrients(food, log.quantity ?? 100, log.unit || food.servingUnit || 'g')
      : {
          calories: Math.round(log.calories || 0),
          carbs: roundTo(log.carbs || 0, 1),
          protein: roundTo(log.protein || 0, 1),
          fat: roundTo(log.fat || 0, 1),
        };

    const resolvedName = food
      ? formatFoodDisplayName(food)
      : resolveFoodLogTitle(log, t, food);

    const amountFormatted = food || (!isSystemEntry && log.quantity)
      ? formatFoodServing(
          log.quantity ?? food?.servingSize ?? 100,
          log.unit || food?.servingUnit || 'g',
          foodWeightUnit,
          foodVolumeUnit
        ).formatted
      : '';

    const normalizedType: 'item' | 'estimate' | 'as_planned' =
      rawEntryType === 'as_planned' || log.isAsPlanned
        ? 'as_planned'
        : rawEntryType === 'estimate' || log.isPlaceholder
          ? 'estimate'
          : 'item';

    return {
      raw: log,
      mealType: log.mealType,
      normalizedType,
      name: resolvedName,
      amount: amountFormatted,
      bundleId: log.bundleId,
      bundleTitle: (log as FoodLog & { bundleTitle?: string }).bundleTitle,
      calories: formatEnergy(nutrients.calories, energyUnit).value,
      rawKcal: nutrients.calories,
      carbs: roundTo(nutrients.carbs, 1),
      protein: roundTo(nutrients.protein, 1),
      fat: roundTo(nutrients.fat, 1),
    };
  });

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealGroups: ExportMealGroup[] = [];

  let totalRawKcal = 0;
  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;

  for (const mealType of mealTypes) {
    const entriesForMeal = hydratedEntries.filter((e) => e.mealType === mealType);
    if (entriesForMeal.length === 0) continue;

    let mealRawKcal = 0;
    let mealCarbs = 0;
    let mealProtein = 0;
    let mealFat = 0;

    const items: ExportDietEntry[] = [];
    const bundleGroupMap = new Map<
      string,
      Extract<ExportDietEntry, { type: 'recipe' }>
    >();

    for (const entry of entriesForMeal) {
      mealRawKcal += entry.rawKcal;
      mealCarbs += entry.carbs;
      mealProtein += entry.protein;
      mealFat += entry.fat;

      totalRawKcal += entry.rawKcal;
      totalCarbs += entry.carbs;
      totalProtein += entry.protein;
      totalFat += entry.fat;

      if (entry.bundleId) {
        let bundleItem = bundleGroupMap.get(entry.bundleId);
        if (!bundleItem) {
          const recipe = recipeMap.get(entry.bundleId);
          const recipeTitle =
            entry.bundleTitle?.trim() ||
            recipe?.name?.trim() ||
            t('aiExport.diet.recipeTag', '食譜');
          bundleItem = {
            type: 'recipe',
            name: recipeTitle,
            calories: 0,
            carbs: 0,
            protein: 0,
            fat: 0,
            ingredients: [],
          };
          bundleGroupMap.set(entry.bundleId, bundleItem);
          items.push(bundleItem);
        }
        bundleItem.calories = Math.round(bundleItem.calories + entry.calories);
        bundleItem.carbs = roundTo(bundleItem.carbs + entry.carbs, 1);
        bundleItem.protein = roundTo(bundleItem.protein + entry.protein, 1);
        bundleItem.fat = roundTo(bundleItem.fat + entry.fat, 1);
        bundleItem.ingredients.push({
          name: entry.name,
          amount: entry.amount,
          calories: entry.calories,
          carbs: entry.carbs,
          protein: entry.protein,
          fat: entry.fat,
        });
      } else if (entry.normalizedType === 'estimate' || entry.normalizedType === 'as_planned') {
        items.push({
          type: entry.normalizedType,
          name: entry.name,
          calories: entry.calories,
          carbs: entry.carbs,
          protein: entry.protein,
          fat: entry.fat,
        });
      } else {
        items.push({
          type: 'food',
          name: entry.name,
          amount: entry.amount,
          calories: entry.calories,
          carbs: entry.carbs,
          protein: entry.protein,
          fat: entry.fat,
        });
      }
    }

    mealGroups.push({
      mealType,
      mealLabel: t(`diet.${mealType}`, mealType),
      calories: formatEnergy(mealRawKcal, energyUnit).value,
      carbs: roundTo(mealCarbs, 1),
      protein: roundTo(mealProtein, 1),
      fat: roundTo(mealFat, 1),
      items,
    });
  }

  const actualEnergy = formatEnergy(totalRawKcal, energyUnit).value;

  return {
    activityLevel,
    activityLabel: getActivityLabel(activityLevel, t),
    macroSplit,
    target: {
      calories: targetEnergy,
      energyUnit,
      carbs: roundTo(targetCarbs, 1),
      protein: roundTo(targetProtein, 1),
      fat: roundTo(targetFat, 1),
    },
    actual: {
      calories: actualEnergy,
      energyUnit,
      carbs: roundTo(totalCarbs, 1),
      protein: roundTo(totalProtein, 1),
      fat: roundTo(totalFat, 1),
    },
    calorieDiff: actualEnergy - targetEnergy,
    meals: mealGroups,
  };
}

function buildWorkoutSection(
  input: BuildDailyExportInput,
  t: TFunction
): ExportWorkoutSection {
  const weightUnit: BodyWeightUnit = input.unitPreferences?.bodyWeight || 'kg';
  const exerciseMap = new Map<string, Exercise>(
    (input.exercises || []).map((e) => [e.id, e])
  );
  const routineMap = new Map<string, WorkoutRoutine & { title?: string }>(
    (input.routines || []).map((r) => [r.id, r])
  );
  const equipmentMap = new Map<string, Equipment>(
    (input.equipments || []).map((eq) => [eq.id, eq])
  );

  let totalExercises = 0;
  let totalSets = 0;
  let totalVolumeKg = 0;

  const sessions: ExportWorkoutSession[] = (input.workoutLogs || []).map((w) => {
    const routine = w.routineId ? routineMap.get(w.routineId) : undefined;
    const routineTitle =
      routine?.title?.trim() ||
      routine?.name?.trim() ||
      (w as WorkoutLog & { routineName?: string }).routineName?.trim() ||
      undefined;

    const exercises: ExportWorkoutExercise[] = (w.exercises || []).map((group) => {
      totalExercises += 1;
      const ex = exerciseMap.get(group.exerciseId);
      const exName =
        ex?.name ||
        (group as { exerciseName?: string }).exerciseName ||
        t('workout.unknownExercise', '未知動作');
      const equipmentLabel = resolveEquipmentLabel(ex?.equipment, equipmentMap, t);

      const muscleEntries = ex?.targetMuscles
        ? sortMuscleEntries(
            Object.entries(ex.targetMuscles) as [DetailedMuscle, MuscleRole | number][]
          )
        : [];

      const primaryMuscles = muscleEntries
        .filter(([, role]) => normalizeMuscleRole(role) === 'primary')
        .map(([m]) => getDetailedMuscleLabel(m, t));

      const secondaryMuscles = muscleEntries
        .filter(([, role]) => normalizeMuscleRole(role) !== 'primary')
        .map(([m]) => getDetailedMuscleLabel(m, t));

      const sets: ExportWorkoutSet[] = (group.sets || []).map((s, idx) => {
        totalSets += 1;
        const rawWeightKg = typeof s.weight === 'number' && !isNaN(s.weight) ? s.weight : 0;
        const reps = typeof s.reps === 'number' && !isNaN(s.reps) ? s.reps : 0;
        totalVolumeKg += rawWeightKg * reps;

        const displayWeight =
          weightUnit === 'lbs' ? kgToLbs(rawWeightKg, 1) : roundTo(rawWeightKg, 1);

        return {
          setNumber: s.setNumber || idx + 1,
          weight: displayWeight,
          unit: weightUnit,
          reps,
          ...(typeof s.rpe === 'number' && s.rpe > 0 ? { rpe: s.rpe } : {}),
        };
      });

      return {
        name: exName,
        equipment: equipmentLabel,
        primaryMuscles,
        secondaryMuscles,
        sets,
      };
    });

    return {
      ...(routineTitle ? { routineTitle } : {}),
      ...(typeof w.durationMinutes === 'number' && w.durationMinutes > 0
        ? { durationMinutes: w.durationMinutes }
        : {}),
      exercises,
    };
  });

  const displayTotalVolume =
    weightUnit === 'lbs' ? kgToLbs(totalVolumeKg, 0) : roundTo(totalVolumeKg, 1);

  // 肌肉恢復/熱力統計 (優先使用全域恢復模型，若無則由當日動作即時推算)
  let recovery: ExportWorkoutSection['recovery'] = undefined;
  if (input.recoverySummary) {
    recovery = {
      recoveringCount: input.recoverySummary.recoveringCount,
      intensityMap: input.recoverySummary.intensityMap,
    };
  } else {
    const intensityMap: Partial<Record<DetailedMuscle, number>> = {};
    let recoveringCount = 0;
    for (const w of input.workoutLogs || []) {
      for (const group of w.exercises || []) {
        const ex = exerciseMap.get(group.exerciseId);
        if (ex?.targetMuscles) {
          for (const [m, role] of Object.entries(ex.targetMuscles) as [
            DetailedMuscle,
            MuscleRole | number,
          ][]) {
            const normalized = normalizeMuscleRole(role);
            const val = normalized === 'primary' ? 85 : 45;
            if (!intensityMap[m] || (intensityMap[m] as number) < val) {
              if (!intensityMap[m]) recoveringCount += 1;
              intensityMap[m] = val;
            }
          }
        }
      }
    }
    recovery = {
      recoveringCount,
      intensityMap,
    };
  }

  return {
    summary: {
      totalExercises,
      totalSets,
      totalVolume: displayTotalVolume,
      weightUnit,
    },
    sessions,
    recovery,
  };
}

function buildBodySection(
  input: BuildDailyExportInput,
  t: TFunction
): ExportBodySection {
  const weightUnit: BodyWeightUnit = input.unitPreferences?.bodyWeight || 'kg';
  const lengthUnit: LengthUnit = input.unitPreferences?.length || 'cm';
  const metric = input.bodyMetric || null;

  let resolvedTrendKg: number | undefined =
    typeof input.trendWeightKg === 'number' && input.trendWeightKg > 0
      ? input.trendWeightKg
      : undefined;

  if (resolvedTrendKg === undefined && input.allBodyMetrics && input.allBodyMetrics.length > 0) {
    const trendPoints = calculateWeightTrend(input.allBodyMetrics);
    const pointsUpToDate = trendPoints.filter((p) => p.date <= input.date);
    if (pointsUpToDate.length > 0) {
      resolvedTrendKg = pointsUpToDate[pointsUpToDate.length - 1].trendWeight;
    }
  }

  const rawWeightKg =
    metric && typeof metric.weight === 'number' && metric.weight > 0
      ? metric.weight
      : undefined;

  const displayWeight =
    rawWeightKg !== undefined
      ? convertBodyWeight(rawWeightKg, 'kg', weightUnit, 1)
      : undefined;

  const displayTrendWeight =
    resolvedTrendKg !== undefined
      ? convertBodyWeight(resolvedTrendKg, 'kg', weightUnit, 1)
      : undefined;

  const bodyFat =
    metric && typeof metric.bodyFat === 'number' && metric.bodyFat > 0
      ? roundTo(metric.bodyFat, 1)
      : undefined;

  const circumferenceDefs: Array<{
    key: ExportBodyCircumference['key'];
    field: keyof BodyMetric;
    labelKey: string;
    defaultLabel: string;
  }> = [
    { key: 'shoulders', field: 'shouldersCm', labelKey: 'body.shoulders', defaultLabel: '肩寬' },
    { key: 'chest', field: 'chestCm', labelKey: 'body.chest', defaultLabel: '胸圍' },
    { key: 'waist', field: 'waistCm', labelKey: 'body.waist', defaultLabel: '腰圍' },
    { key: 'hips', field: 'hipsCm', labelKey: 'body.hips', defaultLabel: '臀圍' },
    { key: 'arms', field: 'armsCm', labelKey: 'body.arms', defaultLabel: '手臂圍' },
    { key: 'thighs', field: 'thighsCm', labelKey: 'body.thighs', defaultLabel: '大腿圍' },
    { key: 'calves', field: 'calvesCm', labelKey: 'body.calves', defaultLabel: '小腿圍' },
  ];

  const circumferences: ExportBodyCircumference[] = [];
  if (metric) {
    for (const def of circumferenceDefs) {
      const rawVal = metric[def.field];
      if (typeof rawVal === 'number' && !isNaN(rawVal) && rawVal > 0) {
        const convertedVal =
          lengthUnit === 'in' ? cmToIn(rawVal, 1) : roundTo(rawVal, 1);
        circumferences.push({
          key: def.key,
          label: t(def.labelKey, def.defaultLabel),
          value: convertedVal,
          unit: lengthUnit,
        });
      }
    }
  }

  return {
    ...(displayWeight !== undefined ? { weight: displayWeight } : {}),
    ...(displayTrendWeight !== undefined ? { trendWeight: displayTrendWeight } : {}),
    weightUnit,
    ...(bodyFat !== undefined ? { bodyFat } : {}),
    circumferences,
  };
}

/**
 * 將當日原始資料組裝為去 ID 化（Hydrated & Denormalized）的結構化匯出物件
 */
export function buildDailyExportPayload(input: BuildDailyExportInput): DailyExportPayload {
  const t = getTranslator(input.t);
  const payload: DailyExportPayload = {
    date: input.date,
    scope: input.scope,
  };

  if (input.scope === 'diet' || input.scope === 'all') {
    payload.diet = buildDietSection(input, t);
  }

  if (input.scope === 'workout' || input.scope === 'all') {
    payload.workout = buildWorkoutSection(input, t);
  }

  if (input.scope === 'body' || input.scope === 'all') {
    payload.body = buildBodySection(input, t);
  }

  return payload;
}

/**
 * 將結構化匯出物件渲染為清晰易讀的純文本 (Markdown / Clean Text)
 */
export function formatDailyExportAsText(
  payload: DailyExportPayload,
  tInput?: TFunction
): string {
  const t = getTranslator(tInput);
  const lines: string[] = [];

  const scopeTitle = t(`aiExport.scope.${payload.scope}`, '當日數據');
  lines.push(`# Zenfit ${scopeTitle} (${payload.date})`);

  // 1. 飲食區塊
  if (payload.diet) {
    const d = payload.diet;
    const eUnit = d.target.energyUnit;
    const diffSign = d.calorieDiff > 0 ? '+' : '';
    lines.push('');
    lines.push(`## ${t('aiExport.sections.diet', '飲食數據')}`);
    lines.push(
      `- ${t('aiExport.diet.activityLevel', '活動係數')}: ${d.activityLabel} (${d.activityLevel})`
    );
    lines.push(
      `- ${t('aiExport.diet.target', '目標配額')}: ${d.target.calories} ${eUnit} (C: ${d.target.carbs}g / P: ${d.target.protein}g / F: ${d.target.fat}g | ${d.macroSplit.carbs}/${d.macroSplit.protein}/${d.macroSplit.fat})`
    );
    lines.push(
      `- ${t('aiExport.diet.actual', '實際攝取')}: ${d.actual.calories} ${eUnit} (C: ${d.actual.carbs}g / P: ${d.actual.protein}g / F: ${d.actual.fat}g)`
    );
    lines.push(
      `- ${t('aiExport.diet.calorieDiff', '熱量差值')}: ${diffSign}${d.calorieDiff} ${eUnit}`
    );

    if (d.meals.length === 0) {
      lines.push(`- ${t('aiExport.diet.noLogs', '當日無飲食記錄')}`);
    } else {
      for (const meal of d.meals) {
        lines.push('');
        lines.push(
          `### ${meal.mealLabel} (${meal.calories} ${eUnit} | C: ${meal.carbs}g, P: ${meal.protein}g, F: ${meal.fat}g)`
        );
        for (const item of meal.items) {
          if (item.type === 'recipe') {
            lines.push(
              `- [${t('aiExport.diet.recipeTag', '食譜')}] ${item.name}: ${item.calories} ${eUnit} (C: ${item.carbs}g, P: ${item.protein}g, F: ${item.fat}g)`
            );
            for (const ing of item.ingredients) {
              const amountPart = ing.amount ? ` ${ing.amount}` : '';
              lines.push(
                `  - ${ing.name}${amountPart}: ${ing.calories} ${eUnit} (C: ${ing.carbs}g, P: ${ing.protein}g, F: ${ing.fat}g)`
              );
            }
          } else if (item.type === 'estimate') {
            lines.push(
              `- [${t('aiExport.diet.estimateTag', '快速估算')}] ${item.name}: ${item.calories} ${eUnit} (C: ${item.carbs}g, P: ${item.protein}g, F: ${item.fat}g)`
            );
          } else if (item.type === 'as_planned') {
            lines.push(
              `- [${t('aiExport.diet.asPlannedTag', '歷史均值')}] ${item.name}: ${item.calories} ${eUnit} (C: ${item.carbs}g, P: ${item.protein}g, F: ${item.fat}g)`
            );
          } else {
            const amountPart = item.amount ? ` (${item.amount})` : '';
            lines.push(
              `- ${item.name}${amountPart}: ${item.calories} ${eUnit} (C: ${item.carbs}g, P: ${item.protein}g, F: ${item.fat}g)`
            );
          }
        }
      }
    }
  }

  // 2. 訓練區塊
  if (payload.workout) {
    const w = payload.workout;
    lines.push('');
    lines.push(`## ${t('aiExport.sections.workout', '訓練數據')}`);
    if (w.sessions.length === 0) {
      lines.push(`- ${t('aiExport.workout.noLogs', '當日無訓練記錄')}`);
    } else {
      lines.push(
        `- ${t('aiExport.workout.summary', '訓練概要')}: ${t('aiExport.workout.totalExercises', { count: w.summary.totalExercises })} · ${t('aiExport.workout.totalSets', { count: w.summary.totalSets })} · ${t('aiExport.workout.totalVolume', { volume: w.summary.totalVolume, unit: w.summary.weightUnit })}`
      );

      for (const session of w.sessions) {
        if (session.routineTitle) {
          lines.push(
            `- ${t('aiExport.workout.routinePrefix', '課表')}: ${session.routineTitle}`
          );
        }
        for (const ex of session.exercises) {
          lines.push('');
          const metaParts: string[] = [ex.equipment];
          if (ex.primaryMuscles.length > 0) {
            metaParts.push(
              `${t('aiExport.workout.primaryMuscles', '主肌群')}: ${ex.primaryMuscles.join('、')}`
            );
          }
          if (ex.secondaryMuscles.length > 0) {
            metaParts.push(
              `${t('aiExport.workout.secondaryMuscles', '協同肌群')}: ${ex.secondaryMuscles.join('、')}`
            );
          }
          lines.push(`### ${ex.name} (${metaParts.join(' | ')})`);
          for (const s of ex.sets) {
            const setLine = t('aiExport.workout.setLine', {
              index: s.setNumber,
              weight: s.weight,
              unit: s.unit,
              reps: s.reps,
            });
            const rpeSuffix = s.rpe ? ` @ RPE ${s.rpe}` : '';
            lines.push(`- ${setLine}${rpeSuffix}`);
          }
        }
      }
    }
  }

  // 3. 身體區塊
  if (payload.body) {
    const b = payload.body;
    lines.push('');
    lines.push(`## ${t('aiExport.sections.body', '身體數據')}`);
    const hasAnyBodyData =
      b.weight !== undefined ||
      b.trendWeight !== undefined ||
      b.bodyFat !== undefined ||
      b.circumferences.length > 0;

    if (!hasAnyBodyData) {
      lines.push(`- ${t('aiExport.body.noLogs', '當日無身體數據記錄')}`);
    } else {
      if (b.weight !== undefined) {
        lines.push(`- ${t('aiExport.body.weight', '當日體重')}: ${b.weight} ${b.weightUnit}`);
      }
      if (b.trendWeight !== undefined) {
        lines.push(
          `- ${t('aiExport.body.trendWeight', '平滑趨勢體重')}: ${b.trendWeight} ${b.weightUnit}`
        );
      }
      if (b.bodyFat !== undefined) {
        lines.push(`- ${t('aiExport.body.bodyFat', '體脂率')}: ${b.bodyFat}%`);
      }
      if (b.circumferences.length > 0) {
        const circStr = b.circumferences
          .map((c) => `${c.label} ${c.value}${c.unit}`)
          .join(' · ');
        lines.push(`- ${t('aiExport.body.circumferences', '身體圍度')}: ${circStr}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * 將結構化匯出物件序列化為格式化的去 ID JSON 字串
 */
export function formatDailyExportAsJson(payload: DailyExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

/**
 * 一站式生成指定格式（純文本或 JSON）的當日 AI 匯出內容
 */
export function formatDailyExportData(
  input: BuildDailyExportInput,
  format: AiExportFormat = 'text'
): string {
  const payload = buildDailyExportPayload(input);
  if (format === 'json') {
    return formatDailyExportAsJson(payload);
  }
  return formatDailyExportAsText(payload, input.t);
}

export {
  renderDailyExportToCanvas,
  generateDailyExportImageBlob,
  generateDailyExportImageDataUrl,
  type GenerateExportImageOptions,
  type ImagePalette,
  DARK_PALETTE,
  LIGHT_PALETTE,
} from './aiDataExportImage';


