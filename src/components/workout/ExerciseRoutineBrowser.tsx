import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import { useRecentExercises } from '@/hooks/useRecentExercises';
import { MAJOR_MUSCLE_GROUPS } from '@/constants/muscles';
import { EquipmentBadge } from '@/components/workout/EquipmentBadge';
import { AdaptiveMuscleBadgeGroup } from '@/components/workout/AdaptiveMuscleBadgeGroup';
import { sortMuscleEntries } from '@/utils/muscleIntensity';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { matchesMultilingual } from '@/utils/multilingualSearch';
import type { Exercise, WorkoutRoutine, DetailedMuscle } from '@/types';

export type ExerciseSelectMode = 'all' | 'exercises' | 'routines';
export type ExerciseInteractiveMode = 'manage' | 'select';

export interface ExerciseRoutineBrowserProps {
  /** 模式：全部 (可切換)、僅動作、或僅組合 @default 'all' */
  mode?: ExerciseSelectMode;
  /** 當前選中的 Tab (受控模式) */
  activeTab?: 'exercises' | 'routines';
  /** Tab 切換回調 (受控模式) */
  onTabChange?: (tab: 'exercises' | 'routines') => void;
  /** 交互模式：管理 (指標卡) 或選擇 (按鈕切換器) @default 'select' */
  interactiveMode?: ExerciseInteractiveMode;
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
  interactiveMode = 'select',
  onItemClick,
  disabledIds,
  isItemDisabled,
  className,
  listContainerClassName,
}: ExerciseRoutineBrowserProps) {
  const { t } = useTranslation();

  // 動作庫資料
  const { activeExercises, isLoading: isExercisesLoading } = useExercises();
  const { getEquipmentDisplayName } = useEquipments();

  // 組合庫資料
  const { activeRoutines, isLoading: isRoutinesLoading, exerciseMap } = useRoutines();

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

  // 最近訓練動作提取
  const { recentExerciseIds, recentRoutineIds, isLoading: isRecentLoading } = useRecentExercises();
  const recentExerciseIdSet = useMemo(() => new Set(recentExerciseIds), [recentExerciseIds]);


  const recentExerciseOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    recentExerciseIds.forEach((id, idx) => map.set(id, idx));
    return map;
  }, [recentExerciseIds]);

  const recentRoutineOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    recentRoutineIds.forEach((id, idx) => map.set(id, idx));
    return map;
  }, [recentRoutineIds]);

  const isManage = interactiveMode === 'manage';

  // 分類導航列橫向自動平滑滾動對齊
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const routineCategoryScrollRef = useRef<HTMLDivElement>(null);

  const handleScrollTabIntoView = (
    container: HTMLDivElement | null,
    buttonEl: HTMLButtonElement,
    isFirst = false,
    isLast = false
  ) => {
    if (!container) return;

    if (isFirst) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (isLast) {
      container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = buttonEl.getBoundingClientRect();
    const relativeLeft = buttonRect.left - containerRect.left;
    const targetDelta = relativeLeft - containerRect.width / 2 + buttonRect.width / 2;

    container.scrollBy({
      left: targetDelta,
      behavior: 'smooth',
    });
  };

  const recentExercisesCount = useMemo(() => {
    return activeExercises.filter((e) => recentExerciseIdSet.has(e.id)).length;
  }, [activeExercises, recentExerciseIdSet]);

  const muscleGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {
      recent: recentExercisesCount,
      all: activeExercises.length,
      chest: 0,
      back: 0,
      shoulders: 0,
      arms: 0,
      legs: 0,
      core: 0,
    };

    for (const ex of activeExercises) {
      if (!ex.targetMuscles) continue;
      const muscleKeys = Object.keys(ex.targetMuscles) as DetailedMuscle[];
      for (const group of MAJOR_MUSCLE_GROUPS) {
        if (muscleKeys.some((m) => group.detailedMuscles.includes(m))) {
          counts[group.id] = (counts[group.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [activeExercises, recentExercisesCount]);

  // 動作過濾狀態
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>(() => {
    return !isManage ? 'recent' : 'all';
  });

  // 初次載入/打開定位決策：若動作最近記錄為空且當前仍為 recent，自動定位至 'all'（useRef 確保後續手動切換不受影響）
  const initialMuscleFilterResolvedRef = useRef(false);
  useEffect(() => {
    if (isManage) return;
    if (initialMuscleFilterResolvedRef.current) return;
    if (isRecentLoading || isExercisesLoading) return;

    initialMuscleFilterResolvedRef.current = true;
    if (recentExercisesCount === 0 && selectedMuscleFilter === 'recent') {
      setSelectedMuscleFilter('all');
    }
  }, [isManage, isRecentLoading, isExercisesLoading, recentExercisesCount, selectedMuscleFilter]);

  const filteredExercises = useMemo(() => {
    let list = activeExercises;
    const isSearching = Boolean(exerciseSearchQuery.trim());

    // 1. 部位過濾 / 最近過濾 (僅在非搜尋狀態下套用)
    if (!isSearching) {
      if (selectedMuscleFilter === 'recent') {
        list = list.filter((ex) => recentExerciseIdSet.has(ex.id));
      } else if (selectedMuscleFilter !== 'all') {
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
    }

    // 2. 搜尋字串過濾：跳過部位與最近過濾，全局檢索動作名稱與備註
    if (isSearching) {
      list = list.filter((ex) =>
        matchesMultilingual(
          exerciseSearchQuery,
          { id: ex.id, name: ex.name, notes: ex.notes },
          'exercise'
        )
      );
    }

    // 3. 排序：僅在 !isSearching && selectedMuscleFilter === 'recent' 時套用最近時間排序
    if (!isSearching && selectedMuscleFilter === 'recent') {
      return list.slice().sort((a, b) => {
        const orderA = recentExerciseOrderMap.get(a.id) ?? 999999;
        const orderB = recentExerciseOrderMap.get(b.id) ?? 999999;
        return orderA - orderB;
      });
    }

    return list;
  }, [activeExercises, selectedMuscleFilter, exerciseSearchQuery, recentExerciseIdSet, recentExerciseOrderMap]);

  // 組合過濾狀態
  const recentRoutineIdSet = useMemo(() => new Set(recentRoutineIds), [recentRoutineIds]);

  const recentRoutinesCount = useMemo(() => {
    return activeRoutines.filter((r) => recentRoutineIdSet.has(r.id)).length;
  }, [activeRoutines, recentRoutineIdSet]);

  const [routineSearchQuery, setRoutineSearchQuery] = useState('');
  const [selectedRoutineFilter, setSelectedRoutineFilter] = useState<'recent' | 'all'>(() => {
    return !isManage ? 'recent' : 'all';
  });

  // 初次載入/打開定位決策：若組合最近記錄為空且當前仍為 recent，自動定位至 'all'
  const initialRoutineFilterResolvedRef = useRef(false);
  useEffect(() => {
    if (isManage) return;
    if (initialRoutineFilterResolvedRef.current) return;
    if (isRecentLoading || isRoutinesLoading) return;

    initialRoutineFilterResolvedRef.current = true;
    if (recentRoutinesCount === 0 && selectedRoutineFilter === 'recent') {
      setSelectedRoutineFilter('all');
    }
  }, [isManage, isRecentLoading, isRoutinesLoading, recentRoutinesCount, selectedRoutineFilter]);

  const filteredRoutines = useMemo(() => {
    let list = activeRoutines;
    const isSearching = Boolean(routineSearchQuery.trim());

    // 1. 最近過濾 (僅在非搜尋狀態下套用)
    if (!isSearching) {
      if (selectedRoutineFilter === 'recent') {
        list = list.filter((r) => recentRoutineIdSet.has(r.id));
      }
    }

    // 2. 搜尋字串過濾：全域檢索組合名稱與備註
    if (isSearching) {
      list = list.filter((r) =>
        matchesMultilingual(
          routineSearchQuery,
          { id: r.id, name: r.name, notes: r.notes },
          'exercise'
        )
      );
    }

    // 3. 排序：僅在 !isSearching && selectedRoutineFilter === 'recent' 時套用最近時間排序
    if (!isSearching && selectedRoutineFilter === 'recent') {
      return list.slice().sort((a, b) => {
        const orderA = recentRoutineOrderMap.get(a.id) ?? 999999;
        const orderB = recentRoutineOrderMap.get(b.id) ?? 999999;
        return orderA - orderB;
      });
    }

    return list;
  }, [activeRoutines, selectedRoutineFilter, routineSearchQuery, recentRoutineIdSet, recentRoutineOrderMap]);

  const handleExerciseClick = useCallback((exercise: Exercise, isDisabled: boolean) => {
    if (isDisabled) {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('selection');
    onItemClick?.(exercise, 'exercise');
  }, [onItemClick]);

  const handleRoutineClick = useCallback((routine: WorkoutRoutine, isDisabled: boolean) => {
    if (isDisabled) {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('selection');
    onItemClick?.(routine, 'routine');
  }, [onItemClick]);

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
              'cursor-pointer transition-all outline-none',
              interactiveMode === 'manage'
                ? 'p-2.5 sm:p-3 rounded-xl text-left flex flex-col justify-between h-[66px]'
                : 'h-10 rounded-lg flex items-center justify-center font-mono text-xs font-medium',
              viewTab === 'exercises'
                ? interactiveMode === 'manage'
                  ? 'border border-foreground bg-muted/30 shadow-none'
                  : 'bg-foreground text-background border border-foreground font-medium'
                : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
            )}
          >
            {interactiveMode === 'manage' ? (
              <>
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
              </>
            ) : (
              <div className="flex items-center justify-center text-xs font-medium">
                {t('workout.exercisesShort', '動作')}
              </div>
            )}
          </button>

          {/* 組合指標卡 */}
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === 'routines'}
            onClick={() => handleTabChange('routines')}
            className={cn(
              'cursor-pointer transition-all outline-none',
              interactiveMode === 'manage'
                ? 'p-2.5 sm:p-3 rounded-xl text-left flex flex-col justify-between h-[66px]'
                : 'h-10 rounded-lg flex items-center justify-center font-mono text-xs font-medium',
              viewTab === 'routines'
                ? interactiveMode === 'manage'
                  ? 'border border-foreground bg-muted/30 shadow-none'
                  : 'bg-foreground text-background border border-foreground font-medium'
                : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
            )}
          >
            {interactiveMode === 'manage' ? (
              <>
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
              </>
            ) : (
              <div className="flex items-center justify-center text-xs font-medium">
                {t('workout.routinesShort', '組合')}
              </div>
            )}
          </button>
        </div>
      )}

      {/* 視圖內容 (Exercises 或 Routines) */}
      {viewTab === 'exercises' ? (
        <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
          {/* 搜尋輸入框 (無 autoFocus，防止行動端鍵盤自動彈出) */}
          <div className="relative flex items-center shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={exerciseSearchQuery}
              onChange={(e) => setExerciseSearchQuery(e.target.value)}
              placeholder={t('workout.searchExercisePlaceholder', '搜尋動作名稱或備註...')}
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus:ring-0 focus-visible:ring-0 shadow-none"
            />
            {exerciseSearchQuery && (
              <button
                type="button"
                onClick={() => setExerciseSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* 分類橫向滾動列 (全寬滾動，不被右側按鈕擠壓) */}
          <div
            ref={categoryScrollRef}
            onWheel={(e) => {
              if (e.deltaY !== 0 && categoryScrollRef.current) {
                categoryScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="overflow-x-auto no-scrollbar shrink-0 py-0.5"
          >
            <div className="flex items-center gap-1 shrink-0 pr-1">
              {/* 最近動作膠囊 (僅在選擇彈窗模式下顯示) */}
              {!isManage && (
                <button
                  type="button"
                  onClick={(e) => {
                    triggerHaptic('selection');
                    setSelectedMuscleFilter('recent');
                    handleScrollTabIntoView(categoryScrollRef.current, e.currentTarget, true, false);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
                    selectedMuscleFilter === 'recent'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{t('common.recent', '最近')}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      selectedMuscleFilter === 'recent' ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {recentExercisesCount}
                  </span>
                </button>
              )}

              {/* 全部動作膠囊 */}
              <button
                type="button"
                onClick={(e) => {
                  triggerHaptic('selection');
                  setSelectedMuscleFilter('all');
                  handleScrollTabIntoView(categoryScrollRef.current, e.currentTarget, false, false);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
                  selectedMuscleFilter === 'all'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <span>{t('common.all', '全部')}</span>
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    selectedMuscleFilter === 'all' ? 'opacity-60' : 'opacity-45'
                  )}
                >
                  {activeExercises.length}
                </span>
              </button>

              {/* 主要肌群分類膠囊 */}
              {MAJOR_MUSCLE_GROUPS.map((group, index) => {
                const isSelected = selectedMuscleFilter === group.id;
                const count = muscleGroupCounts[group.id] ?? 0;
                const isLast = index === MAJOR_MUSCLE_GROUPS.length - 1;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={(e) => {
                      triggerHaptic('selection');
                      setSelectedMuscleFilter(group.id);
                      handleScrollTabIntoView(categoryScrollRef.current, e.currentTarget, false, isLast);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
                      isSelected
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <span>{t(`workout.${group.id}`)}</span>
                    <span
                      className={cn(
                        'text-[10px] tabular-nums',
                        isSelected ? 'opacity-60' : 'opacity-45'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
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
                {exerciseSearchQuery.trim()
                  ? t('common.noResults', '無搜尋結果')
                  : selectedMuscleFilter === 'recent'
                  ? t('workout.noRecentExercises', '無最近記錄')
                  : t('workout.noExercises', '無動作')}
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
                              entries={sortMuscleEntries(muscleEntries)}
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
        <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
          {/* 組合搜尋輸入框 (無 autoFocus，防止行動端鍵盤自動彈出) */}
          <div className="relative flex items-center shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={routineSearchQuery}
              onChange={(e) => setRoutineSearchQuery(e.target.value)}
              placeholder={t('workout.searchRoutinePlaceholder', '搜尋組合名稱或備註...')}
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus:ring-0 focus-visible:ring-0 shadow-none"
            />
            {routineSearchQuery && (
              <button
                type="button"
                onClick={() => setRoutineSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* 組合快捷分類膠囊列 */}
          <div
            ref={routineCategoryScrollRef}
            onWheel={(e) => {
              if (e.deltaY !== 0 && routineCategoryScrollRef.current) {
                routineCategoryScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="overflow-x-auto no-scrollbar shrink-0 py-0.5"
          >
            <div className="flex items-center gap-1 shrink-0 pr-1">
              {/* 最近組合膠囊 (僅在選擇彈窗模式下顯示) */}
              {!isManage && (
                <button
                  type="button"
                  onClick={(e) => {
                    triggerHaptic('selection');
                    setSelectedRoutineFilter('recent');
                    handleScrollTabIntoView(routineCategoryScrollRef.current, e.currentTarget, true, false);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
                    selectedRoutineFilter === 'recent'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{t('common.recent', '最近')}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      selectedRoutineFilter === 'recent' ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {recentRoutinesCount}
                  </span>
                </button>
              )}

              {/* 全部組合膠囊 */}
              <button
                type="button"
                onClick={(e) => {
                  triggerHaptic('selection');
                  setSelectedRoutineFilter('all');
                  handleScrollTabIntoView(routineCategoryScrollRef.current, e.currentTarget, false, true);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1',
                  selectedRoutineFilter === 'all'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <span>{t('common.all', '全部')}</span>
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    selectedRoutineFilter === 'all' ? 'opacity-60' : 'opacity-45'
                  )}
                >
                  {activeRoutines.length}
                </span>
              </button>
            </div>
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
                {routineSearchQuery.trim()
                  ? t('common.noResults', '無搜尋結果')
                  : selectedRoutineFilter === 'recent'
                  ? t('workout.noRecentRoutines', '無最近記錄')
                  : t('workout.noRoutines', '無組合')}
              </div>
            ) : (
              filteredRoutines.map((routine) => {
                const isDisabled = checkIsRoutineDisabled(routine);
                const exerciseSummary = routine.exercises
                  .map((item) => exerciseMap.get(item.exerciseId)?.name)
                  .filter(Boolean)
                  .join(' · ');

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
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono min-w-0 overflow-hidden">
                        <span className="shrink-0">
                          {routine.exercises.length} {t('common.items', '項')}
                        </span>
                        {exerciseSummary ? (
                          <>
                            <span className="text-border shrink-0">·</span>
                            <span className="truncate text-muted-foreground/80">
                              {exerciseSummary}
                            </span>
                          </>
                        ) : routine.notes ? (
                          <>
                            <span className="text-border shrink-0">·</span>
                            <span className="truncate text-muted-foreground/80">
                              {routine.notes}
                            </span>
                          </>
                        ) : null}
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

