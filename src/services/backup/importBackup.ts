import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/services/db/db';
import {
  sanitizeUserBaseInfo,
  sanitizeRecipe,
  sanitizeDailyDietLog,
  sanitizeWorkoutLog,
  sanitizeWorkoutRoutine,
  mapLegacyIdToUuid,
} from '@/services/sync/syncSanitizers';
import type {
  FoodItem,
  FoodRecipe,
  DailyDietLog,
  Exercise,
  Equipment,
  WorkoutRoutine,
  WorkoutLog,
  BodyMetric,
  UserBaseInfo,
} from '@/types';

export type ImportStrategy = 'merge' | 'overwrite';

export interface ImportBackupStats {
  baseInfo: number;
  foods: number;
  recipes: number;
  dailyDietLogs: number;
  exercises: number;
  equipments: number;
  routines: number;
  workoutLogs: number;
  bodyMetrics: number;
  total: number;
}

export interface ImportBackupResult {
  success: boolean;
  stats: ImportBackupStats;
}

export interface ParsedBackupData {
  baseInfos: UserBaseInfo[];
  foods: FoodItem[];
  recipes: FoodRecipe[];
  dailyDietLogs: DailyDietLog[];
  exercises: Exercise[];
  equipments: Equipment[];
  routines: WorkoutRoutine[];
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  total: number;
}

export function sanitizeFoodItem(raw: any): FoodItem {
  const rawId = String(raw.id || uuidv4());
  return {
    id: mapLegacyIdToUuid(rawId) || rawId,
    name: String(raw.name || '').trim(),
    category: raw.category || 'natural',
    ...(raw.brand ? { brand: String(raw.brand).trim() } : {}),
    servingSize: Number(raw.servingSize) || 100,
    servingUnit: String(raw.servingUnit || 'g'),
    calories: Number(raw.calories) || 0,
    protein: Number(raw.protein) || 0,
    carbs: Number(raw.carbs) || 0,
    fat: Number(raw.fat) || 0,
    ...(raw.fiber !== undefined ? { fiber: Number(raw.fiber) } : {}),
    ...(raw.labelBasisSize !== undefined ? { labelBasisSize: Number(raw.labelBasisSize) } : {}),
    ...(raw.labelBasisUnit !== undefined ? { labelBasisUnit: String(raw.labelBasisUnit) } : {}),
    isCustom: Boolean(raw.isCustom),
    isArchived: Boolean(raw.isArchived),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    ...(raw.rev !== undefined ? { rev: Number(raw.rev) } : {}),
  };
}

export function sanitizeExercise(raw: any): Exercise {
  const rawId = String(raw.id || uuidv4());
  const rawEq = String(raw.equipment || 'bodyweight');
  return {
    id: mapLegacyIdToUuid(rawId) || rawId,
    name: String(raw.name || '').trim(),
    ...(raw.category ? { category: raw.category } : {}),
    equipment: mapLegacyIdToUuid(rawEq) || rawEq,
    targetMuscles: raw.targetMuscles || {},
    ...(raw.notes ? { notes: String(raw.notes) } : {}),
    isCustom: Boolean(raw.isCustom),
    isArchived: Boolean(raw.isArchived),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    ...(raw.rev !== undefined ? { rev: Number(raw.rev) } : {}),
  };
}

export function sanitizeEquipment(raw: any): Equipment {
  const rawId = String(raw.id || uuidv4());
  return {
    id: mapLegacyIdToUuid(rawId) || rawId,
    name: String(raw.name || '').trim(),
    isCustom: Boolean(raw.isCustom),
    isArchived: Boolean(raw.isArchived),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    ...(raw.rev !== undefined ? { rev: Number(raw.rev) } : {}),
  };
}

