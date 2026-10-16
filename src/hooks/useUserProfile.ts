import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { UserProfile } from '@/types';

const DEFAULT_PROFILE_ID = 'default-user-profile';

const DEFAULT_PROFILE: UserProfile = {
  id: DEFAULT_PROFILE_ID,
  name: 'Noah',
  gender: 'male',
  age: 25,
  heightCm: 175,
  currentWeightKg: 70,
  activityLevel: 1.55,
  goalType: 'lose_fat',
  dailyCaloriesTarget: 2000,
  proteinGramsTarget: 125,
  carbsGramsTarget: 250,
  fatGramsTarget: 56,
  dailyWaterMlTarget: 2500,
  macroSplit: {
    carbs: 50,
    protein: 25,
    fat: 25,
  },
  weightUnit: 'kg',
  isSetupCompleted: true,
  updatedAt: Date.now(),
};

export function useUserProfile() {
  const profile = useLiveQuery(async () => {
    const existing = await db.user_profile.get(DEFAULT_PROFILE_ID);
    return existing || DEFAULT_PROFILE;
  }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const current = profile || DEFAULT_PROFILE;
    const updated: UserProfile = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };
    await db.user_profile.put(updated);
  };

  return {
    profile: profile || DEFAULT_PROFILE,
    isLoading: profile === undefined,
    updateProfile,
  };
}
