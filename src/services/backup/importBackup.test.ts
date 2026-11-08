import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { importBackup, parseBackupFile } from './importBackup';
import { db } from '@/services/db/db';
import { PRIMARY_USER_ID } from '@/services/db/defaultData';

vi.mock('@/services/db/db', () => ({
  db: {
    user_base_info: { bulkPut: vi.fn(), clear: vi.fn() },
    user_profile: {
      toCollection: vi.fn().mockReturnValue({
        first: vi.fn(),
      }),
      update: vi.fn(),
      clear: vi.fn(),
    },
    foods: { bulkPut: vi.fn(), clear: vi.fn() },
    recipes: { bulkPut: vi.fn(), clear: vi.fn() },
    daily_diet_logs: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn(),
        }),
      }),
    },
    exercises: { bulkPut: vi.fn(), clear: vi.fn() },
    equipments: { bulkPut: vi.fn(), clear: vi.fn() },
    routines: { bulkPut: vi.fn(), clear: vi.fn() },
    workout_logs: { bulkPut: vi.fn(), clear: vi.fn() },
    body_metrics: { bulkPut: vi.fn(), clear: vi.fn() },
    transaction: vi.fn(async (_mode, _tables, callback) => {
      return await callback();
    }),
  },
}));

describe('importBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應正確解析標準 ZIP 備份包並呼叫 Dexie bulkPut 寫入所有資料表', async () => {
    const zip = new JSZip();

    zip.file(
      'user/base_info.json',
      JSON.stringify([
        {
          id: PRIMARY_USER_ID,
          name: 'Noah',
          gender: 'male',
          birthDate: '1995-01-01',
          heightCm: 183,
        },
      ])
    );

    zip.file(
      'nutrition/foods.json',
      JSON.stringify([
        {
          id: 'food-uuid-1',
          name: '雞胸肉',
          calories: 120,
          protein: 24,
          carbs: 0,
          fat: 2,
          servingSize: 100,
          servingUnit: 'g',
          isCustom: false,
        },
      ])
    );

    zip.file(
      'nutrition/recipes.json',
      JSON.stringify([
        {
          id: 'recipe-uuid-1',
          name: '健身特餐',
          ingredients: [{ foodId: 'food-uuid-1', quantity: 200, unit: 'g' }],
          isCustom: true,
        },
      ])
    );

    zip.file(
      'nutrition/logs/2026-11-08.json',
      JSON.stringify({
        id: 'diet-log-1',
        date: '2026-11-08',
        meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
        entries: [
          {
            id: 'entry-1',
            date: '2026-11-08',
            mealType: 'lunch',
            foodId: 'food-uuid-1',
            quantity: 200,
            unit: 'g',
          },
        ],
      })
    );

    zip.file(
      'workout/exercises.json',
      JSON.stringify([
        {
          id: 'exercise-uuid-1',
          name: '槓鈴臥推',
          equipment: 'barbell',
          targetMuscles: { mid_lower_chest: 'primary' },
          isCustom: false,
        },
      ])
    );

    zip.file(
      'workout/equipments.json',
      JSON.stringify([
        {
          id: 'barbell',
          name: '槓鈴',
          isCustom: false,
        },
      ])
    );

    zip.file(
      'workout/routines.json',
      JSON.stringify([
        {
          id: 'routine-uuid-1',
          name: '胸推課表',
          exercises: [{ exerciseId: 'exercise-uuid-1' }],
          isCustom: true,
        },
      ])
    );

    zip.file(
      'workout/logs/2026-11-08.json',
      JSON.stringify([
        {
          id: 'wlog-uuid-1',
          date: '2026-11-08',
          exercises: [
            {
              exerciseId: 'exercise-uuid-1',
              sets: [{ id: 's1', setNumber: 1, weight: 100, reps: 5, isCompleted: true }],
            },
          ],
        },
      ])
    );

    zip.file(
      'body/metrics/2026-11-08.json',
      JSON.stringify([
        {
          id: 'metric-uuid-1',
          date: '2026-11-08',
          weight: 75.5,
          bodyFat: 14.5,
        },
      ])
    );

    const blob = await zip.generateAsync({ type: 'blob' });

    // Mock existing user_profile
    vi.mocked(db.user_profile.toCollection().first).mockResolvedValue({
      id: 'profile-1',
      name: '',
      gender: 'male',
      birthDate: '',
      heightCm: 0,
      currentWeightKg: 0,
      weightUnit: 'kg',
      activityLevel: 1.55,
      macroSplit: { carbs: 40, protein: 30, fat: 30 },
      isSetupCompleted: false,
      updatedAt: 0,
    } as any);

    const result = await importBackup(blob, 'merge');

    expect(result.success).toBe(true);
    expect(result.stats.baseInfo).toBe(1);
    expect(result.stats.foods).toBe(1);
    expect(result.stats.recipes).toBe(1);
    expect(result.stats.dailyDietLogs).toBe(1);
    expect(result.stats.exercises).toBe(1);
    expect(result.stats.equipments).toBe(1);
    expect(result.stats.routines).toBe(1);
    expect(result.stats.workoutLogs).toBe(1);
    expect(result.stats.bodyMetrics).toBe(1);
    expect(result.stats.total).toBe(9);

    expect(db.user_base_info.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: PRIMARY_USER_ID,
          name: 'Noah',
        }),
      ])
    );

    expect(db.foods.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'food-uuid-1',
          name: '雞胸肉',
        }),
      ])
    );

    expect(db.user_profile.update).toHaveBeenCalledWith(
      'profile-1',
      expect.objectContaining({
        name: 'Noah',
        heightCm: 183,
      })
    );
  });

  it('使用 overwrite 策略時應先呼叫 clear 清空資料表再寫入備份數據', async () => {
    const zip = new JSZip();
    zip.file(
      'nutrition/foods.json',
      JSON.stringify([
        {
          id: 'food-overwrite-1',
          name: '燕麥',
          calories: 389,
          protein: 16.9,
          carbs: 66.3,
          fat: 6.9,
          servingSize: 100,
          servingUnit: 'g',
          isCustom: false,
        },
      ])
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const result = await importBackup(blob, 'overwrite');

    expect(result.success).toBe(true);
    expect(db.foods.clear).toHaveBeenCalled();
    expect(db.daily_diet_logs.clear).toHaveBeenCalled();
    expect(db.workout_logs.clear).toHaveBeenCalled();
    expect(db.foods.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'food-overwrite-1',
          name: '燕麥',
        }),
      ])
    );
  });

  it('parseBackupFile 應在不修改資料庫的情況下正確解析備份內容', async () => {
    const zip = new JSZip();
    zip.file(
      'user/base_info.json',
      JSON.stringify([
        {
          id: PRIMARY_USER_ID,
          name: 'Cheney',
          gender: 'female',
          birthDate: '1998-05-12',
          heightCm: 168,
        },
      ])
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const parsed = await parseBackupFile(blob);

    expect(parsed.baseInfos[0]?.name).toBe('Cheney');
    expect(parsed.baseInfos[0]?.gender).toBe('female');
    expect(db.user_base_info.bulkPut).not.toHaveBeenCalled();
  });

  it('應支援帶有頂層資料夾前綴的 ZIP 檔案解壓與匯入', async () => {
    const zip = new JSZip();

    zip.file(
      'zenfit-backup-2026-11-08/nutrition/foods.json',
      JSON.stringify([
        {
          id: 'nested-food-1',
          name: '燕麥',
          calories: 389,
          protein: 16.9,
          carbs: 66.3,
          fat: 6.9,
          servingSize: 100,
          servingUnit: 'g',
          isCustom: false,
        },
      ])
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const result = await importBackup(blob);

    expect(result.success).toBe(true);
    expect(result.stats.foods).toBe(1);
    expect(db.foods.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'nested-food-1',
          name: '燕麥',
        }),
      ])
    );
  });

  it('若飲食日誌該日期已存在，合併時應自動沿用本地已有 ID 以規避 unique index &date 衝突', async () => {
    const zip = new JSZip();

    zip.file(
      'nutrition/logs/2026-11-08.json',
      JSON.stringify({
        id: 'new-imported-id',
        date: '2026-11-08',
        meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
        entries: [],
      })
    );

    // Mock where('date').equals('2026-11-08').first() returns existing record
    vi.mocked(db.daily_diet_logs.where('date').equals('2026-11-08').first).mockResolvedValue({
      id: 'existing-local-id',
      date: '2026-11-08',
      meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
      entries: [],
      createdAt: 1000,
      updatedAt: 1000,
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const result = await importBackup(blob, 'merge');

    expect(result.success).toBe(true);
    expect(result.stats.dailyDietLogs).toBe(1);
    expect(db.daily_diet_logs.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'existing-local-id', // Reused existing ID
          date: '2026-11-08',
        }),
      ])
    );
  });

  it('應支援舊版 JSON 備份檔匯入（向後相容）', async () => {
    const legacyJson = JSON.stringify({
      version: 3,
      appName: 'Zenfit',
      exportedAt: '2026-11-08T00:00:00.000Z',
      profile: {
        userBaseInfo: {
          id: PRIMARY_USER_ID,
          name: 'Legacy User',
          gender: 'female',
          birthDate: '1998-05-12',
          heightCm: 168,
        },
      },
      diet: {
        foods: [
          {
            id: 'legacy-food-1',
            name: '水煮蛋',
            calories: 78,
            protein: 6.3,
            carbs: 0.6,
            fat: 5.3,
            servingSize: 50,
            servingUnit: 'g',
            isCustom: false,
          },
        ],
        recipes: [],
        dailyDietLogs: [],
      },
      workout: {
        exercises: [],
        routines: [],
        equipments: [],
        workoutLogs: [],
      },
      body: {
        bodyMetrics: [],
      },
    });

    const blob = new Blob([legacyJson], { type: 'application/json' });
    const result = await importBackup(blob);

    expect(result.success).toBe(true);
    expect(result.stats.baseInfo).toBe(1);
    expect(result.stats.foods).toBe(1);
    expect(db.foods.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'legacy-food-1',
          name: '水煮蛋',
        }),
      ])
    );
  });

  it('若傳入空白或無效格式檔案，應拋出 INVALID_BACKUP_FILE 錯誤', async () => {
    const emptyBlob = new Blob(['not a zip or json'], { type: 'text/plain' });
    await expect(importBackup(emptyBlob)).rejects.toThrow('INVALID_BACKUP_FILE');
  });
});
