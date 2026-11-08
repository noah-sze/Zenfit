import JSZip from 'jszip';
import { db } from '@/services/db/db';
import {
  sanitizeUserBaseInfo,
  sanitizeRecipe,
  sanitizeDailyDietLog,
  sanitizeWorkoutLog,
  sanitizeWorkoutRoutine,
} from '@/services/sync/syncSanitizers';
import {
  groupWorkoutLogsByDate,
  groupBodyMetricsByDate,
  type SyncManifest,
  type BucketManifest,
  type BucketInfo,
} from '@/services/sync/syncEngine';

/**
 * 匯出全量備份為 ZIP 檔案
 * 文件結構與 Dropbox 解包同步目錄 100% 嚴格一致：
 *
 * manifest.json
 * user/
 *   base_info.json
 * nutrition/
 *   foods.json
 *   recipes.json
 *   logs/
 *     manifest.json
 *     YYYY-MM-DD.json
 * workout/
 *   exercises.json
 *   equipments.json
 *   routines.json
 *   logs/
 *     manifest.json
 *     YYYY-MM-DD.json
 * body/
 *   metrics/
 *     manifest.json
 *     YYYY-MM-DD.json
 */
export async function exportBackupZip(): Promise<Blob> {
  const [
    baseInfos,
    foods,
    recipes,
    dailyDietLogs,
    exercises,
    equipments,
    routines,
    workoutLogs,
    bodyMetrics,
  ] = await Promise.all([
    db.user_base_info.toArray(),
    db.foods.toArray(),
    db.recipes.toArray(),
    db.daily_diet_logs.toArray(),
    db.exercises.toArray(),
    db.equipments.toArray(),
    db.routines.toArray(),
    db.workout_logs.toArray(),
    db.body_metrics.toArray(),
  ]);

  const zip = new JSZip();
  const now = new Date().toISOString();

  // 1. 使用者個人資料: /user/base_info.json
  const sanitizedBaseInfos = baseInfos.map(sanitizeUserBaseInfo);
  zip.file('user/base_info.json', JSON.stringify(sanitizedBaseInfos, null, 2));

  // 2. 飲食模組基礎清單: /nutrition/foods.json & /nutrition/recipes.json
  zip.file('nutrition/foods.json', JSON.stringify(foods, null, 2));
  const sanitizedRecipes = recipes.map(sanitizeRecipe);
  zip.file('nutrition/recipes.json', JSON.stringify(sanitizedRecipes, null, 2));

  // 3. 飲食日誌按日分卷 (YYYY-MM-DD.json) 與 /nutrition/logs/manifest.json
  const foodBucketManifest: Record<string, BucketInfo> = {};
  for (const dLog of dailyDietLogs) {
    const bucket = dLog.date;
    const sanitizedLog = sanitizeDailyDietLog(dLog);
    zip.file(`nutrition/logs/${bucket}.json`, JSON.stringify(sanitizedLog, null, 2));

    const maxUpdated =
      typeof dLog.updatedAt === 'number'
        ? dLog.updatedAt
        : new Date(dLog.updatedAt || 0).getTime();

    foodBucketManifest[bucket] = {
      count: dLog.entries ? dLog.entries.length : 0,
      updatedAt: maxUpdated || Date.now(),
    };
  }
  const foodManifestData: BucketManifest = {
    version: 1,
    updatedAt: now,
    buckets: foodBucketManifest,
  };
  zip.file('nutrition/logs/manifest.json', JSON.stringify(foodManifestData, null, 2));

  // 4. 訓練模組基礎清單: /workout/exercises.json, /workout/equipments.json, /workout/routines.json
  zip.file('workout/exercises.json', JSON.stringify(exercises, null, 2));
  zip.file('workout/equipments.json', JSON.stringify(equipments, null, 2));
  const sanitizedRoutines = routines.map(sanitizeWorkoutRoutine);
  zip.file('workout/routines.json', JSON.stringify(sanitizedRoutines, null, 2));

  // 5. 訓練日誌按日分卷 (YYYY-MM-DD.json) 與 /workout/logs/manifest.json
  const groupedWorkoutLogs = groupWorkoutLogsByDate(workoutLogs);
  const workoutBucketManifest: Record<string, BucketInfo> = {};
  for (const [bucket, bLogs] of Object.entries(groupedWorkoutLogs)) {
    const sanitizedLogs = bLogs.map(sanitizeWorkoutLog);
    zip.file(`workout/logs/${bucket}.json`, JSON.stringify(sanitizedLogs, null, 2));

    const maxUpdated = bLogs.reduce((max, l) => {
      const ts =
        typeof l.updatedAt === 'number' ? l.updatedAt : new Date(l.updatedAt || 0).getTime();
      return Math.max(max, ts || 0);
    }, 0);

    workoutBucketManifest[bucket] = {
      count: bLogs.length,
      updatedAt: maxUpdated || Date.now(),
    };
  }
  const workoutManifestData: BucketManifest = {
    version: 1,
    updatedAt: now,
    buckets: workoutBucketManifest,
  };
  zip.file('workout/logs/manifest.json', JSON.stringify(workoutManifestData, null, 2));

  // 6. 體態指標按日分卷 (YYYY-MM-DD.json) 與 /body/metrics/manifest.json
  const groupedMetrics = groupBodyMetricsByDate(bodyMetrics);
  const bodyBucketManifest: Record<string, BucketInfo> = {};
  for (const [bucket, bMetrics] of Object.entries(groupedMetrics)) {
    zip.file(`body/metrics/${bucket}.json`, JSON.stringify(bMetrics, null, 2));

    const maxUpdated = bMetrics.reduce((max, m) => {
      const ts =
        typeof m.updatedAt === 'number' ? m.updatedAt : new Date(m.updatedAt || 0).getTime();
      return Math.max(max, ts || 0);
    }, 0);

    bodyBucketManifest[bucket] = {
      count: bMetrics.length,
      updatedAt: maxUpdated || Date.now(),
    };
  }
  const bodyManifestData: BucketManifest = {
    version: 1,
    updatedAt: now,
    buckets: bodyBucketManifest,
  };
  zip.file('body/metrics/manifest.json', JSON.stringify(bodyManifestData, null, 2));

  // 7. 全域根目錄 /manifest.json
  const rootManifest: SyncManifest = {
    appName: 'Zenfit',
    schemaVersion: 2,
    exportedAt: now,
    stats: {
      foodsCount: foods.length,
      recipesCount: recipes.length,
      dailyDietLogsCount: dailyDietLogs.length,
      exercisesCount: exercises.length,
      equipmentsCount: equipments.length,
      routinesCount: routines.length,
      workoutLogsCount: workoutLogs.length,
      bodyMetricsCount: bodyMetrics.length,
    },
  };
  zip.file('manifest.json', JSON.stringify(rootManifest, null, 2));

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
