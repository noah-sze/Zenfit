import type {
  DailyExportPayload,
  ExportDietSection,
  ExportMealGroup,
  ExportWorkoutSection,
  ExportBodySection,
} from './aiDataExport';

export interface GenerateExportImageOptions {
  theme?: 'dark' | 'light';
  dpr?: number;
  width?: number;
}

export interface ImagePalette {
  canvasBg: string;
  cardBg: string;
  cardSubtleBg: string;
  border: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  pillBg: string;
  pillText: string;
  pillSubtleBg: string;
  calories: string;
  caloriesBg: string;
  caloriesBorder: string;
  carbs: string;
  carbsBg: string;
  carbsBorder: string;
  protein: string;
  proteinBg: string;
  proteinBorder: string;
  fat: string;
  fatBg: string;
  fatBorder: string;
  trackBg: string;
  progressBar: string;
}

export const LIGHT_PALETTE: ImagePalette = {
  canvasBg: '#f4f4f5',
  cardBg: '#ffffff',
  cardSubtleBg: '#fafafa',
  border: '#e4e4e7',
  divider: '#f0f0f2',
  textPrimary: '#09090b',
  textSecondary: '#71717a',
  textTertiary: '#a1a1aa',
  pillBg: '#09090b',
  pillText: '#ffffff',
  pillSubtleBg: '#f4f4f5',
  calories: '#e11d48',
  caloriesBg: '#fff1f2',
  caloriesBorder: '#fecdd3',
  carbs: '#d97706',
  carbsBg: '#fff7ed',
  carbsBorder: '#fed7aa',
  protein: '#0284c7',
  proteinBg: '#f0f9ff',
  proteinBorder: '#bae6fd',
  fat: '#7c3aed',
  fatBg: '#faf5ff',
  fatBorder: '#e9d5ff',
  trackBg: '#f4f4f5',
  progressBar: '#09090b',
};

export const DARK_PALETTE: ImagePalette = {
  canvasBg: '#09090b',
  cardBg: '#121215',
  cardSubtleBg: '#18181c',
  border: '#27272a',
  divider: '#202024',
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  pillBg: '#ffffff',
  pillText: '#09090b',
  pillSubtleBg: '#1c1c20',
  calories: '#f43f5e',
  caloriesBg: 'rgba(244, 63, 94, 0.14)',
  caloriesBorder: 'rgba(244, 63, 94, 0.28)',
  carbs: '#f59e0b',
  carbsBg: 'rgba(245, 158, 11, 0.12)',
  carbsBorder: 'rgba(245, 158, 11, 0.25)',
  protein: '#38bdf8',
  proteinBg: 'rgba(56, 189, 248, 0.12)',
  proteinBorder: 'rgba(56, 189, 248, 0.25)',
  fat: '#a78bfa',
  fatBg: 'rgba(167, 139, 250, 0.12)',
  fatBorder: 'rgba(167, 139, 250, 0.25)',
  trackBg: '#27272a',
  progressBar: '#ffffff',
};

const SANS_FONT =
  'Inter Variable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "PingFang TC", "Microsoft YaHei", sans-serif';
