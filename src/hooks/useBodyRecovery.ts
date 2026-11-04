import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import { calculateBodyRecovery, type BodyRecoverySummary } from '@/utils/recoveryMath';
import type { Exercise } from '@/types';

/**
 * 人體肌肉恢復狀態 Hook (純粹客觀日曆天數模型 - 方案 A)
 * @param referenceDate 選定日期 (YYYY-MM-DD)
 */
export function useBodyRecovery(referenceDate: string) {
  // 查詢全部訓練記錄與動作庫 (保證 Dexie 任何異動均能即時同步觸發計算)
  const liveData = useLiveQuery(
    async () => {
      const logs = await db.workout_logs.toArray();
      const exercises = await db.exercises.toArray();
      return { logs, exercises };
    },
    [referenceDate]
  );

  const recoverySummary: BodyRecoverySummary = useMemo(() => {
    if (!liveData) {
      return calculateBodyRecovery([], { referenceDate });
    }

    const { logs, exercises } = liveData;

    // 構建最新動作字典 Map
    const exerciseMap = new Map<string, Exercise>();
    for (const ex of exercises) {
      exerciseMap.set(ex.id, ex);
    }

    // 篩選出日期小於等於參考日期的歷史與當日記錄
    const relevantLogs = logs.filter((l) => l.date <= referenceDate);

    return calculateBodyRecovery(relevantLogs, {
      referenceDate,
      exerciseMap,
    });
  }, [liveData, referenceDate]);

  return {
    recoverySummary,
    isLoading: liveData === undefined,
  };
}
