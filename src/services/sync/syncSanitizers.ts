import type {
  FoodItem,
  FoodRecipe,
  FoodLog,
  FoodLogEntryType,
  DailyDietLog,
  MacroSplit,
  MealType,
  WorkoutLog,
  WorkoutRoutine,
  UserBaseInfo,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { LEGACY_ID_TO_UUID_MAP, PRIMARY_USER_ID } from '@/services/db/defaultData';
import { normalizeServingToMetric } from '@/utils/nutritionMath';

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
}

export function mapLegacyIdToUuid(id?: string): string {
  if (!id) return '';
  return LEGACY_ID_TO_UUID_MAP[id] || id;
}

/**
 * 清洗單品食材：強制收斂為純淨公制 SI（g / ml、kcal），徹底剔除歷史殘留的 rawNutrition / labelBasisSize / labelBasisUnit
 */
export function sanitizeFoodItem(rawInput: unknown): FoodItem {
  const raw = asRecord(rawInput);
  const rawId = String(raw.id || uuidv4());
  const category = (raw.category as FoodItem['category']) || 'natural';
  const rawSize = Number(raw.servingSize);
  const rawUnit = typeof raw.servingUnit === 'string' ? raw.servingUnit : undefined;
  const metricServing = normalizeServingToMetric(
    Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 100,
    rawUnit,
    category
  );

  return {
    id: mapLegacyIdToUuid(rawId) || rawId,
    name: String(raw.name || '').trim(),
    category,
    ...(raw.brand ? { brand: String(raw.brand).trim() } : {}),
    servingSize: metricServing.servingSize,
    servingUnit: metricServing.servingUnit,
    calories: Math.max(0, Number(raw.calories) || 0),
    protein: Math.max(0, Number(raw.protein) || 0),
    carbs: Math.max(0, Number(raw.carbs) || 0),
    fat: Math.max(0, Number(raw.fat) || 0),
    ...(raw.fiber !== undefined ? { fiber: Number(raw.fiber) } : {}),
    isCustom: Boolean(raw.isCustom),
    isArchived: Boolean(raw.isArchived),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    ...(raw.rev !== undefined ? { rev: Number(raw.rev) } : {}),
  };
}

/**
 * 清洗菜餚組合：嚴格踐行純 ID 關聯正規化，剔除任何 foodName 快照與根層級 description，並自動遷移舊 ID 至 UUID
 */
export function sanitizeRecipe(recipeInput: unknown): FoodRecipe {
  const recipe = asRecord(recipeInput);
  const rawId = String(recipe.id || '');
  return {
    id: mapLegacyIdToUuid(rawId),
    name: String(recipe.name || ''),
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((ingInput: unknown) => {
          const ing = asRecord(ingInput);
          const rawFoodId = String(ing.foodId || '');
          const item: { foodId: string; quantity: number; unit: string; isOptional?: boolean } = {
            foodId: mapLegacyIdToUuid(rawFoodId),
            quantity: Number(ing.quantity) || 0,
            unit: String(ing.unit || 'g'),
          };
          if (typeof ing.isOptional === 'boolean') {
            item.isOptional = ing.isOptional;
          }
          return item;
        })
      : [],
    isCustom: Boolean(recipe.isCustom),
    isArchived: Boolean(recipe.isArchived),
    createdAt: Number(recipe.createdAt) || Date.now(),
    updatedAt: Number(recipe.updatedAt) || Date.now(),
    ...(recipe.rev !== undefined ? { rev: Number(recipe.rev) } : {}),
  };
}

/**
 * 清洗飲食日誌：只保留物理事實與系統原型，剔除食物名稱與靜態營養素快照，並自動遷移引用 foodId 至 UUID
 */
