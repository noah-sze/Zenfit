import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronRight, X } from 'lucide-react';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import { MAJOR_MUSCLE_GROUPS } from '@/constants/muscles';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import { AdaptiveMuscleBadgeGroup } from '@/components/workout/AdaptiveMuscleBadgeGroup';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { Exercise, WorkoutRoutine, DetailedMuscle } from '@/types';

export type ExerciseSelectMode = 'all' | 'exercises' | 'routines';

export interface ExerciseRoutineBrowserProps {
  /** 模式：全部 (可切換)、僅動作、或僅組合 @default 'all' */
  mode?: ExerciseSelectMode;
  /** 當前選中的 Tab (受控模式) */
  activeTab?: 'exercises' | 'routines';
  /** Tab 切換回調 (受控模式) */
  onTabChange?: (tab: 'exercises' | 'routines') => void;
  /** 項目點擊回調 */
  onItemClick?: (item: Exercise | WorkoutRoutine, type: 'exercise' | 'routine') => void;
  /** 禁用的項目 ID 陣列（將反灰顯示且無法點擊選取） */
  disabledIds?: string[];
  /** 自訂項目是否禁用的判斷函數 */
  isItemDisabled?: (item: Exercise | WorkoutRoutine, type: 'exercise' | 'routine') => boolean;
  /** 自訂容器類名 */
  className?: string;
  /** 自訂列表滾動容器類名 */
  listContainerClassName?: string;
}

