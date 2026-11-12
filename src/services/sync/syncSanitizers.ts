import type { FoodRecipe, FoodLog, FoodLogEntryType, DailyDietLog, WorkoutLog, WorkoutRoutine, UserBaseInfo } from '@/types';
import { LEGACY_ID_TO_UUID_MAP, PRIMARY_USER_ID } from '@/services/db/defaultData';

export function mapLegacyIdToUuid(id?: string): string {
  if (!id) return '';
  return LEGACY_ID_TO_UUID_MAP[id] || id;
}

/**
 * 清洗菜餚組合：嚴格踐行純 ID 關聯正規化，剔除任何 foodName 快照與根層級 description，並自動遷移舊 ID 至 UUID
 */
export function sanitizeRecipe(recipe: any): FoodRecipe {
  const rawId = String(recipe.id || '');
  return {
    id: mapLegacyIdToUuid(rawId),
    name: String(recipe.name || ''),
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((ing: any) => {
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
export function sanitizeFoodLog(log: any): FoodLog {
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
    mealType: log.mealType || 'snack',
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
    if (log.customTitle?.trim()) {
      sanitized.customTitle = String(log.customTitle).trim();
    } else if (log.foodName?.trim()) {
      const rawName = String(log.foodName).trim();
      const isGeneric =
        rawName.endsWith('配額') ||
        rawName.endsWith('配额') ||
        rawName.endsWith('Budget') ||
        rawName === '正常飲食' ||
        rawName === '正常饮食' ||
        rawName === 'Regular Diet' ||
        rawName === '算我正常吃' ||
        rawName === '算我正常食' ||
        rawName === '歷史均值' ||
        rawName === '历史均值' ||
        rawName === 'Past Average' ||
        rawName === 'Historical Average';
      if (!isGeneric) {
        sanitized.customTitle = rawName;
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
    if (log.customTitle?.trim()) {
      sanitized.customTitle = String(log.customTitle).trim();
    } else if (log.foodName?.trim()) {
      const rawName = String(log.foodName).trim();
      const isGeneric =
        rawName === '快速估算' ||
        rawName === '快速粗估' ||
        rawName === 'Quick Estimate' ||
        rawName === '常規';
      if (!isGeneric) {
        sanitized.customTitle = rawName;
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
export function sanitizeDailyDietLog(raw: any): DailyDietLog {
  const rawId = String(raw.id || '');
  return {
    id: mapLegacyIdToUuid(rawId) || rawId,
    date: String(raw.date || ''),
    meta: {
      activityLevel: Number(raw.meta?.activityLevel) || 1.55,
      macroSplit: raw.meta?.macroSplit || { carbs: 40, protein: 30, fat: 30 },
    },
    entries: Array.isArray(raw.entries)
      ? raw.entries.map((entry: any) => sanitizeFoodLog(entry))
      : [],
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    ...(raw.rev !== undefined ? { rev: Number(raw.rev) } : {}),
  };
}

/**
 * 清洗訓練日誌：只保留動作 ID 與組數，剔除標題、動作名稱與肌群快照，並自動遷移 exerciseId/routineId 至 UUID
 */
export function sanitizeWorkoutLog(log: any): WorkoutLog {
  const sanitized: WorkoutLog = {
    id: String(log.id || ''),
    date: String(log.date || ''),
    exercises: Array.isArray(log.exercises)
      ? log.exercises.map((group: any) => ({
          exerciseId: mapLegacyIdToUuid(String(group.exerciseId || '')),
          sets: Array.isArray(group.sets)
            ? group.sets.map((s: any, idx: number) => ({
                id: String(s.id || `set-${idx}`),
                setNumber: Number(s.setNumber) || idx + 1,
                weight: Number(s.weight) || 0,
                reps: Number(s.reps) || 0,
                isCompleted: Boolean(s.isCompleted),
                ...(s.rpe !== undefined ? { rpe: Number(s.rpe) } : {}),
              }))
            : [],
        }))
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
export function sanitizeUserBaseInfo(info: any): UserBaseInfo {
  const rawId = String(info.id || PRIMARY_USER_ID);
  return {
    id: mapLegacyIdToUuid(rawId) || PRIMARY_USER_ID,
    name: String(info.name || ''),
    gender: info.gender || 'male',
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
export function sanitizeWorkoutRoutine(routine: any): WorkoutRoutine {
  const rawId = String(routine.id || '');
  return {
    id: mapLegacyIdToUuid(rawId) || rawId,
    name: String(routine.name || ''),
    ...(routine.notes ? { notes: String(routine.notes) } : {}),
    exercises: Array.isArray(routine.exercises)
      ? routine.exercises.map((item: any) => ({
          exerciseId: mapLegacyIdToUuid(String(item.exerciseId || '')),
        }))
      : [],
    isCustom: Boolean(routine.isCustom ?? true),
    ...(routine.isArchived !== undefined ? { isArchived: Boolean(routine.isArchived) } : {}),
    createdAt: Number(routine.createdAt) || Date.now(),
    updatedAt: Number(routine.updatedAt) || Date.now(),
    ...(routine.rev !== undefined ? { rev: Number(routine.rev) } : {}),
  };
}