const MONO_FONT =
  'JetBrains Mono Variable, JetBrains Mono, "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill?: string,
  stroke?: string,
  lineWidth = 1
) {
  drawRoundedRect(ctx, x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  palette: ImagePalette;
  width: number;
  paddingX: number;
  cardWidth: number;
  cardGap: number;
  isMeasureOnly: boolean;
}

/**
 * 頂部 Header：品牌名稱、副標、日期與範圍膠囊
 */
function renderHeader(rc: RenderContext, payload: DailyExportPayload, y: number): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const headerHeight = 44;

  if (!isMeasureOnly) {
    ctx.save();
    // 品牌標識
    ctx.font = `700 18px ${MONO_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'top';
    ctx.fillText('ZENFIT', paddingX, y + 2);

    ctx.font = `500 10px ${MONO_FONT}`;
    ctx.fillStyle = palette.textTertiary;
    ctx.fillText('DAILY SNAPSHOT', paddingX, y + 24);

    // 右側膠囊標籤
    const scopeLabelMap: Record<string, string> = {
      diet: 'DIET 飲食',
      workout: 'WORKOUT 訓練',
      body: 'BODY 身體',
      all: 'FULL 全部',
    };
    const scopeText = scopeLabelMap[payload.scope] || payload.scope.toUpperCase();

    ctx.font = `600 10px ${MONO_FONT}`;
    const scopeWidth = ctx.measureText(scopeText).width + 14;
    const scopeX = paddingX + cardWidth - scopeWidth;
    drawRoundedBox(ctx, scopeX, y + 2, scopeWidth, 20, 6, palette.pillBg);
    ctx.fillStyle = palette.pillText;
    ctx.textBaseline = 'middle';
    ctx.fillText(scopeText, scopeX + 7, y + 12);

    // 日期膠囊
    ctx.font = `500 11px ${MONO_FONT}`;
    const dateText = payload.date;
    const dateWidth = ctx.measureText(dateText).width + 16;
    const dateX = scopeX - dateWidth - 8;
    drawRoundedBox(
      ctx,
      dateX,
      y + 2,
      dateWidth,
      20,
      6,
      palette.cardSubtleBg,
      palette.border,
      1
    );
    ctx.fillStyle = palette.textSecondary;
    ctx.textBaseline = 'middle';
    ctx.fillText(dateText, dateX + 8, y + 12);

    ctx.restore();
  }

  return y + headerHeight + rc.cardGap;
}

/**
 * 頂部熱量統計卡片 (100% 像素級還原圖片 2 的 Hero Card)
 */
function renderCaloriesHeroCard(
  rc: RenderContext,
  diet: ExportDietSection,
  startY: number
): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const innerPad = 16;
  const innerWidth = cardWidth - innerPad * 2;
  const innerX = paddingX + innerPad;

  let curY = startY + innerPad;

  // 1. 卡片頂部 Bar: [久坐辦公 ⌄]  -- 熱量統計 --  [均衡 >]
  if (!isMeasureOnly) {
    ctx.save();
    // 左側活動係數膠囊
    const actText = `${diet.activityLabel} ⌄`;
    ctx.font = `500 11px ${SANS_FONT}`;
    const actW = ctx.measureText(actText).width + 16;
    drawRoundedBox(
      ctx,
      innerX,
      curY,
      actW,
      24,
      6,
      palette.pillSubtleBg,
      palette.border,
      1
    );
    ctx.fillStyle = palette.textSecondary;
    ctx.textBaseline = 'middle';
    ctx.fillText(actText, innerX + 8, curY + 12);

    // 中間標題
    ctx.font = `500 12px ${SANS_FONT}`;
    ctx.fillStyle = palette.textSecondary;
    ctx.textAlign = 'center';
    ctx.fillText('熱量統計', paddingX + cardWidth / 2, curY + 12);

    // 右側供能比膠囊
    let splitName = '均衡 >';
    if (diet.macroSplit.carbs === 40 && diet.macroSplit.protein === 30 && diet.macroSplit.fat === 30) {
      splitName = '均衡 >';
    } else if (diet.macroSplit.carbs === 40 && diet.macroSplit.protein === 35 && diet.macroSplit.fat === 25) {
      splitName = '高蛋白 >';
    } else if (diet.macroSplit.carbs === 25 && diet.macroSplit.protein === 40 && diet.macroSplit.fat === 35) {
      splitName = '低碳 >';
    } else {
      splitName = `${diet.macroSplit.carbs}/${diet.macroSplit.protein}/${diet.macroSplit.fat} >`;
    }

    ctx.textAlign = 'left';
    ctx.font = `500 11px ${SANS_FONT}`;
    const splitW = ctx.measureText(splitName).width + 16;
    const splitX = innerX + innerWidth - splitW;
    drawRoundedBox(
      ctx,
      splitX,
      curY,
      splitW,
      24,
      6,
      palette.pillSubtleBg,
      palette.border,
      1
    );
    ctx.fillStyle = palette.textSecondary;
    ctx.fillText(splitName, splitX + 8, curY + 12);

    ctx.restore();
  }
  curY += 24 + 14;

  // 2. 居中超大熱量數值與單位
  const actualCal = diet.actual.calories;
  const targetCal = diet.target.calories;
  const remainingCal = targetCal - actualCal;
  const eUnit = diet.target.energyUnit;

  if (!isMeasureOnly) {
    ctx.save();
    ctx.font = `700 36px ${MONO_FONT}`;
    const calStr = actualCal.toLocaleString();
    const calStrW = ctx.measureText(calStr).width;

    ctx.font = `500 15px ${MONO_FONT}`;
    const unitStr = ` ${eUnit}`;
    const unitStrW = ctx.measureText(unitStr).width;

    const totalHeroW = calStrW + unitStrW;
    const heroStartX = paddingX + (cardWidth - totalHeroW) / 2;

    ctx.font = `700 36px ${MONO_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(calStr, heroStartX, curY + 34);

    ctx.font = `500 15px ${MONO_FONT}`;
    ctx.fillStyle = palette.textSecondary;
    ctx.fillText(unitStr, heroStartX + calStrW, curY + 34);

    // 下方居中小字：剩餘 / 超額
    ctx.font = `500 13px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    if (remainingCal >= 0) {
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(`剩餘 ${remainingCal.toLocaleString()} ${eUnit}`, paddingX + cardWidth / 2, curY + 54);
    } else {
      ctx.fillStyle = palette.calories;
      ctx.fillText(`超額 ${Math.abs(remainingCal).toLocaleString()} ${eUnit}`, paddingX + cardWidth / 2, curY + 54);
    }

    ctx.restore();
  }
  curY += 66;

  // 3. 居中熱量進度條
  const calBarH = 6;
  const calRatio = targetCal > 0 ? Math.min(1, Math.max(0, actualCal / targetCal)) : 0;
  if (!isMeasureOnly) {
    ctx.save();
    // 軌道
    drawRoundedBox(ctx, innerX, curY, innerWidth, calBarH, 3, palette.trackBg);
    // 黑色/前景色進度條
    if (calRatio > 0) {
      drawRoundedBox(ctx, innerX, curY, Math.max(4, innerWidth * calRatio), calBarH, 3, palette.progressBar);
    }
    ctx.restore();
  }
  curY += calBarH + 18;

  // 4. 三大營養素三等分欄（有 1px 垂直分割線）
  const macroBarH = 68;
  const colW = innerWidth / 3;

  if (!isMeasureOnly) {
    ctx.save();
    // 頂部水平分割線
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.divider;
    ctx.beginPath();
    ctx.moveTo(paddingX, curY);
    ctx.lineTo(paddingX + cardWidth, curY);
    ctx.stroke();

    // 垂直分割線 1 & 2
    ctx.beginPath();
    ctx.moveTo(innerX + colW, curY);
    ctx.lineTo(innerX + colW, curY + macroBarH);
    ctx.moveTo(innerX + colW * 2, curY);
    ctx.lineTo(innerX + colW * 2, curY + macroBarH);
    ctx.stroke();

    const cols = [
      {
        label: '碳水化合物',
        actual: diet.actual.carbs,
        target: diet.target.carbs,
        color: palette.carbs,
        trackColor: palette.carbsBg,
      },
      {
        label: '蛋白質',
        actual: diet.actual.protein,
        target: diet.target.protein,
        color: palette.protein,
        trackColor: palette.proteinBg,
      },
      {
        label: '脂肪',
        actual: diet.actual.fat,
        target: diet.target.fat,
        color: palette.fat,
        trackColor: palette.fatBg,
      },
    ];

    cols.forEach((col, idx) => {
      const colStartX = innerX + idx * colW + 8;
      const colInnerW = colW - 16;
      const colY = curY + 10;

      // 彩色標籤
      ctx.font = `600 12px ${SANS_FONT}`;
      ctx.fillStyle = col.color;
      ctx.textBaseline = 'top';
      ctx.fillText(col.label, colStartX, colY);

      // 大數字與目標
      ctx.font = `700 15px ${MONO_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      const actStr = `${Math.round(col.actual)}g`;
      ctx.fillText(actStr, colStartX, colY + 18);
      const actW = ctx.measureText(actStr).width;

      ctx.font = `500 11px ${MONO_FONT}`;
      ctx.fillStyle = palette.textTertiary;
      ctx.fillText(`/${col.target}g`, colStartX + actW, colY + 20);

      // 底部彩色進度條
      const barY = colY + 40;
      const progressH = 5;
      drawRoundedBox(ctx, colStartX, barY, colInnerW, progressH, 2.5, col.trackColor);
      const ratio = col.target > 0 ? Math.min(1, Math.max(0, col.actual / col.target)) : 0;
      if (ratio > 0) {
        drawRoundedBox(ctx, colStartX, barY, Math.max(3, colInnerW * ratio), progressH, 2.5, col.color);
      }
    });

    ctx.restore();
  }
  curY += macroBarH;

  const totalCardH = curY - startY;

  return startY + totalCardH + rc.cardGap;
}