export function ExerciseRoutineBrowser({
  mode = 'all',
  activeTab: controlledTab,
  onTabChange: setControlledTab,
  onItemClick,
  disabledIds,
  isItemDisabled,
  className,
  listContainerClassName,
}: ExerciseRoutineBrowserProps) {
  const { t } = useTranslation();

  // 動作庫資料
  const { activeExercises } = useExercises();
  const { getEquipmentDisplayName } = useEquipments();

  // 組合庫資料
  const { activeRoutines } = useRoutines();

  // 禁用 ID 快取集合
  const disabledIdSet = useMemo(() => new Set(disabledIds || []), [disabledIds]);

  const checkIsExerciseDisabled = (exercise: Exercise) => {
    if (disabledIdSet.has(exercise.id)) return true;
    if (isItemDisabled && isItemDisabled(exercise, 'exercise')) return true;
    return false;
  };

  const checkIsRoutineDisabled = (routine: WorkoutRoutine) => {
    if (disabledIdSet.has(routine.id)) return true;
    if (isItemDisabled && isItemDisabled(routine, 'routine')) return true;
    return false;
  };

  // 標籤頁切換狀態
  const [internalTab, setInternalTab] = useState<'exercises' | 'routines'>(
    mode === 'routines' ? 'routines' : 'exercises'
  );

  const currentTab = controlledTab ?? internalTab;
  const viewTab = mode === 'all' ? currentTab : mode;

  const handleTabChange = (tab: 'exercises' | 'routines') => {
    triggerHaptic('selection');
    if (setControlledTab) {
      setControlledTab(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // 動作過濾狀態
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');

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
    const query = exerciseSearchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          (ex.notes && ex.notes.toLowerCase().includes(query))
      );
    }

    return list;
  }, [activeExercises, selectedMuscleFilter, exerciseSearchQuery]);

  // 組合過濾狀態
  const [routineSearchQuery, setRoutineSearchQuery] = useState('');

  const filteredRoutines = useMemo(() => {
    let list = activeRoutines;
    const query = routineSearchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          (r.notes && r.notes.toLowerCase().includes(query))
      );
    }
    return list;
  }, [activeRoutines, routineSearchQuery]);

  const handleExerciseClick = (exercise: Exercise, isDisabled: boolean) => {
    if (isDisabled) {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('selection');
    onItemClick?.(exercise, 'exercise');
  };

  const handleRoutineClick = (routine: WorkoutRoutine, isDisabled: boolean) => {
    if (isDisabled) {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('selection');
    onItemClick?.(routine, 'routine');
  };

  return (
    <div className={cn('space-y-3 font-mono flex flex-col', className)}>
      {/* 頂部雙列指標卡 (僅在 mode === 'all' 時渲染) */}
      {mode === 'all' && (
        <div
          className="grid grid-cols-2 gap-2.5 font-mono select-none shrink-0"
          role="tablist"
          aria-label={t('workout.exercises', '動作')}
        >
          {/* 動作指標卡 */}
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === 'exercises'}
            onClick={() => handleTabChange('exercises')}
            className={cn(
              'p-2.5 sm:p-3 rounded-xl text-left cursor-pointer transition-all flex flex-col justify-between h-[66px] outline-none',
              viewTab === 'exercises'
                ? 'border border-foreground bg-muted/30 shadow-none'
                : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn(
                  'font-medium',
                  viewTab === 'exercises' ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {t('workout.exercises', '動作')}
              </span>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  viewTab === 'exercises' ? 'bg-foreground' : 'bg-transparent'
                )}
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-xl font-bold tracking-tight',
                  viewTab === 'exercises' ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {activeExercises.length}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t('common.items', '項')}
              </span>
            </div>
          </button>

          {/* 組合指標卡 */}
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === 'routines'}
            onClick={() => handleTabChange('routines')}
            className={cn(
              'p-2.5 sm:p-3 rounded-xl text-left cursor-pointer transition-all flex flex-col justify-between h-[66px] outline-none',
              viewTab === 'routines'
                ? 'border border-foreground bg-muted/30 shadow-none'
                : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn(
                  'font-medium',
                  viewTab === 'routines' ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {t('workout.routinesShort', '組合')}
              </span>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  viewTab === 'routines' ? 'bg-foreground' : 'bg-transparent'
                )}
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-xl font-bold tracking-tight',
                  viewTab === 'routines' ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {activeRoutines.length}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t('common.items', '項')}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 視圖內容 (Exercises 或 Routines) */}
      {viewTab === 'exercises' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-2">
          {/* 搜尋欄位 */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={exerciseSearchQuery}
              onChange={(e) => setExerciseSearchQuery(e.target.value)}
              placeholder={t('common.search', '搜尋')}
              className="w-full h-8 pl-8 pr-8 rounded-md bg-muted/30 border border-border/80 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
            />
            {exerciseSearchQuery && (
              <button
                type="button"
                onClick={() => setExerciseSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* 部位過濾標籤橫向滑動列 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 pb-0.5">
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
          <div
            className={cn(
              'flex-1 min-h-0 overflow-y-auto border border-border rounded-lg bg-card divide-y divide-border',
              listContainerClassName
            )}
          >
            {filteredExercises.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                {t('workout.noExercises', '無動作')}
              </div>
            ) : (
              filteredExercises.map((exercise) => {
                const isDisabled = checkIsExerciseDisabled(exercise);
                const muscleEntries = Object.entries(exercise.targetMuscles || {}) as [
                  DetailedMuscle,
                  number,
                ][];

                return (
                  <div
                    key={exercise.id}
                    onClick={() => handleExerciseClick(exercise, isDisabled)}
                    className={cn(
                      'p-3 flex items-center justify-between transition-colors select-none',
                      isDisabled
                        ? 'opacity-35 cursor-not-allowed bg-muted/10'
                        : 'hover:bg-hover active:bg-muted/50 cursor-pointer'
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
                            <AdaptiveMuscleBadgeGroup
                              entries={muscleEntries}
                              className="min-w-0 flex-1"
                            />
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
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-2">
          {/* 組合搜尋欄位 */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={routineSearchQuery}
              onChange={(e) => setRoutineSearchQuery(e.target.value)}
              placeholder={t('common.search', '搜尋')}
              className="w-full h-8 pl-8 pr-8 rounded-md bg-muted/30 border border-border/80 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
            />
            {routineSearchQuery && (
              <button
                type="button"
                onClick={() => setRoutineSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* 組合清單 */}
          <div
            className={cn(
              'flex-1 min-h-0 overflow-y-auto border border-border rounded-lg bg-card divide-y divide-border',
              listContainerClassName
            )}
          >
            {filteredRoutines.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                {t('workout.noRoutines', '無組合')}
              </div>
            ) : (
              filteredRoutines.map((routine) => {
                const isDisabled = checkIsRoutineDisabled(routine);
                const totalSets = routine.exercises.reduce(
                  (sum, it) => sum + (it.defaultSets || 3),
                  0
                );

                return (
                  <div
                    key={routine.id}
                    onClick={() => handleRoutineClick(routine, isDisabled)}
                    className={cn(
                      'min-h-12 py-2.5 px-3 sm:px-4 flex items-center justify-between gap-3 transition-colors select-none',
                      isDisabled
                        ? 'opacity-35 cursor-not-allowed bg-muted/10'
                        : 'hover:bg-hover active:bg-muted/50 cursor-pointer bg-card'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {routine.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono">
                        <span>
                          {routine.exercises.length} {t('common.items', '項')}
                        </span>
                        <span className="text-border">·</span>
                        <span>
                          {totalSets} {t('workout.set', '組')}
                        </span>
                        {routine.notes && (
                          <>
                            <span className="text-border">·</span>
                            <span className="truncate max-w-[120px] text-muted-foreground/80">
                              {routine.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isDisabled ? (
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 border border-border px-1.5 py-0.5 rounded">
                          {t('common.selected', '已選')}
                        </span>
                      ) : (
                        <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

