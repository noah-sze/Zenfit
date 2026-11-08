import { describe, it, expect } from 'vitest';
import { DEFAULT_EXERCISES, DEFAULT_EXERCISE_IDS } from './defaultExercises';
import { DEFAULT_EQUIPMENT_IDS } from './defaultEquipments';

const VALID_MUSCLES = new Set([
  'upper_chest', 'mid_lower_chest', 'lats', 'upper_back_traps', 'lower_back',
  'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques'
]);

describe('DEFAULT_EXERCISES 動作資料庫權威校驗', () => {
  it('應包含全量 83 個專業訓練動作', () => {
    expect(DEFAULT_EXERCISES.length).toBe(83);
    expect(Object.keys(DEFAULT_EXERCISE_IDS).length).toBe(83);
  });

  it('每一個動作 ID 均為合法 RFC 4122 UUID 且無重複', () => {
    const seenIds = new Set<string>();
    for (const ex of DEFAULT_EXERCISES) {
      expect(ex.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(seenIds.has(ex.id)).toBe(false);
      seenIds.add(ex.id);
    }
  });

  it('所有動作名稱均符合極簡規範，無括號贅詞與重複名稱', () => {
    const seenNames = new Set<string>();
    for (const ex of DEFAULT_EXERCISES) {
      expect(ex.name).not.toMatch(/[()（）]/);
      expect(seenNames.has(ex.name)).toBe(false);
      seenNames.add(ex.name);
    }
  });

  it('所有動作關聯之器械 ID 均合法且存在於 DEFAULT_EQUIPMENT_IDS', () => {
    const validEquipmentIds = new Set<string>(Object.values(DEFAULT_EQUIPMENT_IDS));
    for (const ex of DEFAULT_EXERCISES) {
      expect(validEquipmentIds.has(ex.equipment)).toBe(true);
    }
  });

  it('所有肌群靶向均符合 17 處 DetailedMuscle 與三級機能學角色', () => {
    for (const ex of DEFAULT_EXERCISES) {
      const muscles = Object.keys(ex.targetMuscles);
      expect(muscles.length).toBeGreaterThan(0);
      for (const m of muscles) {
        expect(VALID_MUSCLES.has(m)).toBe(true);
        const role = ex.targetMuscles[m as keyof typeof ex.targetMuscles];
        expect(['primary', 'secondary', 'stabilizer']).toContain(role);
      }
      if (ex.category !== 'cardio') {
        const hasPrimary = Object.values(ex.targetMuscles).includes('primary');
        expect(hasPrimary).toBe(true);
      }
    }
  });
});