/**
 * 獨立餐次卡片 (早餐 / 午餐 / 晚餐 / 加餐 各自為獨立 Bento 卡片)
 */
function renderMealCard(
  rc: RenderContext,
  meal: ExportMealGroup,
  startY: number
): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const innerPad = 14;
  const innerWidth = cardWidth - innerPad * 2;
  const innerX = paddingX + innerPad;

  let curY = startY + innerPad;

  // 1. 餐次標題欄：大黑體「早餐」· 灰字「397 kcal ⌄」
  if (!isMeasureOnly) {
    ctx.save();
    ctx.font = `700 16px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'top';
    ctx.fillText(meal.mealLabel, innerX, curY);
    const mealLabelW = ctx.measureText(meal.mealLabel).width;

    ctx.font = `500 13px ${MONO_FONT}`;
    ctx.fillStyle = palette.textSecondary;
    ctx.fillText(` · ${meal.calories} kcal ⌄`, innerX + mealLabelW, curY + 2);
    ctx.restore();
  }
  curY += 24;

  // 供能比三色比例條 (小巧的橘-藍-紫，高度約 4px)
  const miniBarH = 4;
  if (!isMeasureOnly) {
    ctx.save();
    const cKcal = meal.carbs * 4;
    const pKcal = meal.protein * 4;
    const fKcal = meal.fat * 9;
    const totalMacroKcal = cKcal + pKcal + fKcal;

    let cRatio = totalMacroKcal > 0 ? cKcal / totalMacroKcal : 0.33;
    let pRatio = totalMacroKcal > 0 ? pKcal / totalMacroKcal : 0.33;
    let fRatio = totalMacroKcal > 0 ? fKcal / totalMacroKcal : 0.34;
    const sum = cRatio + pRatio + fRatio || 1;
    cRatio = cRatio / sum;
    pRatio = pRatio / sum;
    fRatio = fRatio / sum;

    const barW = 120;
    const cW = Math.round(barW * cRatio);
    const pW = Math.round(barW * pRatio);
    const fW = barW - cW - pW;

    drawRoundedRect(ctx, innerX, curY, barW, miniBarH, 2);
    ctx.clip();
    ctx.fillStyle = palette.carbs;
    ctx.fillRect(innerX, curY, cW, miniBarH);
    ctx.fillStyle = palette.protein;
    ctx.fillRect(innerX + cW, curY, pW, miniBarH);
    ctx.fillStyle = palette.fat;
    ctx.fillRect(innerX + cW + pW, curY, fW, miniBarH);
    ctx.restore();
  }
  curY += miniBarH + 12;

  // 2. 食物列表項目 (每筆項目高度約 58px，左右分佈，完全還原圖片 2)
  if (meal.items.length === 0) {
    if (!isMeasureOnly) {
      ctx.save();
      ctx.font = `500 11px ${SANS_FONT}`;
      ctx.fillStyle = palette.textTertiary;
      ctx.textBaseline = 'top';
      ctx.fillText('無食物明細', innerX, curY + 4);
      ctx.restore();
    }
    curY += 28;
  } else {
    meal.items.forEach((item, itemIdx) => {
      // 項目上方分割線 (第一項不用)
      if (itemIdx > 0) {
        if (!isMeasureOnly) {
          ctx.save();
          ctx.lineWidth = 1;
          ctx.strokeStyle = palette.divider;
          ctx.beginPath();
          ctx.moveTo(innerX, curY);
          ctx.lineTo(innerX + innerWidth, curY);
          ctx.stroke();
          ctx.restore();
        }
        curY += 8;
      }

      const itemRowH = 52;
      if (!isMeasureOnly) {
        ctx.save();
        // --- (A) 右側 MacroSquares：3 個彩色方形膠囊 (碳 / 蛋 / 脂) ---
        const sqW = 38;
        const sqH = 36;
        const sqGap = 6;
        const squaresTotalW = sqW * 3 + sqGap * 2;
        const squaresStartX = innerX + innerWidth - squaresTotalW;
        const sqY = curY + (itemRowH - sqH) / 2;

        const squares = [
          {
            tag: '碳',
            val: `${roundNum(item.carbs)}g`,
            color: palette.carbs,
            bg: palette.carbsBg,
            border: palette.carbsBorder,
          },
          {
            tag: '蛋',
            val: `${roundNum(item.protein)}g`,
            color: palette.protein,
            bg: palette.proteinBg,
            border: palette.proteinBorder,
          },
          {
            tag: '脂',
            val: `${roundNum(item.fat)}g`,
            color: palette.fat,
            bg: palette.fatBg,
            border: palette.fatBorder,
          },
        ];

        squares.forEach((sq, sIdx) => {
          const sX = squaresStartX + sIdx * (sqW + sqGap);
          drawRoundedBox(ctx, sX, sqY, sqW, sqH, 6, sq.bg, sq.border, 1);

          // 頂部標籤
          ctx.font = `600 9px ${MONO_FONT}`;
          ctx.fillStyle = sq.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sq.tag, sX + sqW / 2, sqY + 10);

          // 底部數值
          ctx.font = `700 11px ${MONO_FONT}`;
          ctx.fillStyle = palette.textPrimary;
          ctx.fillText(sq.val, sX + sqW / 2, sqY + 25);
        });

        // --- (B) 左側品名與份量熱量高亮 ---
        ctx.textAlign = 'left';
        let prefix = '';
        if (item.type === 'recipe') prefix = '[食譜] ';
        if (item.type === 'estimate') prefix = '[估算] ';
        if (item.type === 'as_planned') prefix = '[均值] ';

        const fullName = `${prefix}${item.name}`;
        const maxTitleW = innerWidth - squaresTotalW - 12;

        ctx.font = `600 13px ${SANS_FONT}`;
        ctx.fillStyle = palette.textPrimary;
        ctx.textBaseline = 'top';
        const displayTitle = truncateText(ctx, fullName, maxTitleW);
        ctx.fillText(displayTitle, innerX, curY + 6);

        // 第二行：份量 + 粉紅熱量膠囊
        const subY = curY + 28;
        ctx.font = `500 11px ${MONO_FONT}`;
        ctx.fillStyle = palette.textSecondary;
        ctx.textBaseline = 'middle';

        const amountStr = 'amount' in item && item.amount ? `${item.amount} · ` : '';
        ctx.fillText(amountStr, innerX, subY);
        const amountW = ctx.measureText(amountStr).width;

        // 粉紅熱量微膠囊 (圖片 2 特徵)
        const calTag = `${item.calories} kcal`;
        ctx.font = `600 10px ${MONO_FONT}`;
        const calTagW = ctx.measureText(calTag).width + 10;
        const calTagX = innerX + amountW;
        drawRoundedBox(
          ctx,
          calTagX,
          subY - 8,
          calTagW,
          17,
          4,
          palette.caloriesBg,
          palette.caloriesBorder,
          1
        );
        ctx.fillStyle = palette.calories;
        ctx.fillText(calTag, calTagX + 5, subY);

        ctx.restore();
      }

      curY += itemRowH;
    });
  }

  curY += innerPad - 6;
  const totalCardH = curY - startY;

  return startY + totalCardH + rc.cardGap;
}

function roundNum(val: number): number | string {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round(val * 10) / 10;
}

/**
 * 訓練紀錄卡片 (獨立 Bento 卡片)
 */
function renderWorkoutSection(
  rc: RenderContext,
  workout: ExportWorkoutSection,
  startY: number
): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const innerPad = 16;
  const innerWidth = cardWidth - innerPad * 2;
  const innerX = paddingX + innerPad;

  let curY = startY + innerPad;

  // 1. 訓練概要 Bar
  if (!isMeasureOnly) {
    ctx.save();
    ctx.font = `700 14px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'top';
    ctx.fillText('訓練概要 · WORKOUT', innerX, curY);

    // 右側膠囊 (總組數)
    const setsText = `${workout.summary.totalSets} 組訓練`;
    ctx.font = `600 11px ${MONO_FONT}`;
    const setsW = ctx.measureText(setsText).width + 14;
    const setsX = innerX + innerWidth - setsW;
    drawRoundedBox(ctx, setsX, curY - 2, setsW, 22, 6, palette.pillSubtleBg, palette.border, 1);
    ctx.fillStyle = palette.textSecondary;
    ctx.textBaseline = 'middle';
    ctx.fillText(setsText, setsX + 7, curY + 9);
    ctx.restore();
  }
  curY += 32;

  // 2. 3 格 Bento 統計 (動作數 / 總組數 / 總容量)
  const statGap = 8;
  const statW = (innerWidth - statGap * 2) / 3;
  const stats = [
    { label: '動作數', val: `${workout.summary.totalExercises}` },
    { label: '總組數', val: `${workout.summary.totalSets}` },
    { label: `總容量 (${workout.summary.weightUnit})`, val: `${workout.summary.totalVolume.toLocaleString()}` },
  ];

  const statH = 46;
  if (!isMeasureOnly) {
    ctx.save();
    stats.forEach((st, idx) => {
      const bx = innerX + idx * (statW + statGap);
      drawRoundedBox(ctx, bx, curY, statW, statH, 8, palette.pillSubtleBg, palette.border, 1);
      ctx.font = `500 10px ${SANS_FONT}`;
      ctx.fillStyle = palette.textTertiary;
      ctx.textBaseline = 'top';
      ctx.fillText(st.label, bx + 10, curY + 8);

      ctx.font = `700 15px ${MONO_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(st.val, bx + 10, curY + 22);
    });
    ctx.restore();
  }
  curY += statH + 16;

  // 3. 動作列表
  if (workout.sessions.length === 0) {
    if (!isMeasureOnly) {
      ctx.save();
      ctx.font = `500 11px ${SANS_FONT}`;
      ctx.fillStyle = palette.textTertiary;
      ctx.textBaseline = 'top';
      ctx.fillText('當日無訓練記錄', innerX, curY);
      ctx.restore();
    }
    curY += 24;
  } else {
    for (const session of workout.sessions) {
      if (session.routineTitle) {
        if (!isMeasureOnly) {
          ctx.save();
          ctx.font = `600 11px ${MONO_FONT}`;
          const rText = `課表 · ${session.routineTitle}`;
          const rW = ctx.measureText(rText).width + 16;
          drawRoundedBox(ctx, innerX, curY, rW, 22, 6, palette.pillSubtleBg, palette.border, 1);
          ctx.fillStyle = palette.textSecondary;
          ctx.textBaseline = 'middle';
          ctx.fillText(rText, innerX + 8, curY + 11);
          ctx.restore();
        }
        curY += 28;
      }

      for (const ex of session.exercises) {
        if (!isMeasureOnly) {
          ctx.save();
          ctx.font = `700 13px ${SANS_FONT}`;
          ctx.fillStyle = palette.textPrimary;
          ctx.textBaseline = 'top';
          ctx.fillText(ex.name, innerX, curY);

          // 標籤 (器械與肌群)
          const tags: string[] = [ex.equipment];
          if (ex.primaryMuscles.length > 0) {
            tags.push(`主: ${ex.primaryMuscles.join('、')}`);
          }
          const tagStr = tags.join(' · ');
          ctx.font = `500 10px ${SANS_FONT}`;
          ctx.fillStyle = palette.textTertiary;
          const tagW = ctx.measureText(tagStr).width;
          ctx.fillText(tagStr, innerX + innerWidth - tagW, curY + 1);
          ctx.restore();
        }
        curY += 20;

        // 組數清單
        for (const s of ex.sets) {
          if (!isMeasureOnly) {
            ctx.save();
            ctx.font = `500 11px ${MONO_FONT}`;
            ctx.fillStyle = palette.textSecondary;
            ctx.textBaseline = 'middle';
            ctx.fillText(`第 ${s.setNumber} 組`, innerX + 8, curY + 9);

            const detailStr = `${s.weight} ${s.unit} × ${s.reps} 次${s.rpe ? ` @ RPE ${s.rpe}` : ''}`;
            const detailW = ctx.measureText(detailStr).width;
            ctx.fillStyle = palette.textPrimary;
            ctx.fillText(detailStr, innerX + innerWidth - detailW - 8, curY + 9);
            ctx.restore();
          }
          curY += 18;
        }
        curY += 8;
      }
    }
  }

  curY += innerPad - 6;
  const totalCardH = curY - startY;

  return startY + totalCardH + rc.cardGap;
}

/**
 * 身體數據卡片 (獨立 Bento 卡片)
 */
function renderBodyCard(
  rc: RenderContext,
  body: ExportBodySection,
  startY: number
): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const innerPad = 16;
  const innerWidth = cardWidth - innerPad * 2;
  const innerX = paddingX + innerPad;

  let curY = startY + innerPad;

  // 1. 標題
  if (!isMeasureOnly) {
    ctx.save();
    ctx.font = `700 14px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'top';
    ctx.fillText('身體數據 · BODY', innerX, curY);
    ctx.restore();
  }
  curY += 26;

  const hasData =
    body.weight !== undefined ||
    body.trendWeight !== undefined ||
    body.bodyFat !== undefined ||
    body.circumferences.length > 0;

  if (!hasData) {
    if (!isMeasureOnly) {
      ctx.save();
      ctx.font = `500 11px ${SANS_FONT}`;
      ctx.fillStyle = palette.textTertiary;
      ctx.textBaseline = 'top';
      ctx.fillText('當日無身體數據記錄', innerX, curY);
      ctx.restore();
    }
    curY += 24;
  } else {
    // 體重大字
    if (body.weight !== undefined) {
      if (!isMeasureOnly) {
        ctx.save();
        ctx.font = `700 32px ${MONO_FONT}`;
        ctx.fillStyle = palette.textPrimary;
        ctx.textBaseline = 'alphabetic';
        const wStr = `${body.weight}`;
        ctx.fillText(wStr, innerX, curY + 28);
        const wStrW = ctx.measureText(wStr).width;

        ctx.font = `500 14px ${MONO_FONT}`;
        ctx.fillStyle = palette.textSecondary;
        ctx.fillText(` ${body.weightUnit}`, innerX + wStrW, curY + 28);

        // 趨勢體重 / 體脂標籤
        const tags: string[] = [];
        if (body.trendWeight !== undefined) {
          tags.push(`趨勢: ${body.trendWeight} ${body.weightUnit}`);
        }
        if (body.bodyFat !== undefined) {
          tags.push(`體脂: ${body.bodyFat}%`);
        }

        if (tags.length > 0) {
          const metaStr = tags.join(' · ');
          ctx.font = `600 11px ${MONO_FONT}`;
          const metaW = ctx.measureText(metaStr).width + 16;
          const metaX = innerX + innerWidth - metaW;
          drawRoundedBox(
            ctx,
            metaX,
            curY + 8,
            metaW,
            24,
            6,
            palette.pillSubtleBg,
            palette.border,
            1
          );
          ctx.fillStyle = palette.textSecondary;
          ctx.textBaseline = 'middle';
          ctx.fillText(metaStr, metaX + 8, curY + 20);
        }
        ctx.restore();
      }
      curY += 42;
    }

    // 圍度膠囊
    if (body.circumferences.length > 0) {
      curY += 4;
      if (!isMeasureOnly) {
        ctx.save();
        ctx.font = `600 10px ${SANS_FONT}`;
        ctx.fillStyle = palette.textTertiary;
        ctx.textBaseline = 'top';
        ctx.fillText('圍度紀錄', innerX, curY);
        ctx.restore();
      }
      curY += 18;

      if (!isMeasureOnly) {
        ctx.save();
        let curX = innerX;
        let curRowY = curY;

        for (const c of body.circumferences) {
          const itemText = `${c.label} ${c.value} ${c.unit}`;
          ctx.font = `500 10px ${MONO_FONT}`;
          const itemW = ctx.measureText(itemText).width + 14;

          if (curX + itemW > innerX + innerWidth && curX !== innerX) {
            curX = innerX;
            curRowY += 24;
          }

          drawRoundedBox(
            ctx,
            curX,
            curRowY,
            itemW,
            20,
            5,
            palette.pillSubtleBg,
            palette.border,
            1
          );
          ctx.fillStyle = palette.textSecondary;
          ctx.textBaseline = 'middle';
          ctx.fillText(itemText, curX + 7, curRowY + 10);

          curX += itemW + 6;
        }
        ctx.restore();
      }

      let testX = innerX;
      let rows = 1;
      for (const c of body.circumferences) {
        const itemText = `${c.label} ${c.value} ${c.unit}`;
        const itemW = 10 * itemText.length * 0.6 + 14;
        if (testX + itemW > innerX + innerWidth && testX !== innerX) {
          testX = innerX;
          rows++;
        }
        testX += itemW + 6;
      }
      curY += rows * 24;
    }
  }

  curY += innerPad - 6;
  const totalCardH = curY - startY;

  return startY + totalCardH + rc.cardGap;
}

/**
 * 底部 Footer
 */
function renderFooter(rc: RenderContext, y: number): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const footerH = 24;

  if (!isMeasureOnly) {
    ctx.save();
    ctx.font = `600 10px ${MONO_FONT}`;
    ctx.fillStyle = palette.textTertiary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ZENFIT · LOCAL-FIRST FITNESS TRACKER', paddingX + cardWidth / 2, y + 12);
    ctx.restore();
  }

  return y + footerH + 20;
}

