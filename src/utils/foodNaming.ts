export interface FoodNamingInput {
  name?: string | null;
  brand?: string | null;
}

/**
 * 格式化食材呈現名稱。
 * 遵循 Zenfit 食物數據規範：
 * - 若有品牌，格式為「品牌 · 名稱」 (使用 U+00B7 Middle Dot)
 * - 若無品牌，格式為「名稱」
 * - 具備防呆機制：若名稱已包含品牌前綴，避免重複拼接
 */
export function formatFoodDisplayName(food: FoodNamingInput): string {
  const name = food.name?.trim() || '';
  const brand = food.brand?.trim() || '';

  if (!brand) {
    return name;
  }

  // 防呆：如果名稱已經以該品牌開頭，直接返回 name（避免重複如 "曼可頓 · 曼可頓 · 全麥吐司"）
  if (
    name.startsWith(`${brand} ·`) ||
    name.startsWith(`${brand} •`) ||
    name.startsWith(`${brand}·`) ||
    name.startsWith(`${brand}•`)
  ) {
    return name;
  }

  return `${brand} · ${name}`;
}

/**
 * 解析「算我正常吃 / 歷史均值」（asPlanned）條目的標題顯示名稱：
 * 針對歷史資料中的「{{meal}} 配額」（如「午餐 配額」）、「正常飲食」、「算我正常食」或空白名稱，
 * 自動正規化顯示為精簡的「歷史均值」（或自訂的 defaultName）。
 * 若使用者曾手動自訂為其他具體備註（如「媽媽煮的便當」），則保留其原名稱。
 */
export function resolveAsPlannedDisplayName(
  item: { foodName?: string | null },
  defaultName: string = '歷史均值'
): string {
  const rawName = item.foodName?.trim() || '';
  if (
    !rawName ||
    rawName.endsWith('配額') ||
    rawName.endsWith('配额') ||
    rawName.endsWith('Budget') ||
    rawName === '正常飲食' ||
    rawName === '正常饮食' ||
    rawName === 'Regular Diet' ||
    rawName === '算我正常吃' ||
    rawName === '算我正常食' ||
    rawName === '歷史均值' ||
    rawName === '历史均值' ||
    rawName === 'Past Average' ||
    rawName === 'Historical Average'
  ) {
    return defaultName;
  }
  return rawName;
}



