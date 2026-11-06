import { db } from '@/services/db/db';
import type {
  FoodItem,
  FoodRecipe,
  DailyDietLog,
  FoodLog,
  DietPlan,
  Exercise,
  Equipment,
  WorkoutRoutine,
  WorkoutLog,
  BodyMetric,
  UserBaseInfo,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
  listRemoteFolder,
  downloadJsonFile,
  uploadJsonFile,
  type DropboxFileMetadata,
} from './dropboxClient';
import {
  sanitizeRecipe,
  sanitizeFoodLog,
  sanitizeDailyDietLog,
  sanitizeWorkoutLog,
  sanitizeWorkoutRoutine,
  sanitizeUserBaseInfo,
} from './syncSanitizers';
import { isDropboxConnected } from './dropboxAuth';

const LAST_SYNC_KEY = 'zenfit_dropbox_last_sync';
const CACHED_REVS_KEY = 'zenfit_dropbox_cached_revs';
const TABLE_PUSH_TIME_KEY = 'zenfit_dropbox_pushed_times';

export interface SyncResult {
  success: boolean;
  timestamp: string;
  error?: string;
  actionTaken: 'uploaded_initial' | 'merged' | 'downloaded_remote' | 'uploaded_local' | 'up_to_date';
}

export interface SyncEngineStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncError: string | null;
  justSynced: boolean;
}

let currentSyncStatus: SyncEngineStatus = {
  isSyncing: false,
  lastSyncTime: null,
  lastSyncError: null,
  justSynced: false,
};

const syncStatusListeners = new Set<(status: SyncEngineStatus) => void>();
let justSyncedTimer: ReturnType<typeof setTimeout> | null = null;

export function getSyncEngineStatus(): SyncEngineStatus {
  if (currentSyncStatus.lastSyncTime === null) {
    currentSyncStatus.lastSyncTime = getLastSyncTime();
  }
  return { ...currentSyncStatus };
}

export function updateSyncEngineStatus(patch: Partial<SyncEngineStatus>): void {
  currentSyncStatus = { ...currentSyncStatus, ...patch };
  syncStatusListeners.forEach((fn) => {
    try {
      fn(currentSyncStatus);
    } catch (e) {
      console.error('Error in sync status listener:', e);
    }
  });
}

export function onSyncEngineStatusChange(listener: (status: SyncEngineStatus) => void): () => void {
  syncStatusListeners.add(listener);
  listener(getSyncEngineStatus());
  return () => {
    syncStatusListeners.delete(listener);
  };
}

export interface SyncManifestStats {
  foodsCount: number;
  recipesCount: number;
  dailyDietLogsCount: number;
  foodLogsCount?: number;
  dietPlansCount?: number;
  exercisesCount: number;
  equipmentsCount: number;
  routinesCount: number;
  workoutLogsCount: number;
  bodyMetricsCount: number;
}

export interface SyncManifest {
  appName: string;
  schemaVersion: number;
  exportedAt: string;
  stats: SyncManifestStats;
}

export interface BucketInfo {
  count: number;
  updatedAt: number;
}

export interface BucketManifest {
  version: number;
  updatedAt: string;
  buckets: Record<string, BucketInfo>;
}

let isSyncInProgress = false;
let hasPendingSyncRequest = false;
let pendingSyncMode: 'auto' | 'overwrite_local' | 'overwrite_remote' = 'auto';
let autoSyncTimeout: ReturnType<typeof setTimeout> | null = null;

export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function setLastSyncTime(isoTime: string): void {
  localStorage.setItem(LAST_SYNC_KEY, isoTime);
  updateSyncEngineStatus({ lastSyncTime: isoTime });
}

