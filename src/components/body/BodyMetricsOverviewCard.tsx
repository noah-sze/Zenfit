import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type MetricType = 'trendWeight' | 'bmi' | 'ffmi' | 'leanBodyMass' | 'fatMass';

export interface BodyMetricsOverviewCardProps {
  trendWeight?: number | null;
  bodyWeightUnit?: string;
  hasTodayWeight?: boolean;
  bmi?: number | null;
  ffmi?: number | null;
  hasTodayBodyFat?: boolean;
  leanMass?: number | null;
  fatMass?: number | null;
  interactive?: boolean;
  onOpenMetricPopover?: (type: MetricType, anchorEl: HTMLElement) => void;
}

export function BodyMetricsOverviewCard({
  trendWeight = null,
  bodyWeightUnit = 'kg',
  hasTodayWeight = false,
  bmi = null,
  ffmi = null,
  hasTodayBodyFat = false,
  leanMass = null,
  fatMass = null,
  interactive = false,
  onOpenMetricPopover,
}: BodyMetricsOverviewCardProps) {
  const { t } = useTranslation();
  const [activeMetric, setActiveMetric] = useState<MetricType | null>(null);

  const getMetricDisplayValue = (type: MetricType) => {
    switch (type) {
      case 'trendWeight':
        return trendWeight ? `${trendWeight} ${bodyWeightUnit}` : '-';
      case 'bmi':
        return bmi && bmi > 0 ? `${bmi}` : '-';
      case 'ffmi':
        return ffmi && ffmi > 0 ? `${ffmi}` : '-';
      case 'leanBodyMass':
        return leanMass && leanMass > 0 ? `${leanMass} ${bodyWeightUnit}` : '-';
      case 'fatMass':
        return fatMass && fatMass > 0 ? `${fatMass} ${bodyWeightUnit}` : '-';
    }
  };

  const isMetricFresh = (type: MetricType) => {
    if (type === 'trendWeight' || type === 'bmi') {
      return hasTodayWeight;
    }
    return hasTodayWeight && hasTodayBodyFat;
  };

  const renderMetricPopoverContent = (type: MetricType) => (
    <PopoverContent
      align="center"
      side="bottom"
      sideOffset={6}
      className="w-80 sm:w-88 max-w-[calc(100vw-24px)] p-4 bg-popover text-popover-foreground border border-border shadow-none rounded-lg select-none font-mono focus:outline-hidden"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="text-xs font-semibold text-foreground">
            {t(`body.metricExplanations.${type}.title`)}
          </div>
          <div
            className={cn(
              'text-xs font-mono transition-colors',
              isMetricFresh(type) ? 'text-foreground' : 'text-muted-foreground/60'
            )}
          >
            {getMetricDisplayValue(type)}
            {!isMetricFresh(type) && getMetricDisplayValue(type) !== '-' && (
              <span className="text-[11px] text-muted-foreground/60 ml-1.5 font-sans">
                ({t('body.referenceValue', '參考值')})
              </span>
            )}
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground font-mono flex flex-wrap items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded leading-relaxed">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 shrink-0">
            {t('body.metricExplanations.formula', '計算公式')}:
          </span>
          <span className="text-foreground whitespace-normal break-words">
            {t(`body.metricExplanations.${type}.formula`)}
          </span>
        </div>

        <div className="text-xs text-muted-foreground font-sans leading-relaxed pt-0.5 break-words">
          {t(`body.metricExplanations.${type}.desc`)}
        </div>
      </div>
    </PopoverContent>
  );

  return (
    <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground select-none font-mono">
      {/* 標頭 */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs">
        <span className="font-semibold text-xs uppercase tracking-widest text-muted-foreground font-sans">
          {t('body.metricsTitle', '體態指標')}
        </span>
      </div>

      {/* 第一列：平滑體重 */}
      {interactive ? (
        <Popover
          open={activeMetric === 'trendWeight'}
          onOpenChange={(open) => setActiveMetric(open ? 'trendWeight' : null)}
        >
          <PopoverTrigger
            type="button"
            onClick={(e) => onOpenMetricPopover?.('trendWeight', e.currentTarget)}
            className="w-full p-3 sm:p-3.5 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
          >
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.trendWeight', '平滑體重')}
            </div>
            <div
              className={cn(
                'text-base sm:text-lg font-normal truncate transition-colors',
                hasTodayWeight
                  ? 'text-foreground'
                  : trendWeight
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {trendWeight ? `${trendWeight} ${bodyWeightUnit}` : '-'}
            </div>
          </PopoverTrigger>
          {renderMetricPopoverContent('trendWeight')}
        </Popover>
      ) : (
        <div className="w-full p-3 sm:p-3.5 text-center space-y-0.5 overflow-hidden">
          <div className="text-[11px] text-muted-foreground truncate">
            {t('body.trendWeight', '平滑體重')}
          </div>
          <div
            className={cn(
              'text-base sm:text-lg font-normal truncate',
              hasTodayWeight
                ? 'text-foreground'
                : trendWeight
                  ? 'text-muted-foreground/40'
                  : 'text-muted-foreground/25'
            )}
          >
            {trendWeight ? `${trendWeight}${bodyWeightUnit}` : '-'}
          </div>
        </div>
      )}

      {/* 第二列：BMI 指數 · FFMI 指數 */}
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        {/* 1. BMI 指數 */}
        {interactive ? (
          <Popover
            open={activeMetric === 'bmi'}
            onOpenChange={(open) => setActiveMetric(open ? 'bmi' : null)}
          >
            <PopoverTrigger
              type="button"
              onClick={(e) => onOpenMetricPopover?.('bmi', e.currentTarget)}
              className="p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
            >
              <div className="text-[11px] text-muted-foreground truncate">
                {t('body.bmi', 'BMI')}
              </div>
              <div
                className={cn(
                  'text-sm sm:text-base font-normal truncate transition-colors',
                  hasTodayWeight
                    ? 'text-foreground'
                    : bmi && bmi > 0
                      ? 'text-muted-foreground/40'
                      : 'text-muted-foreground/25'
                )}
              >
                {bmi && bmi > 0 ? bmi : '-'}
              </div>
            </PopoverTrigger>
            {renderMetricPopoverContent('bmi')}
          </Popover>
        ) : (
          <div className="p-3 text-center space-y-0.5 overflow-hidden">
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.bmi', 'BMI')}
            </div>
            <div
              className={cn(
                'text-sm sm:text-base font-normal truncate',
                hasTodayWeight
                  ? 'text-foreground'
                  : bmi && bmi > 0
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {bmi && bmi > 0 ? bmi : '-'}
            </div>
          </div>
        )}

        {/* 2. FFMI 指數 */}
        {interactive ? (
          <Popover
            open={activeMetric === 'ffmi'}
            onOpenChange={(open) => setActiveMetric(open ? 'ffmi' : null)}
          >
            <PopoverTrigger
              type="button"
              onClick={(e) => onOpenMetricPopover?.('ffmi', e.currentTarget)}
              className="p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
            >
              <div className="text-[11px] text-muted-foreground truncate">
                {t('body.ffmi', 'FFMI')}
              </div>
              <div
                className={cn(
                  'text-sm sm:text-base font-normal truncate transition-colors',
                  hasTodayWeight && hasTodayBodyFat
                    ? 'text-foreground'
                    : ffmi !== null && ffmi !== undefined && ffmi > 0
                      ? 'text-muted-foreground/40'
                      : 'text-muted-foreground/25'
                )}
              >
                {ffmi !== null && ffmi !== undefined && ffmi > 0 ? ffmi : '-'}
              </div>
            </PopoverTrigger>
            {renderMetricPopoverContent('ffmi')}
          </Popover>
        ) : (
          <div className="p-3 text-center space-y-0.5 overflow-hidden">
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.ffmi', 'FFMI')}
            </div>
            <div
              className={cn(
                'text-sm sm:text-base font-normal truncate',
                hasTodayWeight && hasTodayBodyFat
                  ? 'text-foreground'
                  : ffmi !== null && ffmi !== undefined && ffmi > 0
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {ffmi !== null && ffmi !== undefined && ffmi > 0 ? ffmi : '-'}
            </div>
          </div>
        )}
      </div>

      {/* 第三列：去脂體重 · 脂肪總重 */}
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        {/* 3. 去脂體重 */}
        {interactive ? (
          <Popover
            open={activeMetric === 'leanBodyMass'}
            onOpenChange={(open) => setActiveMetric(open ? 'leanBodyMass' : null)}
          >
            <PopoverTrigger
              type="button"
              onClick={(e) => onOpenMetricPopover?.('leanBodyMass', e.currentTarget)}
              className="p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
            >
              <div className="text-[11px] text-muted-foreground truncate">
                {t('body.leanBodyMass', '去脂體重')}
              </div>
              <div
                className={cn(
                  'text-sm sm:text-base font-normal truncate transition-colors',
                  hasTodayWeight && hasTodayBodyFat
                    ? 'text-foreground'
                    : leanMass
                      ? 'text-muted-foreground/40'
                      : 'text-muted-foreground/25'
                )}
              >
                {leanMass ? `${leanMass} ${bodyWeightUnit}` : '-'}
              </div>
            </PopoverTrigger>
            {renderMetricPopoverContent('leanBodyMass')}
          </Popover>
        ) : (
          <div className="p-3 text-center space-y-0.5 overflow-hidden">
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.leanBodyMass', '去脂體重')}
            </div>
            <div
              className={cn(
                'text-sm sm:text-base font-normal truncate',
                hasTodayWeight && hasTodayBodyFat
                  ? 'text-foreground'
                  : leanMass
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {leanMass ? `${leanMass}${bodyWeightUnit}` : '-'}
            </div>
          </div>
        )}

        {/* 4. 脂肪總重 */}
        {interactive ? (
          <Popover
            open={activeMetric === 'fatMass'}
            onOpenChange={(open) => setActiveMetric(open ? 'fatMass' : null)}
          >
            <PopoverTrigger
              type="button"
              onClick={(e) => onOpenMetricPopover?.('fatMass', e.currentTarget)}
              className="p-3 text-center space-y-0.5 overflow-hidden hover:bg-hover transition-colors cursor-pointer active:scale-[0.99] focus:outline-hidden"
            >
              <div className="text-[11px] text-muted-foreground truncate">
                {t('body.fatMass', '脂肪總重')}
              </div>
              <div
                className={cn(
                  'text-sm sm:text-base font-normal truncate transition-colors',
                  hasTodayWeight && hasTodayBodyFat
                    ? 'text-foreground'
                    : fatMass
                      ? 'text-muted-foreground/40'
                      : 'text-muted-foreground/25'
                )}
              >
                {fatMass ? `${fatMass} ${bodyWeightUnit}` : '-'}
              </div>
            </PopoverTrigger>
            {renderMetricPopoverContent('fatMass')}
          </Popover>
        ) : (
          <div className="p-3 text-center space-y-0.5 overflow-hidden">
            <div className="text-[11px] text-muted-foreground truncate">
              {t('body.fatMass', '脂肪總重')}
            </div>
            <div
              className={cn(
                'text-sm sm:text-base font-normal truncate',
                hasTodayWeight && hasTodayBodyFat
                  ? 'text-foreground'
                  : fatMass
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/25'
              )}
            >
              {fatMass ? `${fatMass}${bodyWeightUnit}` : '-'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
