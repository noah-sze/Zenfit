import type { FoodItem, FoodRecipe } from '@/types';
import type { ZenfitDatabase } from './db';
import { clearDropboxTokens } from '@/services/sync/dropboxAuth';
import { clearFoodsCache } from '@/hooks/useFoods';
import { clearRecipesCache } from '@/hooks/useRecipes';
import { clearExercisesCache } from '@/hooks/useExercises';
import { NATURAL_FOOD_IDS, DEFAULT_NATURAL_FOODS } from './defaultNaturalFoods';
import { DEFAULT_EQUIPMENT_IDS, DEFAULT_EQUIPMENTS } from './defaultEquipments';
import { DEFAULT_EXERCISE_IDS, DEFAULT_EXERCISES } from './defaultExercises';

export { DEFAULT_EQUIPMENT_IDS, DEFAULT_EQUIPMENTS };
export { DEFAULT_EXERCISE_IDS, DEFAULT_EXERCISES };

// ============================================================================
// 系統預設實體確定性靜態 UUID (Deterministic Static UUIDs)
// 確保多設備分散式同步與初次種子初始化時 ID 始終恆定一致，杜絕分叉與重複
// ============================================================================

export const PRIMARY_USER_ID = '2848673b-dd09-4d1c-893a-bc501b79122a';
export const DEFAULT_USER_PROFILE_ID = '36789f9a-551b-4b58-9984-dd26b50a2e71';

export const DEFAULT_FOOD_IDS = {
  chicken_breast: '11504467-3117-4122-97c6-305bb10ff4dc',
  whole_egg: 'f57cb780-a0b1-4d41-bb80-8750fd9361cc',
  white_rice: 'a8edd570-19e9-4866-9103-35dae800e958',
  sweet_potato: '1193d479-e382-41e7-9ecb-895b3b18da42',
  whey_protein: '9ff121e5-ff94-4bdf-9012-fe7466eb957f',
  rolled_oats: 'a0bf9893-0f2d-45d7-83db-dd029d3f4b18',
  beef_flank: '1d8c099f-5c03-4ada-8171-73be97f57198',
  greek_yogurt: '98717b75-f935-46d7-9c8a-3c0bdc0df251',
  salmon: '325c20fb-b4b2-49ce-b91f-ea2044401a42',
  soy_milk: '6bdcc9bd-6e4b-40f7-b772-113e38ee556d',
  tomato: '53aef1a1-7d50-4655-924c-aa544ef76558',
  cooking_oil: '182261b5-6e77-4f51-9cdd-4a2b3c5ab785',
  black_pepper: 'f564160e-46af-4a25-aaad-3c8fe8cf9710',
  ...NATURAL_FOOD_IDS,
} as const;

export const DEFAULT_RECIPE_IDS = {
  tomato_egg: '4156a9b9-5fa1-4a7e-bda3-fa373bdd51b2',
  oat_bowl: '4fb4b671-6bd5-4446-b556-8f3cd456c191',
  chicken_rice_box: 'd6f594b7-9379-463b-9b86-894dd72279f0',
} as const;

// 歷史 slug ID 至標準確定性 UUID 映射字典
export const LEGACY_ID_TO_UUID_MAP: Record<string, string> = {
  // Foods
  food_chicken_breast: DEFAULT_FOOD_IDS.chicken_breast,
  food_whole_egg: DEFAULT_FOOD_IDS.whole_egg,
  food_white_rice: DEFAULT_FOOD_IDS.white_rice,
  food_sweet_potato: DEFAULT_FOOD_IDS.sweet_potato,
  food_whey_protein: DEFAULT_FOOD_IDS.whey_protein,
  food_rolled_oats: DEFAULT_FOOD_IDS.rolled_oats,
  food_beef_flank: DEFAULT_FOOD_IDS.beef_flank,
  food_greek_yogurt: DEFAULT_FOOD_IDS.greek_yogurt,
  food_salmon: DEFAULT_FOOD_IDS.salmon,
  food_soy_milk: DEFAULT_FOOD_IDS.soy_milk,
  food_tomato: DEFAULT_FOOD_IDS.tomato,
  food_cooking_oil: DEFAULT_FOOD_IDS.cooking_oil,
  food_black_pepper: DEFAULT_FOOD_IDS.black_pepper,

  // Recipes
  recipe_tomato_egg: DEFAULT_RECIPE_IDS.tomato_egg,
  recipe_oat_bowl: DEFAULT_RECIPE_IDS.oat_bowl,
  recipe_chicken_rice_box: DEFAULT_RECIPE_IDS.chicken_rice_box,

  // Equipments
  barbell: DEFAULT_EQUIPMENT_IDS.barbell,
  dumbbell: DEFAULT_EQUIPMENT_IDS.dumbbell,
  kettlebell: DEFAULT_EQUIPMENT_IDS.kettlebell,
  specialty_bar: DEFAULT_EQUIPMENT_IDS.specialty_bar,
  cable: DEFAULT_EQUIPMENT_IDS.cable,
  pin_loaded_machine: DEFAULT_EQUIPMENT_IDS.pin_loaded_machine,
  plate_loaded_machine: DEFAULT_EQUIPMENT_IDS.plate_loaded_machine,
  smith_machine: DEFAULT_EQUIPMENT_IDS.smith_machine,
  leg_press: DEFAULT_EQUIPMENT_IDS.leg_press,
  hack_squat: DEFAULT_EQUIPMENT_IDS.hack_squat,
  bodyweight: DEFAULT_EQUIPMENT_IDS.bodyweight,
  weighted_bodyweight: DEFAULT_EQUIPMENT_IDS.weighted_bodyweight,
  resistance_band: DEFAULT_EQUIPMENT_IDS.resistance_band,
  gymnastic_rings: DEFAULT_EQUIPMENT_IDS.gymnastic_rings,
  cardio_machine: DEFAULT_EQUIPMENT_IDS.cardio_machine,
  other: DEFAULT_EQUIPMENT_IDS.other,

  // Users
  primary_user: PRIMARY_USER_ID,
  'default-user-profile': DEFAULT_USER_PROFILE_ID,
};