export function getCachedRevs(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHED_REVS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function setCachedRevs(revs: Record<string, string>): void {
  localStorage.setItem(CACHED_REVS_KEY, JSON.stringify(revs));
}

export function getPushedTimes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TABLE_PUSH_TIME_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function setPushedTimes(times: Record<string, string>): void {
  localStorage.setItem(TABLE_PUSH_TIME_KEY, JSON.stringify(times));
}

/**
 * 標準化時間戳轉為數字毫秒，保證數值與 ISO 字串能準確對齊比較
 */
function getNormalizedTimestamp(ts?: number | string): number {
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string' && ts) {
    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * 核心演算法：支援邏輯版本號 (rev) 與時間戳雙重防護的 LWW (Last-Write-Wins) 合併
 */
export function mergeEntities<T extends { id: string; updatedAt?: number | string; rev?: number }>(
  localList: T[],
  remoteList: T[]
): { merged: T[]; hasLocalChanges: boolean; hasRemoteChanges: boolean } {
  const localMap = new Map<string, T>(localList.map((item) => [item.id, item]));
  const remoteMap = new Map<string, T>(remoteList.map((item) => [item.id, item]));
  const mergedMap = new Map<string, T>();

  let hasLocalChanges = false;
  let hasRemoteChanges = false;

  for (const localItem of localList) {
    const remoteItem = remoteMap.get(localItem.id);
    if (!remoteItem) {
      mergedMap.set(localItem.id, localItem);
      hasRemoteChanges = true;
    } else {
      const localRev = localItem.rev || 1;
      const remoteRev = remoteItem.rev || 1;
      const localTime = getNormalizedTimestamp(localItem.updatedAt);
      const remoteTime = getNormalizedTimestamp(remoteItem.updatedAt);

      // 1. 優先比對單調遞增邏輯版本號
      if (remoteRev > localRev) {
        mergedMap.set(localItem.id, remoteItem);
        hasLocalChanges = true;
      } else if (localRev > remoteRev) {
        mergedMap.set(localItem.id, localItem);
        hasRemoteChanges = true;
      } else {
        // 2. 版本號相同時，以最新時間戳為仲裁
        if (remoteTime > localTime) {
          mergedMap.set(localItem.id, remoteItem);
          hasLocalChanges = true;
        } else if (localTime > remoteTime) {
          mergedMap.set(localItem.id, localItem);
          hasRemoteChanges = true;
        } else {
          mergedMap.set(localItem.id, localItem);
        }
      }
    }
  }

  for (const remoteItem of remoteList) {
    if (!localMap.has(remoteItem.id)) {
      mergedMap.set(remoteItem.id, remoteItem);
      hasLocalChanges = true;
    }
  }

  return {
    merged: Array.from(mergedMap.values()),
    hasLocalChanges,
    hasRemoteChanges,
  };
}

/**
 * 按日期 (YYYY-MM-DD) 分組 FoodLog
 */
export function groupFoodLogsByDate(logs: FoodLog[]): Record<string, FoodLog[]> {
  const groups: Record<string, FoodLog[]> = {};
  for (const log of logs) {
    const bucket = log.date && log.date.length >= 10 ? log.date.slice(0, 10) : (log.date || 'unknown');
    if (!groups[bucket]) groups[bucket] = [];
    groups[bucket].push(log);
  }
  return groups;
}

/**
 * 按日期 (YYYY-MM-DD) 分組 WorkoutLog
 */
export function groupWorkoutLogsByDate(logs: WorkoutLog[]): Record<string, WorkoutLog[]> {
  const groups: Record<string, WorkoutLog[]> = {};
  for (const log of logs) {
    const bucket = log.date && log.date.length >= 10 ? log.date.slice(0, 10) : (log.date || 'unknown');
    if (!groups[bucket]) groups[bucket] = [];
    groups[bucket].push(log);
  }
  return groups;
}

/**
 * 按日期 (YYYY-MM-DD) 分組 BodyMetric
 */
export function groupBodyMetricsByDate(metrics: BodyMetric[]): Record<string, BodyMetric[]> {
  const groups: Record<string, BodyMetric[]> = {};
  for (const m of metrics) {
    const bucket = m.date && m.date.length >= 10 ? m.date.slice(0, 10) : (m.date || 'unknown');
    if (!groups[bucket]) groups[bucket] = [];
    groups[bucket].push(m);
  }
  return groups;
}

// 向後相容別名
export const groupFoodLogsByMonth = groupFoodLogsByDate;
export const groupWorkoutLogsByMonth = groupWorkoutLogsByDate;
export const groupBodyMetricsByYear = groupBodyMetricsByDate;

/**
 * 全量上傳本機所有資料模組至雲端
 */
export async function uploadAllLocalData(
  now: string,
  cachedRevs: Record<string, string>,
  pushedTimes: Record<string, string>
): Promise<void> {
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

  // 1. 使用者個人資料（唯一真理源：base_info）
  cachedRevs['/user/base_info.json'] = await uploadJsonFile(
    '/user/base_info.json',
    baseInfos.map(sanitizeUserBaseInfo)
  );
  pushedTimes['user_base_info'] = now;

  // 2. 飲食模組基礎清單
  cachedRevs['/nutrition/foods.json'] = await uploadJsonFile('/nutrition/foods.json', foods);
  cachedRevs['/nutrition/recipes.json'] = await uploadJsonFile(
    '/nutrition/recipes.json',
    recipes.map(sanitizeRecipe)
  );
  pushedTimes['foods'] = now;
  pushedTimes['recipes'] = now;

  // 3. 飲食日誌按日自包含膠囊 (YYYY-MM-DD，整合日誌頭部 meta 與進食組件 entries)
  const foodBucketManifest: Record<string, BucketInfo> = {};
  for (const dLog of dailyDietLogs) {
    const bucket = dLog.date;
    const bucketPath = `/nutrition/logs/${bucket}.json`;
    cachedRevs[bucketPath] = await uploadJsonFile(bucketPath, sanitizeDailyDietLog(dLog));
    const maxUpdated = getNormalizedTimestamp(dLog.updatedAt);
    foodBucketManifest[bucket] = {
      count: dLog.entries.length,
      updatedAt: maxUpdated,
    };
    pushedTimes[`food_log_${bucket}`] = now;
    pushedTimes[`food_log_${bucket}_count`] = String(dLog.entries.length);
  }
  const foodManifestData: BucketManifest = {
    version: 1,
    updatedAt: now,
    buckets: foodBucketManifest,
  };
  cachedRevs['/nutrition/logs/manifest.json'] = await uploadJsonFile(
    '/nutrition/logs/manifest.json',
    foodManifestData
  );

  // 4. 訓練模組基礎清單
  cachedRevs['/workout/exercises.json'] = await uploadJsonFile('/workout/exercises.json', exercises);
  cachedRevs['/workout/equipments.json'] = await uploadJsonFile('/workout/equipments.json', equipments);
  cachedRevs['/workout/routines.json'] = await uploadJsonFile(
    '/workout/routines.json',
    routines.map(sanitizeWorkoutRoutine)
  );
  pushedTimes['exercises'] = now;
  pushedTimes['equipments'] = now;
  pushedTimes['routines'] = now;

  // 5. 訓練日誌按日分卷 (YYYY-MM-DD)
  const groupedWorkoutLogs = groupWorkoutLogsByDate(workoutLogs);
  const workoutBucketManifest: Record<string, BucketInfo> = {};
  for (const [bucket, bLogs] of Object.entries(groupedWorkoutLogs)) {
    const bucketPath = `/workout/logs/${bucket}.json`;
    cachedRevs[bucketPath] = await uploadJsonFile(bucketPath, bLogs.map(sanitizeWorkoutLog));
    const maxUpdated = bLogs.reduce((max, l) => Math.max(max, getNormalizedTimestamp(l.updatedAt)), 0);
    workoutBucketManifest[bucket] = {
      count: bLogs.length,
      updatedAt: maxUpdated,
    };
    pushedTimes[`workout_log_${bucket}`] = now;
    pushedTimes[`workout_log_${bucket}_count`] = String(bLogs.length);
  }
  const workoutManifestData: BucketManifest = {
    version: 1,
    updatedAt: now,
    buckets: workoutBucketManifest,
  };
  cachedRevs['/workout/logs/manifest.json'] = await uploadJsonFile(
    '/workout/logs/manifest.json',
    workoutManifestData
  );

  // 6. 體態指標按日分卷 (YYYY-MM-DD)
  const groupedMetrics = groupBodyMetricsByDate(bodyMetrics);
  const bodyBucketManifest: Record<string, BucketInfo> = {};
  for (const [bucket, bMetrics] of Object.entries(groupedMetrics)) {
    const bucketPath = `/body/metrics/${bucket}.json`;
    cachedRevs[bucketPath] = await uploadJsonFile(bucketPath, bMetrics);
    const maxUpdated = bMetrics.reduce((max, m) => Math.max(max, getNormalizedTimestamp(m.updatedAt)), 0);
    bodyBucketManifest[bucket] = {
      count: bMetrics.length,
      updatedAt: maxUpdated,
    };
    pushedTimes[`body_metric_${bucket}`] = now;
    pushedTimes[`body_metric_${bucket}_count`] = String(bMetrics.length);
  }
  const bodyManifestData: BucketManifest = {
    version: 1,
    updatedAt: now,
    buckets: bodyBucketManifest,
  };
  cachedRevs['/body/metrics/manifest.json'] = await uploadJsonFile(
    '/body/metrics/manifest.json',
    bodyManifestData
  );

  // 7. 全域清單 manifest.json
  await uploadManifestFile(cachedRevs);
}

/**
 * 建立並上傳全域 manifest.json
 */
export async function uploadManifestFile(cachedRevs: Record<string, string>): Promise<void> {
  const [
    foodsCount,
    recipesCount,
    dailyDietLogsCount,
    exercisesCount,
    equipmentsCount,
    routinesCount,
    workoutLogsCount,
    bodyMetricsCount,
  ] = await Promise.all([
    db.foods.count(),
    db.recipes.count(),
    db.daily_diet_logs.count(),
    db.exercises.count(),
    db.equipments.count(),
    db.routines.count(),
    db.workout_logs.count(),
    db.body_metrics.count(),
  ]);

  const now = new Date().toISOString();
  const manifest: SyncManifest = {
    appName: 'Zenfit',
    schemaVersion: 2,
    exportedAt: now,
    stats: {
      foodsCount,
      recipesCount,
      dailyDietLogsCount,
      exercisesCount,
      equipmentsCount,
      routinesCount,
      workoutLogsCount,
      bodyMetricsCount,
    },
  };

  const rev = await uploadJsonFile('/manifest.json', manifest);
  cachedRevs['/manifest.json'] = rev;
}

/**
 * 執行解包資料夾雙向同步 (Unpacked Folder Sync Engine)
 */
export async function executeSync(
  mode: 'auto' | 'overwrite_local' | 'overwrite_remote' = 'auto'
): Promise<SyncResult> {
  if (isSyncInProgress) {
    hasPendingSyncRequest = true;
    if (mode === 'overwrite_remote' || mode === 'overwrite_local') {
      pendingSyncMode = mode;
    }
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Sync already in progress, queued next run',
      actionTaken: 'up_to_date',
    };
  }

  if (!isDropboxConnected()) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Dropbox not connected',
      actionTaken: 'up_to_date',
    };
  }

  updateSyncEngineStatus({ isSyncing: true, lastSyncError: null, justSynced: false });

  // 1. 純覆蓋雲端模式 (Overwrite Remote)
  if (mode === 'overwrite_remote') {
    isSyncInProgress = true;
    try {
      const now = new Date().toISOString();
      const cachedRevs = getCachedRevs();
      const pushedTimes = getPushedTimes();

      await uploadAllLocalData(now, cachedRevs, pushedTimes);

      setCachedRevs(cachedRevs);
      setPushedTimes(pushedTimes);
      setLastSyncTime(now);

      if (justSyncedTimer) clearTimeout(justSyncedTimer);
      updateSyncEngineStatus({
        isSyncing: false,
        lastSyncTime: now,
        lastSyncError: null,
        justSynced: true,
      });
      justSyncedTimer = setTimeout(() => {
        updateSyncEngineStatus({ justSynced: false });
      }, 2500);

      return { success: true, timestamp: now, actionTaken: 'uploaded_local' };
    } catch (error: unknown) {
      console.error('Overwrite remote error:', error);
      const errMsg = error instanceof Error ? error.message : 'Overwrite remote error';
      updateSyncEngineStatus({
        isSyncing: false,
        lastSyncError: errMsg,
        justSynced: false,
      });
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: errMsg,
        actionTaken: 'up_to_date',
      };
    } finally {
      isSyncInProgress = false;
      drainPendingQueue();
    }
  }

  isSyncInProgress = true;

  try {
    const now = new Date().toISOString();
    const cachedRevs = getCachedRevs();
    const pushedTimes = getPushedTimes();

    // 呼叫一次 listRemoteFolder，單次請求掌握所有遠端檔案及其 rev
    const remoteFiles = await listRemoteFolder();

    // 2. 遠端完全沒有資料夾記錄（初次上傳）
    if (remoteFiles.length === 0) {
      await uploadAllLocalData(now, cachedRevs, pushedTimes);
      setCachedRevs(cachedRevs);
      setPushedTimes(pushedTimes);
      setLastSyncTime(now);

      if (justSyncedTimer) clearTimeout(justSyncedTimer);
      updateSyncEngineStatus({
        isSyncing: false,
        lastSyncTime: now,
        lastSyncError: null,
        justSynced: true,
      });
      justSyncedTimer = setTimeout(() => {
        updateSyncEngineStatus({ justSynced: false });
      }, 2500);

      return { success: true, timestamp: now, actionTaken: 'uploaded_initial' };
    }

    const remoteFileMap = new Map<string, DropboxFileMetadata>(
      remoteFiles.map((f) => [f.path_lower, f])
    );

    // 3. 純覆蓋本機模式 (Overwrite Local)
    if (mode === 'overwrite_local') {
      const [
        baseInfos,
        foods,
        recipes,
        exercises,
        equipments,
        routines,
      ] = await Promise.all([
        downloadJsonFile<UserBaseInfo[]>('/user/base_info.json'),
        downloadJsonFile<FoodItem[]>('/nutrition/foods.json'),
        downloadJsonFile<FoodRecipe[]>('/nutrition/recipes.json'),
        downloadJsonFile<Exercise[]>('/workout/exercises.json'),
        downloadJsonFile<Equipment[]>('/workout/equipments.json'),
        downloadJsonFile<WorkoutRoutine[]>('/workout/routines.json'),
      ]);

      // 下載所有飲食分卷
      const foodFiles = remoteFiles.filter(
        (f) =>
          f.path_lower.startsWith('/nutrition/logs/') &&
          f.name.endsWith('.json') &&
          !f.name.endsWith('manifest.json')
      );
      const foodChunks = await Promise.all(
        foodFiles.map((f) => downloadJsonFile<any>(f.path_lower))
      );
      const allDailyDietLogs: DailyDietLog[] = [];
      for (let i = 0; i < foodFiles.length; i++) {
        const chunk = foodChunks[i];
        const f = foodFiles[i];
        if (!chunk) continue;
        if (Array.isArray(chunk)) {
          if (chunk.length > 0 && 'entries' in chunk[0]) {
            allDailyDietLogs.push(...chunk.map(sanitizeDailyDietLog));
          } else {
            const dateStr = f.name.replace('.json', '');
            allDailyDietLogs.push({
              id: uuidv4(),
              date: dateStr,
              meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
              entries: chunk.map(sanitizeFoodLog),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
        } else if ('entries' in chunk) {
          allDailyDietLogs.push(sanitizeDailyDietLog(chunk));
        }
      }

      // 下載所有訓練分卷
      const workoutFiles = remoteFiles.filter(
        (f) =>
          f.path_lower.startsWith('/workout/logs/') &&
          f.name.endsWith('.json') &&
          !f.name.endsWith('manifest.json')
      );
      const workoutChunks = await Promise.all(
        workoutFiles.map((f) => downloadJsonFile<WorkoutLog[]>(f.path_lower))
      );
      const allWorkoutLogs: WorkoutLog[] = [];
      for (const chunk of workoutChunks) {
        if (chunk?.length) allWorkoutLogs.push(...chunk);
      }

      // 下載所有體態分卷
      const bodyFiles = remoteFiles.filter(
        (f) =>
          f.path_lower.startsWith('/body/metrics/') &&
          f.name.endsWith('.json') &&
          !f.name.endsWith('manifest.json')
      );
      const bodyChunks = await Promise.all(
        bodyFiles.map((f) => downloadJsonFile<BodyMetric[]>(f.path_lower))
      );
      const allBodyMetrics: BodyMetric[] = [];
      for (const chunk of bodyChunks) {
        if (chunk?.length) allBodyMetrics.push(...chunk);
      }

      // 原子清空與全量覆寫寫入
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

          if (baseInfos?.length) await db.user_base_info.bulkPut(baseInfos.map(sanitizeUserBaseInfo));
          if (foods?.length) await db.foods.bulkPut(foods);
          if (recipes?.length) await db.recipes.bulkPut(recipes.map(sanitizeRecipe));
          if (allDailyDietLogs.length) await db.daily_diet_logs.bulkPut(allDailyDietLogs);
          if (exercises?.length) await db.exercises.bulkPut(exercises);
          if (equipments?.length) await db.equipments.bulkPut(equipments);
          if (routines?.length) await db.routines.bulkPut(routines);
          if (allWorkoutLogs.length) await db.workout_logs.bulkPut(allWorkoutLogs.map(sanitizeWorkoutLog));
          if (allBodyMetrics.length) await db.body_metrics.bulkPut(allBodyMetrics);
        }
      );

      // 快取所有遠端最新 rev
      for (const [pathLower, fileMeta] of remoteFileMap) {
        cachedRevs[pathLower] = fileMeta.rev;
      }
      setCachedRevs(cachedRevs);
      setLastSyncTime(now);

      if (justSyncedTimer) clearTimeout(justSyncedTimer);
      updateSyncEngineStatus({
        isSyncing: false,
        lastSyncTime: now,
        lastSyncError: null,
        justSynced: true,
      });
      justSyncedTimer = setTimeout(() => {
        updateSyncEngineStatus({ justSynced: false });
      }, 2500);

      return { success: true, timestamp: now, actionTaken: 'downloaded_remote' };
    }

    // 4. 動態雙向解包文件夾同步模式 (Auto Granular Selective Pull & Push)
    let hasLocalModified = false;
    let hasRemoteModified = false;

    // A. 遠端修訂號比對拉取 (Selective Pull via rev)
    // 1. 檢查 user_base_info
    const baseInfoMeta = remoteFileMap.get('/user/base_info.json');
    if (baseInfoMeta && cachedRevs['/user/base_info.json'] !== baseInfoMeta.rev) {
      const rawRemote = (await downloadJsonFile<UserBaseInfo[]>('/user/base_info.json')) || [];
      const remoteList = rawRemote.map(sanitizeUserBaseInfo);
      const localList = await db.user_base_info.toArray();
      const m = mergeEntities(localList, remoteList);
      if (m.hasLocalChanges) {
        await db.user_base_info.bulkPut(m.merged.map(sanitizeUserBaseInfo));
        hasLocalModified = true;
      }
      if (m.hasRemoteChanges) hasRemoteModified = true;
      cachedRevs['/user/base_info.json'] = baseInfoMeta.rev;
    }

    // 2. 檢查 foods
    const foodsMeta = remoteFileMap.get('/nutrition/foods.json');
    if (foodsMeta && cachedRevs['/nutrition/foods.json'] !== foodsMeta.rev) {
      const remoteList = (await downloadJsonFile<FoodItem[]>('/nutrition/foods.json')) || [];
      const localList = await db.foods.toArray();
      const m = mergeEntities(localList, remoteList);
      if (m.hasLocalChanges) {
        await db.foods.bulkPut(m.merged);
        hasLocalModified = true;
      }
      if (m.hasRemoteChanges) hasRemoteModified = true;
      cachedRevs['/nutrition/foods.json'] = foodsMeta.rev;
    }

    // 4. 檢查 recipes
    const recipesMeta = remoteFileMap.get('/nutrition/recipes.json');
    if (recipesMeta && cachedRevs['/nutrition/recipes.json'] !== recipesMeta.rev) {
      const rawRemote = (await downloadJsonFile<FoodRecipe[]>('/nutrition/recipes.json')) || [];
      const remoteList = rawRemote.map(sanitizeRecipe);
      const localList = await db.recipes.toArray();
      const m = mergeEntities(localList, remoteList);
      if (m.hasLocalChanges) {
        await db.recipes.bulkPut(m.merged.map(sanitizeRecipe));
        hasLocalModified = true;
      }
      if (m.hasRemoteChanges) hasRemoteModified = true;
      cachedRevs['/nutrition/recipes.json'] = recipesMeta.rev;
    }

    // 5. 檢查舊版 diet_plans (向下相容吸收進日誌頭部)
    const plansMeta = remoteFileMap.get('/nutrition/diet_plans.json');
    if (plansMeta && cachedRevs['/nutrition/diet_plans.json'] !== plansMeta.rev) {
      const remoteList = (await downloadJsonFile<DietPlan[]>('/nutrition/diet_plans.json')) || [];
      for (const p of remoteList) {
        if (!p.date) continue;
        const existing = await db.daily_diet_logs.get(p.date);
        if (existing) {
          const remoteUpdated = getNormalizedTimestamp(p.updatedAt);
          const localUpdated = getNormalizedTimestamp(existing.updatedAt);
          if (remoteUpdated > localUpdated) {
            existing.meta = {
              activityLevel: p.activityLevel ?? existing.meta.activityLevel,
              macroSplit: p.macroSplit ?? existing.meta.macroSplit,
            };
            existing.updatedAt = Math.max(existing.updatedAt, remoteUpdated);
            await db.daily_diet_logs.put(existing);
            hasLocalModified = true;
          }
        } else {
          await db.daily_diet_logs.put({
            id: uuidv4(),
            date: p.date,
            meta: {
              activityLevel: p.activityLevel ?? 1.55,
              macroSplit: p.macroSplit ?? { carbs: 40, protein: 30, fat: 30 },
            },
            entries: [],
            createdAt: p.createdAt || Date.now(),
            updatedAt: p.updatedAt || Date.now(),
          });
          hasLocalModified = true;
        }
      }
      cachedRevs['/nutrition/diet_plans.json'] = plansMeta.rev;
    }

    // 6. 檢查 exercises
    const exMeta = remoteFileMap.get('/workout/exercises.json');
    if (exMeta && cachedRevs['/workout/exercises.json'] !== exMeta.rev) {
      const remoteList = (await downloadJsonFile<Exercise[]>('/workout/exercises.json')) || [];
      const localList = await db.exercises.toArray();
      const m = mergeEntities(localList, remoteList);
      if (m.hasLocalChanges) {
        await db.exercises.bulkPut(m.merged);
        hasLocalModified = true;
      }
      if (m.hasRemoteChanges) hasRemoteModified = true;
      cachedRevs['/workout/exercises.json'] = exMeta.rev;
    }

    // 7. 檢查 equipments
    const eqMeta = remoteFileMap.get('/workout/equipments.json');
    if (eqMeta && cachedRevs['/workout/equipments.json'] !== eqMeta.rev) {
      const remoteList = (await downloadJsonFile<Equipment[]>('/workout/equipments.json')) || [];
      const localList = await db.equipments.toArray();
      const m = mergeEntities(localList, remoteList);
      if (m.hasLocalChanges) {
        await db.equipments.bulkPut(m.merged);
        hasLocalModified = true;
      }
      if (m.hasRemoteChanges) hasRemoteModified = true;
      cachedRevs['/workout/equipments.json'] = eqMeta.rev;
    }

    // 8. 檢查 routines
    const routinesMeta = remoteFileMap.get('/workout/routines.json');
    if (routinesMeta && cachedRevs['/workout/routines.json'] !== routinesMeta.rev) {
      const remoteList = (await downloadJsonFile<WorkoutRoutine[]>('/workout/routines.json')) || [];
      const localList = await db.routines.toArray();
      const m = mergeEntities(localList, remoteList);
      if (m.hasLocalChanges) {
        await db.routines.bulkPut(m.merged);
        hasLocalModified = true;
      }
      if (m.hasRemoteChanges) hasRemoteModified = true;
      cachedRevs['/workout/routines.json'] = routinesMeta.rev;
    }

    // 9. 檢查 daily_diet_logs 各日分卷 (/nutrition/logs/YYYY-MM-DD.json)
    const remoteFoodBuckets = remoteFiles.filter(
      (f) =>
        f.path_lower.startsWith('/nutrition/logs/') &&
        f.name.endsWith('.json') &&
        !f.name.endsWith('manifest.json')
    );
    for (const bMeta of remoteFoodBuckets) {
      const path = bMeta.path_lower;
      if (cachedRevs[path] !== bMeta.rev) {
        const bucket = bMeta.name.replace('.json', '');
        const rawRemote = await downloadJsonFile<any>(path);
        if (rawRemote) {
          let remoteLog: DailyDietLog;
          if (Array.isArray(rawRemote)) {
            if (rawRemote.length > 0 && 'entries' in rawRemote[0]) {
              remoteLog = sanitizeDailyDietLog(rawRemote[0]);
            } else {
              // 舊版 FoodLog[] 平鋪結構向下相容
              remoteLog = {
                id: uuidv4(),
                date: bucket,
                meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
                entries: rawRemote.map(sanitizeFoodLog),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
            }
          } else {
            remoteLog = sanitizeDailyDietLog(rawRemote);
          }

          const localLog = await db.daily_diet_logs.get(bucket);
          if (!localLog) {
            await db.daily_diet_logs.put(remoteLog);
            hasLocalModified = true;
          } else {
            const remoteUpdated = getNormalizedTimestamp(remoteLog.updatedAt);
            const localUpdated = getNormalizedTimestamp(localLog.updatedAt);
            if (remoteUpdated > localUpdated) {
              await db.daily_diet_logs.put(remoteLog);
              hasLocalModified = true;
            } else if (localUpdated > remoteUpdated) {
              hasRemoteModified = true;
            }
          }
        }
        cachedRevs[path] = bMeta.rev;
      }
    }

    // 10. 檢查 workout_logs 各月份分卷
    const remoteWorkoutBuckets = remoteFiles.filter(
      (f) =>
        f.path_lower.startsWith('/workout/logs/') &&
        f.name.endsWith('.json') &&
        !f.name.endsWith('manifest.json')
    );
    for (const bMeta of remoteWorkoutBuckets) {
      const path = bMeta.path_lower;
      if (cachedRevs[path] !== bMeta.rev) {
        const bucket = bMeta.name.replace('.json', '');
        const rawRemote = (await downloadJsonFile<WorkoutLog[]>(path)) || [];
        const remoteList = rawRemote.map(sanitizeWorkoutLog);
        const localList = await db.workout_logs.filter((l) => l.date.startsWith(bucket)).toArray();
        const m = mergeEntities(localList, remoteList);
        if (m.hasLocalChanges) {
          await db.workout_logs.bulkPut(m.merged.map(sanitizeWorkoutLog));
          hasLocalModified = true;
        }
        if (m.hasRemoteChanges) hasRemoteModified = true;
        cachedRevs[path] = bMeta.rev;
      }
    }

    // 11. 檢查 body_metrics 各年份分卷
    const remoteBodyBuckets = remoteFiles.filter(
      (f) =>
        f.path_lower.startsWith('/body/metrics/') &&
        f.name.endsWith('.json') &&
        !f.name.endsWith('manifest.json')
    );
    for (const bMeta of remoteBodyBuckets) {
      const path = bMeta.path_lower;
      if (cachedRevs[path] !== bMeta.rev) {
        const bucket = bMeta.name.replace('.json', '');
        const remoteList = (await downloadJsonFile<BodyMetric[]>(path)) || [];
        const localList = await db.body_metrics.filter((m) => m.date.startsWith(bucket)).toArray();
        const m = mergeEntities(localList, remoteList);
        if (m.hasLocalChanges) {
          await db.body_metrics.bulkPut(m.merged);
          hasLocalModified = true;
        }
        if (m.hasRemoteChanges) hasRemoteModified = true;
        cachedRevs[path] = bMeta.rev;
      }
    }

    // B. 本地增量推送 (Granular Push)
    // 1. user_base_info
    const localBaseInfo = await db.user_base_info.toArray();
    const lastBaseInfoPushed = pushedTimes['user_base_info'] || '';
    const maxBaseInfoUpdated = localBaseInfo.reduce(
      (max, i) => Math.max(max, getNormalizedTimestamp(i.updatedAt)),
      0
    );
    if (!lastBaseInfoPushed || maxBaseInfoUpdated > getNormalizedTimestamp(lastBaseInfoPushed)) {
      cachedRevs['/user/base_info.json'] = await uploadJsonFile(
        '/user/base_info.json',
        localBaseInfo.map(sanitizeUserBaseInfo),
        cachedRevs['/user/base_info.json']
      );
      pushedTimes['user_base_info'] = now;
      hasRemoteModified = true;
    }

    // 2. foods
    const localFoods = await db.foods.toArray();
    const lastFoodsPushed = pushedTimes['foods'] || '';
    const maxFoodsUpdated = localFoods.reduce(
      (max, i) => Math.max(max, getNormalizedTimestamp(i.updatedAt)),
      0
    );
    if (!lastFoodsPushed || maxFoodsUpdated > getNormalizedTimestamp(lastFoodsPushed)) {
      cachedRevs['/nutrition/foods.json'] = await uploadJsonFile(
        '/nutrition/foods.json',
        localFoods,
        cachedRevs['/nutrition/foods.json']
      );
      pushedTimes['foods'] = now;
      hasRemoteModified = true;
    }

    // 4. recipes
    const localRecipes = await db.recipes.toArray();
    const lastRecipesPushed = pushedTimes['recipes'] || '';
    const maxRecipesUpdated = localRecipes.reduce(
      (max, i) => Math.max(max, getNormalizedTimestamp(i.updatedAt)),
      0
    );
    if (!lastRecipesPushed || maxRecipesUpdated > getNormalizedTimestamp(lastRecipesPushed)) {
      cachedRevs['/nutrition/recipes.json'] = await uploadJsonFile(
        '/nutrition/recipes.json',
        localRecipes.map(sanitizeRecipe),
        cachedRevs['/nutrition/recipes.json']
      );
      pushedTimes['recipes'] = now;
      hasRemoteModified = true;
    }

    // 6. exercises
    const localExercises = await db.exercises.toArray();
    const lastExPushed = pushedTimes['exercises'] || '';
    const maxExUpdated = localExercises.reduce(
      (max, i) => Math.max(max, getNormalizedTimestamp(i.updatedAt)),
      0
    );
    if (!lastExPushed || maxExUpdated > getNormalizedTimestamp(lastExPushed)) {
      cachedRevs['/workout/exercises.json'] = await uploadJsonFile(
        '/workout/exercises.json',
        localExercises,
        cachedRevs['/workout/exercises.json']
      );
      pushedTimes['exercises'] = now;
      hasRemoteModified = true;
    }

    // 7. equipments
    const localEquipments = await db.equipments.toArray();
    const lastEqPushed = pushedTimes['equipments'] || '';
    const maxEqUpdated = localEquipments.reduce(
      (max, i) => Math.max(max, getNormalizedTimestamp(i.updatedAt)),
      0
    );
    if (!lastEqPushed || maxEqUpdated > getNormalizedTimestamp(lastEqPushed)) {
      cachedRevs['/workout/equipments.json'] = await uploadJsonFile(
        '/workout/equipments.json',
        localEquipments,
        cachedRevs['/workout/equipments.json']
      );
      pushedTimes['equipments'] = now;
      hasRemoteModified = true;
    }

    // 8. routines
    const localRoutines = await db.routines.toArray();
    const lastRoutinesPushed = pushedTimes['routines'] || '';
    const maxRoutinesUpdated = localRoutines.reduce(
      (max, i) => Math.max(max, getNormalizedTimestamp(i.updatedAt)),
      0
    );
    if (!lastRoutinesPushed || maxRoutinesUpdated > getNormalizedTimestamp(lastRoutinesPushed)) {
      cachedRevs['/workout/routines.json'] = await uploadJsonFile(
        '/workout/routines.json',
        localRoutines.map(sanitizeWorkoutRoutine),
        cachedRevs['/workout/routines.json']
      );
      pushedTimes['routines'] = now;
      hasRemoteModified = true;
    }

    // 9. daily_diet_logs 增量推送 (按日自包含膠囊 /nutrition/logs/YYYY-MM-DD.json)
    const allLocalDietLogs = await db.daily_diet_logs.toArray();
    let dietLogsChanged = false;
    const foodBucketManifestData: Record<string, BucketInfo> = {};

    for (const dLog of allLocalDietLogs) {
      const bucket = dLog.date;
      const bucketPath = `/nutrition/logs/${bucket}.json`;
      const lastPushed = pushedTimes[`diet_log_${bucket}`] || '';
      const lastCount = pushedTimes[`diet_log_${bucket}_count`];
      const maxUpdated = getNormalizedTimestamp(dLog.updatedAt);

      const isCountChanged = lastCount !== undefined && lastCount !== String(dLog.entries.length);
      const isTimeUpdated = !lastPushed || maxUpdated > getNormalizedTimestamp(lastPushed);
      const isMissingOnRemote = !cachedRevs[bucketPath];

      if (isTimeUpdated || isCountChanged || isMissingOnRemote) {
        cachedRevs[bucketPath] = await uploadJsonFile(
          bucketPath,
          sanitizeDailyDietLog(dLog),
          cachedRevs[bucketPath]
        );
        pushedTimes[`diet_log_${bucket}`] = now;
        pushedTimes[`diet_log_${bucket}_count`] = String(dLog.entries.length);
        dietLogsChanged = true;
        hasRemoteModified = true;
      }

      foodBucketManifestData[bucket] = {
        count: dLog.entries.length,
        updatedAt: maxUpdated,
      };
    }

    if (dietLogsChanged || !cachedRevs['/nutrition/logs/manifest.json']) {
      const foodManifest: BucketManifest = {
        version: 1,
        updatedAt: now,
        buckets: foodBucketManifestData,
      };
      cachedRevs['/nutrition/logs/manifest.json'] = await uploadJsonFile(
        '/nutrition/logs/manifest.json',
        foodManifest,
        cachedRevs['/nutrition/logs/manifest.json']
      );
    }

    // 10. workout_logs 增量推送 (按日分卷 YYYY-MM-DD)
    const allLocalWorkoutLogs = await db.workout_logs.toArray();
    const groupedLocalWorkoutLogs = groupWorkoutLogsByDate(allLocalWorkoutLogs);
    let workoutLogsChanged = false;
    const workoutBucketManifestData: Record<string, BucketInfo> = {};

    for (const [bucket, bLogs] of Object.entries(groupedLocalWorkoutLogs)) {
      const bucketPath = `/workout/logs/${bucket}.json`;
      const lastPushed = pushedTimes[`workout_log_${bucket}`] || '';
      const lastCount = pushedTimes[`workout_log_${bucket}_count`];
      const maxUpdated = bLogs.reduce((max, l) => Math.max(max, getNormalizedTimestamp(l.updatedAt)), 0);

      const isCountChanged = lastCount !== undefined && lastCount !== String(bLogs.length);
      const isTimeUpdated = !lastPushed || maxUpdated > getNormalizedTimestamp(lastPushed);
      const isMissingOnRemote = !cachedRevs[bucketPath];

      if (isTimeUpdated || isCountChanged || isMissingOnRemote) {
        cachedRevs[bucketPath] = await uploadJsonFile(
          bucketPath,
          bLogs.map(sanitizeWorkoutLog),
          cachedRevs[bucketPath]
        );
        pushedTimes[`workout_log_${bucket}`] = now;
        pushedTimes[`workout_log_${bucket}_count`] = String(bLogs.length);
        workoutLogsChanged = true;
        hasRemoteModified = true;
      }

      workoutBucketManifestData[bucket] = {
        count: bLogs.length,
        updatedAt: maxUpdated,
      };
    }

    if (workoutLogsChanged || !cachedRevs['/workout/logs/manifest.json']) {
      const workoutManifest: BucketManifest = {
        version: 1,
        updatedAt: now,
        buckets: workoutBucketManifestData,
      };
      cachedRevs['/workout/logs/manifest.json'] = await uploadJsonFile(
        '/workout/logs/manifest.json',
        workoutManifest,
        cachedRevs['/workout/logs/manifest.json']
      );
    }

    // 11. body_metrics 增量推送 (按日分卷 YYYY-MM-DD)
    const allLocalMetrics = await db.body_metrics.toArray();
    const groupedLocalMetrics = groupBodyMetricsByDate(allLocalMetrics);
    let bodyMetricsChanged = false;
    const bodyBucketManifestData: Record<string, BucketInfo> = {};

    for (const [bucket, bMetrics] of Object.entries(groupedLocalMetrics)) {
      const bucketPath = `/body/metrics/${bucket}.json`;
      const lastPushed = pushedTimes[`body_metric_${bucket}`] || '';
      const lastCount = pushedTimes[`body_metric_${bucket}_count`];
      const maxUpdated = bMetrics.reduce((max, m) => Math.max(max, getNormalizedTimestamp(m.updatedAt)), 0);

      const isCountChanged = lastCount !== undefined && lastCount !== String(bMetrics.length);
      const isTimeUpdated = !lastPushed || maxUpdated > getNormalizedTimestamp(lastPushed);
      const isMissingOnRemote = !cachedRevs[bucketPath];

      if (isTimeUpdated || isCountChanged || isMissingOnRemote) {
        cachedRevs[bucketPath] = await uploadJsonFile(
          bucketPath,
          bMetrics,
          cachedRevs[bucketPath]
        );
        pushedTimes[`body_metric_${bucket}`] = now;
        pushedTimes[`body_metric_${bucket}_count`] = String(bMetrics.length);
        bodyMetricsChanged = true;
        hasRemoteModified = true;
      }

      bodyBucketManifestData[bucket] = {
        count: bMetrics.length,
        updatedAt: maxUpdated,
      };
    }

    if (bodyMetricsChanged || !cachedRevs['/body/metrics/manifest.json']) {
      const bodyManifest: BucketManifest = {
        version: 1,
        updatedAt: now,
        buckets: bodyBucketManifestData,
      };
      cachedRevs['/body/metrics/manifest.json'] = await uploadJsonFile(
        '/body/metrics/manifest.json',
        bodyManifest,
        cachedRevs['/body/metrics/manifest.json']
      );
    }

    // 若有任何遠端變動，更新全域 manifest.json
    if (hasRemoteModified) {
      await uploadManifestFile(cachedRevs);
    }

    setCachedRevs(cachedRevs);
    setPushedTimes(pushedTimes);
    setLastSyncTime(now);

    if (justSyncedTimer) clearTimeout(justSyncedTimer);
    updateSyncEngineStatus({
      isSyncing: false,
      lastSyncTime: now,
      lastSyncError: null,
      justSynced: true,
    });
    justSyncedTimer = setTimeout(() => {
      updateSyncEngineStatus({ justSynced: false });
    }, 2500);

    return {
      success: true,
      timestamp: now,
      actionTaken: hasLocalModified || hasRemoteModified ? 'merged' : 'up_to_date',
    };
  } catch (error: unknown) {
    console.error('Folder sync execution error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown sync error';
    if (errMsg.includes('DROPBOX_CONFLICT')) {
      console.warn('Dropbox concurrency conflict detected! Queuing automatic re-merge...');
      hasPendingSyncRequest = true;
      pendingSyncMode = 'auto';
    }
    updateSyncEngineStatus({
      isSyncing: false,
      lastSyncError: errMsg,
      justSynced: false,
    });
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: errMsg,
      actionTaken: 'up_to_date',
    };
  } finally {
    isSyncInProgress = false;
    drainPendingQueue();
  }
}

function drainPendingQueue(): void {
  if (hasPendingSyncRequest) {
    hasPendingSyncRequest = false;
    const nextMode = pendingSyncMode;
    pendingSyncMode = 'auto';
    const jitterDelay = Math.floor(300 + Math.random() * 300);
    setTimeout(() => {
      executeSync(nextMode).catch((err) => {
        console.warn('Pending sync execution error:', err);
      });
    }, jitterDelay);
  }
}

/**
 * 安排防抖自動同步 (本地有數據變更後 3 秒自動執行局部增量推送)
 */
export function scheduleAutoSync(delayMs = 3000): void {
  if (!isDropboxConnected() || !navigator.onLine) return;

  if (autoSyncTimeout) {
    clearTimeout(autoSyncTimeout);
  }

  autoSyncTimeout = setTimeout(() => {
    executeSync('auto').catch((err) => {
      console.warn('Auto folder sync error:', err);
    });
  }, delayMs);
}