export function sanitizeBodyMetric(raw: any): BodyMetric {
  const rawId = String(raw.id || uuidv4());
  return {
    id: rawId,
    date: String(raw.date || ''),
    ...(raw.weight !== undefined ? { weight: Number(raw.weight) } : {}),
    ...(raw.bodyFat !== undefined
      ? { bodyFat: Number(raw.bodyFat) }
      : raw.bodyFatPercentage !== undefined
      ? { bodyFat: Number(raw.bodyFatPercentage) }
      : {}),
    ...(raw.muscleMass !== undefined ? { muscleMass: Number(raw.muscleMass) } : {}),
    ...(raw.waistCm !== undefined ? { waistCm: Number(raw.waistCm) } : {}),
    ...(raw.hipsCm !== undefined ? { hipsCm: Number(raw.hipsCm) } : {}),
    ...(raw.chestCm !== undefined ? { chestCm: Number(raw.chestCm) } : {}),
    ...(raw.armsCm !== undefined ? { armsCm: Number(raw.armsCm) } : {}),
    ...(raw.thighsCm !== undefined ? { thighsCm: Number(raw.thighsCm) } : {}),
    ...(raw.calvesCm !== undefined ? { calvesCm: Number(raw.calvesCm) } : {}),
    ...(raw.waterMl !== undefined ? { waterMl: Number(raw.waterMl) } : {}),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    ...(raw.rev !== undefined ? { rev: Number(raw.rev) } : {}),
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    if (item.id) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

/**
 * 解析備份檔案內容至記憶體（支援 ZIP 壓縮包與舊版 JSON 備份檔）
 * 不修改資料庫，供前置檢查與對比展示使用
 */
export async function parseBackupFile(file: File | Blob | string): Promise<ParsedBackupData> {
  const baseInfos: UserBaseInfo[] = [];
  const foods: FoodItem[] = [];
  const recipes: FoodRecipe[] = [];
  const dailyDietLogs: DailyDietLog[] = [];
  const exercises: Exercise[] = [];
  const equipments: Equipment[] = [];
  const routines: WorkoutRoutine[] = [];
  const workoutLogs: WorkoutLog[] = [];
  const bodyMetrics: BodyMetric[] = [];

  let zip: JSZip | null = null;
  let isZipLoaded = false;

  // 1. 嘗試以 JSZip 解開
  if (typeof file !== 'string') {
    try {
      zip = await JSZip.loadAsync(file);
      isZipLoaded = Object.keys(zip.files).length > 0;
    } catch {
      zip = null;
      isZipLoaded = false;
    }
  }

  // 2. 若為 ZIP 壓縮包，遍歷檔案讀取
  if (zip && isZipLoaded) {
    for (const [rawPath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      const path = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');

      if (/(?:^|\/)user\/base_info\.json$/i.test(path)) {
        const text = await zipEntry.async('string');
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        baseInfos.push(...arr.map(sanitizeUserBaseInfo));
      } else if (/(?:^|\/)nutrition\/foods\.json$/i.test(path)) {
        const text = await zipEntry.async('string');
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        foods.push(...arr.map(sanitizeFoodItem));
      } else if (/(?:^|\/)nutrition\/recipes\.json$/i.test(path)) {
        const text = await zipEntry.async('string');
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        recipes.push(...arr.map(sanitizeRecipe));
      } else if (/(?:^|\/)nutrition\/logs\/([^/]+)\.json$/i.test(path)) {
        const match = path.match(/(?:^|\/)nutrition\/logs\/([^/]+)\.json$/i);
        if (match && match[1] !== 'manifest') {
          const text = await zipEntry.async('string');
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            dailyDietLogs.push(...parsed.map(sanitizeDailyDietLog));
          } else {
            dailyDietLogs.push(sanitizeDailyDietLog(parsed));
          }
        }
      } else if (/(?:^|\/)workout\/exercises\.json$/i.test(path)) {
        const text = await zipEntry.async('string');
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        exercises.push(...arr.map(sanitizeExercise));
      } else if (/(?:^|\/)workout\/equipments\.json$/i.test(path)) {
        const text = await zipEntry.async('string');
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        equipments.push(...arr.map(sanitizeEquipment));
      } else if (/(?:^|\/)workout\/routines\.json$/i.test(path)) {
        const text = await zipEntry.async('string');
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        routines.push(...arr.map(sanitizeWorkoutRoutine));
      } else if (/(?:^|\/)workout\/logs\/([^/]+)\.json$/i.test(path)) {
        const match = path.match(/(?:^|\/)workout\/logs\/([^/]+)\.json$/i);
        if (match && match[1] !== 'manifest') {
          const text = await zipEntry.async('string');
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            workoutLogs.push(...parsed.map(sanitizeWorkoutLog));
          } else {
            workoutLogs.push(sanitizeWorkoutLog(parsed));
          }
        }
      } else if (/(?:^|\/)body\/metrics\/([^/]+)\.json$/i.test(path)) {
        const match = path.match(/(?:^|\/)body\/metrics\/([^/]+)\.json$/i);
        if (match && match[1] !== 'manifest') {
          const text = await zipEntry.async('string');
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            bodyMetrics.push(...parsed.map(sanitizeBodyMetric));
          } else {
            bodyMetrics.push(sanitizeBodyMetric(parsed));
          }
        }
      }
    }
  }

  // 3. 若非 ZIP 或 ZIP 中未解析出任何資料，嘗試作為 JSON 備份檔解析（向後相容）
  const hasExtractedFromZip =
    baseInfos.length > 0 ||
    foods.length > 0 ||
    recipes.length > 0 ||
    dailyDietLogs.length > 0 ||
    exercises.length > 0 ||
    equipments.length > 0 ||
    routines.length > 0 ||
    workoutLogs.length > 0 ||
    bodyMetrics.length > 0;

  if (!hasExtractedFromZip) {
    let jsonText: string | null = null;
    if (typeof file === 'string') {
      jsonText = file;
    } else if (file instanceof Blob) {
      try {
        jsonText = await file.text();
      } catch {
        jsonText = null;
      }
    }

    if (jsonText) {
      try {
        const data = JSON.parse(jsonText);

        const rawBase = data.profile?.userBaseInfo
          ? [data.profile.userBaseInfo]
          : data.userBaseInfo || data.user_base_info || [];
        const rawFoods = data.diet?.foods || data.foods || [];
        const rawRecipes = data.diet?.recipes || data.recipes || [];
        const rawDietLogs = data.diet?.dailyDietLogs || data.dailyDietLogs || data.daily_diet_logs || [];
        const rawExercises = data.workout?.exercises || data.exercises || [];
        const rawEquipments = data.workout?.equipments || data.equipments || [];
        const rawRoutines = data.workout?.routines || data.routines || [];
        const rawWorkoutLogs = data.workout?.workoutLogs || data.workoutLogs || data.workout_logs || [];
        const rawBodyMetrics = data.body?.bodyMetrics || data.bodyMetrics || data.body_metrics || [];

        if (Array.isArray(rawBase)) baseInfos.push(...rawBase.map(sanitizeUserBaseInfo));
        if (Array.isArray(rawFoods)) foods.push(...rawFoods.map(sanitizeFoodItem));
        if (Array.isArray(rawRecipes)) recipes.push(...rawRecipes.map(sanitizeRecipe));
        if (Array.isArray(rawDietLogs)) dailyDietLogs.push(...rawDietLogs.map(sanitizeDailyDietLog));
        if (Array.isArray(rawExercises)) exercises.push(...rawExercises.map(sanitizeExercise));
        if (Array.isArray(rawEquipments)) equipments.push(...rawEquipments.map(sanitizeEquipment));
        if (Array.isArray(rawRoutines)) routines.push(...rawRoutines.map(sanitizeWorkoutRoutine));
        if (Array.isArray(rawWorkoutLogs)) workoutLogs.push(...rawWorkoutLogs.map(sanitizeWorkoutLog));
        if (Array.isArray(rawBodyMetrics)) bodyMetrics.push(...rawBodyMetrics.map(sanitizeBodyMetric));
      } catch {
        // 非法 JSON
      }
    }
  }

  // 4. 去重與標準化
  const dedupedBaseInfos = dedupeById(baseInfos);
  const dedupedFoods = dedupeById(foods);
  const dedupedRecipes = dedupeById(recipes);
  const dedupedExercises = dedupeById(exercises);
  const dedupedEquipments = dedupeById(equipments);
  const dedupedRoutines = dedupeById(routines);
  const dedupedWorkoutLogs = dedupeById(workoutLogs);
  const dedupedBodyMetrics = dedupeById(bodyMetrics);

  // dailyDietLogs 依照 date 唯一去重
  const dietLogsByDate = new Map<string, DailyDietLog>();
  for (const log of dailyDietLogs) {
    if (log.date) {
      dietLogsByDate.set(log.date, log);
    }
  }
  const dedupedDailyDietLogs = Array.from(dietLogsByDate.values());

  const total =
    dedupedBaseInfos.length +
    dedupedFoods.length +
    dedupedRecipes.length +
    dedupedDailyDietLogs.length +
    dedupedExercises.length +
    dedupedEquipments.length +
    dedupedRoutines.length +
    dedupedWorkoutLogs.length +
    dedupedBodyMetrics.length;

  if (total === 0) {
    throw new Error('INVALID_BACKUP_FILE');
  }

  return {
    baseInfos: dedupedBaseInfos,
    foods: dedupedFoods,
    recipes: dedupedRecipes,
    dailyDietLogs: dedupedDailyDietLogs,
    exercises: dedupedExercises,
    equipments: dedupedEquipments,
    routines: dedupedRoutines,
    workoutLogs: dedupedWorkoutLogs,
    bodyMetrics: dedupedBodyMetrics,
    total,
  };
}

