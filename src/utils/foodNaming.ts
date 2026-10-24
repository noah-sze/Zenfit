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
