import { useState, useEffect, useId, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import { ExerciseSelectDialog } from '@/components/workout/ExerciseSelectDialog';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { useExercises } from '@/hooks/useExercises';
import { useEquipments } from '@/hooks/useEquipments';
import { getRoutineFactSummary } from '@/utils/workoutMath';
import type { RoutineExerciseItem, WorkoutRoutine, Exercise } from '@/types';

export interface RoutineFormData {
  name: string;
  notes?: string;
  exercises: RoutineExerciseItem[];
}

export interface RoutineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: WorkoutRoutine | null;
  onSubmit: (data: RoutineFormData) => Promise<void> | void;
}

interface KeypadConfig {
  index: number;
  exerciseName: string;
  value: number;
  anchorEl?: HTMLElement | null;
}

export function RoutineFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: RoutineFormDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { allExercises } = useExercises();
  const { getEquipmentDisplayName } = useEquipments();
  const isEdit = !!initialData;

  // 構建快速查詢 Map
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((ex) => map.set(ex.id, ex));
    return map;
  }, [allExercises]);

  const [name, setName] = useState('');
  const [items, setItems] = useState<RoutineExerciseItem[]>([]);

  // 動作挑選器狀態
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // 數字鍵盤狀態
  const [keypadConfig, setKeypadConfig] = useState<KeypadConfig | null>(null);
  const initialKeypadValueRef = useRef<number>(4);

  // 初始化或編輯回填
  useEffect(() => {
    if (!open) return;

    if (initialData) {
      // oxlint-disable-next-line react/set-state-in-effect
      setName(initialData.name || '');
      setItems(initialData.exercises || []);
    } else {
      // oxlint-disable-next-line react/set-state-in-effect
      setName('');
      setItems([]);
    }
  }, [open, initialData]);

  // 即時計算組合客觀事實概覽
  const summary = useMemo(() => {
    return getRoutineFactSummary({ exercises: items }, exerciseMap);
  }, [items, exerciseMap]);

  // 計算挑選器中已存在不可重複選擇的 ID
  const disabledExerciseIds = useMemo(() => {
    if (replacingIndex !== null && replacingIndex >= 0 && replacingIndex < items.length) {
      return items.filter((_, idx) => idx !== replacingIndex).map((it) => it.exerciseId);
    }
    return items.map((it) => it.exerciseId);
  }, [items, replacingIndex]);

  // 新增動作觸發
  const handleOpenAddExercise = () => {
    triggerHaptic('selection');
    setReplacingIndex(null);
    setIsPickerOpen(true);
  };

  // 替換現有動作觸發
  const handleOpenReplaceExercise = (index: number) => {
    triggerHaptic('selection');
    setReplacingIndex(index);
    setIsPickerOpen(true);
  };

  // 挑選器選中動作回調
  const handleSelectExercise = (exercise: Exercise) => {
    if (replacingIndex !== null && replacingIndex >= 0 && replacingIndex < items.length) {
      // 替換
      const updated = [...items];
      updated[replacingIndex] = {
        ...updated[replacingIndex],
        exerciseId: exercise.id,
      };
      setItems(updated);
      setReplacingIndex(null);
    } else {
      // 新增，預設組數為 4 組
      setItems([...items, { exerciseId: exercise.id, defaultSets: 4 }]);
    }
  };

  // 喚起懸浮鍵盤微調組數
  const handleOpenKeypad = (index: number, anchorEl?: HTMLElement) => {
    const item = items[index];
    if (!item) return;
    const ex = exerciseMap.get(item.exerciseId);
    initialKeypadValueRef.current = item.defaultSets;
    setKeypadConfig({
      index,
      exerciseName: ex ? ex.name : t('workout.exercises'),
      value: item.defaultSets,
      anchorEl,
    });
  };

  const handleKeypadLiveChange = (value: number) => {
    if (!keypadConfig) return;
    const cleanSets = Math.max(1, Math.min(30, Math.floor(value || 1)));
    setItems((prev) => {
      const next = [...prev];
      if (next[keypadConfig.index]) {
        next[keypadConfig.index] = {
          ...next[keypadConfig.index],
          defaultSets: cleanSets,
        };
      }
      return next;
    });
  };

  const handleKeypadConfirm = (value: number) => {
    if (!keypadConfig) return;
    const cleanSets = Math.max(1, Math.min(30, Math.floor(value || 1)));
    setItems((prev) => {
      const next = [...prev];
      if (next[keypadConfig.index]) {
        next[keypadConfig.index] = {
          ...next[keypadConfig.index],
          defaultSets: cleanSets,
        };
      }
      return next;
    });
    setKeypadConfig(null);
  };

  const handleKeypadCancel = () => {
    if (!keypadConfig) return;
    const originalVal = initialKeypadValueRef.current;
    setItems((prev) => {
      const next = [...prev];
      if (next[keypadConfig.index]) {
        next[keypadConfig.index] = {
          ...next[keypadConfig.index],
          defaultSets: originalVal,
        };
      }
      return next;
    });
    setKeypadConfig(null);
  };

  const handleRemoveItem = (index: number) => {
    triggerHaptic('selection');
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.show(t('common.required'));
      return;
    }

    if (items.length === 0) {
      toast.show(t('workout.atLeastOneExercise'));
      return;
    }

    try {
      await onSubmit({
        name: trimmed,
        exercises: items,
      });
      onOpenChange(false);
    } catch {
      toast.show(t('common.error'));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <PrecisionDialogContent
          title={isEdit ? t('workout.editRoutine') : t('common.add')}
          form={formId}
          onClose={() => onOpenChange(false)}
        >
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="pt-3.5 space-y-3 font-mono text-xs select-none"
          >
            <div className="space-y-3">
              {/* 表單段落 1: 名稱 (Usage List 佈局) */}
              <div className="border border-border rounded-lg overflow-hidden bg-card text-xs shrink-0">
                {/* 組合名稱 */}
                <div className="min-h-11 py-2 px-3 sm:px-4 flex items-center justify-between gap-3 bg-card">
                  <span className="text-muted-foreground whitespace-nowrap shrink-0">
                    {t('workout.routineName')}
                  </span>
                  <div className="flex-1 flex justify-end">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('workout.routineNamePlaceholder', '例如：推力日 A')}
                      className="h-7 px-3 rounded-full border border-border/80 bg-background text-right text-xs font-sans text-foreground font-medium focus:outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-all duration-100 w-36"
                      maxLength={50}
                    />
                  </div>
                </div>
              </div>

              {/* 表單段落 2: 即時事實看板 (HUD Banner) */}
              <div className="space-y-1.5 shrink-0">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  {t('workout.objectiveMetrics', '客觀概覽')}
                </div>
                <div className="border border-border rounded-lg overflow-hidden bg-card grid grid-cols-2 divide-x divide-border select-none py-2 text-center shrink-0">
                  <div className="px-1 flex flex-col items-center justify-center min-w-0">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                      {t('workout.exercises', '動作數')}
                    </span>
                    <div className="font-mono text-xs font-bold text-foreground mt-0.5 truncate flex items-baseline gap-0.5">
                      <span>{summary.exerciseCount}</span>
                      <span className="text-[9px] font-normal opacity-75">{t('common.items', '項')}</span>
                    </div>
                  </div>
                  <div className="px-1 flex flex-col items-center justify-center min-w-0">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                      {t('workout.plannedSets', '計劃組數')}
                    </span>
                    <div className="font-mono text-xs font-bold text-foreground mt-0.5 truncate flex items-baseline gap-0.5">
                      <span>{summary.totalPlannedSets}</span>
                      <span className="text-[9px] font-normal opacity-75">{t('workout.set', '組')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 表單段落 3: 動作構成清單 */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between px-0">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {t('workout.routineExerciseList', '動作構成')} ({items.length})
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddExercise}
                    className="h-6 px-2.5 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer text-foreground active:scale-95 select-none"
                  >
                    <Plus className="size-3 text-muted-foreground" />
                    <span>{t('workout.addExercise')}</span>
                  </button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
                  {items.length === 0 ? (
                    <div className="py-6 px-4 text-center shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenAddExercise}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none font-mono"
                      >
                        <Plus className="size-3.5" />
                        <span>{t('workout.addExercise')}</span>
                      </button>
                    </div>
                  ) : (
                    items.map((item, index) => {
                      const ex = exerciseMap.get(item.exerciseId);
                      return (
                        <div
                          key={`${item.exerciseId}-${index}`}
                          className="min-h-12 py-2 px-3 sm:px-4 flex items-center justify-between gap-2 bg-card shrink-0"
                        >
                          {/* 左側：動作名與器械 (點擊可替換動作) */}
                          <button
                            type="button"
                            onClick={() => handleOpenReplaceExercise(index)}
                            className="text-left min-w-0 flex-1 truncate cursor-pointer outline-none group"
                            title={ex ? ex.name : t('workout.unknownExercise')}
                          >
                            <div className="text-xs font-medium text-foreground truncate group-hover:opacity-75 transition-opacity">
                              {ex ? ex.name : t('workout.unknownExercise')}
                            </div>
                            {ex && (
                              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                                <EquipmentBadge
                                  name={getEquipmentDisplayName(ex.equipment, t)}
                                  size="sm"
                                  className="text-[9px] px-1 py-0 h-4 leading-none"
                                />
                              </div>
                            )}
                          </button>

                          {/* 右側：組數膠囊 + 刪除按鈕 */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleOpenKeypad(index, e.currentTarget)}
                              className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-hover font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95 select-none shrink-0"
                            >
                              <span className="font-bold text-foreground">
                                {item.defaultSets}
                              </span>
                              <span className="text-muted-foreground text-[11px]">
                                {t('workout.set', '組')}
                              </span>
                              <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="size-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-hover transition-colors cursor-pointer shrink-0"
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </form>
        </PrecisionDialogContent>
      </Dialog>

      {/* 次級懸浮鍵盤 (組數微調) */}
      {keypadConfig && (
        <NumericKeypadDialog
          open={!!keypadConfig}
          onOpenChange={(kOpen) => {
            if (!kOpen) handleKeypadCancel();
          }}
          title={keypadConfig.exerciseName}
          value={keypadConfig.value}
          unit={t('workout.set', '組')}
          allowDecimals={false}
          maxDecimals={0}
          anchorEl={keypadConfig.anchorEl}
          onLiveChange={handleKeypadLiveChange}
          onConfirm={handleKeypadConfirm}
          onCancel={handleKeypadCancel}
        />
      )}

      {/* 次級動作選擇器 (平鋪兄弟節點，zIndex={80}) */}
      <ExerciseSelectDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        mode="exercises"
        zIndex={80}
        disabledIds={disabledExerciseIds}
        onSelect={(item) => handleSelectExercise(item as Exercise)}
      />
    </>
  );
}
