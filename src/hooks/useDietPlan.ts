import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { DietPlan } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { triggerHaptic } from '@/lib/haptics';

export interface UseDietPlanResult {
  plan: DietPlan;
  isCustomPlan: boolean;
  isLoading: boolean;
  saveDietPlan: (updates: Partial<Omit<DietPlan, 'id' | 'date' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const DEFAULT_DIET_PLAN: Omit<DietPlan, 'id' | 'date' | 'createdAt' | 'updatedAt'> = {
  planName: '標準目標',
  caloriesTarget: 2000,
  proteinTarget: 140,
  carbsTarget: 220,
  fatTarget: 60,
  waterMlTarget: 2500,
};

export function useDietPlan(date: string): UseDietPlanResult {
  const customPlan = useLiveQuery(
    async () => {
      const records = await db.diet_plans.where('date').equals(date).toArray();
      return records[0] || null;
    },
    [date]
  );

  const isCustomPlan = customPlan !== null && customPlan !== undefined;

  const currentPlan: DietPlan = customPlan || {
    id: `default-${date}`,
    date,
    ...DEFAULT_DIET_PLAN,
    createdAt: 0,
    updatedAt: 0,
  };

  const saveDietPlan = async (
    updates: Partial<Omit<DietPlan, 'id' | 'date' | 'createdAt' | 'updatedAt'>>
  ) => {
    const existing = await db.diet_plans.where('date').equals(date).first();
    const now = Date.now();

    if (existing) {
      await db.diet_plans.update(existing.id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      const newPlan: DietPlan = {
        id: uuidv4(),
        date,
        planName: updates.planName || DEFAULT_DIET_PLAN.planName,
        caloriesTarget: updates.caloriesTarget ?? DEFAULT_DIET_PLAN.caloriesTarget,
        proteinTarget: updates.proteinTarget ?? DEFAULT_DIET_PLAN.proteinTarget,
        carbsTarget: updates.carbsTarget ?? DEFAULT_DIET_PLAN.carbsTarget,
        fatTarget: updates.fatTarget ?? DEFAULT_DIET_PLAN.fatTarget,
        waterMlTarget: updates.waterMlTarget ?? DEFAULT_DIET_PLAN.waterMlTarget,
        notes: updates.notes,
        createdAt: now,
        updatedAt: now,
      };
      await db.diet_plans.add(newPlan);
    }
    triggerHaptic('success');
  };

  const resetToDefault = async () => {
    const existing = await db.diet_plans.where('date').equals(date).first();
    if (existing) {
      await db.diet_plans.delete(existing.id);
      triggerHaptic('selection');
    }
  };

  return {
    plan: currentPlan,
    isCustomPlan,
    isLoading: customPlan === undefined,
    saveDietPlan,
    resetToDefault,
  };
}
