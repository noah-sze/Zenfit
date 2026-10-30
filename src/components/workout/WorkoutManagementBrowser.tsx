import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, ChevronRight, X, RotateCcw, Trash2, Edit2, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import { MAJOR_MUSCLE_GROUPS } from '@/constants/muscles';
import { getRoutineFactSummary } from '@/utils/workoutMath';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { Exercise, WorkoutRoutine, Equipment, DetailedMuscle } from '@/types';

export type WorkoutTab = 'exercises' | 'routines' | 'equipments';

export interface WorkoutManagementBrowserProps {
  /** 當前選中的 Tab (受控) */
  activeTab?: WorkoutTab;
  /** Tab 切換回調 */
  onTabChange?: (tab: WorkoutTab) => void;
  /** 點擊動作回調 */
  onExerciseClick?: (exercise: Exercise) => void;
  /** 點擊組合回調 */
  onRoutineClick?: (routine: WorkoutRoutine) => void;
  /** 編輯器械回調 */
  onEditEquipment?: (equipment: Equipment) => void;
  /** 刪除動作回調 */
  onDeleteExercise?: (exercise: Exercise) => void;
  /** 還原動作回調 */
  onUnarchiveExercise?: (exercise: Exercise) => void;
  /** 刪除組合回調 */
  onDeleteRoutine?: (routine: WorkoutRoutine) => void;
  /** 還原組合回調 */
  onUnarchiveRoutine?: (routine: WorkoutRoutine) => void;
  /** 歸檔器械回調 */
  onArchiveEquipment?: (equipment: Equipment) => void;
  /** 還原器械回調 */
  onUnarchiveEquipment?: (equipment: Equipment) => void;
  /** 刪除器械回調 */
  onDeleteEquipment?: (equipment: Equipment) => void;
  /** 自訂容器樣式 */
  className?: string;
}

