import { useState, useMemo, useEffect } from 'react';
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
}: {
  payload?: DailyExportPayload;
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

  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [focusedPreview, setFocusedPreview] = useState<'image' | 'text' | 'json' | null>(null);

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

  // 複製圖片（分享朋友或社交媒體）
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
        downloadBlob(blob, `zenfit-${activePayload.date}.png`);
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

  return (
    <div className="flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth items-stretch gap-4 sm:gap-6 md:grid md:grid-cols-3 md:gap-6 font-mono text-xs pb-4 -mr-4 pr-4 sm:-mr-8 sm:pr-8 md:mr-0 md:pr-0 md:pb-0 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* ========================================================================= */}
      {/* 卡片 1：圖片 (Image Export)                                               */}
      {/* ========================================================================= */}
      <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] md:w-full md:max-w-none shrink-0 snap-start border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5 sm:p-6 rounded-lg flex flex-col justify-between shadow-none space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-900 dark:text-white font-bold uppercase tracking-wider text-xs">
              01 // {t('aiExport.formatImage', '圖片')}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] uppercase">
              IMAGE
            </span>
          </div>
          <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">
            {t('landing.shareCards.imageTitle', '高密度分析長圖')}
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
            {t('landing.shareCards.imageDesc', '像素級高對比向量排版，無失真記錄體態、課表與生重進食，適合發送給教練或社群分享。')}
          </p>
        </div>

        {/* 圖片預覽區（點擊獲取焦點後才允許內部滾動） */}
        <div
          tabIndex={0}
          onFocus={() => setFocusedPreview('image')}
          onBlur={() => setFocusedPreview((prev) => (prev === 'image' ? null : prev))}
          className={
            focusedPreview === 'image'
              ? 'h-[240px] overflow-y-auto overflow-x-hidden rounded-lg border border-foreground/40 bg-muted/20 p-2 overscroll-contain select-none focus:outline-hidden'
              : 'h-[240px] overflow-hidden rounded-lg border border-border bg-muted/20 p-2 select-none cursor-pointer focus:outline-hidden'
          }
        >
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt={`Zenfit ${activePayload.date} Share`}
              className="block w-full h-auto rounded shadow-none select-none pointer-events-none"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
              <Loader2 className="size-4 animate-spin mr-2" />
              <span>{t('aiExport.imageGenerating', '正在繪製長圖...')}</span>
            </div>
          )}
        </div>

        {/* 底部操作按鈕：分享朋友或社交媒體（點擊複製長圖） */}
        <div className="pt-1">
          <Button
            type="button"
            disabled={isCapturing}
            onClick={handleCopyImage}
            className="w-full h-9 rounded-lg bg-foreground text-background font-mono text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isCapturing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : imageCopied ? (
              <Check className="size-3.5 stroke-[2.2]" />
            ) : (
              <Copy className="size-3.5 stroke-[2]" />
            )}
            <span>{t('aiExport.shareFriendsOrSocial', '分享朋友或社交媒體')}</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 卡片 2：純文本 (Plain Text Markdown Prompt)                                */}
      {/* ========================================================================= */}
      <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] md:w-full md:max-w-none shrink-0 snap-start border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5 sm:p-6 rounded-lg flex flex-col justify-between shadow-none space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-900 dark:text-white font-bold uppercase tracking-wider text-xs">
              02 // {t('aiExport.formatText', '純文本')}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] uppercase">
              MARKDOWN
            </span>
          </div>
          <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">
            {t('landing.shareCards.textTitle', '結構化 AI 提示詞')}
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
            {t('landing.shareCards.textDesc', '將當日客觀體態、生重宏量素與訓練組數格式化為無噪音 Markdown，直接貼入 Claude 或 ChatGPT。')}
          </p>
        </div>

        {/* 純文本預覽區（點擊獲取焦點後才允許內部滾動） */}
        <div
          tabIndex={0}
          onFocus={() => setFocusedPreview('text')}
          onBlur={() => setFocusedPreview((prev) => (prev === 'text' ? null : prev))}
          className={
            focusedPreview === 'text'
              ? 'h-[240px] overflow-y-auto rounded-lg border border-foreground/40 bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words select-text text-muted-foreground overscroll-contain focus:outline-hidden'
              : 'h-[240px] overflow-hidden rounded-lg border border-border bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words select-none text-muted-foreground cursor-pointer focus:outline-hidden'
          }
        >
          {textContent}
        </div>

        {/* 底部操作按鈕：AI 或朋友 */}
        <div className="pt-1">
          <Button
            type="button"
            onClick={handleCopyText}
            className="w-full h-9 rounded-lg bg-foreground text-background font-mono text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {textCopied ? (
              <Check className="size-3.5 stroke-[2.2]" />
            ) : (
              <Copy className="size-3.5 stroke-[2]" />
            )}
            <span>{t('aiExport.shareAiOrFriends', 'AI 或朋友')}</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 卡片 3：JSON (Structured JSON Data)                                      */}
      {/* ========================================================================= */}
      <div className="w-[84vw] max-w-[350px] sm:max-w-[400px] md:w-full md:max-w-none shrink-0 snap-start border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5 sm:p-6 rounded-lg flex flex-col justify-between shadow-none space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-900 dark:text-white font-bold uppercase tracking-wider text-xs">
              03 // {t('aiExport.formatJson', 'JSON')}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] uppercase">
              JSON
            </span>
          </div>
          <h3 className="text-neutral-900 dark:text-white text-base font-sans font-bold">
            {t('landing.shareCards.jsonTitle', '純數學結構化 JSON')}
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed text-xs">
            {t('landing.shareCards.jsonDesc', '100% 開放標準數據合約，包含完整能量平衡、動作參數與身體維度，便於自動化腳本分析。')}
          </p>
        </div>

        {/* JSON 預覽區（點擊獲取焦點後才允許內部滾動） */}
        <div
          tabIndex={0}
          onFocus={() => setFocusedPreview('json')}
          onBlur={() => setFocusedPreview((prev) => (prev === 'json' ? null : prev))}
          className={
            focusedPreview === 'json'
              ? 'h-[240px] overflow-y-auto rounded-lg border border-foreground/40 bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre select-text text-muted-foreground overscroll-contain focus:outline-hidden'
              : 'h-[240px] overflow-hidden rounded-lg border border-border bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre select-none text-muted-foreground cursor-pointer focus:outline-hidden'
          }
        >
          {jsonContent}
        </div>

        {/* 底部操作按鈕：AI 或程式 */}
        <div className="pt-1">
          <Button
            type="button"
            onClick={handleCopyJson}
            className="w-full h-9 rounded-lg bg-foreground text-background font-mono text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {jsonCopied ? (
              <Check className="size-3.5 stroke-[2.2]" />
            ) : (
              <Copy className="size-3.5 stroke-[2]" />
            )}
            <span>{t('aiExport.shareAiOrPrograms', 'AI 或程式')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
