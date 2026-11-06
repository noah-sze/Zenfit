import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { Exercise } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 模組級動作記憶體注水快取 (In-Memory Hydration Cache)
 * 解決彈窗與組件掛載時等待 IndexedDB 異步查詢造成的微閃爍問題
 * 實現第 0 幀滿數據同步秒開
 */
let inMemoryExercisesCache: Exercise[] | null = null;

export function getInMemoryExercisesCache(): Exercise[] | null {
  return inMemoryExercisesCache;
}

export function setInMemoryExercisesCache(exercises: Exercise[]): void {
  inMemoryExercisesCache = exercises;
}

export function clearExercisesCache(): void {
  inMemoryExercisesCache = null;
}

/**
 * 預熱動作記憶體快取 (非阻塞非同步預熱)
 */
export async function prewarmExercisesCache(): Promise<Exercise[]> {
  if (inMemoryExercisesCache !== null) return inMemoryExercisesCache;
  try {
    if (typeof indexedDB === 'undefined') return [];
    const exercises = await db.exercises.toArray();
    inMemoryExercisesCache = exercises;
    return exercises;
  } catch {
    return [];
  }
}

export function useExercises(equipmentFilter?: string, searchQuery = '') {
  const allExercisesList = useLiveQuery(
    async () => {
      const result = await db.exercises.toArray();
      inMemoryExercisesCache = result;
      return result;
    },
    []
  );

  // 核心即時注水：若 useLiveQuery 仍在等待微任務/IPC 回調，直接同步採用記憶體快照
  const allExercises = allExercisesList ?? inMemoryExercisesCache ?? [];
  const activeExercises = allExercises.filter((item) => !item.isArchived);
  const archivedExercises = allExercises.filter((item) => item.isArchived);

  const customExercises = activeExercises.filter((item) => item.isCustom);
  const presetExercises = activeExercises.filter((item) => !item.isCustom);

  const archivedCustomExercises = archivedExercises.filter((item) => item.isCustom);
  const archivedPresetExercises = archivedExercises.filter((item) => !item.isCustom);

  // 根據搜尋與器械過濾
  const filteredActiveExercises = activeExercises.filter((item) => {
    if (equipmentFilter && equipmentFilter !== 'all') {
      if (item.equipment !== equipmentFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const addExercise = async (
    data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'isCustom' | 'isArchived'> & {
      isCustom?: boolean;
    }
  ): Promise<Exercise> => {
    const now = Date.now();
    const newEx: Exercise = {
      ...data,
      id: uuidv4(),
      isCustom: data.isCustom ?? true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.exercises.add(newEx);
    return newEx;
  };

  const updateExercise = async (
    id: string,
    updates: Partial<Omit<Exercise, 'id' | 'createdAt'>>
  ) => {
    await db.exercises.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  };

  const archiveExercise = async (id: string) => {
    await db.exercises.update(id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  };

  const unarchiveExercise = async (id: string) => {
    await db.exercises.update(id, {
      isArchived: false,
      updatedAt: Date.now(),
    });
  };

  const deleteExercise = async (
    id: string
  ): Promise<{ success: boolean; reason?: 'has_logs' | 'has_routines' | 'not_found' }> => {
    const exercise = await db.exercises.get(id);
    if (!exercise) {
      return { success: false, reason: 'not_found' };
    }

    // 檢查是否有關聯之訓練日誌
    // 檢查是否有關聯之訓練記錄（純 ID 關聯）
    const hasLogs = await db.workout_logs
      .filter((log) => log.exercises.some((ex) => ex.exerciseId === id))
      .count();

    if (hasLogs > 0) {
      return { success: false, reason: 'has_logs' };
    }

    // 檢查是否有關聯之訓練組合
    const hasRoutines = await db.routines
      .filter((r) => r.exercises.some((item) => item.exerciseId === id))
      .count();

    if (hasRoutines > 0) {
      return { success: false, reason: 'has_routines' };
    }

    await db.exercises.delete(id);
    return { success: true };
  };

  return {
    allExercises,
    activeExercises,
    filteredActiveExercises,
    archivedExercises,
    customExercises,
    presetExercises,
    archivedCustomExercises,
    archivedPresetExercises,
    // 相容性別名
    exercises: filteredActiveExercises,
    isLoading: allExercisesList === undefined && inMemoryExercisesCache === null,
    addExercise,
    updateExercise,
    archiveExercise,
    unarchiveExercise,
    deleteExercise,
  };
}