export function WorkoutManagementBrowser({
  activeTab: controlledTab,
  onTabChange: setControlledTab,
  onExerciseClick,
  onRoutineClick,
  onEditEquipment,
  onDeleteExercise,
  onUnarchiveExercise,
  onDeleteRoutine,
  onUnarchiveRoutine,
  onArchiveEquipment,
  onUnarchiveEquipment,
  onDeleteEquipment,
  className,
}: WorkoutManagementBrowserProps) {
  const { t } = useTranslation();

  // 頂部視圖 Tab（受控 / 非受控）
  const [internalTab, setInternalTab] = useState<WorkoutTab>('exercises');
  const viewTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: WorkoutTab) => {
    triggerHaptic('selection');
    if (setControlledTab) {
      setControlledTab(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // 1. 動作資料庫
  const {
    activeExercises,
    archivedExercises,
    allExercises,
  } = useExercises();

  // 2. 訓練組合資料庫
  const {
    activeRoutines,
    archivedRoutines,
    exerciseMap,
  } = useRoutines();

  // 3. 器械資料庫
  const {
    activeEquipments,
    archivedEquipments,
    getEquipmentDisplayName,
  } = useEquipments();

  // 計算每個器械被多少個動作使用
  const equipmentUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of allExercises) {
      if (ex.equipment) {
        counts[ex.equipment] = (counts[ex.equipment] || 0) + 1;
      }
    }
    return counts;
  }, [allExercises]);

  // ==========================================
  // 分頁 1：動作 (Exercises) 狀態與過濾
  // ==========================================
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [showExerciseArchived, setShowExerciseArchived] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');

  const exerciseBaseList = showExerciseArchived ? archivedExercises : activeExercises;

  // 計算每個主肌群在當前列表下的動作數量
  const muscleGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of MAJOR_MUSCLE_GROUPS) {
      counts[group.id] = 0;
    }
    for (const ex of exerciseBaseList) {
      const muscles = Object.keys(ex.targetMuscles || {}) as DetailedMuscle[];
      for (const group of MAJOR_MUSCLE_GROUPS) {
        if (muscles.some((m) => group.detailedMuscles.includes(m))) {
          counts[group.id] = (counts[group.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [exerciseBaseList]);

  // 動作篩選結果
  const filteredExercises = useMemo(() => {
    const q = exerciseSearchQuery.toLowerCase().trim();
    return exerciseBaseList
      .filter((item) => {
        // 器械快篩
        if (selectedEquipment !== 'all' && item.equipment !== selectedEquipment) {
          return false;
        }
        // 肌群快篩
        if (selectedMuscleGroup !== 'all') {
          const group = MAJOR_MUSCLE_GROUPS.find((g) => g.id === selectedMuscleGroup);
          if (group) {
            const muscles = Object.keys(item.targetMuscles || {}) as DetailedMuscle[];
            const matches = muscles.some((m) => group.detailedMuscles.includes(m));
            if (!matches) return false;
          }
        }
        // 關鍵字搜尋
        if (q) {
          const matchName = item.name.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          if (!matchName && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exerciseBaseList, selectedEquipment, selectedMuscleGroup, exerciseSearchQuery]);

  // ==========================================
  // 分頁 2：訓練組合 (Routines) 狀態與過濾
  // ==========================================
  const [routineSearchQuery, setRoutineSearchQuery] = useState('');
  const [showRoutineArchived, setShowRoutineArchived] = useState(false);

  const routineBaseList = showRoutineArchived ? archivedRoutines : activeRoutines;

  const filteredRoutines = useMemo(() => {
    const q = routineSearchQuery.toLowerCase().trim();
    return routineBaseList
      .filter((r) => {
        if (q) {
          const matchName = r.name.toLowerCase().includes(q);
          const matchNotes = r.notes?.toLowerCase().includes(q);
          if (!matchName && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [routineBaseList, routineSearchQuery]);

  // ==========================================
  // 分頁 3：器械 (Equipments) 狀態與過濾
  // ==========================================
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [showEquipmentArchived, setShowEquipmentArchived] = useState(false);

  const equipmentBaseList = showEquipmentArchived ? archivedEquipments : activeEquipments;

  const filteredEquipments = useMemo(() => {
    const q = equipmentSearchQuery.toLowerCase().trim();
    return equipmentBaseList
      .filter((eq) => {
        if (q) {
          const displayName = getEquipmentDisplayName(eq.id, t).toLowerCase();
          const matchName = displayName.includes(q) || eq.name.toLowerCase().includes(q);
          if (!matchName) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const nameA = getEquipmentDisplayName(a.id, t);
        const nameB = getEquipmentDisplayName(b.id, t);
        return nameA.localeCompare(nameB);
      });
  }, [equipmentBaseList, equipmentSearchQuery, getEquipmentDisplayName, t]);

  const getMuscleLabel = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    return t(key);
  };

  return (
    <div className={cn('space-y-3 font-mono flex flex-col', className)}>
      {/* 頂部三列指標卡 (動作 ➔ 組合 ➔ 器械，100% 對齊飲食管理設計) */}
      <div
        className="grid grid-cols-3 gap-2 sm:gap-2.5 font-mono select-none shrink-0"
        role="tablist"
        aria-label={t('settings.workoutSection')}
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
                'font-medium truncate',
                viewTab === 'exercises' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {t('settings.exercises', '動作')}
            </span>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors shrink-0',
                viewTab === 'exercises' ? 'bg-foreground' : 'bg-transparent'
              )}
            />
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span
              className={cn(
                'text-lg sm:text-xl font-bold tracking-tight',
                viewTab === 'exercises' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {activeExercises.length}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {t('workout.itemsUnit', '項動作')}
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
                'font-medium truncate',
                viewTab === 'routines' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {t('workout.routinesShort', '組合')}
            </span>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors shrink-0',
                viewTab === 'routines' ? 'bg-foreground' : 'bg-transparent'
              )}
            />
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span
              className={cn(
                'text-lg sm:text-xl font-bold tracking-tight',
                viewTab === 'routines' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {activeRoutines.length}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {t('workout.routinesUnit', '個組合')}
            </span>
          </div>
        </button>

        {/* 器械指標卡 */}
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === 'equipments'}
          onClick={() => handleTabChange('equipments')}
          className={cn(
            'p-2.5 sm:p-3 rounded-xl text-left cursor-pointer transition-all flex flex-col justify-between h-[66px] outline-none',
            viewTab === 'equipments'
              ? 'border border-foreground bg-muted/30 shadow-none'
              : 'border border-border hover:border-foreground/40 bg-card text-muted-foreground'
          )}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                'font-medium truncate',
                viewTab === 'equipments' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {t('settings.equipments', '器械')}
            </span>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors shrink-0',
                viewTab === 'equipments' ? 'bg-foreground' : 'bg-transparent'
              )}
            />
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span
              className={cn(
                'text-lg sm:text-xl font-bold tracking-tight',
                viewTab === 'equipments' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {activeEquipments.length}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {t('workout.equipmentsUnit', '項器械')}
            </span>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 分頁 1：動作庫 (Exercises) */}
      {/* ========================================================================= */}
      {viewTab === 'exercises' && (
        <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
          {/* 搜尋輸入框 */}
          <div className="relative flex items-center shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={exerciseSearchQuery}
              onChange={(e) => setExerciseSearchQuery(e.target.value)}
              placeholder={t('workout.searchExercisePlaceholder', '搜尋動作名稱或備註...')}
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
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

          {/* 篩選列：左側橫向滾動肌群膠囊 + 已歸檔，右側器械下拉選單 */}
          <div className="flex items-center justify-between gap-1.5 py-0.5 shrink-0">
            <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 shrink-0 pr-1">
                {/* 全部膠囊 */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowExerciseArchived(false);
                    setSelectedMuscleGroup('all');
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap',
                    !showExerciseArchived && selectedMuscleGroup === 'all'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {t('common.all', '全部')}
                  <span
                    className={cn(
                      'ml-1 text-[10px] tabular-nums',
                      !showExerciseArchived && selectedMuscleGroup === 'all' ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {activeExercises.length}
                  </span>
                </button>

                {/* 主肌群膠囊 */}
                {MAJOR_MUSCLE_GROUPS.map((group) => {
                  const isSelected = !showExerciseArchived && selectedMuscleGroup === group.id;
                  const count = muscleGroupCounts[group.id] || 0;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setShowExerciseArchived(false);
                        setSelectedMuscleGroup(group.id);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap',
                        isSelected
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {t(`workout.${group.id}`)}
                      <span
                        className={cn(
                          'ml-1 text-[10px] tabular-nums',
                          isSelected ? 'opacity-60' : 'opacity-45'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* 分隔線與已歸檔 */}
                <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowExerciseArchived((prev) => !prev);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0',
                    showExerciseArchived
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {t('common.archived', '已歸檔')}
                  <span
                    className={cn(
                      'ml-1 text-[10px] tabular-nums',
                      showExerciseArchived ? 'opacity-60' : 'opacity-45'
                    )}
                  >
                    {archivedExercises.length}
                  </span>
                </button>
              </div>
            </div>

            {/* 右側：器械下拉選單 */}
            <div className="shrink-0">
              <div
                className={cn(
                  'inline-flex items-center rounded-full text-xs font-mono transition-all border',
                  selectedEquipment !== 'all'
                    ? 'bg-foreground text-background border-foreground font-medium'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="flex items-center gap-1 py-1.5 pl-3 pr-2 cursor-pointer focus:outline-none"
                      >
                        <span className="truncate max-w-[80px]">
                          {selectedEquipment === 'all'
                            ? t('workout.equipment', '器械')
                            : getEquipmentDisplayName(selectedEquipment, t)}
                        </span>
                        <ChevronDown className="size-3 opacity-60" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-[180px] font-mono text-xs max-h-60 overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedEquipment('all');
                      }}
                      className={cn(
                        'cursor-pointer flex items-center justify-between',
                        selectedEquipment === 'all' && 'font-semibold bg-muted'
                      )}
                    >
                      <span>{t('common.all', '全部器械')}</span>
                    </DropdownMenuItem>
                    {activeEquipments.map((eq) => (
                      <DropdownMenuItem
                        key={eq.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedEquipment(eq.id);
                        }}
                        className={cn(
                          'cursor-pointer flex items-center justify-between',
                          selectedEquipment === eq.id && 'font-semibold bg-muted'
                        )}
                      >
                        <span>{getEquipmentDisplayName(eq.id, t)}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedEquipment !== 'all' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setSelectedEquipment('all');
                    }}
                    className="p-1 pr-2 hover:opacity-70 cursor-pointer"
                    title={t('diet.resetFilter', '重設')}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 動作清單容器 */}
          <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground flex-1 min-h-0 flex flex-col">
            {/* 內嵌表頭 */}
            <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground shrink-0">
              <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                {t('common.itemCount', { count: filteredExercises.length })}
              </span>
            </div>

            {/* 滾動內容區 */}
            <div className="divide-y divide-border overflow-y-auto flex-1 min-h-0">
              {filteredExercises.length === 0 ? (
                <div className="p-8 text-center text-sm font-mono text-muted-foreground">
                  {showExerciseArchived
                    ? t('settings.noArchivedItems', '無已歸檔項目')
                    : t('workout.noExercises', '無動作')}
                </div>
              ) : (
                filteredExercises.map((exercise) => {
                  const muscleEntries = Object.entries(exercise.targetMuscles || {}) as [DetailedMuscle, number][];
                  return (
                    <div
                      key={exercise.id}
                      onClick={() => onExerciseClick?.(exercise)}
                      className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1 pr-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {exercise.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground flex-wrap">
                          <span>{getEquipmentDisplayName(exercise.equipment, t)}</span>
                          {muscleEntries.length > 0 && (
                            <>
                              <span className="opacity-40">·</span>
                              <div className="flex items-center gap-1 flex-wrap">
                                {muscleEntries.slice(0, 3).map(([m, intensity]) => (
                                  <span
                                    key={m}
                                    className="px-1.5 py-0.2 bg-muted/60 text-[10px] rounded text-foreground/80"
                                  >
                                    {getMuscleLabel(m)} {intensity}
                                  </span>
                                ))}
                                {muscleEntries.length > 3 && (
                                  <span className="text-[10px] opacity-60">
                                    +{muscleEntries.length - 3}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {showExerciseArchived ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {onUnarchiveExercise && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnarchiveExercise(exercise);
                              }}
                              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title={t('common.restore')}
                              aria-label={t('common.restore')}
                            >
                              <RotateCcw className="size-3.5" />
                            </Button>
                          )}
                          {onDeleteExercise && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteExercise(exercise);
                              }}
                              className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <ChevronRight className="size-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 分頁 2：訓練組合 (Routines) */}
      {/* ========================================================================= */}
      {viewTab === 'routines' && (
        <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
          {/* 搜尋輸入框 */}
          <div className="relative flex items-center shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={routineSearchQuery}
              onChange={(e) => setRoutineSearchQuery(e.target.value)}
              placeholder={t('workout.searchRoutinePlaceholder', '搜尋組合名稱或備註...')}
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
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

          {/* 篩選列：左側「全部」與「已歸檔」膠囊 */}
          <div className="flex items-center justify-between gap-1.5 py-0.5 shrink-0">
            <div className="flex items-center gap-1 shrink-0 pr-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setShowRoutineArchived(false);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap',
                  !showRoutineArchived
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {t('common.all', '全部')}
                <span
                  className={cn(
                    'ml-1 text-[10px] tabular-nums',
                    !showRoutineArchived ? 'opacity-60' : 'opacity-45'
                  )}
                >
                  {activeRoutines.length}
                </span>
              </button>

              <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setShowRoutineArchived((prev) => !prev);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0',
                  showRoutineArchived
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {t('common.archived', '已歸檔')}
                <span
                  className={cn(
                    'ml-1 text-[10px] tabular-nums',
                    showRoutineArchived ? 'opacity-60' : 'opacity-45'
                  )}
                >
                  {archivedRoutines.length}
                </span>
              </button>
            </div>
          </div>

          {/* 組合清單容器 */}
          <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground flex-1 min-h-0 flex flex-col">
            {/* 內嵌表頭 */}
            <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground shrink-0">
              <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                {t('common.itemCount', { count: filteredRoutines.length })}
              </span>
            </div>

            {/* 滾動內容區 */}
            <div className="divide-y divide-border overflow-y-auto flex-1 min-h-0">
              {filteredRoutines.length === 0 ? (
                <div className="p-8 text-center text-sm font-mono text-muted-foreground">
                  {showRoutineArchived
                    ? t('settings.noArchivedItems', '無已歸檔項目')
                    : t('workout.noRoutines', '無訓練組合')}
                </div>
              ) : (
                filteredRoutines.map((routine) => {
                  const summary = getRoutineFactSummary(routine, exerciseMap);
                  return (
                    <div
                      key={routine.id}
                      onClick={() => onRoutineClick?.(routine)}
                      className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1 pr-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {routine.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground flex-wrap">
                          <span>{t('workout.exerciseCount', { count: summary.exerciseCount })}</span>
                          <span className="opacity-40">·</span>
                          <span>{summary.totalPlannedSets} {t('workout.set', '組')}</span>
                          {summary.coveredMuscles.length > 0 && (
                            <>
                              <span className="opacity-40">·</span>
                              <div className="flex items-center gap-1 flex-wrap">
                                {summary.coveredMuscles.slice(0, 3).map((item) => (
                                  <span
                                    key={item.muscle}
                                    className="px-1.5 py-0.2 bg-muted/60 text-[10px] rounded text-foreground/80"
                                  >
                                    {getMuscleLabel(item.muscle)}
                                  </span>
                                ))}
                                {summary.coveredMuscles.length > 3 && (
                                  <span className="text-[10px] opacity-60">
                                    +{summary.coveredMuscles.length - 3}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {showRoutineArchived ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {onUnarchiveRoutine && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnarchiveRoutine(routine);
                              }}
                              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title={t('common.restore')}
                              aria-label={t('common.restore')}
                            >
                              <RotateCcw className="size-3.5" />
                            </Button>
                          )}
                          {onDeleteRoutine && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRoutine(routine);
                              }}
                              className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <ChevronRight className="size-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 分頁 3：器械 (Equipments) */}
      {/* ========================================================================= */}
      {viewTab === 'equipments' && (
        <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
          {/* 搜尋輸入框 */}
          <div className="relative flex items-center shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={equipmentSearchQuery}
              onChange={(e) => setEquipmentSearchQuery(e.target.value)}
              placeholder={t('workout.searchEquipmentPlaceholder', '搜尋器械名稱...')}
              className="h-10 pl-9 pr-9 text-xs rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
            />
            {equipmentSearchQuery && (
              <button
                type="button"
                onClick={() => setEquipmentSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* 篩選列：左側「全部」與「已歸檔」膠囊 */}
          <div className="flex items-center justify-between gap-1.5 py-0.5 shrink-0">
            <div className="flex items-center gap-1 shrink-0 pr-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setShowEquipmentArchived(false);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap',
                  !showEquipmentArchived
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {t('common.all', '全部')}
                <span
                  className={cn(
                    'ml-1 text-[10px] tabular-nums',
                    !showEquipmentArchived ? 'opacity-60' : 'opacity-45'
                  )}
                >
                  {activeEquipments.length}
                </span>
              </button>

              <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setShowEquipmentArchived((prev) => !prev);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0',
                  showEquipmentArchived
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {t('common.archived', '已歸檔')}
                <span
                  className={cn(
                    'ml-1 text-[10px] tabular-nums',
                    showEquipmentArchived ? 'opacity-60' : 'opacity-45'
                  )}
                >
                  {archivedEquipments.length}
                </span>
              </button>
            </div>
          </div>

          {/* 器械清單容器 */}
          <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground flex-1 min-h-0 flex flex-col">
            {/* 內嵌表頭 */}
            <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground shrink-0">
              <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                {t('common.itemCount', { count: filteredEquipments.length })}
              </span>
            </div>

            {/* 滾動內容區 */}
            <div className="divide-y divide-border overflow-y-auto flex-1 min-h-0">
              {filteredEquipments.length === 0 ? (
                <div className="p-8 text-center text-sm font-mono text-muted-foreground">
                  {showEquipmentArchived
                    ? t('settings.noArchivedItems', '無已歸檔項目')
                    : t('workout.noEquipments', '無器械')}
                </div>
              ) : (
                filteredEquipments.map((eq) => {
                  const usage = equipmentUsageCount[eq.id] || 0;
                  const displayName = getEquipmentDisplayName(eq.id, t);
                  return (
                    <div
                      key={eq.id}
                      onClick={() => onEditEquipment?.(eq)}
                      className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1 pr-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {displayName}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          <span>{t('workout.equipmentExerciseCount', { count: usage })}</span>
                        </div>
                      </div>

                      {showEquipmentArchived ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {onUnarchiveEquipment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnarchiveEquipment(eq);
                              }}
                              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title={t('common.restore')}
                              aria-label={t('common.restore')}
                            >
                              <RotateCcw className="size-3.5" />
                            </Button>
                          )}
                          {usage === 0 && onDeleteEquipment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEquipment(eq);
                              }}
                              className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          {onEditEquipment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditEquipment(eq);
                              }}
                              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title={t('common.edit')}
                              aria-label={t('common.edit')}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                          )}
                          {onArchiveEquipment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchiveEquipment(eq);
                              }}
                              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title={t('common.archive')}
                              aria-label={t('common.archive')}
                            >
                              <Archive className="size-3.5" />
                            </Button>
                          )}
                          {usage === 0 && onDeleteEquipment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEquipment(eq);
                              }}
                              className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
