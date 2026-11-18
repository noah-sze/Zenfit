/**
 * 實體預設活躍度排序引擎 (Recent Activity Sorting Engine)
 * 遵循 Precision Metric Testing 準則：純函數無副作用，100% 防護 NaN、負數、缺省時間戳。
 *
 * 預設排序規則：
 * 1. 最近使用（日誌記錄時間）、最近添加（自訂項目建立時間）、最近修改（更新時間）取最大值，由新到舊置頂。
 * 2. 對於未經使用者修改之出廠預設項目（isCustom === false 且 updatedAt <= createdAt），其出廠/遷移種子時間不計入活躍度，
 *    避免版本升級補齊預設資料時將未接觸之預設項目頂到使用者常用項目之上。
 * 3. 同等活躍度（如皆為未接觸過之預設項目）依名稱 localeCompare 升序排列。
 */

export interface ActivitySortableItem {
  id: string;
  name: string;
  isCustom?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

function normalizeTimestamp(ts: number | undefined): number {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) {
    return 0;
  }
  return ts;
}

/**
 * 計算實體的綜合最近活躍時間戳（最近使用 / 添加 / 修改之最大值）
 */
export function getEntityActivityTimestamp(
  item: ActivitySortableItem,
  lastUsedAt?: number
): number {
  const usedAt = normalizeTimestamp(lastUsedAt);
  const createdAt = normalizeTimestamp(item.createdAt);
  const updatedAt = normalizeTimestamp(item.updatedAt);

  let touchedAt = 0;
  if (item.isCustom) {
    touchedAt = Math.max(createdAt, updatedAt);
  } else if (updatedAt > createdAt) {
    touchedAt = updatedAt;
  }

  return Math.max(usedAt, touchedAt);
}

/**
 * 預設排序比較函式：最近使用 / 添加 / 修改優先，其次依名稱升序
 */
export function compareByRecentActivityThenName<T extends ActivitySortableItem>(
  a: T,
  b: T,
  lastUsedMap?: ReadonlyMap<string, number>,
  getName?: (item: T) => string
): number {
  const actA = getEntityActivityTimestamp(a, lastUsedMap?.get(a.id));
  const actB = getEntityActivityTimestamp(b, lastUsedMap?.get(b.id));

  if (actA !== actB) {
    return actB - actA;
  }

  const nameA = getName ? getName(a) : a.name;
  const nameB = getName ? getName(b) : b.name;
  return nameA.localeCompare(nameB);
}