/**
 * 核心渲染程序：透過 Two-pass 計算高度並繪製「獨立卡片流 (Separated Card Stack)」
 */
export function renderDailyExportToCanvas(
  payload: DailyExportPayload,
  options?: GenerateExportImageOptions
): HTMLCanvasElement {
  const isDark =
    options?.theme === 'dark' ||
    (options?.theme === undefined &&
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'));

  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const width = options?.width || 480;
  const dpr = options?.dpr || 2;
  const paddingX = 20;
  const cardWidth = width - paddingX * 2;
  const cardGap = 12;

  // 1. Pass 1: 測量總高度
  const measureCanvas =
    typeof document !== 'undefined'
      ? document.createElement('canvas')
      : ({
          getContext: () => ({
            measureText: (txt: string) => ({ width: txt.length * 7 }),
          }),
        } as unknown as HTMLCanvasElement);

  const measureCtx = measureCanvas.getContext('2d') as CanvasRenderingContext2D;

  const measureRc: RenderContext = {
    ctx: measureCtx,
    palette,
    width,
    paddingX,
    cardWidth,
    cardGap,
    isMeasureOnly: true,
  };

  let measuredY = 24;
  measuredY = renderHeader(measureRc, payload, measuredY);

  if (payload.diet) {
    // 頂部熱量 Hero Card
    measuredY = renderCaloriesHeroCard(measureRc, payload.diet, measuredY);

    // 各餐次獨立卡片
    for (const meal of payload.diet.meals) {
      measuredY = renderMealCard(measureRc, meal, measuredY);
    }
  }

  if (payload.workout) {
    measuredY = renderWorkoutSection(measureRc, payload.workout, measuredY);
  }

  if (payload.body) {
    measuredY = renderBodyCard(measureRc, payload.body, measuredY);
  }

  measuredY = renderFooter(measureRc, measuredY);
  const totalHeight = measuredY;

  // 2. Pass 2: 建立目標 Canvas 並繪製底色與卡片
  const canvas =
    typeof document !== 'undefined'
      ? document.createElement('canvas')
      : (measureCanvas as HTMLCanvasElement);

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(totalHeight * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.scale(dpr, dpr);

  // 繪製畫布底色
  ctx.fillStyle = palette.canvasBg;
  ctx.fillRect(0, 0, width, totalHeight);

  const drawRc: RenderContext = {
    ctx,
    palette,
    width,
    paddingX,
    cardWidth,
    cardGap,
    isMeasureOnly: false,
  };

  let drawY = 24;
  drawY = renderHeader(drawRc, payload, drawY);

  if (payload.diet) {
    // 先畫卡片背景底色，再畫內部文字與進度條
    const startHeroY = drawY;
    const endHeroY = renderCaloriesHeroCard(measureRc, payload.diet, startHeroY);
    const heroCardH = endHeroY - startHeroY - cardGap;
    drawRoundedBox(ctx, paddingX, startHeroY, cardWidth, heroCardH, 16, palette.cardBg, palette.border, 1);
    renderCaloriesHeroCard(drawRc, payload.diet, startHeroY);
    drawY = endHeroY;

    // 各餐次獨立卡片
    for (const meal of payload.diet.meals) {
      const startMealY = drawY;
      const endMealY = renderMealCard(measureRc, meal, startMealY);
      const mealCardH = endMealY - startMealY - cardGap;
      drawRoundedBox(ctx, paddingX, startMealY, cardWidth, mealCardH, 16, palette.cardBg, palette.border, 1);
      renderMealCard(drawRc, meal, startMealY);
      drawY = endMealY;
    }
  }

  if (payload.workout) {
    const startWorkoutY = drawY;
    const endWorkoutY = renderWorkoutSection(measureRc, payload.workout, startWorkoutY);
    const workoutCardH = endWorkoutY - startWorkoutY - cardGap;
    drawRoundedBox(ctx, paddingX, startWorkoutY, cardWidth, workoutCardH, 16, palette.cardBg, palette.border, 1);
    renderWorkoutSection(drawRc, payload.workout, startWorkoutY);
    drawY = endWorkoutY;
  }

  if (payload.body) {
    const startBodyY = drawY;
    const endBodyY = renderBodyCard(measureRc, payload.body, startBodyY);
    const bodyCardH = endBodyY - startBodyY - cardGap;
    drawRoundedBox(ctx, paddingX, startBodyY, cardWidth, bodyCardH, 16, palette.cardBg, palette.border, 1);
    renderBodyCard(drawRc, payload.body, startBodyY);
    drawY = endBodyY;
  }

  renderFooter(drawRc, drawY);

  return canvas;
}

/**
 * 生成 PNG Blob
 */
export async function generateDailyExportImageBlob(
  payload: DailyExportPayload,
  options?: GenerateExportImageOptions
): Promise<Blob> {
  const canvas = renderDailyExportToCanvas(payload, options);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate image blob from canvas'));
      }
    }, 'image/png');
  });
}

/**
 * 生成 Data URL (用於預覽)
 */
export function generateDailyExportImageDataUrl(
  payload: DailyExportPayload,
  options?: GenerateExportImageOptions
): string {
  const canvas = renderDailyExportToCanvas(payload, options);
  return canvas.toDataURL('image/png');
}
