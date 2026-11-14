import type {
  DailyExportPayload,
  ExportDietSection,
  ExportMealGroup,
  ExportWorkoutSection,
  ExportBodySection,
} from './aiDataExport';
import { evaluateNutritionalHighlight } from '../utils/nutritionEvaluation';
import {
  MALE_OUTLINE_FRONT,
  MALE_OUTLINE_BACK,
  BODY_FRONT_PARTS,
  BODY_BACK_PARTS,
} from '../components/workout/bodyModelData';
import {
  getDetailedMusclesForSlug,
  type BodyPartSlug,
} from '../utils/muscleHighlight';

export interface GenerateExportImageOptions {
  theme?: 'dark' | 'light';
  dpr?: number;
  width?: number;
}

export interface ImagePalette {
  canvasBg: string;
  cardBg: string;
  cardHeaderBg: string;
  cardSubtleBg: string;
  border: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  pillBg: string;
  pillText: string;
  pillSubtleBg: string;
  pillSubtleBorder: string;
  calories: string;
  caloriesBg: string;
  caloriesBorder: string;
  caloriesText: string;
  calorieLowBg: string;
  calorieLowBorder: string;
  calorieLowText: string;
  carbs: string;
  carbsBg: string;
  carbsBorder: string;
  carbsSubtle: string;
  protein: string;
  proteinBg: string;
  proteinBorder: string;
  proteinSubtle: string;
  fat: string;
  fatBg: string;
  fatBorder: string;
  fatSubtle: string;
  macroNeutralBg: string;
  macroNeutralBorder: string;
  macroNeutralLabel: string;
  trackBg: string;
  progressBar: string;
  muscleBaseFill: string;
  muscleBaseStroke: string;
  muscleOutline: string;
  muscleHighlightFill: string;
  muscleHighlightStroke: string;
  muscleRecoveringPillBg: string;
  muscleRecoveringPillBorder: string;
  muscleRecoveringPillText: string;
}

export const LIGHT_PALETTE: ImagePalette = {
  canvasBg: '#ffffff',
  cardBg: '#ffffff',
  cardHeaderBg: 'rgba(0, 0, 0, 0.025)',
  cardSubtleBg: '#fafafa',
  border: '#eaeaea',
  divider: '#eaeaea',
  textPrimary: '#09090b',
  textSecondary: '#666666',
  textTertiary: '#a1a1aa',
  pillBg: '#09090b',
  pillText: '#ffffff',
  pillSubtleBg: 'rgba(0, 0, 0, 0.03)',
  pillSubtleBorder: 'rgba(0, 0, 0, 0.12)',
  calories: '#e11d48',
  caloriesBg: 'rgba(225, 29, 72, 0.06)',
  caloriesBorder: 'rgba(225, 29, 72, 0.16)',
  caloriesText: '#e11d48',
  calorieLowBg: 'rgba(16, 185, 129, 0.06)',
  calorieLowBorder: 'rgba(16, 185, 129, 0.16)',
  calorieLowText: '#059669',
  carbs: '#d97706',
  carbsBg: 'rgba(217, 119, 6, 0.035)',
  carbsBorder: 'rgba(217, 119, 6, 0.20)',
  carbsSubtle: 'rgba(217, 119, 6, 0.15)',
  protein: '#0284c7',
  proteinBg: 'rgba(2, 132, 199, 0.035)',
  proteinBorder: 'rgba(2, 132, 199, 0.20)',
  proteinSubtle: 'rgba(2, 132, 199, 0.15)',
  fat: '#7c3aed',
  fatBg: 'rgba(124, 58, 237, 0.035)',
  fatBorder: 'rgba(124, 58, 237, 0.20)',
  fatSubtle: 'rgba(124, 58, 237, 0.15)',
  macroNeutralBg: 'rgba(0, 0, 0, 0.02)',
  macroNeutralBorder: '#eaeaea',
  macroNeutralLabel: '#888888',
  trackBg: '#e4e4e7',
  progressBar: '#09090b',
  muscleBaseFill: '#e4e4e7',
  muscleBaseStroke: '#d4d4d8',
  muscleOutline: 'rgba(0, 0, 0, 0.40)',
  muscleHighlightFill: '#f87171',
  muscleHighlightStroke: '#ef4444',
  muscleRecoveringPillBg: 'rgba(239, 68, 68, 0.08)',
  muscleRecoveringPillBorder: 'rgba(239, 68, 68, 0.35)',
  muscleRecoveringPillText: '#e11d48',
};

export const DARK_PALETTE: ImagePalette = {
  canvasBg: '#000000',
  cardBg: '#000000',
  cardHeaderBg: 'rgba(255, 255, 255, 0.03)',
  cardSubtleBg: '#111111',
  border: '#333333',
  divider: '#222222',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textTertiary: '#71717a',
  pillBg: '#ffffff',
  pillText: '#09090b',
  pillSubtleBg: 'rgba(255, 255, 255, 0.04)',
  pillSubtleBorder: 'rgba(255, 255, 255, 0.15)',
  calories: '#f43f5e',
  caloriesBg: 'rgba(244, 63, 94, 0.12)',
  caloriesBorder: 'rgba(244, 63, 94, 0.24)',
  caloriesText: '#f43f5e',
  calorieLowBg: 'rgba(52, 211, 153, 0.12)',
  calorieLowBorder: 'rgba(52, 211, 153, 0.24)',
  calorieLowText: '#34d399',
  carbs: '#f59e0b',
  carbsBg: 'rgba(245, 158, 11, 0.05)',
  carbsBorder: 'rgba(245, 158, 11, 0.20)',
  carbsSubtle: 'rgba(245, 158, 11, 0.18)',
  protein: '#38bdf8',
  proteinBg: 'rgba(56, 189, 248, 0.05)',
  proteinBorder: 'rgba(56, 189, 248, 0.20)',
  proteinSubtle: 'rgba(56, 189, 248, 0.18)',
  fat: '#a78bfa',
  fatBg: 'rgba(167, 139, 250, 0.05)',
  fatBorder: 'rgba(167, 139, 250, 0.20)',
  fatSubtle: 'rgba(167, 139, 250, 0.18)',
  macroNeutralBg: 'rgba(255, 255, 255, 0.03)',
  macroNeutralBorder: '#333333',
  macroNeutralLabel: '#71717a',
  trackBg: '#27272a',
  progressBar: '#ffffff',
  muscleBaseFill: '#27272a',
  muscleBaseStroke: '#3f3f46',
  muscleOutline: 'rgba(255, 255, 255, 0.40)',
  muscleHighlightFill: '#ef4444',
  muscleHighlightStroke: '#f87171',
  muscleRecoveringPillBg: 'rgba(239, 68, 68, 0.16)',
  muscleRecoveringPillBorder: 'rgba(239, 68, 68, 0.45)',
  muscleRecoveringPillText: '#fb7185',
};

