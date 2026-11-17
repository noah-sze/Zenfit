import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Dialog, PrecisionDialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { triggerHaptic } from '@/lib/haptics';

export interface RawWeightGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const RICE_STEPS = [
  { methodKey: 'riceSteamed', methodFb: '正常蒸煮', weight: '250g', scale: 0.76, kcal: '142 kcal' },
  { methodKey: 'ricePorridge', methodFb: '軟爛稀飯', weight: '320g', scale: 0.97, kcal: '111 kcal' },
  { methodKey: 'riceFried', methodFb: '乾硬炒飯', weight: '210g', scale: 0.64, kcal: '170 kcal' },
] as const;

const MEAT_STEPS = [
  { methodKey: 'meatBoiled', methodFb: '水煮', weight: '82g', scale: 0.82, kcal: '134 kcal' },
  { methodKey: 'meatPanSeared', methodFb: '香煎', weight: '74g', scale: 0.74, kcal: '149 kcal' },
  { methodKey: 'meatAirFried', methodFb: '氣炸烘烤', weight: '66g', scale: 0.66, kcal: '167 kcal' },
] as const;

/**
 * 首次記錄食材 / 食譜時顯示的生重計算基準說明彈窗（方案 1：動態烹飪手法輪播）
 * 須輸入關鍵字（生重 / raw）方可解鎖確認按鈕
 */
export function RawWeightGuideDialog({
  open,
  onOpenChange,
  onConfirm,
}: RawWeightGuideDialogProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [step, setStep] = useState(0);

  const keyword = t('diet.rawWeightGuide.keyword', '生重');
  const trimmed = inputValue.trim();
  const isValid = trimmed.toLowerCase() === keyword.toLowerCase();
  const targetLen = keyword.length;
  const currentLen = Math.min(targetLen, trimmed.length);

  useEffect(() => {
    if (!open) return;
    setInputValue('');
    setStep(0);
    const timer = window.setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [open]);

  const rice = RICE_STEPS[step];
  const meat = MEAT_STEPS[step];

  const handleConfirm = () => {
    if (!isValid) return;
    triggerHaptic('success');
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PrecisionDialogContent
        title={t('diet.rawWeightGuide.title', '生重計算基準')}
        onClose={() => onOpenChange(false)}
        onSubmit={handleConfirm}
        submitDisabled={!isValid}
        submitAriaLabel={t('common.confirm', '確認')}
        cancelAriaLabel={t('common.cancel', '取消')}
      >
        <div className="pt-3.5 space-y-3">
          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            {t('diet.rawWeightGuide.introPrefix', '所有食材一律以「')}
            <span className="text-foreground font-medium">
              {t('diet.rawWeightGuide.introHighlight', '未經烹調之生重')}
            </span>
            {t(
              'diet.rawWeightGuide.introSuffix',
              '」計算。相同生重因烹飪手法等因素，導致熟重會大幅漂移：'
            )}
          </p>

          {/* 動態烹飪手法對比卡片 */}
          <div className="border border-border rounded-md p-3 space-y-3 bg-muted/20">
            {/* 1. 白米動態輪播 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-sans text-muted-foreground shrink-0">
                    {t('diet.rawWeightGuide.riceRaw', '白米 100g')}
                  </span>
                  <span className="text-border select-none">·</span>
                  <span className="font-sans text-foreground font-medium truncate">
                    {t(`diet.rawWeightGuide.${rice.methodKey}`, rice.methodFb)}
                  </span>
                </div>
                <span className="tabular-nums text-foreground font-medium shrink-0">
                  {rice.weight}
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full border border-dashed border-border overflow-hidden bg-background">
                <div
                  className="absolute inset-y-0 left-0 w-full bg-muted-foreground/30 origin-left transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${rice.scale})` }}
                />
                <div className="relative h-full w-[30%] bg-foreground" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span className="font-sans">
                  {t('diet.rawWeightGuide.riceDensityLabel', '每 100g 熟飯熱量')}
                </span>
                <span className="text-telemetry-accent font-medium">{rice.kcal}</span>
              </div>
            </div>

            {/* 2. 雞胸肉動態輪播 */}
            <div className="pt-2.5 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between text-[11px] gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-sans text-muted-foreground shrink-0">
                    {t('diet.rawWeightGuide.meatRaw', '雞胸 100g')}
                  </span>
                  <span className="text-border select-none">·</span>
                  <span className="font-sans text-foreground font-medium truncate">
                    {t(`diet.rawWeightGuide.${meat.methodKey}`, meat.methodFb)}
                  </span>
                </div>
                <span className="tabular-nums text-foreground font-medium shrink-0">
                  {meat.weight}
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-track overflow-hidden">
                <div
                  className="h-full w-full bg-foreground origin-left transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${meat.scale})` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span className="font-sans">
                  {t('diet.rawWeightGuide.meatDensityLabel', '每 100g 熟肉熱量')}
                </span>
                <span className="text-telemetry-accent font-medium">{meat.kcal}</span>
              </div>
            </div>

            {/* 3. 烹調用油 */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] gap-2">
              <span className="font-sans text-muted-foreground truncate">
                {t('diet.rawWeightGuide.oilRule', '烹調用油獨立計量')}
              </span>
              <span className="tabular-nums text-telemetry-accent font-medium shrink-0">
                + 5g
              </span>
            </div>
          </div>

          {/* 門檻輸入框（高度恆定，右側顯示即時字數校準進度） */}
          <div className="space-y-1.5">
            <label
              htmlFor="raw-weight-confirm-input"
              className="block font-sans text-[11px] text-muted-foreground"
            >
              {t('diet.rawWeightGuide.inputHintPrefix', '輸入「')}
              <span className="font-mono font-semibold text-foreground">{keyword}</span>
              {t('diet.rawWeightGuide.inputHintSuffix', '」後點擊右上角確認。')}
            </label>
            <div className="relative">
              <Input
                id="raw-weight-confirm-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValid) {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                placeholder={keyword}
                className="h-9 pr-10 rounded-md border-border bg-background text-xs font-sans placeholder:opacity-40"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] tabular-nums pointer-events-none flex items-center">
                {isValid ? (
                  <Check className="size-3.5 text-foreground stroke-[2.2]" />
                ) : (
                  <span className="text-muted-foreground">
                    {currentLen}/{targetLen}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </PrecisionDialogContent>
    </Dialog>
  );
}
