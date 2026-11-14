/**
 * 日期會話與無感切換核心純函數庫 (Date Session & Foreground Recovery)
 * 遵循 Precision Metric Testing 準則：純函數無副作用，防護異常時間戳、跨夜邊界與快照遺失
 */
import { format } from 'date-fns';

export const DATE_SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 分鐘
export const DATE_SESSION_STORAGE_KEY = 'zenfit_date_session';

export interface DateSessionSnapshot {
  date: string;
  timestamp: number;
}

/**
 * 取得當前真實物理「今天」（YYYY-MM-DD）
 */
export function getPhysicalToday(now: Date = new Date()): string {
  return format(now, 'yyyy-MM-dd');
}

/**
 * 記錄當前選取日期與活動時間戳
 */
export function recordDateSession(
  selectedDate: string,
  timestamp: number = Date.now(),
  storage?: Storage
): void {
  try {
    const s = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
    if (!s) return;
    const payload: DateSessionSnapshot = {
      date: selectedDate,
      timestamp,
    };
    s.setItem(DATE_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 忽略隱私模式或存儲受限拋出的異常
  }
}

/**
 * 讀取已儲存的日期會話快照
 */
export function getDateSessionSnapshot(storage?: Storage): DateSessionSnapshot | null {
  try {
    const s = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
    if (!s) return null;
    const raw = s.getItem(DATE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DateSessionSnapshot>;
    if (
      typeof parsed?.date === 'string' &&
      typeof parsed?.timestamp === 'number' &&
      !isNaN(parsed.timestamp) &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
    ) {
      return {
        date: parsed.date,
        timestamp: parsed.timestamp,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 清除日期會話快照
 */
export function clearDateSession(storage?: Storage): void {
  try {
    const s = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
    if (!s) return;
    s.removeItem(DATE_SESSION_STORAGE_KEY);
  } catch {
    // 忽略異常
  }
}

/**
 * 冷啟動 / 刷新水合時獲取初始日期：
 * - 若同一次會話在 10 分鐘內被系統中斷（熱恢復），恢復選定日期
 * - 若超過 10 分鐘或真正冷啟動（新會話），固定定位今天
 */
export function getInitialDateSession(
  now: number = Date.now(),
  storage?: Storage,
  timeoutMs: number = DATE_SESSION_TIMEOUT_MS
): string {
  const snapshot = getDateSessionSnapshot(storage);
  if (snapshot) {
    const elapsed = now - snapshot.timestamp;
    if (elapsed >= 0 && elapsed < timeoutMs && snapshot.date) {
      return snapshot.date;
    }
  }
  return getPhysicalToday(new Date(now));
}

export interface ShouldResetDateOptions {
  lastActiveTimestamp: number | null;
  isModalOpen?: boolean;
  currentDate?: string;
  now?: number;
  timeoutMs?: number;
}

/**
 * 判斷切回前景（Visibility Change / Window Focus）時是否應自動返回今天：
 * 1. 若有表單/彈窗開啟中（isModalOpen），絕對不重置（防資料錯位寫入）
 * 2. 若當前日期已是今天，無須重置
 * 3. 若離開前景時長未達 10 分鐘，不重置（保留工作上下文）
 * 4. 若離開前景時長超過 10 分鐘，判定會話逾時，應自動重置為今天
 */
export function shouldResetDateOnForeground({
  lastActiveTimestamp,
  isModalOpen = false,
  currentDate,
  now = Date.now(),
  timeoutMs = DATE_SESSION_TIMEOUT_MS,
}: ShouldResetDateOptions): boolean {
  if (isModalOpen) return false;

  const todayStr = getPhysicalToday(new Date(now));
  if (currentDate && currentDate === todayStr) return false;

  if (lastActiveTimestamp === null) return false;

  const elapsed = now - lastActiveTimestamp;
  return elapsed >= timeoutMs;
}