const SANS_FONT =
  'Inter Variable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "PingFang TC", "Microsoft YaHei", sans-serif';
const MONO_FONT =
  'JetBrains Mono Variable, JetBrains Mono, "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace';

function parseAmount(amountStr?: string): { servingSize: number; servingUnit: string } {
  if (!amountStr) return { servingSize: 100, servingUnit: 'g' };
  const match = amountStr.match(/^([\d.]+)\s*([a-zA-Z]+)?/);
  if (!match) return { servingSize: 100, servingUnit: 'g' };
  const size = parseFloat(match[1]);
  const unit = match[2] || 'g';
  return {
    servingSize: isNaN(size) || size <= 0 ? 100 : size,
    servingUnit: unit,
  };
}

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

function drawRoundedTopBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill?: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.restore();
}

function drawChevronDown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  stroke: string,
  lineWidth = 1.4
) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const half = size / 2;
  ctx.moveTo(cx - half, cy - half * 0.4);
  ctx.lineTo(cx, cy + half * 0.5);
  ctx.lineTo(cx + half, cy - half * 0.4);
  ctx.stroke();
  ctx.restore();
}

function drawPlusIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  stroke: string,
  lineWidth = 1.4
) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const half = size / 2;
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx + half, cy);
  ctx.moveTo(cx, cy - half);
  ctx.lineTo(cx, cy + half);
  ctx.stroke();
  ctx.restore();
}

const LOGO_PATHS = [
  {
    d: 'M0 15.2344L0 7.61719C0 5.51376 0.743674 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743674 128.313 0 126.517 0 124.414L0 15.2344Z',
    tx: 0,
    ty: 0,
  },
  {
    d: 'M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23102 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23102 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z',
    tx: 40.625,
    ty: 0,
  },
  {
    d: 'M0 15.2344L0 7.61719C0 5.51376 0.743675 3.71837 2.23103 2.23102C3.71837 0.743674 5.51376 0 7.61719 0L12.6953 0C14.7987 0 16.5941 0.743674 18.0815 2.23102C19.5688 3.71837 20.3125 5.51376 20.3125 7.61719L20.3125 124.414C20.3125 126.517 19.5688 128.313 18.0815 129.8C16.5941 131.288 14.7987 132.031 12.6953 132.031L7.61719 132.031C5.51376 132.031 3.71837 131.288 2.23103 129.8C0.743675 128.313 0 126.517 0 124.414L0 15.2344Z',
    tx: 81.25,
    ty: 0,
  },
  {
    d: 'M0 0L101.562 0C101.562 0 101.562 55.8594 101.562 55.8594C101.562 86.3281 81.25 106.641 50.7812 106.641C20.3125 106.641 0 86.3281 0 55.8594C0 55.8594 0 0 0 0Z',
    tx: 0,
    ty: 111.719,
  },
  {
    d: 'M0 28.111L0 14.0555C0 10.1742 1.23946 6.86128 3.71837 4.11676C6.19728 1.37225 9.1896 0 12.6953 0C16.201 0 19.1933 1.37225 21.6722 4.11676C24.1512 6.86128 25.3906 10.1742 25.3906 14.0555L25.3906 261.433C25.3906 265.314 24.1512 268.627 21.6722 271.371C19.1933 274.116 16.201 275.488 12.6953 275.488C9.1896 275.488 6.19728 274.116 3.71837 271.371C1.23946 268.627 0 265.314 0 261.433L0 28.111Z',
    tx: 38.086,
    ty: 191.699,
  },
  {
    d: 'M0 20.3125L0 10.1562C0 7.35168 0.991562 4.95783 2.9747 2.9747C4.95782 0.991565 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991565 134.135 2.9747C136.118 4.95783 137.109 7.35168 137.109 10.1562L137.109 55.8594C137.109 58.6639 136.118 61.0578 134.135 63.0409C132.151 65.024 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.024 2.9747 63.0409C0.991562 61.0578 0 58.6639 0 55.8594L0 20.3125Z',
    tx: 248.828,
    ty: 0,
  },
  {
    d: 'M0 8.88671L0 5.07812C0 3.67583 0.495789 2.47891 1.48734 1.48735C2.47891 0.495781 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495781 89.9189 1.48735C90.9105 2.47891 91.4063 3.67583 91.4063 5.07812L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88671Z',
    tx: 271.68,
    ty: 66.016,
  },
  {
    d: 'M0 17.0418L0 8.52092C0 6.16794 0.743683 4.15953 2.23102 2.49572C3.71838 0.831909 5.51376 0 7.61719 0L27.9297 0C30.0331 0 31.8285 0.831909 33.3159 2.49572C34.8032 4.15953 35.5469 6.16794 35.5469 8.52092L35.5469 326.635C35.5469 328.988 34.8032 330.997 33.3159 332.661C31.8285 334.324 30.0331 335.156 27.9297 335.156L7.61719 335.156C5.51376 335.156 3.71838 334.324 2.23102 332.661C0.743683 330.997 0 328.988 0 326.635L0 17.0418Z',
    tx: 299.609,
    ty: 66.016,
  },
  {
    d: 'M0 8.88672L0 5.07813C0 3.67584 0.495789 2.47891 1.48734 1.48734C2.47891 0.495789 3.67584 0 5.07813 0L86.3281 0C87.7304 0 88.9273 0.495789 89.9189 1.48734C90.9105 2.47891 91.4063 3.67584 91.4063 5.07813L91.4063 12.6953C91.4063 14.0976 90.9105 15.2945 89.9189 16.2861C88.9273 17.2776 87.7304 17.7734 86.3281 17.7734L5.07813 17.7734C3.67584 17.7734 2.47891 17.2776 1.48734 16.2861C0.495789 15.2945 0 14.0976 0 12.6953L0 8.88672Z',
    tx: 271.68,
    ty: 383.398,
  },
  {
    d: 'M0 20.3125L0 10.1563C0 7.35168 0.991562 4.95782 2.9747 2.9747C4.95782 0.991577 7.35168 0 10.1563 0L126.953 0C129.758 0 132.151 0.991577 134.135 2.9747C136.118 4.95782 137.109 7.35168 137.109 10.1563L137.109 55.8594C137.109 58.664 136.118 61.0578 134.135 63.041C132.151 65.0241 129.758 66.0156 126.953 66.0156L10.1563 66.0156C7.35168 66.0156 4.95782 65.0241 2.9747 63.041C0.991562 61.0578 0 58.664 0 55.8594L0 20.3125Z',
    tx: 248.828,
    ty: 401.172,
  },
];

function drawZenfitLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  stroke?: string
) {
  ctx.save();
  const radius = size * 0.234;
  drawRoundedBox(ctx, x, y, size, size, radius, '#000000', stroke, 1);

  if (typeof Path2D !== 'undefined') {
    const scale = size / 1024;
    ctx.save();
    ctx.translate(x + 187 * scale, y + 187 * scale);
    ctx.translate(132.031 * scale, 91.406 * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';

    for (const item of LOGO_PATHS) {
      ctx.save();
      ctx.translate(item.tx, item.ty);
      const p = new Path2D(item.d);
      ctx.fill(p);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
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
 * 頂部 Header：品牌標誌、Zenfit 名稱、副標、日期與範圍膠囊
 */
function renderHeader(rc: RenderContext, payload: DailyExportPayload, y: number): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const headerHeight = 44;

  if (!isMeasureOnly) {
    ctx.save();

    // 頂部 Header 統一垂直中軸線 (44px 高度之正中心 y + 22)
    const centerY = y + Math.round(headerHeight / 2);

    // 品牌 Logo (名稱左側附上官方 Logo 圓角黑底白標，尺寸 30x30，中心對齊 centerY)
    const logoSize = 30;
    const logoY = centerY - Math.round(logoSize / 2); // y + 7
    drawZenfitLogo(ctx, paddingX, logoY, logoSize, palette.border);

    // 品牌文字區塊 (X 軸左對齊，垂直方向與 Logo 嚴格視覺對齊)
    const brandTextX = paddingX + logoSize + 9;

    // 1. 主名稱 Zenfit (字號 16px，頂部大寫字形與 Logo 頂部完美平齊)
    ctx.font = `700 16px ${MONO_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('Zenfit', brandTextX, centerY - 7);

    // 2. 子標題 DAILY SNAPSHOT (字號 9.5px，底部與 Logo 底部精準呼應收束)
    ctx.font = `500 9.5px ${MONO_FONT}`;
    ctx.fillStyle = palette.textTertiary;
    ctx.textBaseline = 'middle';
    ctx.fillText('DAILY SNAPSHOT', brandTextX, centerY + 8);

    // 右側膠囊標籤 (高度 22px，中心同樣嚴格對齊 centerY)
    const pillHeight = 22;
    const pillY = centerY - Math.round(pillHeight / 2);

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
    drawRoundedBox(ctx, scopeX, pillY, scopeWidth, pillHeight, 6, palette.pillBg);
    ctx.fillStyle = palette.pillText;
    ctx.textBaseline = 'middle';
    ctx.fillText(scopeText, scopeX + 7, centerY);

    // 日期膠囊 (高度 22px，中心對齊 centerY)
    ctx.font = `500 11px ${MONO_FONT}`;
    const dateText = payload.date;
    const dateWidth = ctx.measureText(dateText).width + 16;
    const dateX = scopeX - dateWidth - 8;
    drawRoundedBox(
      ctx,
      dateX,
      pillY,
      dateWidth,
      pillHeight,
      6,
      palette.cardSubtleBg,
      palette.border,
      1
    );
    ctx.fillStyle = palette.textSecondary;
    ctx.textBaseline = 'middle';
    ctx.fillText(dateText, dateX + 8, centerY);

    ctx.restore();
  }

  return y + headerHeight + rc.cardGap;
}

/**
 * 頂部熱量統計卡片 (100% 像素級還原 App 真實 UI)
 */
function renderCaloriesHeroCard(
  rc: RenderContext,
  diet: ExportDietSection,
  startY: number
): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const innerPad = 16;
  const innerWidth = cardWidth - innerPad * 2;

  let curY = startY + innerPad;

  // 1. 卡片頂部 Bar: 居中「熱量統計」標題
  if (!isMeasureOnly) {
    ctx.save();
    ctx.font = `400 13px ${SANS_FONT}`;
    ctx.fillStyle = palette.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('熱量統計', paddingX + cardWidth / 2, curY + 6);
    ctx.restore();
  }
  curY += 16;

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

    ctx.font = `400 14px ${MONO_FONT}`;
    const unitStr = `${eUnit}`;
    const unitStrW = ctx.measureText(unitStr).width;

    const totalHeroW = calStrW + unitStrW;
    const heroStartX = paddingX + (cardWidth - totalHeroW) / 2;

    ctx.font = `700 36px ${MONO_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(calStr, heroStartX, curY + 34);

    ctx.font = `400 14px ${MONO_FONT}`;
    ctx.fillStyle = palette.textSecondary;
    ctx.fillText(unitStr, heroStartX + calStrW, curY + 34);

    // 下方居中小字：剩餘 / 超額
    ctx.font = `400 13px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    if (remainingCal >= 0) {
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(`剩餘 ${remainingCal.toLocaleString()}${eUnit}`, paddingX + cardWidth / 2, curY + 54);
    } else {
      ctx.fillStyle = palette.calories;
      ctx.fillText(`超額 +${Math.abs(remainingCal).toLocaleString()}${eUnit}`, paddingX + cardWidth / 2, curY + 54);
    }

    ctx.restore();
  }
  curY += 66;

  // 3. 居中熱量進度條 (h-2 w-full max-w-[220px] mx-auto bg-track rounded-full)
  const calBarH = 8;
  const calBarMaxW = Math.min(220, innerWidth * 0.55);
  const calBarX = paddingX + (cardWidth - calBarMaxW) / 2;
  const calRatio = targetCal > 0 ? Math.min(1, Math.max(0, actualCal / targetCal)) : 0;
  if (!isMeasureOnly) {
    ctx.save();
    // 軌道 (rounded-full)
    drawRoundedBox(ctx, calBarX, curY, calBarMaxW, calBarH, 4, palette.trackBg);
    // 黑色/前景色進度條 (rounded-full)
    if (calRatio > 0) {
      drawRoundedBox(ctx, calBarX, curY, Math.max(calBarH, calBarMaxW * calRatio), calBarH, 4, palette.progressBar);
    }
    ctx.restore();
  }
  curY += calBarH + 20;

  // 4. 三大營養素三等分欄 (grid-cols-3 divide-x divide-border border-t border-border)
  const macroBarH = 78;
  const colW = cardWidth / 3;

  if (!isMeasureOnly) {
    ctx.save();
    // 頂部水平分割線 (滿版卡片寬度)
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.divider;
    ctx.beginPath();
    ctx.moveTo(paddingX, curY);
    ctx.lineTo(paddingX + cardWidth, curY);
    ctx.stroke();

    // 垂直分割線 1 & 2
    ctx.beginPath();
    ctx.moveTo(paddingX + colW, curY);
    ctx.lineTo(paddingX + colW, curY + macroBarH);
    ctx.moveTo(paddingX + colW * 2, curY);
    ctx.lineTo(paddingX + colW * 2, curY + macroBarH);
    ctx.stroke();

    const cols = [
      {
        label: '碳水化合物',
        actual: diet.actual.carbs,
        target: diet.target.carbs,
        color: palette.carbs,
        trackColor: palette.carbsSubtle,
      },
      {
        label: '蛋白質',
        actual: diet.actual.protein,
        target: diet.target.protein,
        color: palette.protein,
        trackColor: palette.proteinSubtle,
      },
      {
        label: '脂肪',
        actual: diet.actual.fat,
        target: diet.target.fat,
        color: palette.fat,
        trackColor: palette.fatSubtle,
      },
    ];

    cols.forEach((col, idx) => {
      const colStartX = paddingX + idx * colW + 14;
      const colInnerW = colW - 28;
      const colY = curY + 12;

      // 彩色標籤 (text-xs font-medium)
      ctx.font = `500 12px ${SANS_FONT}`;
      ctx.fillStyle = col.color;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(col.label, colStartX, colY);

      // 數值與目標 (font-mono: 107g /200g)
      const valY = colY + 20;
      ctx.font = `400 15px ${MONO_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      const actStr = `${Math.round(col.actual)}g`;
      ctx.fillText(actStr, colStartX, valY);
      const actW = ctx.measureText(actStr).width;

      ctx.font = `400 12px ${MONO_FONT}`;
      ctx.fillStyle = palette.textTertiary;
      ctx.fillText(`/${col.target}g`, colStartX + actW, valY + 2);

      // 底部彩色進度條 (h-2, rounded-full)
      const barY = valY + 22;
      const progressH = 8;
      drawRoundedBox(ctx, colStartX, barY, colInnerW, progressH, 4, col.trackColor);
      const ratio = col.target > 0 ? Math.min(1, Math.max(0, col.actual / col.target)) : 0;
      if (ratio > 0) {
        drawRoundedBox(ctx, colStartX, barY, Math.max(progressH, colInnerW * ratio), progressH, 4, col.color);
      }
    });

    ctx.restore();
  }
  curY += macroBarH;

  const totalCardH = curY - startY;

  return startY + totalCardH + rc.cardGap;
}

/**
 * 獨立餐次卡片 (灰底橫欄表頭 + divide-y 食物條目 + 柔和點亮 MacroSquares)
 */
function renderMealCard(
  rc: RenderContext,
  meal: ExportMealGroup,
  startY: number
): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const headerHeight = 40;
  let curY = startY;

  // 1. 餐次標題欄 (灰底橫欄 h-10 px-4 bg-muted/40 border-b border-border)
  if (!isMeasureOnly) {
    ctx.save();
    // 頂部圓角灰色背景 (8px 圓角)
    drawRoundedTopBox(ctx, paddingX, startY, cardWidth, headerHeight, 8, palette.cardHeaderBg);

    // 底部水平分割線
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.moveTo(paddingX, startY + headerHeight);
    ctx.lineTo(paddingX + cardWidth, startY + headerHeight);
    ctx.stroke();

    // 左側：餐別名稱 (font-semibold text-sm)
    const headerInnerX = paddingX + 16;
    ctx.font = `600 14px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(meal.mealLabel, headerInnerX, startY + 20);
    const mealLabelW = ctx.measureText(meal.mealLabel).width;

    if (meal.items.length > 0 && meal.calories > 0) {
      // 點號 ·
      const dotX = headerInnerX + mealLabelW + 6;
      ctx.font = `400 12px ${MONO_FONT}`;
      ctx.fillStyle = palette.textTertiary;
      ctx.fillText('·', dotX, startY + 20);

      // 熱量 popover trigger
      const popoverX = dotX + 10;
      const calText = `${meal.calories}kcal`;
      ctx.font = `500 12px ${MONO_FONT}`;
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(calText, popoverX, startY + 15);
      const calTextW = ctx.measureText(calText).width;

      // 微型箭頭
      drawChevronDown(ctx, popoverX + calTextW + 8, startY + 15, 6, palette.textSecondary);

      // 下半部：與數值同寬之供能色彩微標尺 (3px 高度, rounded-[1.5px])
      const totalPopW = calTextW + 14;
      const miniBarY = startY + 24;
      const miniBarH = 3;

      const carbCals = meal.carbs * 4;
      const proteinCals = meal.protein * 4;
      const fatCals = meal.fat * 9;
      const totalMacroCal = carbCals + proteinCals + fatCals;

      let cPercent = 0;
      let pPercent = 0;

      if (totalMacroCal > 0) {
        cPercent = Math.round((carbCals / totalMacroCal) * 100);
        pPercent = Math.round((proteinCals / totalMacroCal) * 100);
      }

      const cW = Math.max(1, Math.round(totalPopW * (cPercent / 100)));
      const pW = Math.max(1, Math.round(totalPopW * (pPercent / 100)));
      const fW = Math.max(1, totalPopW - cW - pW);

      drawRoundedRect(ctx, popoverX, miniBarY, totalPopW, miniBarH, 1.5);
      ctx.clip();
      ctx.fillStyle = palette.carbs;
      ctx.fillRect(popoverX, miniBarY, cW, miniBarH);
      ctx.fillStyle = palette.protein;
      ctx.fillRect(popoverX + cW, miniBarY, pW, miniBarH);
      ctx.fillStyle = palette.fat;
      ctx.fillRect(popoverX + cW + pW, miniBarY, fW, miniBarH);
    }

    // 右側：Plus「+」圖標按鈕
    drawPlusIcon(ctx, paddingX + cardWidth - 22, startY + 20, 14, palette.textSecondary);

    ctx.restore();
  }

  curY += headerHeight;

  // 2. 食物列表項目 (每筆項目高度約 58px，divide-y divide-border)
  if (meal.items.length === 0) {
    if (!isMeasureOnly) {
      ctx.save();
      ctx.font = `400 12px ${MONO_FONT}`;
      ctx.fillStyle = palette.textTertiary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('無記錄', paddingX + cardWidth / 2, curY + 24);
      ctx.restore();
    }
    curY += 48;
  } else {
    meal.items.forEach((item, itemIdx) => {
      // 項目上方分割線 (第一項已有 header border)
      if (itemIdx > 0) {
        if (!isMeasureOnly) {
          ctx.save();
          ctx.lineWidth = 1;
          ctx.strokeStyle = palette.divider;
          ctx.beginPath();
          ctx.moveTo(paddingX, curY);
          ctx.lineTo(paddingX + cardWidth, curY);
          ctx.stroke();
          ctx.restore();
        }
      }

      const itemRowH = 58;
      if (!isMeasureOnly) {
        ctx.save();

        // 營養評價：算出 highlights 與 high/low calorie 標籤
        const amountInfo = parseAmount('amount' in item ? item.amount : undefined);
        const evalRes = evaluateNutritionalHighlight({
          calories: item.calories,
          carbs: item.carbs,
          protein: item.protein,
          fat: item.fat,
          servingSize: amountInfo.servingSize,
          servingUnit: amountInfo.servingUnit,
        });

        // --- (A) 右側 MacroSquares：3 個方塊矩陣 (碳 / 蛋 / 脂) ---
        // 寬度 w-11 (44px), 高度 38px, 間距 gap-2 (8px), 圓角 4px
        const sqW = 44;
        const sqH = 38;
        const sqGap = 8;
        const squaresTotalW = sqW * 3 + sqGap * 2; // 148px
        const squaresStartX = paddingX + cardWidth - 16 - squaresTotalW;
        const sqY = curY + (itemRowH - sqH) / 2;

        const squares = [
          {
            tag: '碳',
            val: `${roundNum(item.carbs)}g`,
            isHighlighted: evalRes.highlights.carbs,
            color: palette.carbs,
            bg: palette.carbsBg,
            border: palette.carbsBorder,
          },
          {
            tag: '蛋',
            val: `${roundNum(item.protein)}g`,
            isHighlighted: evalRes.highlights.protein,
            color: palette.protein,
            bg: palette.proteinBg,
            border: palette.proteinBorder,
          },
          {
            tag: '脂',
            val: `${roundNum(item.fat)}g`,
            isHighlighted: evalRes.highlights.fat,
            color: palette.fat,
            bg: palette.fatBg,
            border: palette.fatBorder,
          },
        ];

        squares.forEach((sq, sIdx) => {
          const sX = squaresStartX + sIdx * (sqW + sqGap);
          const boxFill = sq.isHighlighted ? sq.bg : palette.macroNeutralBg;
          const boxBorder = sq.isHighlighted ? sq.border : palette.macroNeutralBorder;
          const tagColor = sq.isHighlighted ? sq.color : palette.macroNeutralLabel;
          const tagWeight = sq.isHighlighted ? '600' : '500';

          drawRoundedBox(ctx, sX, sqY, sqW, sqH, 4, boxFill, boxBorder, 1);

          // 頂部標籤 (text-[9px] uppercase)
          ctx.font = `${tagWeight} 9px ${MONO_FONT}`;
          ctx.fillStyle = tagColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sq.tag, sX + sqW / 2, sqY + 11);

          // 底部數值 (text-xs font-mono)
          ctx.font = `400 12px ${MONO_FONT}`;
          ctx.fillStyle = palette.textPrimary;
          ctx.fillText(sq.val, sX + sqW / 2, sqY + 26);
        });

        // --- (B) 左側品名與份量熱量副標 ---
        const leftX = paddingX + 16;
        const maxTitleW = squaresStartX - leftX - 12;

        let badgeText = '';
        if (item.type === 'estimate') badgeText = '⚡ 估算';
        if (item.type === 'as_planned') badgeText = '⚡ 配額';
        if (item.type === 'recipe') badgeText = '食譜';

        let titleStartX = leftX;
        if (badgeText) {
          ctx.font = `500 10px ${MONO_FONT}`;
          const bW = ctx.measureText(badgeText).width + 8;
          drawRoundedBox(ctx, titleStartX, curY + 11, bW, 18, 4, palette.pillSubtleBg, palette.border, 1);
          ctx.fillStyle = palette.textSecondary;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.fillText(badgeText, titleStartX + 4, curY + 20);
          titleStartX += bW + 6;
        }

        ctx.font = `500 14px ${SANS_FONT}`;
        ctx.fillStyle = palette.textPrimary;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        const displayTitle = truncateText(ctx, item.name, maxTitleW - (titleStartX - leftX));
        ctx.fillText(displayTitle, titleStartX, curY + 12);

        // 第二行：份量 + 熱量標籤
        const subY = curY + 36;
        ctx.font = `400 11px ${MONO_FONT}`;
        ctx.fillStyle = palette.textSecondary;
        ctx.textBaseline = 'middle';

        const amountStr = 'amount' in item && item.amount ? `${item.amount} ` : '';
        ctx.fillText(amountStr, leftX, subY);
        let curSubX = leftX + ctx.measureText(amountStr).width;

        if (amountStr) {
          ctx.fillStyle = palette.textTertiary;
          ctx.fillText('· ', curSubX, subY);
          curSubX += ctx.measureText('· ').width;
        }

        const isHighCal = evalRes.labels.includes('high-calorie');
        const isLowCal = evalRes.labels.includes('low-calorie');
        const calTag = `${item.calories}kcal`;

        if (isHighCal) {
          ctx.font = `500 11px ${MONO_FONT}`;
          const calTagW = ctx.measureText(calTag).width + 8;
          drawRoundedBox(ctx, curSubX, subY - 8, calTagW, 17, 3, palette.caloriesBg, undefined, 0);
          ctx.fillStyle = palette.caloriesText;
          ctx.fillText(calTag, curSubX + 4, subY);
        } else if (isLowCal) {
          ctx.font = `500 11px ${MONO_FONT}`;
          const calTagW = ctx.measureText(calTag).width + 8;
          drawRoundedBox(ctx, curSubX, subY - 8, calTagW, 17, 3, palette.calorieLowBg, undefined, 0);
          ctx.fillStyle = palette.calorieLowText;
          ctx.fillText(calTag, curSubX + 4, subY);
        } else {
          ctx.font = `400 11px ${MONO_FONT}`;
          ctx.fillStyle = palette.textSecondary;
          ctx.fillText(calTag, curSubX, subY);
        }

        ctx.restore();
      }

      curY += itemRowH;
    });
  }

  const totalCardH = curY - startY;

  return startY + totalCardH + rc.cardGap;
}

function roundNum(val: number): number | string {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round(val * 10) / 10;
}

const NON_MUSCLE_SLUGS = new Set<string>([
  'head',
  'hair',
  'neck',
  'knees',
  'ankles',
  'feet',
  'hands',
]);

/**
 * 在 Canvas 2D 上繪製雙向人體解剖熱力圖 (ANTERIOR + POSTERIOR)
 * 100% 像素級還原 App 中的 BodyHighlighter
 */
function drawBodyHighlighterOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  intensityMap: Partial<Record<string, number>>,
  palette: ImagePalette
): number {
  const mapHeight = width;
  const scale = width / 1448;

  ctx.save();
  if (typeof ctx.translate === 'function') {
    ctx.translate(x, y);
  }

  if (typeof Path2D !== 'undefined') {
    ctx.save();
    if (typeof ctx.scale === 'function') {
      ctx.scale(scale, scale);
    }

    const renderPartGroup = (slug: string, paths: string[], view: 'anterior' | 'posterior') => {
      const isNonMuscle = NON_MUSCLE_SLUGS.has(slug);
      let intensity = 0;
      if (!isNonMuscle) {
        const muscles = getDetailedMusclesForSlug(slug as BodyPartSlug, view);
        for (const m of muscles) {
          const val = intensityMap[m];
          if (typeof val === 'number' && val > intensity) {
            intensity = val;
          }
        }
      }

      const isStimulated = intensity > 0;
      const fill = isStimulated ? palette.muscleHighlightFill : palette.muscleBaseFill;
      const stroke = isStimulated ? palette.muscleHighlightStroke : palette.muscleBaseStroke;
      const strokeW = isStimulated ? 1.0 : 0.6;

      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const d of paths) {
        const p = new Path2D(d);
        ctx.fill(p);
        ctx.stroke(p);
      }
    };

    // 1. 正面肌肉與部位
    for (const group of BODY_FRONT_PARTS) {
      renderPartGroup(group.slug, group.paths, 'anterior');
    }

    // 2. 背面肌肉與部位
    for (const group of BODY_BACK_PARTS) {
      renderPartGroup(group.slug, group.paths, 'posterior');
    }

    // 3. 外圍人體精確剪影輪廓線
    ctx.strokeStyle = palette.muscleOutline;
    ctx.lineWidth = 1.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pFront = new Path2D(MALE_OUTLINE_FRONT);
    ctx.stroke(pFront);

    const pBack = new Path2D(MALE_OUTLINE_BACK);
    ctx.stroke(pBack);

    ctx.restore();
  }

  // 4. 底部極簡標籤: ANTERIOR / POSTERIOR (精準對齊雙向人體足底中軸)
  ctx.font = `600 10px ${MONO_FONT}`;
  ctx.fillStyle = palette.textTertiary;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // 正面中心: 362 / 1448 = 0.25
  ctx.fillText('ANTERIOR', width * 0.25, mapHeight + 6);
  // 背面中心: 1086 / 1448 = 0.75
  ctx.fillText('POSTERIOR', width * 0.75, mapHeight + 6);

  ctx.restore();

  return mapHeight + 22;
}

/**
 * 訓練 Hero 卡片 (1:1 復刻 App 頂部 WorkoutRecoveryDashboard：人體解剖熱力圖 + 3 欄指標)
 */
function renderWorkoutHeroCard(
  rc: RenderContext,
  workout: ExportWorkoutSection,
  startY: number
): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;

  const topBarH = 34;
  const mapW = Math.min(210, cardWidth - 40);
  const mapH = mapW + 22; // 210 + 22 = 232
  const statH = 68;
  const totalHeroH = topBarH + mapH + statH;

  if (!isMeasureOnly) {
    ctx.save();

    // 1. 頂部狀態膠囊 (右上角)
    const recoveringCount = workout.recovery?.recoveringCount ?? 0;
    if (recoveringCount > 0) {
      const pillText = `${recoveringCount} 個肌群恢復中`;
      ctx.font = `500 11px ${MONO_FONT}`;
      const pillW = ctx.measureText(pillText).width + 16;
      const pillX = paddingX + cardWidth - 16 - pillW;
      const pillY = startY + 10;

      drawRoundedBox(
        ctx,
        pillX,
        pillY,
        pillW,
        22,
        11,
        palette.muscleRecoveringPillBg,
        palette.muscleRecoveringPillBorder,
        1
      );
      ctx.fillStyle = palette.muscleRecoveringPillText;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(pillText, pillX + 8, pillY + 11);
    } else {
      const pillText = '全部肌群已就緒';
      ctx.font = `500 11px ${MONO_FONT}`;
      const pillW = ctx.measureText(pillText).width + 16;
      const pillX = paddingX + cardWidth - 16 - pillW;
      const pillY = startY + 10;

      drawRoundedBox(
        ctx,
        pillX,
        pillY,
        pillW,
        22,
        11,
        palette.pillSubtleBg,
        palette.border,
        1
      );
      ctx.fillStyle = palette.textTertiary;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(pillText, pillX + 8, pillY + 11);
    }

    // 2. 中央人體解剖熱力圖
    const mapX = paddingX + (cardWidth - mapW) / 2;
    const mapY = startY + topBarH + 2;
    drawBodyHighlighterOnCanvas(
      ctx,
      mapX,
      mapY,
      mapW,
      workout.recovery?.intensityMap || {},
      palette
    );

    // 3. 底部 3 欄客觀指標 (動作 / 完成組數 / 總容量)
    const bottomDividerY = startY + topBarH + mapH;
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.divider;
    ctx.beginPath();
    ctx.moveTo(paddingX, bottomDividerY);
    ctx.lineTo(paddingX + cardWidth, bottomDividerY);
    ctx.stroke();

    const colW = cardWidth / 3;
    // 兩條垂直分割線
    ctx.beginPath();
    ctx.moveTo(paddingX + colW, bottomDividerY);
    ctx.lineTo(paddingX + colW, bottomDividerY + statH);
    ctx.moveTo(paddingX + colW * 2, bottomDividerY);
    ctx.lineTo(paddingX + colW * 2, bottomDividerY + statH);
    ctx.stroke();

    const statsData = [
      {
        label: '動作',
        val: `${workout.summary.totalExercises}`,
        unit: ' 項',
      },
      {
        label: '完成組數',
        val: `${workout.summary.totalSets}`,
        unit: ' 組',
      },
      {
        label: '總容量',
        val: `${workout.summary.totalVolume.toLocaleString()}`,
        unit: `${workout.summary.weightUnit}`,
      },
    ];

    statsData.forEach((st, idx) => {
      const colX = paddingX + idx * colW + 16;
      const labelY = bottomDividerY + 14;
      const valY = bottomDividerY + 36;

      ctx.font = `500 12px ${SANS_FONT}`;
      ctx.fillStyle = palette.textSecondary;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(st.label, colX, labelY);

      // 數值大字 (font-mono font-bold 18px)
      ctx.font = `700 18px ${MONO_FONT}`;
      const numW = ctx.measureText(st.val).width;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(st.val, colX, valY);

      // 單位小字
      ctx.font = `400 12px ${MONO_FONT}`;
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(st.unit, colX + numW, valY + 5);
    });

    ctx.restore();
  }

  return startY + totalHeroH + rc.cardGap;
}

/**
 * 訓練記錄明細卡片 (動作、組數、重量次數清單)
 */
function renderWorkoutExercisesCard(
  rc: RenderContext,
  workout: ExportWorkoutSection,
  startY: number
): number {
  const { ctx, palette, paddingX, cardWidth, isMeasureOnly } = rc;
  const headerHeight = 40;
  let curY = startY;

  // 1. 標題欄 (灰底標頭)
  if (!isMeasureOnly) {
    ctx.save();
    drawRoundedTopBox(ctx, paddingX, startY, cardWidth, headerHeight, 8, palette.cardHeaderBg);

    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.moveTo(paddingX, startY + headerHeight);
    ctx.lineTo(paddingX + cardWidth, startY + headerHeight);
    ctx.stroke();

    const innerX = paddingX + 16;
    ctx.font = `600 14px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('訓練日誌', innerX, startY + 20);

    // 右側總組數膠囊
    const setsText = `${workout.summary.totalSets} 組`;
    ctx.font = `500 11px ${MONO_FONT}`;
    const setsW = ctx.measureText(setsText).width + 16;
    const setsX = paddingX + cardWidth - 16 - setsW;
    drawRoundedBox(ctx, setsX, startY + 9, setsW, 22, 11, palette.pillSubtleBg, palette.border, 1);
    ctx.fillStyle = palette.textSecondary;
    ctx.fillText(setsText, setsX + 8, startY + 20);
    ctx.restore();
  }
  curY += headerHeight + 14;

  const innerPad = 16;
  const innerWidth = cardWidth - innerPad * 2;
  const innerX = paddingX + innerPad;

  // 2. 動作清單
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

            const detailStr = `${s.weight}${s.unit} × ${s.reps} 次${s.rpe ? ` @ RPE ${s.rpe}` : ''}`;
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
  const headerHeight = 40;
  let curY = startY;

  // 1. 標題 (灰底橫欄)
  if (!isMeasureOnly) {
    ctx.save();
    drawRoundedTopBox(ctx, paddingX, startY, cardWidth, headerHeight, 8, palette.cardHeaderBg);

    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.moveTo(paddingX, startY + headerHeight);
    ctx.lineTo(paddingX + cardWidth, startY + headerHeight);
    ctx.stroke();

    const innerX = paddingX + 16;
    ctx.font = `600 14px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('身體數據 · BODY', innerX, startY + 20);
    ctx.restore();
  }
  curY += headerHeight + 14;

  const innerPad = 16;
  const innerWidth = cardWidth - innerPad * 2;
  const innerX = paddingX + innerPad;

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
        ctx.fillText(`${body.weightUnit}`, innerX + wStrW, curY + 28);

        // 趨勢體重 / 體脂標籤
        const tags: string[] = [];
        if (body.trendWeight !== undefined) {
          tags.push(`趨勢: ${body.trendWeight}${body.weightUnit}`);
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
          const itemText = `${c.label} ${c.value}${c.unit}`;
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
        const itemText = `${c.label} ${c.value}${c.unit}`;
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
  const paddingX = 16;
  const cardWidth = width - paddingX * 2;
  const cardGap = 16;
  const cardRadius = 8;

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
    measuredY = renderWorkoutHeroCard(measureRc, payload.workout, measuredY);
    if (payload.workout.sessions.length > 0) {
      measuredY = renderWorkoutExercisesCard(measureRc, payload.workout, measuredY);
    }
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
    drawRoundedBox(ctx, paddingX, startHeroY, cardWidth, heroCardH, cardRadius, palette.cardBg, palette.border, 1);
    renderCaloriesHeroCard(drawRc, payload.diet, startHeroY);
    drawY = endHeroY;

    // 各餐次獨立卡片
    for (const meal of payload.diet.meals) {
      const startMealY = drawY;
      const endMealY = renderMealCard(measureRc, meal, startMealY);
      const mealCardH = endMealY - startMealY - cardGap;
      drawRoundedBox(ctx, paddingX, startMealY, cardWidth, mealCardH, cardRadius, palette.cardBg, palette.border, 1);
      renderMealCard(drawRc, meal, startMealY);
      drawY = endMealY;
    }
  }

  if (payload.workout) {
    // 1. 訓練 Hero Card (人體解剖圖與 3 欄指標)
    const startHeroY = drawY;
    const endHeroY = renderWorkoutHeroCard(measureRc, payload.workout, startHeroY);
    const heroCardH = endHeroY - startHeroY - cardGap;
    drawRoundedBox(ctx, paddingX, startHeroY, cardWidth, heroCardH, cardRadius, palette.cardBg, palette.border, 1);
    renderWorkoutHeroCard(drawRc, payload.workout, startHeroY);
    drawY = endHeroY;

    // 2. 訓練動作紀錄卡片 (若有訓練動作)
    if (payload.workout.sessions.length > 0) {
      const startExY = drawY;
      const endExY = renderWorkoutExercisesCard(measureRc, payload.workout, startExY);
      const exCardH = endExY - startExY - cardGap;
      drawRoundedBox(ctx, paddingX, startExY, cardWidth, exCardH, cardRadius, palette.cardBg, palette.border, 1);
      renderWorkoutExercisesCard(drawRc, payload.workout, startExY);
      drawY = endExY;
    }
  }

  if (payload.body) {
    const startBodyY = drawY;
    const endBodyY = renderBodyCard(measureRc, payload.body, startBodyY);
    const bodyCardH = endBodyY - startBodyY - cardGap;
    drawRoundedBox(ctx, paddingX, startBodyY, cardWidth, bodyCardH, cardRadius, palette.cardBg, palette.border, 1);
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
