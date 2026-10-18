import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { UserBaseInfo, UserProfile } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const PRIMARY_USER_ID = 'primary_user';

const DEFAULT_BASE_INFO: UserBaseInfo = {
  id: PRIMARY_USER_ID,
  name: 'Noah',
  gender: 'male',
  birthDate: '1999-01',
  heightCm: 175,
  weightUnit: 'kg',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export function useUserProfile() {
  // 1. 讀取獨立的用戶基礎資訊（名字、性別、身高、出生日期）
  const baseInfo = useLiveQuery(async () => {
    const existing = await db.user_base_info.get(PRIMARY_USER_ID);
    return existing || DEFAULT_BASE_INFO;
  }, []);

  // 2. 動態讀取最新時序體重（從 body_metrics 取最新記錄）
  const latestWeightMetric = useLiveQuery(async () => {
    const latest = await db.body_metrics
      .filter((m) => typeof m.weight === 'number' && m.weight > 0)
      .reverse()
      .sortBy('date');
    return latest.length > 0 ? latest[latest.length - 1] : null;
  }, []);

  const currentWeightKg = latestWeightMetric?.weight || 70;

  // 組合為具備向後相容性的 UserProfile 視圖
  const profile: UserProfile = {
    id: baseInfo?.id || PRIMARY_USER_ID,
    name: baseInfo?.name || 'Noah',
    gender: baseInfo?.gender || 'male',
    birthDate: baseInfo?.birthDate || '1999-01',
    age: 25,
    heightCm: baseInfo?.heightCm || 175,
    currentWeightKg,
    weightUnit: baseInfo?.weightUnit || 'kg',
    activityLevel: 1.55,
    dailyCaloriesTarget: 2000,
    proteinGramsTarget: 140,
    carbsGramsTarget: 220,
    fatGramsTarget: 60,
    dailyWaterMlTarget: 2500,
    macroSplit: {
      carbs: 40,
      protein: 30,
      fat: 30,
    },
    isSetupCompleted: true,
    updatedAt: baseInfo?.updatedAt || Date.now(),
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const now = Date.now();
    const currentBase = baseInfo || DEFAULT_BASE_INFO;

    // 更新基礎靜態資訊（姓名、性別、出生年月、身高、度量單位）
    const baseUpdates: Partial<UserBaseInfo> = {};
    if (updates.name !== undefined) baseUpdates.name = updates.name;
    if (updates.gender !== undefined) baseUpdates.gender = updates.gender;
    if (updates.birthDate !== undefined) baseUpdates.birthDate = updates.birthDate;
    if (updates.heightCm !== undefined) baseUpdates.heightCm = updates.heightCm;
    if (updates.weightUnit !== undefined) baseUpdates.weightUnit = updates.weightUnit;

    if (Object.keys(baseUpdates).length > 0) {
      await db.user_base_info.put({
        ...currentBase,
        ...baseUpdates,
        updatedAt: now,
      });
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