/**
 * 執行已解析資料寫入 IndexedDB（支援合併或完全覆蓋）
 */
export async function executeImport(
  data: ParsedBackupData,
  strategy: ImportStrategy = 'merge'
): Promise<ImportBackupResult> {
  const {
    baseInfos,
    foods,
    recipes,
    dailyDietLogs,
    exercises,
    equipments,
    routines,
    workoutLogs,
    bodyMetrics,
    total,
  } = data;

  await db.transaction(
    'rw',
    [
      db.user_base_info,
      db.user_profile,
      db.foods,
      db.recipes,
      db.daily_diet_logs,
      db.exercises,
      db.equipments,
      db.routines,
      db.workout_logs,
      db.body_metrics,
    ],
    async () => {
      // 若為完全覆蓋策略，先清空所有相關資料庫表
      if (strategy === 'overwrite') {
        await Promise.all([
          db.user_base_info.clear(),
          db.user_profile.clear(),
          db.foods.clear(),
          db.recipes.clear(),
          db.daily_diet_logs.clear(),
          db.exercises.clear(),
          db.equipments.clear(),
          db.routines.clear(),
          db.workout_logs.clear(),
          db.body_metrics.clear(),
        ]);
      } else {
        // 合併策略：飲食日誌防重，若該日已存在日誌，沿用其 ID 防範 &date 唯一鍵衝突
        for (const log of dailyDietLogs) {
          const existing = await db.daily_diet_logs.where('date').equals(log.date).first();
          if (existing) {
            log.id = existing.id;
          }
        }
      }

      if (baseInfos.length > 0) {
        await db.user_base_info.bulkPut(baseInfos);
        // 同步更新 user_profile 表保持 UI 即時響應
        const primary = baseInfos[0];
        const existingProfile = await db.user_profile.toCollection().first();
        if (existingProfile) {
          await db.user_profile.update(existingProfile.id, {
            name: primary.name,
            gender: primary.gender,
            birthDate: primary.birthDate,
            heightCm: primary.heightCm,
            updatedAt: Date.now(),
          });
        }
      }

      if (foods.length > 0) await db.foods.bulkPut(foods);
      if (recipes.length > 0) await db.recipes.bulkPut(recipes);
      if (dailyDietLogs.length > 0) await db.daily_diet_logs.bulkPut(dailyDietLogs);
      if (exercises.length > 0) await db.exercises.bulkPut(exercises);
      if (equipments.length > 0) await db.equipments.bulkPut(equipments);
      if (routines.length > 0) await db.routines.bulkPut(routines);
      if (workoutLogs.length > 0) await db.workout_logs.bulkPut(workoutLogs);
      if (bodyMetrics.length > 0) await db.body_metrics.bulkPut(bodyMetrics);
    }
  );

  return {
    success: true,
    stats: {
      baseInfo: baseInfos.length,
      foods: foods.length,
      recipes: recipes.length,
      dailyDietLogs: dailyDietLogs.length,
      exercises: exercises.length,
      equipments: equipments.length,
      routines: routines.length,
      workoutLogs: workoutLogs.length,
      bodyMetrics: bodyMetrics.length,
      total,
    },
  };
}

/**
 * 一鍵解析並匯入備份（支援合併或完全覆蓋）
 */
export async function importBackup(
  file: File | Blob | string,
  strategy: ImportStrategy = 'merge'
): Promise<ImportBackupResult> {
  const parsed = await parseBackupFile(file);
  return await executeImport(parsed, strategy);
}