export function sanitizeFoodLog(logInput: unknown): FoodLog {
  const log = asRecord(logInput);
  let entryType: FoodLogEntryType = 'item';
  if (log.entryType === 'as_planned' || log.isAsPlanned) {
    entryType = 'as_planned';
  } else if (
    log.entryType === 'estimate' ||
    log.isPlaceholder ||
    (!log.foodId && (log.scenario || log.customTitle || log.calories !== undefined))
  ) {
    entryType = 'estimate';
  }

  const sanitized: FoodLog = {
    id: String(log.id || ''),
    date: String(log.date || ''),
    mealType: (log.mealType as MealType) || 'snack',
    entryType,
    createdAt: Number(log.createdAt) || Date.now(),
    updatedAt: Number(log.updatedAt) || Date.now(),
  };

  if (entryType === 'item') {
    if (log.foodId) sanitized.foodId = mapLegacyIdToUuid(String(log.foodId));
    sanitized.quantity = Number(log.quantity) || 0;
    sanitized.unit = String(log.unit || 'g');
    if (log.bundleId) sanitized.bundleId = mapLegacyIdToUuid(String(log.bundleId));
  } else if (entryType === 'as_planned') {
    sanitized.isAsPlanned = true;
    const rawCustomTitle = typeof log.customTitle === 'string' ? log.customTitle.trim() : '';
    const rawFoodName = typeof log.foodName === 'string' ? log.foodName.trim() : '';
    if (rawCustomTitle) {
      sanitized.customTitle = rawCustomTitle;
    } else if (rawFoodName) {
      const isGeneric =
        rawFoodName.endsWith('配額') ||
        rawFoodName.endsWith('配额') ||
        rawFoodName.endsWith('Budget') ||
        rawFoodName === '正常飲食' ||
        rawFoodName === '正常饮食' ||
        rawFoodName === 'Regular Diet' ||
        rawFoodName === '算我正常吃' ||
        rawFoodName === '算我正常食' ||
        rawFoodName === '歷史均值' ||
        rawFoodName === '历史均值' ||
        rawFoodName === 'Past Average' ||
        rawFoodName === 'Historical Average';
      if (!isGeneric) {
        sanitized.customTitle = rawFoodName;
      }
    }
    if (typeof log.calories === 'number' && !isNaN(log.calories)) sanitized.calories = log.calories;
    if (typeof log.carbs === 'number' && !isNaN(log.carbs)) sanitized.carbs = log.carbs;
    if (typeof log.protein === 'number' && !isNaN(log.protein)) sanitized.protein = log.protein;
    if (typeof log.fat === 'number' && !isNaN(log.fat)) sanitized.fat = log.fat;
  } else if (entryType === 'estimate') {
    sanitized.isPlaceholder = true;
    if (log.scenario) {
      sanitized.scenario = String(log.scenario);
    }
    const rawCustomTitle = typeof log.customTitle === 'string' ? log.customTitle.trim() : '';
    const rawFoodName = typeof log.foodName === 'string' ? log.foodName.trim() : '';
    if (rawCustomTitle) {
      sanitized.customTitle = rawCustomTitle;
    } else if (rawFoodName) {
      const isGeneric =
        rawFoodName === '快速估算' ||
        rawFoodName === '快速粗估' ||
        rawFoodName === 'Quick Estimate' ||
        rawFoodName === '常規';
      if (!isGeneric) {
        sanitized.customTitle = rawFoodName;
      }
    }
    if (typeof log.calories === 'number' && !isNaN(log.calories)) sanitized.calories = log.calories;
    if (typeof log.carbs === 'number' && !isNaN(log.carbs)) sanitized.carbs = log.carbs;
    if (typeof log.protein === 'number' && !isNaN(log.protein)) sanitized.protein = log.protein;
    if (typeof log.fat === 'number' && !isNaN(log.fat)) sanitized.fat = log.fat;
  }

  if (log.rev !== undefined) sanitized.rev = Number(log.rev);

  return sanitized;
}

/**
 * 清洗自包含每日飲食日誌膠囊：規範化日誌頭部 (meta) 與進食組件 (entries)
 */