export const DEFAULT_FOODS: Omit<FoodItem, 'createdAt' | 'updatedAt'>[] = [
  { id: DEFAULT_FOOD_IDS.chicken_breast, name: '雞胸肉', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 110, protein: 23, carbs: 0, fat: 1.2, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.whole_egg, name: '雞蛋', category: 'natural', servingSize: 50, servingUnit: 'g', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.white_rice, name: '白米', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 358, protein: 6.8, carbs: 79.2, fat: 0.7, fiber: 1.3, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.sweet_potato, name: '地瓜', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.whey_protein, name: '乳清蛋白粉', category: 'processed', servingSize: 30, servingUnit: 'g', calories: 120, protein: 24, carbs: 2, fat: 1.5, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.rolled_oats, name: '大燕麥片', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.beef_flank, name: '牛板腱', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 180, protein: 24, carbs: 0, fat: 9, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.greek_yogurt, name: '無糖希臘優格', category: 'processed', servingSize: 100, servingUnit: 'g', calories: 60, protein: 10, carbs: 3.5, fat: 0.5, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.salmon, name: '鮭魚', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 208, protein: 20, carbs: 0, fat: 13, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.soy_milk, name: '無糖豆漿', category: 'beverage', servingSize: 250, servingUnit: 'ml', calories: 85, protein: 8.5, carbs: 4.5, fat: 3.5, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.tomato, name: '牛番茄', category: 'natural', servingSize: 100, servingUnit: 'g', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.cooking_oil, name: '食用植物油', category: 'oil', servingSize: 10, servingUnit: 'g', calories: 90, protein: 0, carbs: 0, fat: 10, isCustom: false, isArchived: false },
  { id: DEFAULT_FOOD_IDS.black_pepper, name: '黑胡椒粒', category: 'condiment', servingSize: 5, servingUnit: 'g', calories: 13, protein: 0.5, carbs: 3.2, fat: 0.2, isCustom: false, isArchived: false },
  ...DEFAULT_NATURAL_FOODS,
];

// 預設食譜（菜餚）庫已完全清空，所有複合料理皆由使用者依個人烹飪習慣自訂
export const DEFAULT_RECIPES: Omit<FoodRecipe, 'createdAt' | 'updatedAt'>[] = [];

/**
 * 恢復預設數據 (無害補齊缺失項目，不覆蓋用戶已修改內容與自訂項目)
 */
