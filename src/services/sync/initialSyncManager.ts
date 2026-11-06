import { db } from '@/services/db/db';
import type {
  FoodItem,
  FoodRecipe,
  DailyDietLog,
  DietPlan,
  Exercise,
  Equipment,
  WorkoutRoutine,
  WorkoutLog,
  BodyMetric,
  UserBaseInfo,
  UserProfile,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
  listRemoteFolder,
  downloadJsonFile,
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
import {
  commitStagingTokens,
  clearStagingTokens,
  setStagingTokens,
  exchangeCodeForTokensOnly,
  type DropboxTokens,
} from './dropboxAuth';
import {
  mergeEntities,
  uploadAllLocalData,
  setLastSyncTime,
  setCachedRevs,
  getCachedRevs,
  getPushedTimes,
  setPushedTimes,
  type SyncManifest,
} from './syncEngine';

export type InitialSyncStep =
  | 'AUTH'        // 步驟 1: 換取 Token (暫存)
  | 'STRATEGY'    // 步驟 2: 衝突策略選擇 (雙方均有資料時)
  | 'DOWNLOADING' // 步驟 3: 下載暫存至記憶體
  | 'APPLYING'    // 步驟 4: 本地原子事務寫入
  | 'COMPLETED';  // 步驟 5: 完成展示

export type SyncConflictStrategy = 'merge' | 'overwrite_local' | 'overwrite_remote';

export interface InitialSyncState {
  isOpen: boolean;
  step: InitialSyncStep;
  progressPercent: number;
  downloadedFilesCount: number;
  totalFilesCount: number;
  localCount: number;
  remoteCount: number;
  error?: string;
  isApplying: boolean;
  summary?: {
    foodsCount: number;
    exercisesCount: number;
    foodLogsCount: number;
    workoutLogsCount: number;
    bodyMetricsCount: number;
  };
}

interface StagedData {
  baseInfos: UserBaseInfo[];
  profiles: UserProfile[];
  foods: FoodItem[];
  recipes: FoodRecipe[];
  dailyDietLogs: DailyDietLog[];
  exercises: Exercise[];
  equipments: Equipment[];
  routines: WorkoutRoutine[];
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  revs: Record<string, string>;
}

interface InitialSyncStaging {
  tokens: DropboxTokens | null;
  remoteManifest: SyncManifest | null;
  remoteFiles: DropboxFileMetadata[];
  strategy: SyncConflictStrategy | null;
  downloaded: StagedData;
}

let staging: InitialSyncStaging = {
  tokens: null,
  remoteManifest: null,
  remoteFiles: [],
  strategy: null,
  downloaded: {
    baseInfos: [],
    profiles: [],
    foods: [],
    recipes: [],
    dailyDietLogs: [],
    exercises: [],
    equipments: [],
    routines: [],
    workoutLogs: [],
    bodyMetrics: [],
    revs: {},
  },
};

let currentState: InitialSyncState = {
  isOpen: false,
  step: 'AUTH',
  progressPercent: 0,
  downloadedFilesCount: 0,
  totalFilesCount: 0,
  localCount: 0,
  remoteCount: 0,
  isApplying: false,
};

type StateListener = (state: InitialSyncState) => void;
const listeners = new Set<StateListener>();

function emitState(nextState: Partial<InitialSyncState>) {
  currentState = { ...currentState, ...nextState };
  listeners.forEach((listener) => listener(currentState));
}

export function subscribeInitialSyncState(listener: StateListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export function getInitialSyncState(): InitialSyncState {
  return currentState;
}

/**
 * 啟動首次同步流程
 */
export async function startInitialSync(code: string): Promise<void> {
  staging = {
    tokens: null,
    remoteManifest: null,
    remoteFiles: [],
    strategy: null,
    downloaded: {
      baseInfos: [],
      profiles: [],
      foods: [],
      recipes: [],
      dailyDietLogs: [],
      exercises: [],
      equipments: [],
      routines: [],
      workoutLogs: [],
      bodyMetrics: [],
      revs: {},
    },
  };

  emitState({
    isOpen: true,
    step: 'AUTH',
    progressPercent: 15,
    downloadedFilesCount: 0,
    totalFilesCount: 0,
    localCount: 0,
    remoteCount: 0,
    error: undefined,
    isApplying: false,
    summary: undefined,
  });

  try {
    // 步驟 1: 僅換取 Token 憑證，絕不持久化至 localStorage
    const tokens = await exchangeCodeForTokensOnly(code);
    staging.tokens = tokens;
    setStagingTokens(tokens);

    emitState({ progressPercent: 30 });

    // 步驟 2: 檢查遠端 Manifest 與資料總量
    await inspectRemote();
  } catch (err: unknown) {
    console.error('Initial sync auth failed:', err);
    emitState({
      error: err instanceof Error ? err.message : 'Authentication failed',
      progressPercent: 0,
    });
  }
}

/**
 * 檢查遠端檔案清單與記錄筆數
 */
async function inspectRemote(): Promise<void> {
  try {
    const [localDietLogs, localWorkoutLogs, localMetrics] = await Promise.all([
      db.daily_diet_logs.count(),
      db.workout_logs.count(),
      db.body_metrics.count(),
    ]);
    const localCount = localDietLogs + localWorkoutLogs + localMetrics;

    const remoteFiles = await listRemoteFolder();
    staging.remoteFiles = remoteFiles;

    const manifestMeta = remoteFiles.find((f) => f.path_lower === '/manifest.json');
    let remoteManifest: SyncManifest | null = null;
    let remoteCount = 0;

    if (manifestMeta) {
      remoteManifest = await downloadJsonFile<SyncManifest>('/manifest.json');
      staging.remoteManifest = remoteManifest;
      if (remoteManifest?.stats) {
        remoteCount =
          (remoteManifest.stats.dailyDietLogsCount ?? remoteManifest.stats.foodLogsCount ?? 0) +
          (remoteManifest.stats.workoutLogsCount || 0) +
          (remoteManifest.stats.bodyMetricsCount || 0);
      }
    } else {
      // 算遠端 json 檔案數量作為簡易粗估
      remoteCount = remoteFiles.filter((f) => f.name.endsWith('.json')).length;
    }

    emitState({
      localCount,
      remoteCount,
      progressPercent: 45,
    });

    // 判定衝突策略
    await determineStrategy(localCount, remoteCount);
  } catch (err: unknown) {
    console.error('Inspect remote failed:', err);
    emitState({
      error: err instanceof Error ? err.message : 'Failed to inspect remote data',
    });
  }
}

/**
 * 判定資料衝突策略 (若一方為空則自動進入下載/上傳，兩方均有則展示選擇介面)
 */
async function determineStrategy(localCount: number, remoteCount: number): Promise<void> {
  if (localCount > 0 && remoteCount > 0) {
    emitState({
      step: 'STRATEGY',
      progressPercent: 50,
      error: undefined,
    });
    return;
  }

  if (remoteCount === 0) {
    // 雲端無資料（初次備份上傳），自動覆蓋雲端
    await selectStrategy('overwrite_remote');
    return;
  }

  // 本地無資料（全新設備換機），自動覆蓋本地
  await selectStrategy('overwrite_local');
}

/**
 * 使用者或系統選擇同步策略並執行後續下載與寫入
 */
export async function selectStrategy(strategy: SyncConflictStrategy): Promise<void> {
  staging.strategy = strategy;

  if (strategy === 'overwrite_remote') {
    await executeAtomicCommit();
    return;
  }

  await executeDownloadQueue();
}

/**
 * 執行下載佇列：將遠端所有模組下載至記憶體暫存
 */
async function executeDownloadQueue(): Promise<void> {
  emitState({
    step: 'DOWNLOADING',
    progressPercent: 55,
    downloadedFilesCount: 0,
    totalFilesCount: 0,
    error: undefined,
  });

  const remoteFiles = staging.remoteFiles;
  const jsonFiles = remoteFiles.filter(
    (f) => f.name.endsWith('.json') && !f.name.endsWith('manifest.json')
  );

  if (jsonFiles.length === 0) {
    await executeAtomicCommit();
    return;
  }

  const total = jsonFiles.length;
  let downloadedCount = 0;

  emitState({
    totalFilesCount: total,
    downloadedFilesCount: 0,
  });

  const staged = staging.downloaded;

  try {
    for (const file of jsonFiles) {
      const path = file.path_lower;

      if (path === '/user/base_info.json') {
        const data = await downloadJsonFile<UserBaseInfo[]>(path);
        if (data) staged.baseInfos.push(...data.map(sanitizeUserBaseInfo));
      } else if (path === '/user/profile.json') {
        const data = await downloadJsonFile<UserProfile[]>(path);
        if (data) staged.profiles.push(...data);
      } else if (path === '/nutrition/foods.json') {
        const data = await downloadJsonFile<FoodItem[]>(path);
        if (data) staged.foods.push(...data);
      } else if (path === '/nutrition/recipes.json') {
        const data = await downloadJsonFile<FoodRecipe[]>(path);
        if (data) staged.recipes.push(...data.map(sanitizeRecipe));
      } else if (path.startsWith('/nutrition/logs/')) {
        const raw = await downloadJsonFile<any>(path);
        if (raw) {
          if (Array.isArray(raw)) {
            if (raw.length > 0 && 'entries' in raw[0]) {
              staged.dailyDietLogs.push(...raw.map(sanitizeDailyDietLog));
            } else {
              // 舊版 FoodLog[] 平鋪結構向下相容
              const dateStr = path.replace('/nutrition/logs/', '').replace('.json', '');
              staged.dailyDietLogs.push({
                id: uuidv4(),
                date: dateStr,
                meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
                entries: raw.map(sanitizeFoodLog),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
          } else if (raw && 'entries' in raw) {
            staged.dailyDietLogs.push(sanitizeDailyDietLog(raw));
          }
        }
      } else if (path === '/nutrition/diet_plans.json') {
        // 舊版遠端 diet_plans 檔案向下相容吸收進日誌頭部
        const legacyPlans = (await downloadJsonFile<DietPlan[]>(path)) || [];
        for (const plan of legacyPlans) {
          if (!plan.date) continue;
          const target = staged.dailyDietLogs.find((d) => d.date === plan.date);
          if (target) {
            target.meta = {
              activityLevel: plan.activityLevel ?? target.meta.activityLevel,
              macroSplit: plan.macroSplit ?? target.meta.macroSplit,
            };
          }
        }
      } else if (path === '/workout/exercises.json') {
        const data = await downloadJsonFile<Exercise[]>(path);
        if (data) staged.exercises.push(...data);
      } else if (path === '/workout/equipments.json') {
        const data = await downloadJsonFile<Equipment[]>(path);
        if (data) staged.equipments.push(...data);
      } else if (path === '/workout/routines.json') {
        const data = await downloadJsonFile<WorkoutRoutine[]>(path);
        if (data) staged.routines.push(...data.map(sanitizeWorkoutRoutine));
      } else if (path.startsWith('/workout/logs/')) {
        const data = await downloadJsonFile<WorkoutLog[]>(path);
        if (data) staged.workoutLogs.push(...data.map(sanitizeWorkoutLog));
      } else if (path.startsWith('/body/metrics/')) {
        const data = await downloadJsonFile<BodyMetric[]>(path);
        if (data) staged.bodyMetrics.push(...data);
      }

      staged.revs[path] = file.rev;
      downloadedCount++;

      const percent = Math.min(85, 55 + Math.round((downloadedCount / total) * 30));
      emitState({
        downloadedFilesCount: downloadedCount,
        progressPercent: percent,
      });
    }

    await executeAtomicCommit();
  } catch (err: unknown) {
    console.error('Download queue error:', err);
    emitState({
      error: err instanceof Error ? err.message : 'Download error',
    });
  }
}

/**
 * 執行原子級本地寫入並最終持久化 Token
 */
async function executeAtomicCommit(): Promise<void> {
  emitState({
    step: 'APPLYING',
    isApplying: true,
    progressPercent: 90,
    error: undefined,
  });

  const strategy = staging.strategy || 'merge';
  const staged = staging.downloaded;
  const now = new Date().toISOString();

  try {
    if (strategy === 'overwrite_remote') {
      const cachedRevs = getCachedRevs();
      const pushedTimes = getPushedTimes();
      await uploadAllLocalData(now, cachedRevs, pushedTimes);
      setCachedRevs(cachedRevs);
      setPushedTimes(pushedTimes);
    } else if (strategy === 'overwrite_local') {
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

          if (staged.baseInfos.length) await db.user_base_info.bulkPut(staged.baseInfos);
          if (staged.profiles.length) await db.user_profile.bulkPut(staged.profiles);
          if (staged.foods.length) await db.foods.bulkPut(staged.foods);
          if (staged.recipes.length) await db.recipes.bulkPut(staged.recipes);
          if (staged.dailyDietLogs.length) await db.daily_diet_logs.bulkPut(staged.dailyDietLogs);
          if (staged.exercises.length) await db.exercises.bulkPut(staged.exercises);
          if (staged.equipments.length) await db.equipments.bulkPut(staged.equipments);
          if (staged.routines.length) await db.routines.bulkPut(staged.routines);
          if (staged.workoutLogs.length) await db.workout_logs.bulkPut(staged.workoutLogs);
          if (staged.bodyMetrics.length) await db.body_metrics.bulkPut(staged.bodyMetrics);
        }
      );
      setCachedRevs(staged.revs);
    } else {
      // 合併 (merge)
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
          const [
            localBaseInfos,
            localProfiles,
            localFoods,
            localRecipes,
            localDietLogs,
            localExercises,
            localEquipments,
            localRoutines,
            localWorkoutLogs,
            localMetrics,
          ] = await Promise.all([
            db.user_base_info.toArray(),
            db.user_profile.toArray(),
            db.foods.toArray(),
            db.recipes.toArray(),
            db.daily_diet_logs.toArray(),
            db.exercises.toArray(),
            db.equipments.toArray(),
            db.routines.toArray(),
            db.workout_logs.toArray(),
            db.body_metrics.toArray(),
          ]);

          const mBase = mergeEntities(localBaseInfos, staged.baseInfos);
          const mProf = mergeEntities(localProfiles, staged.profiles);
          const mFood = mergeEntities(localFoods, staged.foods);
          const mRecipe = mergeEntities(localRecipes, staged.recipes);
          const mDiet = mergeEntities(localDietLogs, staged.dailyDietLogs);
          const mEx = mergeEntities(localExercises, staged.exercises);
          const mEq = mergeEntities(localEquipments, staged.equipments);
          const mRoutine = mergeEntities(localRoutines, staged.routines);
          const mWLogs = mergeEntities(localWorkoutLogs, staged.workoutLogs);
          const mMetrics = mergeEntities(localMetrics, staged.bodyMetrics);

          if (mBase.merged.length) await db.user_base_info.bulkPut(mBase.merged);
          if (mProf.merged.length) await db.user_profile.bulkPut(mProf.merged);
          if (mFood.merged.length) await db.foods.bulkPut(mFood.merged);
          if (mRecipe.merged.length) await db.recipes.bulkPut(mRecipe.merged);
          if (mDiet.merged.length) await db.daily_diet_logs.bulkPut(mDiet.merged);
          if (mEx.merged.length) await db.exercises.bulkPut(mEx.merged);
          if (mEq.merged.length) await db.equipments.bulkPut(mEq.merged);
          if (mRoutine.merged.length) await db.routines.bulkPut(mRoutine.merged);
          if (mWLogs.merged.length) await db.workout_logs.bulkPut(mWLogs.merged);
          if (mMetrics.merged.length) await db.body_metrics.bulkPut(mMetrics.merged);
        }
      );

      // 合併後上傳全量數據確保雲端與本機雙向一致
      const cachedRevs = { ...getCachedRevs(), ...staged.revs };
      const pushedTimes = getPushedTimes();
      await uploadAllLocalData(now, cachedRevs, pushedTimes);
      setCachedRevs(cachedRevs);
      setPushedTimes(pushedTimes);
    }

    // 成功後將 Token 正式提交持久化！
    commitStagingTokens();
    setLastSyncTime(now);

    const [foodsCount, exercisesCount, foodLogsCount, workoutLogsCount, bodyMetricsCount] =
      await Promise.all([
        db.foods.count(),
        db.exercises.count(),
        db.daily_diet_logs.count(),
        db.workout_logs.count(),
        db.body_metrics.count(),
      ]);

    emitState({
      step: 'COMPLETED',
      isApplying: false,
      progressPercent: 100,
      summary: {
        foodsCount,
        exercisesCount,
        foodLogsCount,
        workoutLogsCount,
        bodyMetricsCount,
      },
    });
  } catch (err: unknown) {
    console.error('Commit failed:', err);
    clearStagingTokens();
    emitState({
      isApplying: false,
      error: err instanceof Error ? err.message : 'Database commit failed',
    });
  }
}

/**
 * 取消首次同步：抹除所有暫存 Token 與下載資料，完全回滾乾淨
 */
export function cancelInitialSync(): void {
  clearStagingTokens();
  staging = {
    tokens: null,
    remoteManifest: null,
    remoteFiles: [],
    strategy: null,
    downloaded: {
      baseInfos: [],
      profiles: [],
      foods: [],
      recipes: [],
      dailyDietLogs: [],
      exercises: [],
      equipments: [],
      routines: [],
      workoutLogs: [],
      bodyMetrics: [],
      revs: {},
    },
  };

  emitState({
    isOpen: false,
    step: 'AUTH',
    progressPercent: 0,
    downloadedFilesCount: 0,
    totalFilesCount: 0,
    error: undefined,
    isApplying: false,
    summary: undefined,
  });
}

/**
 * 關閉已完成的首次同步彈窗
 */
export function closeInitialSyncModal(): void {
  emitState({
    isOpen: false,
    step: 'AUTH',
    progressPercent: 0,
    error: undefined,
    isApplying: false,
    summary: undefined,
  });
}
