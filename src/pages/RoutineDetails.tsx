import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Edit2,
  Archive,
  RefreshCcw,
  Trash2,
  ChevronRight,
  Plus,
  X,
  Play,
} from 'lucide-react';
import { useRoutines } from '@/hooks/useRoutines';
import { useExercises } from '@/hooks/useExercises';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useAppStore } from '@/store/useAppStore';
import { getRoutineFactSummary } from '@/utils/workoutMath';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { RoutineExerciseItem, DetailedMuscle } from '@/types';

export default function RoutineDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { selectedDate } = useAppStore();

  const { allRoutines, exerciseMap, updateRoutine, archiveRoutine, unarchiveRoutine, deleteRoutine } = useRoutines();
  const { activeExercises } = useExercises();
  const { addWorkout } = useWorkoutLogs(selectedDate);

  const routine = useMemo(() => {
    return allRoutines.find((r) => r.id === id);
  }, [allRoutines, id]);

  const summary = useMemo(() => {
    return getRoutineFactSummary(routine, exerciseMap);
  }, [routine, exerciseMap]);

  // 編輯組合彈窗狀態
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<RoutineExerciseItem[]>([]);

  const handleOpenEdit = () => {
    if (!routine) return;
    setEditName(routine.name);
    setEditNotes(routine.notes || '');
    setEditItems([...routine.exercises]);
    setIsEditOpen(true);
  };

  const handleAddItem = () => {
    if (activeExercises.length === 0) return;
    setEditItems([...editItems, { exerciseId: activeExercises[0].id, defaultSets: 3 }]);
  };

  const handleRemoveItem = (idx: number) => {
    setEditItems(editItems.filter((_, i) => i !== idx));
  };

  const handleUpdateItemExercise = (idx: number, exerciseId: string) => {
    const next = [...editItems];
    next[idx].exerciseId = exerciseId;
    setEditItems(next);
  };

  const handleUpdateItemSets = (idx: number, setsStr: string) => {
    const val = parseInt(setsStr, 10);
    const defaultSets = isNaN(val) ? 1 : Math.max(1, Math.min(20, val));
    const next = [...editItems];
    next[idx].defaultSets = defaultSets;
    setEditItems(next);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routine || !editName.trim()) return;
    if (editItems.length === 0) {
      toast.show(t('workout.atLeastOneExercise'));
      return;
    }

    await updateRoutine(routine.id, {
      name: editName.trim(),
      notes: editNotes.trim() || undefined,
      exercises: editItems,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditOpen(false);
  };

  const handleToggleArchive = async () => {
    if (!routine) return;
    if (routine.isArchived) {
      await unarchiveRoutine(routine.id);
      triggerHaptic('success');
      toast.show(t('common.saved'));
    } else {
      const ok = await confirm({
        title: t('common.archive'),
        description: `${t('common.confirm')} ${t('common.archive')} ${routine.name}?`,
      });
      if (ok) {
        await archiveRoutine(routine.id);
        triggerHaptic('selection');
        toast.show(t('common.saved'));
        navigate('/settings/routines');
      }
    }
  };

  const handleDelete = async () => {
    if (!routine) return;
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${t('common.delete')} ${routine.name}?`,
      variant: 'destructive',
    });
    if (ok) {
      await deleteRoutine(routine.id);
      triggerHaptic('warning');
      toast.show(t('common.deleted'));
      navigate('/settings/routines');
    }
  };

  // 套用訓練組合至今日訓練
  const handleApplyRoutine = async () => {
    if (!routine) return;

    const ok = await confirm({
      title: t('workout.applyRoutine'),
      description: t('workout.applyRoutineConfirm'),
    });

    if (!ok) return;

    // 將組合中每個動作轉換為 WorkoutExerciseGroup
    const exerciseGroups = routine.exercises.map((item) => {
      const ex = exerciseMap.get(item.exerciseId);
      const setsCount = item.defaultSets || 3;
      const sets = Array.from({ length: setsCount }, (_, i) => ({
        id: Math.random().toString(),
        setNumber: i + 1,
        weight: 20,
        reps: 10,
        isCompleted: false,
      }));

      return {
        exerciseId: item.exerciseId,
        exerciseName: ex ? ex.name : '未知動作',
        category: ex ? ex.category : 'free_weight',
        sets,
        notes: item.notes,
      };
    });

    await addWorkout({
      date: selectedDate,
      title: routine.name,
      exercises: exerciseGroups,
      notes: routine.notes ? `[${routine.name}] ${routine.notes}` : `[${routine.name}]`,
    });

    triggerHaptic('success');
    toast.show(t('workout.routineApplied'));
    navigate('/workout');
  };

  const getMuscleLabel = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    return t(key);
  };

  if (!routine) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center text-sm font-mono text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-20">
      {/* 組合頂部標題卡片 */}
      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {routine.name}
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>{summary.exerciseCount} 個動作</span>
              <span>·</span>
              <span>計劃 {summary.totalPlannedSets} 組</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEdit}
            className="h-8 text-xs font-mono px-2.5 cursor-pointer"
          >
            <Edit2 className="size-3.5 mr-1" />
            {t('common.edit')}
          </Button>
        </div>

        {routine.notes && (
          <p className="text-xs font-mono text-muted-foreground bg-muted/30 p-2 rounded">
            {routine.notes}
          </p>
        )}

        {/* 一鍵套用訓練組合按鈕 */}
        <Button
          onClick={handleApplyRoutine}
          className="w-full h-10 bg-foreground text-background font-mono text-xs flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
        >
          <Play className="size-4 fill-current" />
          {t('workout.applyRoutine')}
        </Button>
      </div>

      {/* 覆蓋細分刺激肌群客觀標籤 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2 font-mono">
          {t('workout.coveredMuscles')}
        </div>
        <div className="border border-border rounded-lg bg-card p-3">
          {summary.coveredMuscles.length === 0 ? (
            <div className="text-xs font-mono text-muted-foreground text-center py-2">
              未指定刺激肌群
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {summary.coveredMuscles.map((item) => (
                <span
                  key={item.muscle}
                  className="px-2 py-1 rounded border border-border bg-muted/30 text-xs font-mono flex items-center gap-1.5"
                >
                  <span className="font-medium text-foreground">
                    {getMuscleLabel(item.muscle)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    最高 {item.maxIntensity}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 動作構成清單 (Usage List, 點擊可跳轉動作詳情) */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2 font-mono">
          動作構成清單 ({routine.exercises.length})
        </div>
        <div className="border border-border rounded-lg bg-card divide-y divide-border overflow-hidden">
          {routine.exercises.map((item, idx) => {
            const ex = exerciseMap.get(item.exerciseId);
            const muscles = Object.entries(ex?.targetMuscles || {}) as [DetailedMuscle, number][];

            return (
              <div
                key={idx}
                onClick={() => ex && navigate(`/settings/exercises/${ex.id}`)}
                className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="space-y-1 min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {ex ? ex.name : '未知動作'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap">
                    <span className="font-bold text-foreground">
                      {item.defaultSets} 組
                    </span>
                    {ex && (
                      <>
                        <span>·</span>
                        <span>{ex.category}</span>
                        <span>·</span>
                        <span>{ex.equipment}</span>
                      </>
                    )}
                    {muscles.length > 0 && (
                      <>
                        <span>·</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {muscles.slice(0, 2).map(([m, val]) => (
                            <span key={m} className="px-1 py-0.2 bg-muted/50 rounded text-[10px]">
                              {getMuscleLabel(m)} {val}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
              </div>
            );
          })}
        </div>
      </div>

      {/* 操作區塊 */}
      <div className="pt-2 space-y-2">
        <Button
          variant="outline"
          onClick={handleToggleArchive}
          className="w-full text-xs font-mono h-10 border-border hover:bg-muted/40 cursor-pointer"
        >
          {routine.isArchived ? (
            <>
              <RefreshCcw className="size-3.5 mr-1.5" />
              {t('common.unarchive')}
            </>
          ) : (
            <>
              <Archive className="size-3.5 mr-1.5" />
              {t('common.archive')}
            </>
          )}
        </Button>

        <Button
          variant="destructive"
          onClick={handleDelete}
          className="w-full text-xs font-mono h-10 bg-destructive text-destructive-foreground hover:opacity-90 cursor-pointer"
        >
          <Trash2 className="size-3.5 mr-1.5" />
          {t('common.delete')}
        </Button>
      </div>

      {/* 編輯組合彈窗 (Instant Pop, 左取消右確認) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md w-full bg-card p-6 border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-tight">
              {t('workout.editRoutine')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('workout.routineName')}
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('common.notes')}
              </Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  動作構成清單 ({editItems.length})
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
                {editItems.map((item, idx) => (
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
                            <SelectItem key={ex.id} value={ex.id}>
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
                ))}
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between pt-3 border-t border-border sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
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
