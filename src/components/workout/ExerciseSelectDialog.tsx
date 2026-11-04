import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { useExercises } from '@/hooks/useExercises';
import { useEquipments } from '@/hooks/useEquipments';
import { MAJOR_MUSCLE_GROUPS } from '@/constants/muscles';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import { AdaptiveMuscleBadgeGroup } from '@/components/workout/AdaptiveMuscleBadgeGroup';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { Exercise, DetailedMuscle } from '@/types';

export interface ExerciseSelectDialogProps {
  /** 控制彈窗開關 */
  open: boolean;
  /** 彈窗開關狀態變更回調 */
  onOpenChange: (open: boolean) => void;
  /** 自訂彈窗標題（預設由 i18n 輸出） */
  title?: string;
  /** 選取回調：回傳選中之動作，並依設定決定是否關閉彈窗 */
  onSelect: (exercise: Exercise) => void;
  /**
   * 選取項目後是否自動關閉彈窗
   * @default true
   */
  autoCloseOnSelect?: boolean;
  /**
   * 多層彈窗層級（Rule 4 規範）：
   * 當此彈窗自次級彈窗呼出時（如在 RoutineFormDialog 編輯彈窗中），
   * 透過傳入 zIndex 自適應提升遮罩與本體層級至 z-[80] 或更高
   * @default 70
   */
  zIndex?: number;
  /** 禁用的動作 ID 陣列（將反灰顯示且無法點擊選取，例如已存在於組合中的動作） */
  disabledIds?: string[];
}

export function ExerciseSelectDialog({
  open,
  onOpenChange,
  title,
  onSelect,
  autoCloseOnSelect = true,
  zIndex = 70,
  disabledIds = [],
}: ExerciseSelectDialogProps) {
  const { t } = useTranslation();
  const { activeExercises } = useExercises();
  const { getEquipmentDisplayName } = useEquipments();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');

  const resolvedTitle = title || t('workout.selectExercise', '選擇動作');
  const zIndexClass = `z-[${zIndex}]`;

  // 動作過濾計算
  const filteredExercises = useMemo(() => {
    let list = activeExercises;

    // 1. 部位過濾
    if (selectedMuscleFilter !== 'all') {
      const targetGroup = MAJOR_MUSCLE_GROUPS.find((g) => g.id === selectedMuscleFilter);
      if (targetGroup) {
        list = list.filter((ex) => {
          if (!ex.targetMuscles) return false;
          return Object.keys(ex.targetMuscles).some((m) =>
            targetGroup.detailedMuscles.includes(m as DetailedMuscle)
          );
        });
      }
    }

    // 2. 搜尋字串過濾
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          (ex.notes && ex.notes.toLowerCase().includes(query))
      );
    }

    return list;
  }, [activeExercises, selectedMuscleFilter, searchQuery]);

  const handleItemClick = (exercise: Exercise, isDisabled: boolean) => {
    if (isDisabled) {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('selection');
    onSelect(exercise);
    if (autoCloseOnSelect) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={zIndexClass}
        className={cn(
          zIndexClass,
          'w-[350px] max-w-[calc(100vw-24px)] sm:w-[350px] sm:max-w-[350px] h-[85vh] sm:h-[80vh] flex flex-col p-4 sm:p-5 bg-card border border-border text-card-foreground overflow-hidden select-none shadow-none font-mono text-xs'
        )}
        initialFocus={false}
      >
        {/* 標頭 (左側 ✕ 圓形取消膠囊，中間標題居中，無底欄) */}
        <DialogHeader className="p-0 pb-2 shrink-0">
          <div className="flex items-center justify-between w-full h-7">
            <DialogClose
              render={
                <button
                  type="button"
                  className="size-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground hover:bg-border transition-all cursor-pointer shrink-0 active:scale-92"
                  title={t('common.cancel')}
                  aria-label={t('common.cancel')}
                />
              }
            >
              <X className="size-3.5 stroke-[2.2]" />
            </DialogClose>

            <DialogTitle className="text-foreground text-sm font-semibold tracking-tight font-sans flex items-center justify-center flex-1 truncate px-2 text-center">
              <span className="truncate">{resolvedTitle}</span>
            </DialogTitle>

            <div className="size-7 shrink-0 pointer-events-none" aria-hidden="true" />
          </div>
        </DialogHeader>

        {/* 搜尋、過濾標籤列與動作清單主容器 (單一子節點接收 flex-1，避免多個同級元素全被 flex-1 拉伸) */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-2 pt-1">
          {/* 搜尋欄位 */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search')}
              className="w-full h-8 pl-8 pr-3 rounded-md bg-muted/30 border border-border/80 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
            />
          </div>

          {/* 部位過濾標籤橫向滑動列 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 pb-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setSelectedMuscleFilter('all');
              }}
              className={cn(
                'h-6 px-2.5 rounded-full border text-[11px] font-mono transition-colors cursor-pointer shrink-0 select-none active:scale-95',
                selectedMuscleFilter === 'all'
                  ? 'bg-foreground text-background border-foreground font-semibold'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/40'
              )}
            >
              {t('common.all', '全部')}
            </button>
            {MAJOR_MUSCLE_GROUPS.map((group) => {
              const isSelected = selectedMuscleFilter === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedMuscleFilter(group.id);
                  }}
                  className={cn(
                    'h-6 px-2.5 rounded-full border text-[11px] font-mono transition-colors cursor-pointer shrink-0 select-none active:scale-95',
                    isSelected
                      ? 'bg-foreground text-background border-foreground font-semibold'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  {t(`workout.${group.id}`)}
                </button>
              );
            })}
          </div>

          {/* 動作清單 */}
          <div className="flex-1 min-h-0 overflow-y-auto border border-border rounded-lg bg-card divide-y divide-border">
          {filteredExercises.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-muted-foreground">
              {t('workout.noExercises')}
            </div>
          ) : (
            filteredExercises.map((exercise) => {
              const isDisabled = disabledIds.includes(exercise.id);
              const muscleEntries = Object.entries(exercise.targetMuscles || {}) as [DetailedMuscle, number][];

              return (
                <div
                  key={exercise.id}
                  onClick={() => handleItemClick(exercise, isDisabled)}
                  className={cn(
                    'p-3 flex items-center justify-between transition-colors cursor-pointer select-none',
                    isDisabled
                      ? 'opacity-35 cursor-not-allowed bg-muted/10'
                      : 'hover:bg-muted/30 active:bg-muted/50'
                  )}
                >
                  <div className="space-y-1 pr-2 min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {exercise.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground flex-nowrap min-w-0 overflow-hidden">
                      <EquipmentBadge name={getEquipmentDisplayName(exercise.equipment, t)} />
                      {muscleEntries.length > 0 && (
                        <>
                          <span className="opacity-40 shrink-0">·</span>
                          <AdaptiveMuscleBadgeGroup entries={muscleEntries} className="min-w-0 flex-1" />
                        </>
                      )}
                    </div>
                  </div>

                  {isDisabled && (
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 border border-border px-1.5 py-0.5 rounded">
                      {t('common.selected', '已選')}
                    </span>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
