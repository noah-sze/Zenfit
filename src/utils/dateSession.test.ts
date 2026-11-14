import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordDateSession,
  getDateSessionSnapshot,
  clearDateSession,
  getInitialDateSession,
  shouldResetDateOnForeground,
  getPhysicalToday,
  DATE_SESSION_TIMEOUT_MS,
  DATE_SESSION_STORAGE_KEY,
} from './dateSession';

// 記憶體 Mock Storage
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('dateSession (日期會話管理與無感切換純函數庫)', () => {
  let mockStorage: MemoryStorage;

  beforeEach(() => {
    mockStorage = new MemoryStorage();
  });

  describe('快照儲存與讀取 (record & read)', () => {
    it('正常記錄與還原快照', () => {
      const now = 1731558000000;
      recordDateSession('2026-11-10', now, mockStorage);

      const snapshot = getDateSessionSnapshot(mockStorage);
      expect(snapshot).toEqual({
        date: '2026-11-10',
        timestamp: now,
      });
    });

    it('Storage 拋出異常時應優雅降級，不導致崩潰', () => {
      const throwingStorage = {
        getItem: () => {
          throw new Error('Blocked storage');
        },
        setItem: () => {
          throw new Error('Quota exceeded');
        },
        removeItem: () => {
          throw new Error('Failed');
        },
      } as unknown as Storage;

      expect(() => recordDateSession('2026-11-10', 1000, throwingStorage)).not.toThrow();
      expect(getDateSessionSnapshot(throwingStorage)).toBeNull();
      expect(() => clearDateSession(throwingStorage)).not.toThrow();
    });

    it('面對損毀的 JSON 格式或非法日期格式，應回傳 null', () => {
      mockStorage.setItem(DATE_SESSION_STORAGE_KEY, 'corrupted_json');
      expect(getDateSessionSnapshot(mockStorage)).toBeNull();

      mockStorage.setItem(DATE_SESSION_STORAGE_KEY, JSON.stringify({ date: 'not-a-date', timestamp: 1000 }));
      expect(getDateSessionSnapshot(mockStorage)).toBeNull();

      mockStorage.setItem(DATE_SESSION_STORAGE_KEY, JSON.stringify({ date: '2026-11-10', timestamp: 'not-num' }));
      expect(getDateSessionSnapshot(mockStorage)).toBeNull();
    });

    it('clearDateSession 應正確清除快照', () => {
      recordDateSession('2026-11-10', 1000, mockStorage);
      expect(getDateSessionSnapshot(mockStorage)).not.toBeNull();
      clearDateSession(mockStorage);
      expect(getDateSessionSnapshot(mockStorage)).toBeNull();
    });
  });

  describe('初始日期判定 (getInitialDateSession)', () => {
    const fixedNow = new Date('2026-11-14T12:00:00Z').getTime();
    const today = getPhysicalToday(new Date(fixedNow));

    it('冷啟動（無任何儲存快照）：恆定定位為今天的真實物理日期', () => {
      const initial = getInitialDateSession(fixedNow, mockStorage);
      expect(initial).toBe(today);
    });

    it('熱恢復（5 分鐘前被中斷，未滿 10 分鐘）：應恢復先前的日期', () => {
      const fiveMinsAgo = fixedNow - 5 * 60 * 1000;
      recordDateSession('2026-11-10', fiveMinsAgo, mockStorage);

      const initial = getInitialDateSession(fixedNow, mockStorage);
      expect(initial).toBe('2026-11-10');
    });

    it('會話過期（15 分鐘前，超過 10 分鐘）：視為真實冷啟動，重置為今天', () => {
      const fifteenMinsAgo = fixedNow - 15 * 60 * 1000;
      recordDateSession('2026-11-10', fifteenMinsAgo, mockStorage);

      const initial = getInitialDateSession(fixedNow, mockStorage);
      expect(initial).toBe(today);
    });

    it('時鐘回撥或未來時間戳防護（elapsed < 0）：防禦性回退至今天', () => {
      const futureTime = fixedNow + 60 * 1000;
      recordDateSession('2026-11-10', futureTime, mockStorage);

      const initial = getInitialDateSession(fixedNow, mockStorage);
      expect(initial).toBe(today);
    });
  });

  describe('切回前景自動返回今天判定 (shouldResetDateOnForeground)', () => {
    const fixedNow = new Date('2026-11-14T12:00:00Z').getTime();
    const today = getPhysicalToday(new Date(fixedNow));

    it('短暫切窗（2 分鐘 < 10 分鐘）：不重置日期，保留上下文', () => {
      const twoMinsAgo = fixedNow - 2 * 60 * 1000;
      const shouldReset = shouldResetDateOnForeground({
        lastActiveTimestamp: twoMinsAgo,
        isModalOpen: false,
        currentDate: '2026-11-10',
        now: fixedNow,
      });
      expect(shouldReset).toBe(false);
    });

    it('長時間離開（12 分鐘 >= 10 分鐘）且當前為歷史日期：應自動重置為今天', () => {
      const twelveMinsAgo = fixedNow - 12 * 60 * 1000;
      const shouldReset = shouldResetDateOnForeground({
        lastActiveTimestamp: twelveMinsAgo,
        isModalOpen: false,
        currentDate: '2026-11-10',
        now: fixedNow,
      });
      expect(shouldReset).toBe(true);
    });

    it('剛好達到 10 分鐘邊界：應判定為超時並重置', () => {
      const tenMinsAgo = fixedNow - DATE_SESSION_TIMEOUT_MS;
      const shouldReset = shouldResetDateOnForeground({
        lastActiveTimestamp: tenMinsAgo,
        isModalOpen: false,
        currentDate: '2026-11-10',
        now: fixedNow,
      });
      expect(shouldReset).toBe(true);
    });

    it('彈窗或編輯中防竄改鎖（isModalOpen = true）：即使離開超過 10 分鐘亦絕不重置', () => {
      const thirtyMinsAgo = fixedNow - 30 * 60 * 1000;
      const shouldReset = shouldResetDateOnForeground({
        lastActiveTimestamp: thirtyMinsAgo,
        isModalOpen: true, // 正在編輯中
        currentDate: '2026-11-10',
        now: fixedNow,
      });
      expect(shouldReset).toBe(false);
    });

    it('當前日期本來就是今天：無須重置', () => {
      const thirtyMinsAgo = fixedNow - 30 * 60 * 1000;
      const shouldReset = shouldResetDateOnForeground({
        lastActiveTimestamp: thirtyMinsAgo,
        isModalOpen: false,
        currentDate: today,
        now: fixedNow,
      });
      expect(shouldReset).toBe(false);
    });

    it('無最後活躍時間戳（lastActiveTimestamp = null）：安全返回 false', () => {
      const shouldReset = shouldResetDateOnForeground({
        lastActiveTimestamp: null,
        isModalOpen: false,
        currentDate: '2026-11-10',
        now: fixedNow,
      });
      expect(shouldReset).toBe(false);
    });
  });
});
