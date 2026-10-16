import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { BodyMetric } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { triggerHaptic } from '@/lib/haptics';
import { calculateWeightTrend, calculateWeeklyChangeRate, type SmoothedWeightPoint } from '@/utils/weightMath';

export function useBodyMetrics(date: string) {
  const metricToday = useLiveQuery(
    async () => {
      const records = await db.body_metrics.where('date').equals(date).toArray();
      return records[0] || null;
    },
    [date]
  );

  const allMetrics = useLiveQuery(
    async () => {
      return await db.body_metrics.orderBy('date').toArray();
    },
    []
  );

  const recentHistory = [...(allMetrics || [])].reverse();

  // 計算平滑趨勢點
  const trendPoints: SmoothedWeightPoint[] = allMetrics ? calculateWeightTrend(allMetrics) : [];
  const currentTrendPoint = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1] : null;
  const currentTrendWeight = currentTrendPoint ? currentTrendPoint.trendWeight : null;
  const weeklyRate = calculateWeeklyChangeRate(trendPoints);

  const saveMetric = async (updates: Partial<Omit<BodyMetric, 'id' | 'date' | 'createdAt' | 'updatedAt'>>) => {
    const existing = await db.body_metrics.where('date').equals(date).first();
    const now = Date.now();

    if (existing) {
      await db.body_metrics.update(existing.id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      const newRecord: BodyMetric = {
        id: uuidv4(),
        date,
        createdAt: now,
        updatedAt: now,
        ...updates,
      };
      await db.body_metrics.add(newRecord);
    }
    triggerHaptic('success');
  };

  const deleteMetric = async (id: string) => {
    await db.body_metrics.delete(id);
    triggerHaptic('selection');
  };

  const addWater = async (amountMl: number) => {
    const currentWater = metricToday?.waterMl || 0;
    const newWater = Math.max(0, currentWater + amountMl);
    await saveMetric({ waterMl: newWater });
    triggerHaptic('selection');
  };

  return {
    metricToday,
    recentHistory,
    trendPoints,
    currentTrendWeight,
    weeklyRate,
    isLoading: metricToday === undefined,
    saveMetric,
    deleteMetric,
    addWater,
  };
}
