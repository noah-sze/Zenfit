import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { exportBackupZip } from './exportBackupZip';
import { db } from '@/services/db/db';

vi.mock('@/services/db/db', () => ({
  db: {
    user_base_info: { toArray: vi.fn() },
    foods: { toArray: vi.fn() },
    recipes: { toArray: vi.fn() },
    daily_diet_logs: { toArray: vi.fn() },
    exercises: { toArray: vi.fn() },
    equipments: { toArray: vi.fn() },
    routines: { toArray: vi.fn() },
    workout_logs: { toArray: vi.fn() },
    body_metrics: { toArray: vi.fn() },
  },
}));

describe('exportBackupZip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應正確產生 ZIP 壓縮包且檔案結構與 Dropbox 規範 100% 一致', async () => {
    // 準備測試數據
    vi.mocked(db.user_base_info.toArray).mockResolvedValue([
      {
        id: 'primary_user',
        name: 'Noah',
        gender: 'male',
        birthDate: '1995-01-01',
        heightCm: 183,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    vi.mocked(db.foods.toArray).mockResolvedValue([
      {
        id: 'food-1',
        name: '雞胸肉',
        calories: 110,
        protein: 23,
        carbs: 0,
        fat: 1.5,
        servingSize: 100,
        servingUnit: 'g',
        isCustom: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    vi.mocked(db.recipes.toArray).mockResolvedValue([
      {
        id: 'recipe-1',
        name: '健身特餐',
        ingredients: [{ foodId: 'food-1', quantity: 150, unit: 'g' }],
        isCustom: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    vi.mocked(db.daily_diet_logs.toArray).mockResolvedValue([
      {
        id: 'diet-log-1',
        date: '2026-11-08',
        meta: {
          activityLevel: 1.55,
          macroSplit: { carbs: 40, protein: 30, fat: 30 },
        },
        entries: [
          {
            id: 'entry-1',
            date: '2026-11-08',
            mealType: 'lunch',
            foodId: 'food-1',
            quantity: 200,
            unit: 'g',
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    vi.mocked(db.exercises.toArray).mockResolvedValue([
      {
        id: 'exercise-1',
        name: '臥推',
        primaryMuscles: ['chest'],
        secondaryMuscles: ['triceps'],
        category: 'chest',
        isCustom: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    vi.mocked(db.equipments.toArray).mockResolvedValue([
      {
        id: 'eq-1',
        name: '槓鈴',
        type: 'barbell',
        isCustom: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    vi.mocked(db.routines.toArray).mockResolvedValue([
      {
        id: 'routine-1',
        name: '胸肌訓練課表',
        exercises: [{ exerciseId: 'exercise-1', targetSets: 4 }],
        isCustom: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    vi.mocked(db.workout_logs.toArray).mockResolvedValue([
      {
        id: 'wlog-1',
        date: '2026-11-08',
        exercises: [
          {
            exerciseId: 'exercise-1',
            sets: [
              {
                id: 'set-1',
                setNumber: 1,
                weight: 80,
                reps: 8,
                isCompleted: true,
              },
            ],
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    vi.mocked(db.body_metrics.toArray).mockResolvedValue([
      {
        id: 'bm-1',
        date: '2026-11-08',
        weight: 65,
        bodyFat: 15,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    // 執行匯出
    const blob = await exportBackupZip();
    expect(blob).toBeInstanceOf(Blob);

    // 使用 JSZip 解壓驗證目錄結構與文件內容
    const zip = await JSZip.loadAsync(blob);

    // 1. 驗證根目錄 manifest.json
    expect(zip.file('manifest.json')).not.toBeNull();
    const manifestJson = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(manifestJson.appName).toBe('Zenfit');
    expect(manifestJson.schemaVersion).toBe(2);
    expect(manifestJson.stats.foodsCount).toBe(1);
    expect(manifestJson.stats.recipesCount).toBe(1);
    expect(manifestJson.stats.dailyDietLogsCount).toBe(1);
    expect(manifestJson.stats.exercisesCount).toBe(1);
    expect(manifestJson.stats.equipmentsCount).toBe(1);
    expect(manifestJson.stats.routinesCount).toBe(1);
    expect(manifestJson.stats.workoutLogsCount).toBe(1);
    expect(manifestJson.stats.bodyMetricsCount).toBe(1);

    // 2. 驗證 user 模組
    expect(zip.file('user/base_info.json')).not.toBeNull();
    const baseInfo = JSON.parse(await zip.file('user/base_info.json')!.async('string'));
    expect(baseInfo[0].name).toBe('Noah');

    // 3. 驗證 nutrition 模組
    expect(zip.file('nutrition/foods.json')).not.toBeNull();
    expect(zip.file('nutrition/recipes.json')).not.toBeNull();
    expect(zip.file('nutrition/logs/manifest.json')).not.toBeNull();
    expect(zip.file('nutrition/logs/2026-11-08.json')).not.toBeNull();

    const dietLog = JSON.parse(await zip.file('nutrition/logs/2026-11-08.json')!.async('string'));
    expect(dietLog.date).toBe('2026-11-08');
    expect(dietLog.entries[0].foodId).toBe('food-1');

    // 4. 驗證 workout 模組
    expect(zip.file('workout/exercises.json')).not.toBeNull();
    expect(zip.file('workout/equipments.json')).not.toBeNull();
    expect(zip.file('workout/routines.json')).not.toBeNull();
    expect(zip.file('workout/logs/manifest.json')).not.toBeNull();
    expect(zip.file('workout/logs/2026-11-08.json')).not.toBeNull();

    const wLog = JSON.parse(await zip.file('workout/logs/2026-11-08.json')!.async('string'));
    expect(wLog[0].exercises[0].exerciseId).toBe('exercise-1');

    // 5. 驗證 body 模組
    expect(zip.file('body/metrics/manifest.json')).not.toBeNull();
    expect(zip.file('body/metrics/2026-11-08.json')).not.toBeNull();

    const bMetrics = JSON.parse(await zip.file('body/metrics/2026-11-08.json')!.async('string'));
    expect(bMetrics[0].weight).toBe(65);
  });
});
