import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFoodLogs } from './useFoodLogs';
import type { DailyDietLog } from '@/types';

let mockDailyLogs: DailyDietLog[] = [];

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn().mockReturnValue(undefined),
}));

vi.mock('@/services/db/db', () => ({
  db: {
    daily_diet_logs: {
      where: vi.fn().mockImplementation(() => ({
        equals: vi.fn().mockImplementation((targetDate: string) => ({
          first: vi.fn().mockImplementation(async () =>
            mockDailyLogs.find((l) => l.date === targetDate)
          ),
        })),
      })),
      put: vi.fn().mockImplementation(async (log: DailyDietLog) => {
        const idx = mockDailyLogs.findIndex((l) => l.id === log.id);
        if (idx >= 0) {
          mockDailyLogs[idx] = log;
        } else {
          mockDailyLogs.push(log);
        }
        return log.id;
      }),
      toArray: vi.fn().mockImplementation(async () => mockDailyLogs),
    },
    foods: {
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('./useDietPlan', () => ({
  ensureDailyDietMeta: vi.fn().mockResolvedValue({
    activityLevel: 1.55,
    macroSplit: { carbs: 40, protein: 30, fat: 30 },
  }),
}));

describe('useFoodLogs 系統分類條目 (System Entry Archetype) 合約測試', () => {
  beforeEach(() => {
    mockDailyLogs = [];
    vi.clearAllMocks();
  });

  describe('addQuickPlaceholder (粗估條目寫入)', () => {
    it('應寫入 entryType: estimate，且完全不包含 quantity 與 unit 欄位', async () => {
      const { addQuickPlaceholder } = useFoodLogs('2026-11-11');

      await addQuickPlaceholder({
        mealType: 'lunch',
        scenario: 'high_protein',
        customTitle: '健身餐盒',
        calories: 650,
        protein: 45,
        carbs: 50,
        fat: 15,
      });

      expect(mockDailyLogs.length).toBe(1);
      const entry = mockDailyLogs[0].entries[0];

      expect(entry.entryType).toBe('estimate');
      expect(entry.scenario).toBe('high_protein');
      expect(entry.customTitle).toBe('健身餐盒');
      expect(entry.quantity).toBeUndefined();
      expect(entry.unit).toBeUndefined();
      expect(entry.calories).toBe(650);
      expect(entry.protein).toBe(45);
      expect(entry.carbs).toBe(50);
      expect(entry.fat).toBe(15);
      expect(entry.isPlaceholder).toBe(true);
    });

    it('若輸入名稱為預設佔位詞（如「快速估算」、「常規」），應自動過濾 customTitle 使其走動態多語系解析', async () => {
      const { addQuickPlaceholder } = useFoodLogs('2026-11-11');

      await addQuickPlaceholder({
        mealType: 'dinner',
        scenario: 'balanced',
        foodName: '快速估算',
        calories: 500,
      });

      const entry = mockDailyLogs[0].entries[0];
      expect(entry.entryType).toBe('estimate');
      expect(entry.scenario).toBe('balanced');
      expect(entry.customTitle).toBeUndefined();
      expect(entry.quantity).toBeUndefined();
      expect(entry.unit).toBeUndefined();
    });
  });

  describe('addAsPlannedMeal (算我正常吃 / 歷史均值寫入)', () => {
    it('應寫入 entryType: as_planned，且完全不包含 quantity 與 unit 欄位', async () => {
      const { addAsPlannedMeal } = useFoodLogs('2026-11-11');

      await addAsPlannedMeal(
        'breakfast',
        { calories: 420, carbs: 45, protein: 25, fat: 12 },
        { customTitle: '飯店自助早餐' }
      );

      expect(mockDailyLogs.length).toBe(1);
      const entry = mockDailyLogs[0].entries[0];

      expect(entry.entryType).toBe('as_planned');
      expect(entry.customTitle).toBe('飯店自助早餐');
      expect(entry.quantity).toBeUndefined();
      expect(entry.unit).toBeUndefined();
      expect(entry.calories).toBe(420);
      expect(entry.isAsPlanned).toBe(true);
    });

    it('若傳入泛用標籤（如「歷史均值」、「早餐配額」、「正常飲食」），應過濾 customTitle 確保動態多語系', async () => {
      const { addAsPlannedMeal } = useFoodLogs('2026-11-11');

      await addAsPlannedMeal(
        'lunch',
        { calories: 700, carbs: 80, protein: 35, fat: 20 },
        { customTitle: '午餐配額' }
      );

      const entry = mockDailyLogs[0].entries[0];
      expect(entry.entryType).toBe('as_planned');
      expect(entry.customTitle).toBeUndefined();
      expect(entry.quantity).toBeUndefined();
      expect(entry.unit).toBeUndefined();
    });
  });

  describe('addFoodLog (統一新增日誌入口)', () => {
    it('新增實體食材 (item) 時，應保留 quantity 與 unit', async () => {
      const { addFoodLog } = useFoodLogs('2026-11-11');

      await addFoodLog({
        date: '2026-11-11',
        mealType: 'snack',
        entryType: 'item',
        foodId: 'food-apple',
        foodName: '富士蘋果',
        quantity: 150,
        unit: 'g',
        calories: 78,
      });

      const entry = mockDailyLogs[0].entries[0];
      expect(entry.entryType).toBe('item');
      expect(entry.quantity).toBe(150);
      expect(entry.unit).toBe('g');
      expect(entry.foodName).toBe('富士蘋果');
    });

    it('新增系統條目 (estimate 或 as_planned) 時，應排除 quantity 與 unit', async () => {
      const { addFoodLog } = useFoodLogs('2026-11-11');

      await addFoodLog({
        date: '2026-11-11',
        mealType: 'snack',
        entryType: 'estimate',
        scenario: 'cheat_day',
        customTitle: '下午茶點心',
        calories: 350,
      });

      const entry = mockDailyLogs[0].entries[0];
      expect(entry.entryType).toBe('estimate');
      expect(entry.scenario).toBe('cheat_day');
      expect(entry.customTitle).toBe('下午茶點心');
      expect(entry.quantity).toBeUndefined();
      expect(entry.unit).toBeUndefined();
    });
  });

  describe('updateFoodLog (修改已記錄條目)', () => {
    it('應成功修改已記錄食物的重量 quantity 與營養素', async () => {
      const { addFoodLog, updateFoodLog } = useFoodLogs('2026-11-11');

      await addFoodLog({
        date: '2026-11-11',
        mealType: 'lunch',
        entryType: 'item',
        foodId: 'food-chicken',
        foodName: '雞胸肉',
        quantity: 100,
        unit: 'g',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      });

      const entryId = mockDailyLogs[0].entries[0].id;
      expect(mockDailyLogs[0].entries[0].quantity).toBe(100);

      // 修改重量至 200g 並同步最新計算數值
      await updateFoodLog(entryId, {
        quantity: 200,
        calories: 330,
        protein: 62,
        carbs: 0,
        fat: 7.2,
      });

      expect(mockDailyLogs[0].entries[0].quantity).toBe(200);
      expect(mockDailyLogs[0].entries[0].calories).toBe(330);
      expect(mockDailyLogs[0].entries[0].protein).toBe(62);
      expect(mockDailyLogs[0].entries[0].fat).toBe(7.2);
    });

    it('跨日期回退查詢：若在當前檢視日期找不到，應從所有紀錄中回退搜尋並成功更新重量', async () => {
      // 假設歷史日期 2026-11-09 有一筆條目
      mockDailyLogs = [
        {
          id: 'log-hist-1',
          date: '2026-11-09',
          meta: {
            activityLevel: 1.55,
            macroSplit: { carbs: 40, protein: 30, fat: 30 },
          },
          entries: [
            {
              id: 'entry-old-1',
              date: '2026-11-09',
              mealType: 'dinner',
              entryType: 'item',
              foodId: 'food-beef',
              quantity: 150,
              unit: 'g',
              calories: 300,
              createdAt: 1000,
              updatedAt: 1000,
            },
          ],
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      // 當前 hook 掛載於 2026-11-11
      const { updateFoodLog } = useFoodLogs('2026-11-11');

      await updateFoodLog('entry-old-1', {
        quantity: 250,
        calories: 500,
      });

      expect(mockDailyLogs[0].entries[0].quantity).toBe(250);
      expect(mockDailyLogs[0].entries[0].calories).toBe(500);
    });
  });
});
