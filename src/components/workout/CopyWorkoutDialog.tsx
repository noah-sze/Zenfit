import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { Check, Clock, ChevronRight, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogPrecisionHeader } from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { db } from '@/services/db/db';
import { cn } from '@/lib/utils';
import { CopyWorkoutDatePickerDialog } from './CopyWorkoutDatePickerDialog';
import type { WorkoutLog, WorkoutExerciseGroup, WorkoutSet } from '@/types';

export interface CopyWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDate: string;
}

interface CopyableWorkoutItem {
  id: string; // 唯一選取 key (e.g. `${workout.id}-${group.exerciseId}-${idx}`)
  sourceWorkoutId: string;
  routineId?: string;
  routineName?: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

/**
 * 依目標組數純函數調整動作組數，增減時保留原有的 weight / reps
 */
export function adjustWorkoutSets(originalSets: WorkoutSet[], targetCount: number): WorkoutSet[] {
  const safeCount = Math.max(1, Math.floor(targetCount));
  if (originalSets.length === safeCount) return originalSets;

  if (safeCount < originalSets.length) {
    return originalSets.slice(0, safeCount).map((s, idx) => ({
      ...s,
      setNumber: idx + 1,
    }));
  }

  const lastSet = originalSets[originalSets.length - 1];
  const newSets = [...originalSets];
  for (let i = originalSets.length; i < safeCount; i++) {
    newSets.push({
      id: uuidv4(),
      setNumber: i + 1,
      weight: lastSet?.weight ?? 0,
      reps: lastSet?.reps ?? 0,
      rpe: lastSet?.rpe,
      isCompleted: true,
    });
  }
  return newSets;
}

/**
 * 複製訓練 Dialog (Precision Modal 標準版 · 一體化表頭橫欄)：
 * 1. 標準 Precision Modal 幾何（w-[320px] sm:w-[340px]，shadow-none，border border-border，p-4 pb-5）。
 * 2. 標頭符合規範：左上角 ✕ 圓形關閉按鈕，中間標題「複製訓練」（去綴詞），右上角 ✓ 圓形確認按鈕。
 * 3. 一體化來源橫欄（Integrated Header Notch）：灰色橫欄，左側顯示來源日期（如 11/09 (昨日)），右側膠囊按鈕「更換 ▾」呼出日期選擇器。
 * 4. 動作清單容器（min-h-[220px] max-h-[340px]），條目對齊 CopyMealDialog（min-h-12 / 48px），支援勾選與右側組數膠囊按鈕（點擊呼出 NumericKeypadDialog 即時調整組數）。
 * 5. 即時連動：數字鍵盤數值變更時即時調整組數與底部彙總條。
 * 6. 底部單行彙總條維持無縫自然留白（無分割線）。
 * 7. 二級日期選擇 Dialog 與懸浮數字鍵盤採平級 Flat Sibling 宣告。
 */
export function CopyWorkoutDialog({
  open,
  onOpenChange,
  targetDate,
}: CopyWorkoutDialogProps) {
  const { t } = useTranslation();

  // 查詢當前目標日期前，所有有訓練記錄的歷史日期 (降序排列)
  const recordedDates = useLiveQuery<string[]>(async () => {
    if (!targetDate) return [];
    const logs = await db.workout_logs
      .where('date')
      .below(targetDate)
      .reverse()
      .toArray();

    const dateSet = new Set<string>();
    for (const log of logs) {
      if (log.exercises && log.exercises.length > 0) {
        dateSet.add(log.date);
      }
    }
    return Array.from(dateSet);
  }, [targetDate]);

  const lastRecordedDate = recordedDates && recordedDates.length > 0 ? recordedDates[0] : null;

  // 手動選擇日期狀態與日曆彈窗
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // 當前生效之歷史日期字串（手動選擇優先，預設為最新一次記錄日期）
  const activeHistoryDate = useMemo(() => {
    return selectedHistoryDate || lastRecordedDate;
  }, [selectedHistoryDate, lastRecordedDate]);

  // 彈窗開啟或目標參數變更時，重置手動選擇與次級彈窗
  useEffect(() => {
    if (open) {
      setSelectedHistoryDate(null);
      setIsDatePickerOpen(false);
      setKeypadConfig(null);
    }
  }, [open, targetDate]);

  // 查詢歷史日期所有訓練動作條目
  const historicalLogs = useLiveQuery<CopyableWorkoutItem[]>(async () => {
    if (!activeHistoryDate) return [];
    const workoutLogs = await db.workout_logs
      .where('date')
      .equals(activeHistoryDate)
      .sortBy('createdAt');

    if (!workoutLogs || workoutLogs.length === 0) return [];

    const allExercises = await db.exercises.toArray();
    const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));

    const allRoutines = await db.routines.toArray();
    const routineMap = new Map(allRoutines.map((r) => [r.id, r]));

    const result: CopyableWorkoutItem[] = [];

    for (const w of workoutLogs) {
      const routine = w.routineId ? routineMap.get(w.routineId) : undefined;
      (w.exercises || []).forEach((group, gIdx) => {
        const ex = exerciseMap.get(group.exerciseId);
        const exerciseName = ex ? ex.name : t('workout.unknownExercise', '未知動作');
        const itemId = `${w.id}-${group.exerciseId}-${gIdx}`;

        // 確保至少有一組，若原記錄組數為空則補齊一組防禦性資料
        const cleanSets =
          group.sets && group.sets.length > 0
            ? group.sets
            : [{ id: uuidv4(), setNumber: 1, weight: 0, reps: 0, isCompleted: true }];

        result.push({
          id: itemId,
          sourceWorkoutId: w.id,
          routineId: w.routineId,
          routineName: routine?.name,
          exerciseId: group.exerciseId,
          exerciseName,
          sets: cleanSets,
        });
      });
    }

    return result;
  }, [activeHistoryDate, t]);

  // 本地可編輯動作清單
  const [items, setItems] = useState<CopyableWorkoutItem[]>([]);
  // 勾選項目的 id 集合
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當歷史資料讀取或切換歷史日期時，更新本地列表並預設全選
  useEffect(() => {
    if (open && historicalLogs) {
      setItems(historicalLogs);
      setSelectedIds(new Set(historicalLogs.map((item) => item.id)));
    }
  }, [open, historicalLogs]);

  // 數字鍵盤狀態
  const [keypadConfig, setKeypadConfig] = useState<{
    index: number;
    title: string;
    value: number;
    unit: string;
    anchorEl?: HTMLElement | null;
  } | null>(null);
  const initialKeypadSetsRef = useRef<WorkoutSet[]>([]);

  // 打開數字鍵盤編輯組數
  const handleOpenKeypad = (index: number, anchorEl: HTMLElement) => {
    const row = items[index];
    if (!row) return;
    triggerHaptic('selection');
    initialKeypadSetsRef.current = row.sets;
    setKeypadConfig({
      index,
      title: row.exerciseName,
      value: row.sets.length,
      unit: t('workout.set', '組'),
      anchorEl,
    });
  };

  const handleKeypadLiveChange = useCallback((val: number) => {
    setItems((prev) => {
      if (!keypadConfig) return prev;
      return prev.map((row, idx) => {
        if (idx !== keypadConfig.index) return row;
        if (val <= 0) return row;
        return {
          ...row,
          sets: adjustWorkoutSets(row.sets, val),
        };
      });
    });
  }, [keypadConfig]);

  const handleKeypadConfirm = useCallback((val: number) => {
    setItems((prev) => {
      if (!keypadConfig) return prev;
      return prev.map((row, idx) => {
        if (idx !== keypadConfig.index) return row;
        const count = val > 0 ? val : 1;
        return {
          ...row,
          sets: adjustWorkoutSets(row.sets, count),
        };
      });
    });
    setKeypadConfig(null);
  }, [keypadConfig]);

  const handleKeypadCancel = useCallback(() => {
    if (!keypadConfig) return;
    const original = initialKeypadSetsRef.current;
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== keypadConfig.index) return row;
        return {
          ...row,
          sets: original,
        };
      })
    );
    setKeypadConfig(null);
  }, [keypadConfig]);

  const toggleItem = (id: string) => {
    triggerHaptic('selection');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const selectedCount = selectedItems.length;

  // 計算已選動作之總組數
  const totalSets = useMemo(() => {
    if (items.length === 0 || selectedCount === 0) return 0;
    return selectedItems.reduce((sum, item) => sum + item.sets.length, 0);
  }, [items, selectedItems, selectedCount]);

  // 格式化來源日期標籤 (如: 11/09 (昨日) 或 11/09)
  const sourceDateLabel = useMemo(() => {
    if (!activeHistoryDate) return null;
    const parsedActive = parseISO(activeHistoryDate);
    if (!isValid(parsedActive)) return activeHistoryDate;
    const formattedDate = format(parsedActive, 'MM/dd');

    if (targetDate) {
      const parsedTarget = parseISO(targetDate);
      if (isValid(parsedTarget)) {
        const diff = differenceInCalendarDays(parsedTarget, parsedActive);
        if (diff === 1) {
          return `${formattedDate} (${t('workout.copyWorkout.yesterdayShort', '昨日')})`;
        }
        if (diff === 2) {
          return `${formattedDate} (${t('workout.copyWorkout.dayBeforeShort', '前天')})`;
        }
      }
    }
    return formattedDate;
  }, [activeHistoryDate, targetDate, t]);

  // 主彈窗開關保護（防止懸浮鍵盤或日期選擇器開啟時誤關主彈窗）
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (keypadConfig || isDatePickerOpen)) {
      return;
    }
    onOpenChange(nextOpen);
  };

  // 執行複製寫入
  const handleCopy = async () => {
    if (items.length === 0 || selectedCount === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (selectedItems.length === 0) return;

      let now = Date.now();

      // 依據原始 sourceWorkoutId 分組建立全新 WorkoutLog，維護課表組合完整性
      const itemsByWorkout = new Map<string, CopyableWorkoutItem[]>();
      for (const item of selectedItems) {
        const list = itemsByWorkout.get(item.sourceWorkoutId) || [];
        list.push(item);
        itemsByWorkout.set(item.sourceWorkoutId, list);
      }

      const newWorkouts: WorkoutLog[] = [];
      for (const [, workoutItems] of itemsByWorkout.entries()) {
        const cleanExercises: WorkoutExerciseGroup[] = workoutItems.map((item) => ({
          exerciseId: item.exerciseId,
          sets: item.sets.map((s, sIdx) => ({
            id: uuidv4(),
            setNumber: sIdx + 1,
            weight: s.weight ?? 0,
            reps: s.reps ?? 0,
            rpe: s.rpe,
            isCompleted: true,
          })),
        }));

        newWorkouts.push({
          id: uuidv4(),
          date: targetDate,
          routineId: workoutItems[0]?.routineId,
          exercises: cleanExercises,
          createdAt: now++,
          updatedAt: now++,
        });
      }

      await db.workout_logs.bulkAdd(newWorkouts);

      triggerHaptic('success');
      toast.show(
        t('workout.copyWorkout.successToast', {
          count: selectedCount,
          defaultValue: `已複製 ${selectedCount} 個動作至今日訓練`,
        })
      );
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to copy workout:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          size="standard"
          showCloseButton={false}
          initialFocus={false}
          className="w-[320px] sm:w-[340px] max-w-[calc(100vw-24px)] sm:max-w-[340px] p-4 pb-5 sm:p-4 sm:pb-5 bg-card text-card-foreground border border-border shadow-none font-mono text-xs select-none flex flex-col overflow-hidden max-h-[85vh] max-h-[85dvh]"
        >
          {/* 頂部標準標頭：左上角 ✕ 關閉，中間標題純粹「複製訓練」（去綴詞），右上角 ✓ 確認複製 */}
          <DialogPrecisionHeader
            title={t('workout.copyWorkout.title', '複製訓練')}
            onClose={() => onOpenChange(false)}
            onSubmit={handleCopy}
            submitDisabled={items.length === 0 || selectedCount === 0 || isSubmitting}
            submitAriaLabel={t('workout.copyWorkout.confirm', '確認複製')}
            cancelAriaLabel={t('common.cancel', '取消')}
          />

          {/* 動作清單容器（全站標準 min-h-[220px] max-h-[340px]，表頭一體化橫欄 Integrated Header Notch） */}
          <div className="flex-1 min-h-[220px] max-h-[340px] flex flex-col mt-5 mb-5 rounded-lg border border-border bg-card overflow-hidden">
            {/* 表頭一體化橫欄 */}
            <div className="h-8.5 bg-muted/40 border-b border-border px-3 flex items-center justify-between select-none shrink-0">
              {/* 左側：時鐘圖標 + 來源： + 粗體高亮日期 */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono min-w-0 truncate">
                <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="shrink-0">{t('workout.copyWorkout.source', '來源：')}</span>
                <span className="font-semibold text-foreground truncate">
                  {sourceDateLabel || t('common.none', '無')}
                </span>
              </div>

              {/* 右側：微型膠囊按鈕 [更換 ▾] */}
              <button
                type="button"
                disabled={!recordedDates || recordedDates.length === 0}
                onClick={() => {
                  triggerHaptic('selection');
                  setIsDatePickerOpen(true);
                }}
                className="h-6 px-2 rounded border border-border/80 bg-background hover:bg-hover text-2xs font-mono flex items-center gap-1 text-foreground cursor-pointer transition-colors active:scale-95 disabled:opacity-40 disabled:pointer-events-none select-none shrink-0"
              >
                <span>{t('workout.copyWorkout.change', '更換')}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </div>

            {/* 動作清單滾動區 */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {t('workout.copyWorkout.empty', '該日期無歷史訓練')}
                  </span>
                  <span className="text-2xs text-muted-foreground/60 font-mono">
                    {t('workout.copyWorkout.emptyHint', '請選擇其他日期')}
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, index) => {
                    const isSelected = selectedIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'min-h-12 py-2 px-3 sm:px-4 flex items-center justify-between gap-2 bg-card transition-all cursor-pointer hover:bg-hover select-none',
                          !isSelected && 'opacity-40'
                        )}
                      >
                        {/* 自訂高對比 Checkbox 與動作名稱 */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div
                            className={cn(
                              'size-4 rounded flex items-center justify-center shrink-0 border transition-colors',
                              isSelected
                                ? 'bg-foreground text-background border-foreground'
                                : 'border-border bg-transparent text-transparent'
                            )}
                          >
                            {isSelected && <Check className="size-3 stroke-[3]" />}
                          </div>

                          <span className="truncate text-xs font-medium text-foreground flex-1 min-w-0">
                            {item.exerciseName}
                          </span>
                        </div>

                        {/* 右側結構：常用數字輸入框膠囊 (組數) */}
                        <button
                          type="button"
                          disabled={!isSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSelected) return;
                            handleOpenKeypad(index, e.currentTarget);
                          }}
                          className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95 select-none shrink-0 disabled:pointer-events-none"
                        >
                          <span className="font-bold text-foreground">
                            {item.sets.length}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {t('workout.set', '組')}
                          </span>
                          <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 底部單行彙總條（自然無縫留白，無分割線） */}
          <div className="flex items-center justify-center px-1 pt-0 pb-0 text-xs font-mono text-muted-foreground shrink-0 select-none">
            <span>
              {t('workout.copyWorkout.summary', {
                count: selectedCount,
                sets: totalSets,
                defaultValue: `已選 ${selectedCount} 個動作 · 總計 ${totalSets} 組`,
              })}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* 二級日期選擇 Dialog (Flat Sibling 宣告，z-[70]) */}
      <CopyWorkoutDatePickerDialog
        open={open && isDatePickerOpen}
        onOpenChange={setIsDatePickerOpen}
        targetDate={targetDate}
        selectedDate={activeHistoryDate}
        recordedDates={recordedDates || []}
        onSelectDate={(dateStr) => {
          setSelectedHistoryDate(dateStr);
          setIsDatePickerOpen(false);
        }}
      />

      {/* 次級懸浮鍵盤 (平級兄弟節點宣告，層級 zIndex={70} 高於主彈窗) */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={!!keypadConfig}
          onOpenChange={(kOpen) => {
            if (!kOpen) handleKeypadCancel();
          }}
          title={keypadConfig.title}
          value={keypadConfig.value}
          unit={keypadConfig.unit}
          allowDecimals={false}
          anchorEl={keypadConfig.anchorEl}
          onLiveChange={handleKeypadLiveChange}
          onConfirm={handleKeypadConfirm}
          onCancel={handleKeypadCancel}
        />
      )}
    </>
  );
}
