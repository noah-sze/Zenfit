import { useTranslation } from 'react-i18next';
import { Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BodyMetricKeypadField =
  | 'weight'
  | 'bodyFat'
  | 'shouldersCm'
  | 'chestCm'
  | 'waistCm'
  | 'hipsCm'
  | 'armsCm'
  | 'thighsCm';

export interface BodyTodayDataCardProps {
  weight?: number | null;
  bodyWeightUnit?: string;
  hasTodayWeight?: boolean;
  bodyFat?: number | null;
  hasTodayBodyFat?: boolean;
  shoulders?: number | null;
  hasTodayShoulders?: boolean;
  chest?: number | null;
  hasTodayChest?: boolean;
  waist?: number | null;
  hasTodayWaist?: boolean;
  hips?: number | null;
  hasTodayHips?: boolean;
  arms?: number | null;
  hasTodayArms?: boolean;
  thighs?: number | null;
  hasTodayThighs?: boolean;
  lengthUnit?: string;
  ignoreTorsoCircumferences?: boolean;
  ignoreLimbCircumferences?: boolean;
  isAllCircumferencesIgnored?: boolean;
  hasAnyTodayLog?: boolean;
  interactive?: boolean;
  onOpenKeypad?: (
    field: BodyMetricKeypadField,
    value: number,
    title: string,
    unit: string,
    anchorEl: HTMLElement
  ) => void;
  onDeleteTodayMetric?: () => void;
}

export function BodyTodayDataCard({
  weight = null,
  bodyWeightUnit = 'kg',
  hasTodayWeight = false,
  bodyFat = null,
  hasTodayBodyFat = false,
  shoulders = null,
  hasTodayShoulders = false,
  chest = null,
  hasTodayChest = false,
  waist = null,
  hasTodayWaist = false,
  hips = null,
  hasTodayHips = false,
  arms = null,
  hasTodayArms = false,
  thighs = null,
  hasTodayThighs = false,
  lengthUnit = 'cm',
  ignoreTorsoCircumferences = false,
  ignoreLimbCircumferences = true,
  isAllCircumferencesIgnored = false,
  hasAnyTodayLog = false,
  interactive = false,
  onOpenKeypad,
  onDeleteTodayMetric,
}: BodyTodayDataCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-lg shadow-none overflow-hidden text-card-foreground select-none font-mono">
      {/* 上半部：實測體重 (Hero Metric) 與 體脂率微型工藝膠囊 */}
      <div className="p-4 sm:p-5 relative space-y-3">
        {/* 頂部列：中間標題「今日數據」居中，右側動作 (刪除今日記錄) */}
        <div className="relative flex items-center justify-between">
          <div className="size-6 shrink-0 opacity-0 pointer-events-none" />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs sm:text-sm font-normal text-muted-foreground select-none">
              {t('body.todayData', '今日數據')}
            </span>
          </div>

          <div className="shrink-0 z-10">
            {interactive && hasAnyTodayLog ? (
              <button
                type="button"
                onClick={onDeleteTodayMetric}
                className="size-6 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title={t('common.delete', '刪除')}
                aria-label={t('common.delete', '刪除')}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : (
              <div className="size-6 shrink-0 opacity-0 pointer-events-none" />
            )}
          </div>
        </div>

        {/* 居中巨型數值 */}
        {interactive ? (
          <div
            onClick={(e) =>
              onOpenKeypad?.(
                'weight',
                weight || 0,
                t('body.rawWeight', '體重'),
                bodyWeightUnit,
                e.currentTarget
              )
            }
            className="pt-1 text-center cursor-pointer group"
          >
            <div className="hero-number flex items-baseline justify-center gap-1.5 font-mono">
              <span
                className={cn(
                  'text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums transition-colors',
                  hasTodayWeight
                    ? 'text-foreground group-hover:opacity-80'
                    : weight
                      ? 'text-muted-foreground/40 group-hover:text-muted-foreground/70'
                      : 'text-muted-foreground/30 group-hover:text-foreground'
                )}
              >
                {weight !== null && weight !== undefined ? weight : '-'}
              </span>
              <span
                className={cn(
                  'text-sm sm:text-base font-normal font-mono transition-colors',
                  hasTodayWeight ? 'text-muted-foreground' : 'text-muted-foreground/40'
                )}
              >
                {bodyWeightUnit}
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-1 text-center">
            <div className="hero-number flex items-baseline justify-center gap-1.5 font-mono">
              <span
                className={cn(
                  'text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums',
                  hasTodayWeight ? 'text-foreground' : 'text-muted-foreground/40'
                )}
              >
                {weight !== null && weight !== undefined ? weight : '-'}
              </span>
              <span
                className={cn(
                  'text-sm sm:text-base font-normal font-mono',
                  hasTodayWeight ? 'text-muted-foreground' : 'text-muted-foreground/40'
                )}
              >
                {bodyWeightUnit}
              </span>
            </div>
          </div>
        )}

        {/* 嵌合在下方的體脂率微型工藝膠囊 */}
        <div className="flex justify-center pt-1">
          {interactive ? (
            <button
              type="button"
              onClick={(e) =>
                onOpenKeypad?.(
                  'bodyFat',
                  bodyFat || 0,
                  t('body.bodyFat', '體脂率'),
                  '%',
                  e.currentTarget
                )
              }
              className="h-7 px-3 rounded-full border border-border bg-muted/30 hover:bg-hover active:scale-95 transition-[background-color,transform] cursor-pointer font-mono text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <span className="text-[11px]">{t('body.bodyFat', '體脂率')}</span>
              <span
                className={cn(
                  'transition-colors font-medium',
                  hasTodayBodyFat
                    ? 'text-foreground'
                    : bodyFat
                      ? 'text-muted-foreground/60'
                      : 'text-muted-foreground/40'
                )}
              >
                {bodyFat ? `${bodyFat}%` : '-'}
              </span>
              <ChevronRight className="size-3 opacity-60" />
            </button>
          ) : (
            <div className="h-7 px-3 rounded-full border border-border bg-muted/30 font-mono text-xs flex items-center gap-1.5 text-muted-foreground">
              <span className="text-[11px]">{t('body.bodyFat', '體脂率')}</span>
              <span
                className={cn(
                  'font-medium',
                  hasTodayBodyFat
                    ? 'text-foreground'
                    : bodyFat
                      ? 'text-muted-foreground/60'
                      : 'text-muted-foreground/40'
                )}
              >
                {bodyFat ? `${bodyFat}%` : '-'}
              </span>
              <ChevronRight className="size-3 opacity-60" />
            </div>
          )}
        </div>
      </div>

      {/* 下半部圍度欄位 */}
      {!isAllCircumferencesIgnored && (
        <>
          {/* 軀幹部位圍度：4 欄 (肩寬 | 胸圍 | 腰圍 | 臀圍) */}
          {!ignoreTorsoCircumferences && (
            <div className="grid grid-cols-4 divide-x divide-border border-t border-border font-mono">
              {/* 1. 肩寬 */}
              {interactive ? (
                <button
                  type="button"
                  onClick={(e) =>
                    onOpenKeypad?.(
                      'shouldersCm',
                      shoulders || 0,
                      t('body.shoulders', '肩寬'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.shoulders', '肩寬')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayShoulders
                        ? 'text-foreground'
                        : shoulders
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {shoulders ? `${shoulders}${lengthUnit}` : '-'}
                  </div>
                </button>
              ) : (
                <div className="p-3 text-center space-y-0.5 overflow-hidden">
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.shoulders', '肩寬')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate',
                      hasTodayShoulders
                        ? 'text-foreground'
                        : shoulders
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {shoulders ? `${shoulders}${lengthUnit}` : '-'}
                  </div>
                </div>
              )}

              {/* 2. 胸圍 */}
              {interactive ? (
                <button
                  type="button"
                  onClick={(e) =>
                    onOpenKeypad?.(
                      'chestCm',
                      chest || 0,
                      t('body.chest', '胸圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.chest', '胸圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayChest
                        ? 'text-foreground'
                        : chest
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {chest ? `${chest}${lengthUnit}` : '-'}
                  </div>
                </button>
              ) : (
                <div className="p-3 text-center space-y-0.5 overflow-hidden">
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.chest', '胸圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate',
                      hasTodayChest
                        ? 'text-foreground'
                        : chest
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {chest ? `${chest}${lengthUnit}` : '-'}
                  </div>
                </div>
              )}

              {/* 3. 腰圍 */}
              {interactive ? (
                <button
                  type="button"
                  onClick={(e) =>
                    onOpenKeypad?.(
                      'waistCm',
                      waist || 0,
                      t('body.waist', '腰圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.waist', '腰圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayWaist
                        ? 'text-foreground'
                        : waist
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {waist ? `${waist}${lengthUnit}` : '-'}
                  </div>
                </button>
              ) : (
                <div className="p-3 text-center space-y-0.5 overflow-hidden">
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.waist', '腰圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate',
                      hasTodayWaist
                        ? 'text-foreground'
                        : waist
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {waist ? `${waist}${lengthUnit}` : '-'}
                  </div>
                </div>
              )}

              {/* 4. 臀圍 */}
              {interactive ? (
                <button
                  type="button"
                  onClick={(e) =>
                    onOpenKeypad?.(
                      'hipsCm',
                      hips || 0,
                      t('body.hips', '臀圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.hips', '臀圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayHips
                        ? 'text-foreground'
                        : hips
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {hips ? `${hips}${lengthUnit}` : '-'}
                  </div>
                </button>
              ) : (
                <div className="p-3 text-center space-y-0.5 overflow-hidden">
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.hips', '臀圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate',
                      hasTodayHips
                        ? 'text-foreground'
                        : hips
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {hips ? `${hips}${lengthUnit}` : '-'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 四肢部位圍度：2 欄 (手臂圍 | 大腿圍) */}
          {!ignoreLimbCircumferences && (
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border font-mono">
              {/* 手臂圍 */}
              {interactive ? (
                <button
                  type="button"
                  onClick={(e) =>
                    onOpenKeypad?.(
                      'armsCm',
                      arms || 0,
                      t('body.arms', '手臂圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.arms', '手臂圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayArms
                        ? 'text-foreground'
                        : arms
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {arms ? `${arms}${lengthUnit}` : '-'}
                  </div>
                </button>
              ) : (
                <div className="p-3 text-center space-y-0.5 overflow-hidden">
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.arms', '手臂圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate',
                      hasTodayArms
                        ? 'text-foreground'
                        : arms
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {arms ? `${arms}${lengthUnit}` : '-'}
                  </div>
                </div>
              )}

              {/* 大腿圍 */}
              {interactive ? (
                <button
                  type="button"
                  onClick={(e) =>
                    onOpenKeypad?.(
                      'thighsCm',
                      thighs || 0,
                      t('body.thighs', '大腿圍'),
                      lengthUnit,
                      e.currentTarget
                    )
                  }
                  className="p-3 text-center space-y-0.5 hover:bg-hover transition-colors cursor-pointer active:scale-98 overflow-hidden"
                >
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.thighs', '大腿圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate transition-colors',
                      hasTodayThighs
                        ? 'text-foreground'
                        : thighs
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {thighs ? `${thighs}${lengthUnit}` : '-'}
                  </div>
                </button>
              ) : (
                <div className="p-3 text-center space-y-0.5 overflow-hidden">
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t('body.thighs', '大腿圍')}
                  </div>
                  <div
                    className={cn(
                      'text-sm sm:text-base font-normal truncate',
                      hasTodayThighs
                        ? 'text-foreground'
                        : thighs
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground/25'
                    )}
                  >
                    {thighs ? `${thighs}${lengthUnit}` : '-'}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
