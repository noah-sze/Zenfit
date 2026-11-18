import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { useTheme } from '@/components/ThemeProvider';
import {
  type DailyExportPayload,
  formatDailyExportAsText,
  formatDailyExportAsJson,
} from '@/services/aiDataExport';
import {
  generateDailyExportImageDataUrl,
  generateDailyExportImageBlob,
} from '@/services/aiDataExportImage';

type ShareFormatId = 'image' | 'text' | 'json';

interface ShareFormatItem {
  id: ShareFormatId;
  index: string;
  badge: string;
  title: string;
  desc: string;
  previewHeader: string;
  spec: string;
  useCases: string[];
  copied: boolean;
  isBusy: boolean;
  onCopy: () => void;
}

const DOT_GRID_STYLE = {
  backgroundImage: 'radial-gradient(var(--canvas-dot) 1px, transparent 1px)',
  backgroundSize: '16px 16px',
} as const;

function UseCaseChips({
  items,
  label,
  emphasized = false,
}: {
  items: string[];
  label?: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label ? (
        <span className="font-mono text-2xs text-muted-foreground mr-0.5 shrink-0">
          {label}
        </span>
      ) : null}
      {items.map((item) => (
        <span
          key={item}
          className={
            emphasized
              ? 'inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-card text-xs leading-tight text-foreground whitespace-nowrap'
              : 'inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-card text-xs leading-tight text-muted-foreground whitespace-nowrap'
          }
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function CopyActionButton({
  copied,
  isBusy,
  copyLabel,
  copiedLabel,
  onClick,
}: {
  copied: boolean;
  isBusy: boolean;
  copyLabel: string;
  copiedLabel: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isBusy}
      onClick={onClick}
      className={
        copied
          ? 'h-7 px-3 rounded-full border-emerald-600 dark:border-emerald-400 bg-card text-emerald-600 dark:text-emerald-400 hover:bg-hover font-mono text-xs font-medium shadow-none cursor-pointer gap-1 shrink-0'
          : 'h-7 px-3 rounded-full border-border bg-card text-foreground hover:border-foreground hover:bg-hover font-mono text-xs font-medium shadow-none cursor-pointer gap-1 shrink-0'
      }
    >
      {isBusy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : copied ? (
        <Check className="size-3 stroke-[2.2]" />
      ) : (
        <Copy className="size-3 stroke-[2]" />
      )}
      <span>{copied ? copiedLabel : copyLabel}</span>
    </Button>
  );
}

/**
 * 男性 180cm 69kg 深度用戶全天數據分享載荷（工廠函式，完整支援多語系 i18n）
 */
export function getDemoDailyExportPayload(
  t?: (key: string, fallback?: string) => string
): DailyExportPayload {
  const tr = (key: string, fallback: string) => (t ? t(key, fallback) : fallback);
  return {
    date: '2026-11-14',
    scope: 'all',
    body: {
      weight: 69.0,
      trendWeight: 68.85,
      weightUnit: 'kg',
      bodyFat: 12.5,
      circumferences: [
        { key: 'shoulders', label: tr('body.shoulders', '肩寬'), value: 46.5, unit: 'cm' },
        { key: 'chest', label: tr('body.chest', '胸圍'), value: 98.0, unit: 'cm' },
        { key: 'waist', label: tr('body.waist', '腰圍'), value: 74.5, unit: 'cm' },
        { key: 'hips', label: tr('body.hips', '臀圍'), value: 92.5, unit: 'cm' },
      ],
    },
    diet: {
      activityLevel: 1.55,
      activityLabel: tr('landing.demoData.moderateActivity', '中度活動 (每週 3-5 天訓練)'),
      macroSplit: { carbs: 50, protein: 25, fat: 25 },
      target: {
        calories: 2500,
        energyUnit: 'kcal',
        carbs: 330,
        protein: 155,
        fat: 62,
      },
      actual: {
        calories: 2350,
        energyUnit: 'kcal',
        carbs: 305,
        protein: 152,
        fat: 58,
      },
      calorieDiff: 150,
      meals: [
        {
          mealType: 'breakfast',
          mealLabel: tr('diet.breakfast', '早餐'),
          calories: 638,
          carbs: 54,
          protein: 69,
          fat: 17,
          items: [
            { type: 'food', name: tr('landing.demoData.chickenBreast', '去皮雞胸肉'), amount: '150 g', calories: 195, carbs: 0, protein: 45, fat: 2 },
            { type: 'food', name: tr('landing.demoData.rolledOats', '傳統燕麥片'), amount: '80 g', calories: 293, carbs: 53, protein: 11, fat: 5 },
            { type: 'food', name: tr('landing.demoData.wholeEggs', '全雞蛋'), amount: '100 g', calories: 150, carbs: 1, protein: 13, fat: 10 },
          ],
        },
        {
          mealType: 'lunch',
          mealLabel: tr('diet.lunch', '午餐'),
          calories: 830,
          carbs: 112,
          protein: 52,
          fat: 20,
          items: [
            {
              type: 'recipe',
              name: tr('landing.demoData.tomatoBeefRice', '番茄牛肉糙米飯'),
              calories: 830,
              carbs: 112,
              protein: 52,
              fat: 20,
              ingredients: [
                { name: tr('landing.demoData.beefTenderloin', '牛里肌'), amount: '180 g', calories: 234, carbs: 0, protein: 40, fat: 8 },
                { name: tr('landing.demoData.brownRice', '糙米'), amount: '150 g', calories: 525, carbs: 112, protein: 12, fat: 4 },
                { name: tr('landing.demoData.oliveOil', '橄欖油'), amount: '8 g', calories: 71, carbs: 0, protein: 0, fat: 8 },
              ],
            },
          ],
        },
        {
          mealType: 'snack',
          mealLabel: tr('diet.snack', '加餐'),
          calories: 299,
          carbs: 53,
          protein: 7,
          fat: 7,
          items: [
            { type: 'estimate', name: tr('landing.demoData.snackOatLatte', '燕麥拿鐵 (大杯 · 無糖)'), calories: 192, carbs: 26, protein: 6, fat: 7 },
            { type: 'food', name: tr('landing.demoData.banana', '香蕉'), amount: '120 g', calories: 107, carbs: 27, protein: 1, fat: 0 },
          ],
        },
        {
          mealType: 'dinner',
          mealLabel: tr('diet.dinner', '晚餐'),
          calories: 583,
          carbs: 86,
          protein: 24,
          fat: 14,
          items: [
            { type: 'as_planned', name: tr('landing.demoData.regularDinner', '日常規律晚餐'), calories: 583, carbs: 86, protein: 24, fat: 14 },
          ],
        },
      ],
    },
    workout: {
      summary: {
        totalExercises: 2,
        totalSets: 6,
        totalVolume: 1480,
        weightUnit: 'kg',
      },
      sessions: [
        {
          routineTitle: tr('landing.demoData.routineChestBack', '胸部與上背專項'),
          exercises: [
            {
              name: tr('landing.demoData.dumbbellBenchPress', '啞鈴臥推'),
              equipment: tr('workout.equipDumbbell', '啞鈴'),
              primaryMuscles: [tr('workout.muscleMidLowerChest', '中下胸'), tr('workout.muscleUpperChest', '上胸')],
              secondaryMuscles: [tr('workout.muscleFrontDelts', '前三角肌'), tr('workout.muscleTriceps', '肱三頭肌')],
              sets: [
                { setNumber: 1, weight: 20, unit: 'kg', reps: 15 },
                { setNumber: 2, weight: 20, unit: 'kg', reps: 12 },
                { setNumber: 3, weight: 20, unit: 'kg', reps: 10 },
              ],
            },
            {
              name: tr('landing.demoData.dumbbellReverseFly', '啞鈴俯身飛鳥'),
              equipment: tr('workout.equipDumbbell', '啞鈴'),
              primaryMuscles: [tr('workout.muscleRearDelts', '後三角肌'), tr('workout.muscleUpperBackTraps', '上背斜方肌')],
              secondaryMuscles: [tr('workout.muscleLats', '背闊肌')],
              sets: [
                { setNumber: 1, weight: 20, unit: 'kg', reps: 15 },
                { setNumber: 2, weight: 20, unit: 'kg', reps: 12 },
                { setNumber: 3, weight: 20, unit: 'kg', reps: 10 },
              ],
            },
          ],
        },
      ],
      recovery: {
        recoveringCount: 2,
        intensityMap: {
          upper_chest: 85,
          mid_lower_chest: 85,
          lats: 70,
          upper_back_traps: 65,
        },
      },
    },
  };
}

export const DEMO_DAILY_EXPORT_PAYLOAD: DailyExportPayload = getDemoDailyExportPayload();

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ShareShowcaseCards({
  payload,
  header,
}: {
  payload?: DailyExportPayload;
  header?: ReactNode;
}) {
  const { t } = useTranslation();
  const tr = (k: string, fb?: string) => (fb !== undefined ? t(k, fb) : t(k));
  const activePayload = useMemo(() => payload || getDemoDailyExportPayload(tr), [payload, t]);
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [activeFormat, setActiveFormat] = useState<ShareFormatId>('image');
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [focusedPreview, setFocusedPreview] = useState<ShareFormatId | null>(null);

  // 生成長圖 DataUrl
  useEffect(() => {
    let isMounted = true;
    try {
      const url = generateDailyExportImageDataUrl(activePayload, {
        theme: isDark ? 'dark' : 'light',
        dpr: 2,
      });
      if (isMounted) setPreviewImageUrl(url);
    } catch (err) {
      console.error('Failed to generate preview image data url:', err);
    }
    return () => {
      isMounted = false;
    };
  }, [activePayload, isDark]);

  // 純文本與 JSON 內容
  const textContent = useMemo(() => formatDailyExportAsText(activePayload, t), [activePayload, t]);
  const jsonContent = useMemo(() => formatDailyExportAsJson(activePayload), [activePayload]);

  // 複製圖片
  const handleCopyImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      triggerHaptic('selection');
      const blob = await generateDailyExportImageBlob(activePayload, {
        theme: isDark ? 'dark' : 'light',
        dpr: 2,
      });
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof ClipboardItem !== 'undefined'
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setImageCopied(true);
        triggerHaptic('success');
        toast(t('aiExport.imageCopied', '已複製圖片'));
        setTimeout(() => setImageCopied(false), 2000);
      } else {
        downloadBlob(blob, `e2cal-${activePayload.date}.png`);
        setImageCopied(true);
        triggerHaptic('success');
        toast(t('aiExport.imageSaved', '已保存長圖'));
        setTimeout(() => setImageCopied(false), 2000);
      }
    } catch (err) {
      console.error('Copy image failed:', err);
      toast(t('aiExport.copyFailed', '複製失敗'));
    } finally {
      setIsCapturing(false);
    }
  };

  // 複製純文本
  const handleCopyText = async () => {
    try {
      triggerHaptic('selection');
      await navigator.clipboard.writeText(textContent);
      setTextCopied(true);
      triggerHaptic('success');
      toast(t('aiExport.textCopied', '已複製純文本'));
      setTimeout(() => setTextCopied(false), 2000);
    } catch (err) {
      console.error('Copy text failed:', err);
      toast(t('aiExport.copyFailed', '複製失敗'));
    }
  };

  // 複製 JSON
  const handleCopyJson = async () => {
    try {
      triggerHaptic('selection');
      await navigator.clipboard.writeText(jsonContent);
      setJsonCopied(true);
      triggerHaptic('success');
      toast(t('aiExport.jsonCopied', '已複製 JSON'));
      setTimeout(() => setJsonCopied(false), 2000);
    } catch (err) {
      console.error('Copy JSON failed:', err);
      toast(t('aiExport.copyFailed', '複製失敗'));
    }
  };

  const copyLabel = t('common.copy', '複製');
  const copiedLabel = t('common.copied', '已複製');
  const useCaseLabel = t('landing.shareCards.useCaseLabel', '分享給');

  const formats: ShareFormatItem[] = [
    {
      id: 'image',
      index: '01',
      badge: 'IMAGE',
      title: t('landing.shareCards.imageTitle', '高密度分析長圖'),
      desc: t('landing.shareCards.imageDesc', '像素級高對比排版，無失真呈現飲食、訓練、體態。'),
      previewHeader: t('landing.shareCards.previewHeaders.image', 'PREVIEW · HIGH-DENSITY SNAPSHOT (PNG)'),
      spec: t('landing.shareCards.specs.image', 'PNG · 2x Retina'),
      useCases: [
        t('landing.shareCards.useCases.friends', '朋友'),
        t('landing.shareCards.useCases.socialMedia', '社交媒體'),
        t('landing.shareCards.useCases.coach', '教練'),
      ],
      copied: imageCopied,
      isBusy: isCapturing,
      onCopy: handleCopyImage,
    },
    {
      id: 'text',
      index: '02',
      badge: 'MD',
      title: t('landing.shareCards.textTitle', '結構化 AI 提示詞'),
      desc: t('landing.shareCards.textDesc', '無噪音 Markdown 結構，直接貼入對話即可展開分析。'),
      previewHeader: t('landing.shareCards.previewHeaders.text', 'PREVIEW · STRUCTURED AI PROMPT (MARKDOWN)'),
      spec: t('landing.shareCards.specs.text', 'MARKDOWN · ZERO-NOISE'),
      useCases: [
        t('landing.shareCards.useCases.chatgpt', 'ChatGPT'),
        t('landing.shareCards.useCases.claude', 'Claude'),
        t('landing.shareCards.useCases.friends', '朋友'),
      ],
      copied: textCopied,
      isBusy: false,
      onCopy: handleCopyText,
    },
    {
      id: 'json',
      index: '03',
      badge: 'JSON',
      title: t('landing.shareCards.jsonTitle', '純數學結構化 JSON'),
      desc: t('landing.shareCards.jsonDesc', '100% 開放標準數據合約，完整涵蓋飲食、訓練、體態。'),
      previewHeader: t('landing.shareCards.previewHeaders.json', 'PREVIEW · OPEN DATA CONTRACT (JSON)'),
      spec: t('landing.shareCards.specs.json', 'JSON · OPEN SCHEMA'),
      useCases: [
        t('landing.shareCards.useCases.ai', 'AI'),
        t('landing.shareCards.useCases.scripts', '自動化腳本'),
        t('landing.shareCards.useCases.externalApps', '外部程式'),
      ],
      copied: jsonCopied,
      isBusy: false,
      onCopy: handleCopyJson,
    },
  ];

  const activeItem = formats.find((item) => item.id === activeFormat) ?? formats[0];

  const renderPreviewContent = (formatId: ShareFormatId, compact = false) => {
    if (formatId === 'image') {
      return previewImageUrl ? (
        <img
          src={previewImageUrl}
          alt={`e2Cal ${activePayload.date} Share`}
          className={
            compact
              ? 'block w-full h-auto rounded border border-border shadow-none select-none pointer-events-none'
              : 'block w-full max-w-[380px] mx-auto h-auto rounded-lg border border-border shadow-none select-none pointer-events-none'
          }
        />
      ) : (
        <div className="h-full min-h-[200px] flex items-center justify-center text-muted-foreground text-xs font-mono">
          <Loader2 className="size-4 animate-spin mr-2" />
          <span>{t('aiExport.imageGenerating', '正在繪製長圖...')}</span>
        </div>
      );
    }

    if (formatId === 'text') {
      return (
        <div
          className={
            compact
              ? 'font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-muted-foreground'
              : 'font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-muted-foreground select-text'
          }
        >
          {textContent}
        </div>
      );
    }

    return (
      <div
        className={
          compact
            ? 'font-mono text-xs leading-relaxed whitespace-pre text-muted-foreground'
            : 'font-mono text-xs leading-relaxed whitespace-pre text-muted-foreground select-text'
        }
      >
        {jsonContent}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-12 lg:items-stretch">
      {/* 左欄：標題說明 + 桌面版三列格式切換器 */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {header}

        {/* 桌面版互動式格式切換器（手機版改由下方橫向滑動卡承載） */}
        <div
          role="tablist"
          aria-label={useCaseLabel}
          className="hidden lg:block rounded-lg border border-border bg-card overflow-hidden divide-y divide-border"
        >
          {formats.map((item) => {
            const isActive = item.id === activeFormat;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveFormat(item.id);
                }}
                className={
                  isActive
                    ? 'w-full text-left px-4 py-3 flex items-start justify-between gap-3 relative bg-muted/40 transition-colors cursor-pointer'
                    : 'w-full text-left px-4 py-3 flex items-start justify-between gap-3 relative bg-card hover:bg-hover transition-colors cursor-pointer'
                }
              >
                {isActive ? (
                  <span aria-hidden="true" className="absolute left-0 inset-y-0 w-0.5 bg-foreground" />
                ) : null}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {item.index}
                    </span>
                    <span className="text-sm font-semibold text-foreground font-sans">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                    {item.desc}
                  </p>
                  <div className="pt-2">
                    <UseCaseChips items={item.useCases} emphasized={isActive} />
                  </div>
                </div>

                <span
                  className={
                    isActive
                      ? 'font-mono text-2xs uppercase px-1.5 py-0.5 rounded border border-foreground bg-foreground text-background shrink-0 mt-0.5'
                      : 'font-mono text-2xs uppercase px-1.5 py-0.5 rounded border border-border bg-card text-muted-foreground shrink-0 mt-0.5'
                  }
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右欄（桌面版）：與左欄頂部與底部完全齊平的寬幅預覽視窗 */}
      <div className="hidden lg:block lg:col-span-7 lg:relative">
        <div className="lg:absolute lg:inset-0 rounded-lg border border-border bg-card text-card-foreground flex flex-col overflow-hidden shadow-none">
          {/* 表頭：與全站 SectionCard h-10 規格一致 */}
          <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3 shrink-0">
            <span className="font-mono text-xs font-normal tracking-wider text-neutral-500 dark:text-neutral-400 uppercase truncate">
              {activeItem.previewHeader}
            </span>
            <CopyActionButton
              copied={activeItem.copied}
              isBusy={activeItem.isBusy}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
              onClick={activeItem.onCopy}
            />
          </div>

          {/* 預覽主舞台（固定填滿剩餘高度，長內容內部平順滾動，確保卡片底部與左欄絕對齊平） */}
          <div
            className={
              activeItem.id === 'image'
                ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain p-5'
                : 'flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 bg-card'
            }
            style={activeItem.id === 'image' ? DOT_GRID_STYLE : undefined}
          >
            {renderPreviewContent(activeItem.id, false)}
          </div>

          {/* 底部場景與規格欄（與 SyncTopologyDiagram h-9 底欄同頻） */}
          <div className="min-h-9 px-4 py-2 border-t border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <UseCaseChips items={activeItem.useCases} label={useCaseLabel} emphasized />
            <span className="font-mono text-2xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider shrink-0">
              {activeItem.spec}
            </span>
          </div>
        </div>
      </div>

      {/* 手機／平板版：左右橫向滑動三張格式預覽卡（左側與其他區塊嚴格對齊） */}
      <div className="lg:hidden -mr-4 pr-4 sm:-mr-8 sm:pr-8 flex flex-row items-stretch gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {formats.map((item) => {
          const isFocused = focusedPreview === item.id;
          return (
            <div
              key={item.id}
              className={
                isFocused
                  ? 'w-[85vw] max-w-[360px] sm:max-w-[400px] shrink-0 snap-start rounded-lg border border-foreground bg-card text-card-foreground flex flex-col overflow-hidden shadow-none transition-colors'
                  : 'w-[85vw] max-w-[360px] sm:max-w-[400px] shrink-0 snap-start rounded-lg border border-border bg-card text-card-foreground flex flex-col overflow-hidden shadow-none transition-colors'
              }
            >
              {/* 表頭：格式編號 + 輕量複製鈕 */}
              <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between gap-2 shrink-0">
                <span className="font-mono text-xs font-normal tracking-wider text-neutral-500 dark:text-neutral-400 uppercase truncate">
                  {item.index} // {item.badge}
                </span>
                <CopyActionButton
                  copied={item.copied}
                  isBusy={item.isBusy}
                  copyLabel={copyLabel}
                  copiedLabel={copiedLabel}
                  onClick={item.onCopy}
                />
              </div>

              {/* 標題與簡介 */}
              <div className="px-4 py-3 border-b border-border space-y-1 shrink-0">
                <h3 className="text-sm font-semibold text-foreground font-sans">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  {item.desc}
                </p>
              </div>

              {/* 預覽區（填滿卡片剩餘高度；點擊獲得焦點後允許內部滾動，避免搶佔手機主頁面滾動） */}
              <div className="relative flex-1 min-h-[240px]">
                <div
                  tabIndex={0}
                  onFocus={() => setFocusedPreview(item.id)}
                  onBlur={() => setFocusedPreview((prev) => (prev === item.id ? null : prev))}
                  style={item.id === 'image' ? DOT_GRID_STYLE : undefined}
                  className={
                    isFocused
                      ? 'absolute inset-0 overflow-y-auto overflow-x-hidden p-3 overscroll-contain focus:outline-hidden'
                      : 'absolute inset-0 overflow-hidden p-3 select-none cursor-pointer focus:outline-hidden'
                  }
                >
                  {renderPreviewContent(item.id, true)}
                </div>
              </div>

              {/* 底欄：適用場景標籤 */}
              <div className="min-h-9 px-4 py-2 border-t border-border bg-muted/40 flex items-center shrink-0">
                <UseCaseChips items={item.useCases} label={useCaseLabel} emphasized />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