export function sanitizeDailyDietLog(rawInput: unknown): DailyDietLog {
  const raw = asRecord(rawInput);
  const meta = asRecord(raw.meta);
  const rawId = String(raw.id || '');
  return {
    id: mapLegacyIdToUuid(rawId) || rawId,
    date: String(raw.date || ''),
    meta: {
      activityLevel: Number(meta.activityLevel) || 1.55,
      macroSplit: (meta.macroSplit as MacroSplit | undefined) || { carbs: 40, protein: 30, fat: 30 },
    },
    entries: Array.isArray(raw.entries)
      ? raw.entries.map((entry: unknown) => sanitizeFoodLog(entry))
      : [],
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    ...(raw.rev !== undefined ? { rev: Number(raw.rev) } : {}),
  };
}

/**
 * 清洗訓練日誌：只保留動作 ID 與組數，剔除標題、動作名稱與肌群快照，並自動遷移 exerciseId/routineId 至 UUID
 */
export function sanitizeWorkoutLog(logInput: unknown): WorkoutLog {
  const log = asRecord(logInput);
  const sanitized: WorkoutLog = {
    id: String(log.id || ''),
    date: String(log.date || ''),
    exercises: Array.isArray(log.exercises)
      ? log.exercises.map((groupInput: unknown) => {
          const group = asRecord(groupInput);
          return {
            exerciseId: mapLegacyIdToUuid(String(group.exerciseId || '')),
            sets: Array.isArray(group.sets)
              ? group.sets.map((sInput: unknown, idx: number) => {
                  const s = asRecord(sInput);
                  return {
                    id: String(s.id || `set-${idx}`),
                    setNumber: Number(s.setNumber) || idx + 1,
                    weight: Number(s.weight) || 0,
                    reps: Number(s.reps) || 0,
                    isCompleted: Boolean(s.isCompleted),
                    ...(s.rpe !== undefined ? { rpe: Number(s.rpe) } : {}),
                  };
                })
              : [],
          };
        })
      : [],
    createdAt: Number(log.createdAt) || Date.now(),
    updatedAt: Number(log.updatedAt) || Date.now(),
  };

  if (log.routineId) sanitized.routineId = mapLegacyIdToUuid(String(log.routineId));
  if (log.rev !== undefined) sanitized.rev = Number(log.rev);

  return sanitized;
}

/**
 * 清洗使用者基礎資料：剔除 weightUnit 與 activityLevel，並自動遷移主鍵至 UUID
 */
export function sanitizeUserBaseInfo(infoInput: unknown): UserBaseInfo {
  const info = asRecord(infoInput);
  const rawId = String(info.id || PRIMARY_USER_ID);
  return {
    id: mapLegacyIdToUuid(rawId) || PRIMARY_USER_ID,
    name: String(info.name || ''),
    gender: info.gender === 'female' ? 'female' : 'male',
    birthDate: String(info.birthDate || '1999-01'),
    heightCm: Number(info.heightCm) || 175,
    createdAt: Number(info.createdAt) || Date.now(),
    updatedAt: Number(info.updatedAt) || Date.now(),
    ...(info.rev !== undefined ? { rev: Number(info.rev) } : {}),
  };
}

/**
 * 清洗訓練課表/組合：僅保留 exerciseId，徹底剔除 defaultSets 等組數設定
 */
export function sanitizeWorkoutRoutine(routineInput: unknown): WorkoutRoutine {
  const routine = asRecord(routineInput);
  const rawId = String(routine.id || '');
  return {
    id: mapLegacyIdToUuid(rawId) || rawId,
    name: String(routine.name || ''),
    ...(routine.notes ? { notes: String(routine.notes) } : {}),
    exercises: Array.isArray(routine.exercises)
      ? routine.exercises.map((itemInput: unknown) => {
          const item = asRecord(itemInput);
          return {
            exerciseId: mapLegacyIdToUuid(String(item.exerciseId || '')),
          };
        })
      : [],
    isCustom: Boolean(routine.isCustom ?? true),
    ...(routine.isArchived !== undefined ? { isArchived: Boolean(routine.isArchived) } : {}),
    createdAt: Number(routine.createdAt) || Date.now(),
    updatedAt: Number(routine.updatedAt) || Date.now(),
    ...(routine.rev !== undefined ? { rev: Number(routine.rev) } : {}),
  };
}