export async function restoreMissingDefaultData(db: ZenfitDatabase): Promise<{
  totalRestored: number;
  details: { foods: number; exercises: number; equipments: number; recipes: number };
}> {
  const now = Date.now();
  let foodsRestored = 0;
  let exercisesRestored = 0;
  let equipmentsRestored = 0;
  let recipesRestored = 0;

  // 1. 補齊器械
  for (const eq of DEFAULT_EQUIPMENTS) {
    const existingById = await db.equipments.get(eq.id);
    const existingByName = await db.equipments.where('name').equals(eq.name).first();
    if (!existingById && !existingByName) {
      await db.equipments.add({ ...eq, createdAt: now, updatedAt: now });
      equipmentsRestored += 1;
    }
  }

  // 2. 補齊食材
  for (const f of DEFAULT_FOODS) {
    const existingById = await db.foods.get(f.id);
    const existingByName = await db.foods.where('name').equals(f.name).first();
    if (!existingById && !existingByName) {
      await db.foods.add({ ...f, createdAt: now, updatedAt: now });
      foodsRestored += 1;
    }
  }

  // 3. 補齊動作
  for (const ex of DEFAULT_EXERCISES) {
    const existingById = await db.exercises.get(ex.id);
    const existingByName = await db.exercises.where('name').equals(ex.name).first();
    const existingByLegacyName = await db.exercises
      .filter((item) => item.name.startsWith(ex.name) && item.name.includes('('))
      .first();
    if (!existingById && !existingByName && !existingByLegacyName) {
      await db.exercises.add({ ...ex, createdAt: now, updatedAt: now });
      exercisesRestored += 1;
    }
  }

  // 4. 補齊菜餚
  for (const r of DEFAULT_RECIPES) {
    const existingById = await db.recipes.get(r.id);
    const existingByName = await db.recipes.where('name').equals(r.name).first();
    if (!existingById && !existingByName) {
      await db.recipes.add({ ...r, createdAt: now, updatedAt: now });
      recipesRestored += 1;
    }
  }

  const totalRestored = foodsRestored + exercisesRestored + equipmentsRestored + recipesRestored;
  return {
    totalRestored,
    details: {
      foods: foodsRestored,
      exercises: exercisesRestored,
      equipments: equipmentsRestored,
      recipes: recipesRestored,
    },
  };
}

/**
 * 徹底出廠重置 (Factory Reset)
 * 1. 清空所有業務日誌 (飲食記錄 daily_diet_logs、訓練日誌 workout_logs、身體指標 body_metrics、課表 routines)
 * 2. 清除所有使用者自定義項目 (isCustom: true 的食材、菜餚、動作、器械)
 * 3. 預設飲食與動作庫 100% 保留並自動解除歸檔 (isArchived: false)；若有缺失自動補齊出廠數據
 * 4. 個人基本資料與檔案重置為初始出廠狀態 (Noah / 70kg / 175cm)
 * 5. 徹底中斷 Dropbox 雲端同步並清除本地授權 Token 與中繼資料
 * 6. 清理記憶體快取與本地偏好存儲
 */
export async function resetDatabaseToFactory(db: ZenfitDatabase): Promise<void> {
  const now = Date.now();

  // 1. 清空所有業務日誌與課表
  await Promise.all([
    db.daily_diet_logs.clear(),
    db.workout_logs.clear(),
    db.body_metrics.clear(),
    db.routines.clear(),
  ]);

  // 2. 清除所有自定義實體 (isCustom: true)
  await Promise.all([
    db.foods.filter((f) => Boolean(f.isCustom)).delete(),
    db.recipes.filter((r) => Boolean(r.isCustom)).delete(),
    db.exercises.filter((e) => Boolean(e.isCustom)).delete(),
    db.equipments.filter((eq) => Boolean(eq.isCustom)).delete(),
  ]);

  // 3. 預設項目解除歸檔
  await Promise.all([
    db.foods.toCollection().modify({ isArchived: false }),
    db.recipes.toCollection().modify({ isArchived: false }),
    db.exercises.toCollection().modify({ isArchived: false }),
    db.equipments.toCollection().modify({ isArchived: false }),
  ]);

  // 4. 補齊出廠預設實體（若預設項目曾被意外刪除）
  await restoreMissingDefaultData(db);

  // 5. 重置個人資料與基本生理常數 (純粹出廠空白態：無姓名、無捏造體重)
  await Promise.all([
    db.user_profile.clear(),
    db.user_base_info.clear(),
  ]);

  await db.user_profile.add({
    id: DEFAULT_USER_PROFILE_ID,
    name: '',
    gender: 'male',
    heightCm: 0,
    currentWeightKg: 0,
    activityLevel: 1.55,
    goalType: 'lose_fat',
    weightUnit: 'kg',
    isSetupCompleted: false,
    updatedAt: now,
  });

  await db.user_base_info.add({
    id: PRIMARY_USER_ID,
    name: '',
    gender: 'male',
    birthDate: '',
    heightCm: 0,
    createdAt: now,
    updatedAt: now,
  });

  // 6. 清理 Dropbox 憑證與同步中繼鍵
  clearDropboxTokens();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('zenfit_dropbox_last_sync');
    localStorage.removeItem('zenfit_dropbox_cached_revs');
    localStorage.removeItem('zenfit_dropbox_pushed_times');
    localStorage.removeItem('zenfit-app-storage');
    localStorage.removeItem('zenfit-ui-theme');
    localStorage.removeItem('zenfit_app_locked');
  }

  // 7. 清空執行時期記憶體注水快取
  clearFoodsCache();
  clearRecipesCache();
  clearExercisesCache();
}
