import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Share2, Download, Loader2 } from 'lucide-react';
import { Dialog, PrecisionDialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useFoods } from '@/hooks/useFoods';
import { useRecipes } from '@/hooks/useRecipes';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import { useBodyRecovery } from '@/hooks/useBodyRecovery';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import {
  buildDailyExportPayload,
  formatDailyExportData,
  type AiExportScope,
  type AiExportFormat,
} from '@/services/aiDataExport';
import {
  generateDailyExportImageBlob,
  generateDailyExportImageDataUrl,
} from '@/services/aiDataExportImage';

export interface CopyDailyDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  scope: AiExportScope;
}

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

export function CopyDailyDataDialog({
  open,
  onOpenChange,
  date,
  scope,
}: CopyDailyDataDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<AiExportFormat>('image');
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { preferences } = useUnitPreferences();
  const { logs: foodLogs } = useFoodLogs(date);
  const { plan: dietPlan } = useDietPlan(date);
  const { allFoods } = useFoods();
  const { allRecipes } = useRecipes();
  const { workouts: workoutLogs } = useWorkoutLogs(date);
  const { allExercises } = useExercises();
  const { allRoutines } = useRoutines();
  const { equipments } = useEquipments();
  const { recoverySummary } = useBodyRecovery(date);
  const { metricToday, currentTrendWeight } = useBodyMetrics(date);

  const exportInput = useMemo(
    () => ({
      date,
      scope,
      t,
      unitPreferences: preferences,
      foodLogs,
      foods: allFoods,
      recipes: allRecipes,
      dietPlan,
      workoutLogs,
      exercises: allExercises,
      routines: allRoutines,
      equipments,
      recoverySummary,
      bodyMetric: metricToday,
      trendWeightKg: currentTrendWeight,
    }),
    [
      date,
      scope,
      t,
      preferences,
      foodLogs,
      allFoods,
      allRecipes,
      dietPlan,
      workoutLogs,
      allExercises,
      allRoutines,
      equipments,
      recoverySummary,
      metricToday,
      currentTrendWeight,
    ]
  );

  const payload = useMemo(
    () => buildDailyExportPayload(exportInput),
    [exportInput]
  );

  const previewContent = useMemo(() => {
    if (format === 'image') return '';
    return formatDailyExportData(exportInput, format);
  }, [exportInput, format]);

  const [previewImageDataUrl, setPreviewImageDataUrl] = useState<string>('');

  useEffect(() => {
    if (!open || format !== 'image') {
      setPreviewImageDataUrl('');
      return;
    }

    let isMounted = true;
    const timer = setTimeout(() => {
      try {
        const url = generateDailyExportImageDataUrl(payload, {
          theme: isDark ? 'dark' : 'light',
          dpr: 2,
        });
        if (isMounted) {
          setPreviewImageDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate preview image data url:', err);
        if (isMounted) {
          setPreviewImageDataUrl('');
        }
      }
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, format, payload, isDark]);

  // 複製純文字 / JSON
  const handleCopyText = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(previewContent);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = previewContent;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      triggerHaptic('success');
      toast.show(t(`aiExport.copiedToast.${scope}`));
      setTimeout(() => {
        setCopied(false);
      }, 1500);
      onOpenChange(false);
    } catch {
      toast.show(t('common.error'));
    }
  };

  // 複製高解析度圖片 (透過 Canvas 繪製超採樣生成)
  const handleCopyImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    const filename = `zenfit-${date}-${scope}.png`;

    try {
      const blob = await generateDailyExportImageBlob(payload, {
        theme: isDark ? 'dark' : 'light',
        dpr: 2,
      });
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setImageCopied(true);
        triggerHaptic('success');
        toast.show(t('aiExport.imageCopied'));
        setTimeout(() => {
          setImageCopied(false);
        }, 1500);
        return;
      }

      // ClipboardItem 不可用時降級為下載
      downloadBlob(blob, filename);
      setImageCopied(true);
      triggerHaptic('success');
      toast.show(t('aiExport.imageDownloaded'));
      setTimeout(() => {
        setImageCopied(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy image:', err);
      toast.show(t('aiExport.imageGenerateError'));
    } finally {
      setIsCapturing(false);
    }
  };

  // 保存圖片至本地 (下載 PNG 檔案)
  const handleSaveImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    const filename = `zenfit-${date}-${scope}.png`;

    try {
      const blob = await generateDailyExportImageBlob(payload, {
        theme: isDark ? 'dark' : 'light',
        dpr: 2,
      });

      downloadBlob(blob, filename);
      triggerHaptic('success');
      toast.show(t('aiExport.imageSaved', '已保存'));
    } catch (err) {
      console.error('Failed to save image:', err);
      toast.show(t('aiExport.imageGenerateError'));
    } finally {
      setIsCapturing(false);
    }
  };

  // 系統原生分享 (支援時喚起原生分享選單，否則下載保存 PNG)
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShareImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    const filename = `zenfit-${date}-${scope}.png`;

    try {
      const blob = await generateDailyExportImageBlob(payload, {
        theme: isDark ? 'dark' : 'light',
        dpr: 2,
      });

      if (canNativeShare) {
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Zenfit ${date}`,
              files: [file],
            });
            triggerHaptic('success');
            return;
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }

      downloadBlob(blob, filename);
      triggerHaptic('success');
      toast.show(t('aiExport.imageSaved', '已保存'));
    } catch (err) {
      console.error('Failed to share image:', err);
      toast.show(t('aiExport.imageGenerateError'));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PrecisionDialogContent
        title={t('aiExport.dialogTitle')}
        onClose={() => onOpenChange(false)}
        cancelAriaLabel={t('common.close')}
        overlayClassName="z-[70]"
        className="z-[70] w-[320px] max-w-[calc(100vw-24px)] sm:w-[320px] sm:max-w-[320px]"
      >
        <div className="pt-3 space-y-3 font-mono text-xs select-none">
          {/* 說明文字 */}
          <p className="text-[11px] text-muted-foreground leading-relaxed font-sans px-0.5">
            {t('aiExport.dialogDesc')}
          </p>

          {/* 日期與範圍狀態列 */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/20 text-[11px]">
            <span className="text-muted-foreground font-mono">{date}</span>
            <span className="px-2 py-0.5 rounded bg-foreground text-background font-sans font-medium text-[10px] leading-tight">
              {t(`aiExport.scope.${scope}`)}
            </span>
          </div>

          {/* 格式切換器 (3 頁籤: 圖片 | 純文本 | JSON) */}
          <div className="grid grid-cols-3 p-0.5 rounded-lg bg-muted border border-border">
            <button
              type="button"
              onClick={() => {
                setFormat('image');
                triggerHaptic('selection');
              }}
              className={cn(
                'h-7 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer',
                format === 'image'
                  ? 'bg-card text-foreground border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('aiExport.formatImage')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormat('text');
                triggerHaptic('selection');
              }}
              className={cn(
                'h-7 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer',
                format === 'text'
                  ? 'bg-card text-foreground border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('aiExport.formatText')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormat('json');
                triggerHaptic('selection');
              }}
              className={cn(
                'h-7 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer',
                format === 'json'
                  ? 'bg-card text-foreground border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('aiExport.formatJson')}
            </button>
          </div>

          {/* 預覽區域 (高度鎖死 240px，上下滾動，圖片嚴格保持原始比例不變形，永不撐大 Dialog) */}
          {format === 'image' ? (
            <div className="h-[240px] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-muted/20 p-2 overscroll-contain">
              {previewImageDataUrl ? (
                <img
                  src={previewImageDataUrl}
                  alt={`Zenfit ${date} Share`}
                  className="block w-full h-auto rounded shadow-none select-none pointer-events-none"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>{t('aiExport.imageGenerating')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[240px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words select-all text-foreground overscroll-contain">
              {previewContent}
            </div>
          )}

          {/* 底部操作按鈕：複製 | 保存 | 分享 */}
          {format === 'image' ? (
            <div className="grid grid-cols-3 gap-1.5">
              {/* 複製 */}
              <Button
                type="button"
                disabled={isCapturing}
                onClick={handleCopyImage}
                className="h-9 px-2 rounded-lg bg-foreground text-background font-mono text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer gap-1"
              >
                {isCapturing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : imageCopied ? (
                  <Check className="size-3.5 stroke-[2.2]" />
                ) : (
                  <Copy className="size-3.5 stroke-[2]" />
                )}
                <span>{t('aiExport.copyImage')}</span>
              </Button>

              {/* 保存 */}
              <Button
                type="button"
                disabled={isCapturing}
                onClick={handleSaveImage}
                variant="outline"
                className="h-9 px-2 rounded-lg border-border bg-card text-foreground font-mono text-xs font-medium hover:bg-muted active:scale-[0.98] transition-all cursor-pointer gap-1"
              >
                {isCapturing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5 stroke-[2]" />
                )}
                <span>{t('aiExport.saveImage')}</span>
              </Button>

              {/* 分享 */}
              <Button
                type="button"
                disabled={isCapturing}
                onClick={handleShareImage}
                variant="outline"
                className="h-9 px-2 rounded-lg border-border bg-card text-foreground font-mono text-xs font-medium hover:bg-muted active:scale-[0.98] transition-all cursor-pointer gap-1"
              >
                {isCapturing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Share2 className="size-3.5 stroke-[2]" />
                )}
                <span>{t('aiExport.shareImage')}</span>
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleCopyText}
              className="w-full h-9 rounded-lg bg-foreground text-background font-mono text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer gap-1.5"
            >
              {copied ? (
                <Check className="size-3.5 stroke-[2.2]" />
              ) : (
                <Copy className="size-3.5 stroke-[2]" />
              )}
              <span>{t('aiExport.copyBtn')}</span>
            </Button>
          )}
        </div>
      </PrecisionDialogContent>
    </Dialog>
  );
}
