import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { DietPlan, HydratedDietPlan, MacroSplit, UserProfile, DailyDietLog } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PRIMARY_USER_ID, DEFAULT_USER_PROFILE_ID } from '@/services/db/defaultData';
import { triggerHaptic } from '@/lib/haptics';
import { format } from 'date-fns';
import {
  calculateBMR,
  calculateTDEE,
  calculateMacrosFromSplit,
  calculateAgeFromBirth,
} from '@/utils/weightMath';

export interface UseDietPlanResult {
  plan: HydratedDietPlan;
  isCustomPlan: boolean;
  isToday: boolean;
  isLoading: boolean;
  activityLevel: number;
  macroSplit: MacroSplit;
  saveDietPlan: (updates: Partial<Omit<DietPlan, 'id' | 'date' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export const DEFAULT_ACTIVITY_LEVEL = 1.55;
export const DEFAULT_MACRO_SPLIT: MacroSplit = { carbs: 40, protein: 30, fat: 30 };

/**
 * 確保特定日期的飲食生理環境 (DailyDietMeta) 顯式存在於日誌頭部
 * 依據前序日誌或 Profile 繼承活動係數與供能比
 */
export async function ensureDailyDietMeta(targetDate: string): Promise<DietPlan> {
  const existing = await db.daily_diet_logs.where('date').equals(targetDate).first();
  if (existing?.meta) {
    return {
      id: existing.id,
      date: targetDate,
      activityLevel: existing.meta.activityLevel,
      macroSplit: existing.meta.macroSplit,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
  }

  const previous = await db.daily_diet_logs
    .where('date')
    .below(targetDate)
    .reverse()
    .sortBy('date');
  const inherited = previous[0];

  const profile = (await db.user_profile.get(DEFAULT_USER_PROFILE_ID)) || (await db.user_profile.toCollection().first());

  const resolvedActivity =
    inherited?.meta?.activityLevel ??
    profile?.activityLevel ??
    DEFAULT_ACTIVITY_LEVEL;

  const resolvedSplit: MacroSplit =
    inherited?.meta?.macroSplit ??
    profile?.macroSplit ??
    DEFAULT_MACRO_SPLIT;

  const now = Date.now();
  return {
    id: uuidv4(),
    date: targetDate,
    activityLevel: resolvedActivity,
    macroSplit: resolvedSplit,
    createdAt: now,
    updatedAt: now,
  };
}

export function useDietPlan(date: string): UseDietPlanResult {
  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = date === today;

  const queryResult = useLiveQuery(
    async () => {
      // 1. 優先查當天專屬 DailyDietLog 之日誌頭部 (meta)
      const exact = await db.daily_diet_logs.where('date').equals(date).first();

      // 2. 若當天無專屬日誌頭部，查詢 date 之前手動設定的最新一筆有效記錄 (向後沿用規則)
      const previous = await db.daily_diet_logs
        .where('date')
        .below(date)
        .reverse()
        .sortBy('date');
      const inherited = previous[0];

      // 3. 查詢全域 Profile 與最新體態數據作為客觀計算錨點
      const baseInfo = await db.user_base_info.get(PRIMARY_USER_ID) || (await db.user_base_info.toCollection().first());
      const profile = await db.user_profile.get(DEFAULT_USER_PROFILE_ID) || (await db.user_profile.toCollection().first());
      const latestBodyMetric = await db.body_metrics.orderBy('date').reverse().first();

      // 解析唯一的真理源輸入 (Single Source of Truth)
      const resolvedActivity =
        exact?.meta?.activityLevel ??
        inherited?.meta?.activityLevel ??
        profile?.activityLevel ??
        DEFAULT_ACTIVITY_LEVEL;

      const resolvedSplit: MacroSplit =
        exact?.meta?.macroSplit ??
        inherited?.meta?.macroSplit ??
        profile?.macroSplit ??
        DEFAULT_MACRO_SPLIT;

      // 取得客觀身體常數
      const weightKg = latestBodyMetric?.weight || profile?.currentWeightKg || 70;
      const heightCm = profile?.heightCm || baseInfo?.heightCm || 175;
      const gender = profile?.gender || baseInfo?.gender || 'male';
      const age = profile?.birthDate
        ? calculateAgeFromBirth(profile.birthDate)
        : profile?.age || 25;

      // 純函數即時動態推算：BMR ➔ TDEE (caloriesTarget) ➔ Macro Grams
      const bmr = calculateBMR(weightKg, heightCm, gender, age);
      const computedCalories = bmr > 0 && resolvedActivity > 0
        ? calculateTDEE(bmr, resolvedActivity)
        : 2000;

      const computedMacros = calculateMacrosFromSplit(
        computedCalories,
        resolvedSplit.carbs,
        resolvedSplit.protein,
        resolvedSplit.fat
      );

      const syntheticPlan: HydratedDietPlan = {
        id: exact?.id || `inherited-${date}`,
        date,
        activityLevel: resolvedActivity,
        macroSplit: resolvedSplit,
        caloriesTarget: computedCalories,
        proteinTarget: computedMacros.proteinGrams,
        carbsTarget: computedMacros.carbsGrams,
        fatTarget: computedMacros.fatGrams,
        createdAt: exact?.createdAt || 0,
        updatedAt: exact?.updatedAt || 0,
      };

      return {
        plan: syntheticPlan,
        isCustomPlan: !!exact?.meta,
      };
    },
    [date]
  );

  const fallbackPlan: HydratedDietPlan = {
    id: `default-${date}`,
    date,
    activityLevel: DEFAULT_ACTIVITY_LEVEL,
    macroSplit: DEFAULT_MACRO_SPLIT,
    caloriesTarget: 2000,
    proteinTarget: 140,
    carbsTarget: 220,
    fatTarget: 60,
    createdAt: 0,
    updatedAt: 0,
  };

  const plan = queryResult?.plan || fallbackPlan;
  const activityLevel = plan.activityLevel;
  const macroSplit = plan.macroSplit;

  const saveDietPlan = async (
    updates: Partial<Omit<DietPlan, 'id' | 'date' | 'createdAt' | 'updatedAt'>>
  ) => {
    const now = Date.now();
    const existing = await db.daily_diet_logs.where('date').equals(date).first();

    const newMeta = {
      activityLevel: updates.activityLevel ?? existing?.meta?.activityLevel ?? activityLevel,
      macroSplit: updates.macroSplit ?? existing?.meta?.macroSplit ?? macroSplit,
    };

    if (existing) {
      existing.meta = newMeta;
      existing.updatedAt = now;
      await db.daily_diet_logs.put(existing);
    } else {
      const newDailyLog: DailyDietLog = {
        id: uuidv4(),
        date,
        meta: newMeta,
        entries: [],
        createdAt: now,
        updatedAt: now,
      };
      await db.daily_diet_logs.put(newDailyLog);
    }

    // 契約落地：如果是修改今天，那麼後續都會沿用該設置，直到手動修改
    // 透過同步更新全局 Profile 的真理源屬性，使今天之後未單獨覆蓋的未來日期自動沿用最新設置
    if (isToday) {
      const profileUpdates: Partial<UserProfile> = {
        updatedAt: now,
      };
      if (updates.activityLevel !== undefined) {
        profileUpdates.activityLevel = updates.activityLevel;
      }
      if (updates.macroSplit !== undefined) {
        profileUpdates.macroSplit = updates.macroSplit;
      }

      const existingProfile = (await db.user_profile.get(DEFAULT_USER_PROFILE_ID)) || (await db.user_profile.toCollection().first());
      if (existingProfile) {
        await db.user_profile.update(existingProfile.id, profileUpdates);
      }
    }

    triggerHaptic('success');
  };

  const resetToDefault = async () => {
    const existing = await db.daily_diet_logs.where('date').equals(date).first();
    if (existing) {
      if (existing.entries.length === 0) {
        await db.daily_diet_logs.delete(existing.id);
      } else {
        existing.meta = {
          activityLevel: DEFAULT_ACTIVITY_LEVEL,
          macroSplit: DEFAULT_MACRO_SPLIT,
        };
        existing.updatedAt = Date.now();
        await db.daily_diet_logs.put(existing);
      }
      triggerHaptic('selection');
    }
  };

  return {
    plan,
    isCustomPlan: queryResult?.isCustomPlan ?? false,
    isToday,
    isLoading: queryResult === undefined,
    activityLevel,
    macroSplit,
    saveDietPlan,
    resetToDefault,
  };
}
