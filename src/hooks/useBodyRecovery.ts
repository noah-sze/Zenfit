import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import { calculateBodyRecovery, type BodyRecoverySummary } from '@/utils/recoveryMath';
import type { Exercise } from '@/types';

/**
 * 獲取本地當前日期的 YYYY-MM-DD
 */
function getLocalTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 計算指定日期的基準參考時間戳
 */
function getReferenceTimestamp(referenceDate: string): number {
  const todayStr = getLocalTodayString();
  if (referenceDate === todayStr) {
    return Date.now();
  }
  const [year, month, day] = referenceDate.split('-').map(Number);
  // 若為過去日期，取該日 23:59:59 作為基準
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/**
 * 人體肌肉恢復狀態 Hook
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
      return calculateBodyRecovery([]);
    }

    const { logs, exercises } = liveData;

    // 構建最新動作字典 Map
    const exerciseMap = new Map<string, Exercise>();
    for (const ex of exercises) {
      exerciseMap.set(ex.id, ex);
    }

    // 篩選出日期小於等於參考日期的歷史與當日記錄
    const relevantLogs = logs.filter((l) => l.date <= referenceDate);
    const refTime = getReferenceTimestamp(referenceDate);

    return calculateBodyRecovery(relevantLogs, {
      referenceTimestamp: refTime,
      exerciseMap,
    });
  }, [liveData, referenceDate]);

  return {
    recoverySummary,
    isLoading: liveData === undefined,
  };
}
