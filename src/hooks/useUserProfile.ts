import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { UserBaseInfo, UserProfile } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useUnitPreferences } from './useUnitPreferences';
import { calculateAgeFromBirth } from '@/utils/weightMath';
import { PRIMARY_USER_ID } from '@/services/db/defaultData';

const DEFAULT_BASE_INFO: UserBaseInfo = {
  id: PRIMARY_USER_ID,
  name: '',
  gender: 'male',
  birthDate: '',
  heightCm: 0,
  createdAt: 0,
  updatedAt: 0,
};

export function useUserProfile() {
  const { bodyWeightUnit } = useUnitPreferences();

  // 1. 讀取獨立的用戶基礎資訊（名字、性別、身高、出生日期）
  const baseInfo = useLiveQuery(async () => {
    const existing = await db.user_base_info.get(PRIMARY_USER_ID);
    return existing || DEFAULT_BASE_INFO;
  }, []);

  // 2. 動態讀取最新時序體重（從 body_metrics 取最新記錄）
  const latestWeightMetric = useLiveQuery(async () => {
    const latest = await db.body_metrics
      .orderBy('date')
      .reverse()
      .filter((m) => typeof m.weight === 'number' && m.weight > 0)
      .first();
    return latest || null;
  }, []);

  const currentWeightKg = latestWeightMetric?.weight || 0;
  const computedAge = baseInfo?.birthDate ? calculateAgeFromBirth(baseInfo.birthDate) : 0;

  // 組合為具備向後相容性的 UserProfile 視圖
  const profile: UserProfile = useMemo(() => {
    return {
      id: baseInfo?.id || PRIMARY_USER_ID,
      name: baseInfo?.name || '',
      gender: baseInfo?.gender || 'male',
      birthDate: baseInfo?.birthDate || '',
      age: computedAge,
      heightCm: baseInfo?.heightCm || 0,
      currentWeightKg,
      weightUnit: bodyWeightUnit,
      activityLevel: 1.55,
      macroSplit: {
        carbs: 40,
        protein: 30,
        fat: 30,
      },
      isSetupCompleted: Boolean(
        baseInfo?.name &&
        baseInfo.name.trim().length > 0 &&
        baseInfo?.birthDate &&
        baseInfo.birthDate.trim().length > 0 &&
        baseInfo?.heightCm &&
        baseInfo.heightCm > 0
      ),
      updatedAt: baseInfo?.updatedAt || 0,
    };
  }, [baseInfo, computedAge, currentWeightKg, bodyWeightUnit]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const now = Date.now();
    const currentBase = baseInfo || DEFAULT_BASE_INFO;

    // 更新基礎靜態資訊（姓名、性別、出生年月、身高）
    const baseUpdates: Partial<UserBaseInfo> = {};
    if (updates.name !== undefined) baseUpdates.name = updates.name;
    if (updates.gender !== undefined) baseUpdates.gender = updates.gender;
    if (updates.birthDate !== undefined) baseUpdates.birthDate = updates.birthDate;
    if (updates.heightCm !== undefined) baseUpdates.heightCm = updates.heightCm;

    if (Object.keys(baseUpdates).length > 0) {
      await db.user_base_info.put({
        ...currentBase,
        ...baseUpdates,
        updatedAt: now,
      });
    }

    // 同步更新 user_profile 表
    const profileUpdates: Partial<UserProfile> = {
      updatedAt: now,
    };
    if (updates.name !== undefined) profileUpdates.name = updates.name;
    if (updates.gender !== undefined) profileUpdates.gender = updates.gender;
    if (updates.birthDate !== undefined) profileUpdates.birthDate = updates.birthDate;
    if (updates.heightCm !== undefined) profileUpdates.heightCm = updates.heightCm;
    if (updates.currentWeightKg !== undefined) profileUpdates.currentWeightKg = updates.currentWeightKg;
    if (updates.isSetupCompleted !== undefined) profileUpdates.isSetupCompleted = updates.isSetupCompleted;

    const existingProfile = await db.user_profile.toCollection().first();
    if (existingProfile) {
      await db.user_profile.update(existingProfile.id, profileUpdates);
    }

    // 若有傳入體重變更，更新或新增至當日的 body_metrics
    if (updates.currentWeightKg !== undefined) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const existingToday = await db.body_metrics.where('date').equals(todayStr).first();
      if (existingToday) {
        await db.body_metrics.update(existingToday.id, {
          weight: updates.currentWeightKg,
          updatedAt: now,
        });
      } else {
        await db.body_metrics.add({
          id: uuidv4(),
          date: todayStr,
          weight: updates.currentWeightKg,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  };

  return {
    profile,
    baseInfo: baseInfo || DEFAULT_BASE_INFO,
    latestWeight: currentWeightKg,
    isLoading: baseInfo === undefined,
    updateProfile,
  };
}
