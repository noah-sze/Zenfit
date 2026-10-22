import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, ChevronRight, X, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useRoutines } from '@/hooks/useRoutines';
import { useExercises } from '@/hooks/useExercises';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { getRoutineFactSummary } from '@/utils/workoutMath';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { RoutineExerciseItem, DetailedMuscle, WorkoutRoutine } from '@/types';

export default function Routines() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') === 'archived' ? 'archived' : 'active') as 'active' | 'archived';
  const handleTabChange = (tab: 'active' | 'archived') => {
    triggerHaptic('selection');
    if (tab === 'archived') {
      setSearchParams({ tab: 'archived' });
    } else {
      setSearchParams({});
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const {
    activeRoutines,
    archivedRoutines,
    exerciseMap,
    addRoutine,
    unarchiveRoutine,
    deleteRoutine,
  } = useRoutines(searchQuery);

  const { activeExercises } = useExercises();

  // 新增組合彈窗狀態
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newRoutineItems, setNewRoutineItems] = useState<RoutineExerciseItem[]>([]);

  const currentList = activeTab === 'archived' ? archivedRoutines : activeRoutines;
  const filteredRoutines = useMemo(() => {
    return currentList
      .filter((r) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            r.name.toLowerCase().includes(q) ||
            (r.notes && r.notes.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentList, searchQuery]);

  const getMuscleLabel = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    return t(key);
  };

  const handleOpenAdd = () => {
    setNewName('');
    setNewNotes('');
    if (activeExercises.length > 0) {
      setNewRoutineItems([
        { exerciseId: activeExercises[0].id, defaultSets: 4 },
      ]);
    } else {
      setNewRoutineItems([]);
    }
    setIsAddOpen(true);
  };

  const handleAddItem = () => {
    if (activeExercises.length === 0) return;
    setNewRoutineItems([
      ...newRoutineItems,
      { exerciseId: activeExercises[0].id, defaultSets: 3 },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setNewRoutineItems(newRoutineItems.filter((_, i) => i !== idx));
  };

  const handleUpdateItemExercise = (idx: number, exerciseId: string) => {
    const next = [...newRoutineItems];
    next[idx].exerciseId = exerciseId;
    setNewRoutineItems(next);
  };

  const handleUpdateItemSets = (idx: number, setsStr: string) => {
    const val = parseInt(setsStr, 10);
    const defaultSets = isNaN(val) ? 1 : Math.max(1, Math.min(20, val));
    const next = [...newRoutineItems];
    next[idx].defaultSets = defaultSets;
    setNewRoutineItems(next);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.show(t('common.required'));
      return;
    }
    if (newRoutineItems.length === 0) {
      toast.show('請至少添加一個動作');
      return;
    }

    await addRoutine({
      name: newName.trim(),
      notes: newNotes.trim() || undefined,
      exercises: newRoutineItems,
      isCustom: true,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsAddOpen(false);
  };

  const handleUnarchive = async (e: React.MouseEvent, routine: WorkoutRoutine) => {
    e.stopPropagation();
    await unarchiveRoutine(routine.id);
    triggerHaptic('selection');
    toast.show(t('common.saved'));
  };

  const handleDelete = async (e: React.MouseEvent, routine: WorkoutRoutine) => {
    e.stopPropagation();
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${t('common.delete')} ${routine.name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

    await deleteRoutine(routine.id);
    triggerHaptic('warning');
    toast.show(t('common.deleted'));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20">
      {/* 頂部 Tab 欄 (使用中 / 已歸檔) */}
      <SegmentedControl<'active' | 'archived'>
        value={activeTab}
        onChange={handleTabChange}
        fullWidth
        options={[
          { value: 'active', label: t('common.active') },
          { value: 'archived', label: t('common.archived') },
        ]}
      />

      {/* 頂部操作與搜尋 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="pl-9 h-10 bg-card border-border font-mono text-sm"
          />
        </div>
        {activeTab === 'active' && (
          <Button
            onClick={handleOpenAdd}
            size="icon"
            className="size-10 shrink-0 bg-foreground text-background hover:opacity-90 cursor-pointer"
            title={t('common.add')}
            aria-label={t('common.add')}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </div>

      {/* 狀態列：計數顯示 */}
      <div className="flex items-center justify-between px-1 text-xs font-mono text-muted-foreground">
        <span>
          {activeTab === 'active'
            ? t('settings.activeCount', { count: filteredRoutines.length })
            : t('settings.archivedCount', { count: filteredRoutines.length })}
        </span>
      </div>

      {/* 訓練組合清單 (Usage List 佈局，無陰影，純邊框) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
        {filteredRoutines.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-muted-foreground">
            {t('workout.noRoutines')}
          </div>
        ) : (
          filteredRoutines.map((routine) => {
            const summary = getRoutineFactSummary(routine, exerciseMap);
            return (
              <div
                key={routine.id}
                onClick={() => navigate(`/settings/routines/${routine.id}`)}
                className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="space-y-1 pr-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {routine.name}
                    </span>
                    {routine.isCustom ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground shrink-0">
                        {t('settings.customRecipes')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground shrink-0">
                        {t('settings.systemPreset')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap">
                    <span>{summary.exerciseCount} 個動作</span>
                    <span>·</span>
                    <span>共 {summary.totalPlannedSets} 組計劃</span>
                    {summary.coveredMuscles.length > 0 && (
                      <>
                        <span>·</span>
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
                            <span className="text-[10px] opacity-60">+{summary.coveredMuscles.length - 3}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {activeTab === 'archived' ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleUnarchive(e, routine)}
                      className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={t('common.restore')}
                      aria-label={t('common.restore')}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                    {routine.isCustom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, routine)}
                        className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 新增組合彈窗 (Instant Pop, 左取消右確認) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md w-full bg-card p-6 border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-tight">
              {t('workout.addRoutine')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('workout.routineName')}
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如: 推力日經典組合 (Push Day)"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('common.notes')}
              </Label>
              <Input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="選填備註，如熱身要求或節奏"
                className="font-mono text-sm"
              />
            </div>

            {/* 動作構成清單 */}
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  動作構成清單 ({newRoutineItems.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs font-mono px-2 cursor-pointer"
                >
                  <Plus className="size-3 mr-1" />
                  {t('workout.addExercise')}
                </Button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {newRoutineItems.length === 0 ? (
                  <div className="text-center py-4 text-xs font-mono text-muted-foreground">
                    點擊右上角新增動作
                  </div>
                ) : (
                  newRoutineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2 rounded border border-border">
                      <div className="flex-1">
                        <Select
                          value={item.exerciseId}
                          onValueChange={(v) => v && handleUpdateItemExercise(idx, v)}
                        >
                          <SelectTrigger className="h-8 text-xs font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {activeExercises.map((ex) => (
                              <SelectItem key={ex.id} value={ex.id} className="text-xs">
                                {ex.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-20 flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={item.defaultSets}
                          onChange={(e) => handleUpdateItemSets(idx, e.target.value)}
                          className="h-8 text-xs font-mono text-center px-1"
                        />
                        <span className="text-xs font-mono text-muted-foreground">組</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="size-7 flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between pt-3 border-t border-border sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="sm" className="bg-foreground text-background cursor-pointer">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
