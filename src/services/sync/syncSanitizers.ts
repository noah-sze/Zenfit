import type { FoodRecipe, FoodLog, DailyDietLog, WorkoutLog, UserBaseInfo } from '@/types';
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
 * 清洗飲食日誌：只保留物理事實，剔除食物名稱與營養素快照，並自動遷移引用 foodId 至 UUID
 */
export function sanitizeFoodLog(log: any): FoodLog {
  const sanitized: FoodLog = {
    id: String(log.id || ''),
    date: String(log.date || ''),
    mealType: log.mealType || 'snack',
    quantity: Number(log.quantity) || 0,
    unit: String(log.unit || 'g'),
    createdAt: Number(log.createdAt) || Date.now(),
    updatedAt: Number(log.updatedAt) || Date.now(),
  };

  if (log.foodId) sanitized.foodId = mapLegacyIdToUuid(String(log.foodId));
  if (log.bundleId) sanitized.bundleId = mapLegacyIdToUuid(String(log.bundleId));
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
