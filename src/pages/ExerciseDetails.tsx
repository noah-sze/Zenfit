import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Edit2,
  Archive,
  RefreshCcw,
  Trash2,
  Layers,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';
import { db } from '@/services/db/db';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import { calculateE1RM } from '@/utils/workoutMath';
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
import type { EquipmentType, DetailedMuscle } from '@/types';
import { MAJOR_MUSCLE_GROUPS } from '@/constants/muscles';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { convertBodyWeight } from '@/utils/unitMath';

export default function ExerciseDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { bodyWeightUnit } = useUnitPreferences();

  const { allExercises, updateExercise, archiveExercise, unarchiveExercise, deleteExercise } = useExercises();
  const { allRoutines } = useRoutines();
  const { activeEquipments, addCustomEquipment, getEquipmentDisplayName } = useEquipments();

  const exercise = useMemo(() => {
    return allExercises.find((e) => e.id === id);
  }, [allExercises, id]);

  // 取得包含此動作的訓練組合
  const relatedRoutines = useMemo(() => {
    if (!id) return [];
    return allRoutines.filter((r) => r.exercises.some((item) => item.exerciseId === id));
  }, [allRoutines, id]);

  // 取得包含此動作的所有歷史日誌
  const workoutLogs = useLiveQuery(
    async () => {
      if (!id || !exercise) return [];
      const logs = await db.workout_logs.toArray();
      // 篩選出包含此動作的日誌
      return logs.filter((log) =>
        log.exercises.some(
          (ex) =>
            ex.exerciseId === id ||
            ex.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
        )
      );
    },
    [id, exercise?.name]
  );

  // 計算客觀指標：歷史最佳 e1RM、累計完成組數、累計容量
  const stats = useMemo(() => {
    if (!workoutLogs || workoutLogs.length === 0 || !exercise) {
      return { bestE1RM: 0, totalVolume: 0, totalCompletedSets: 0 };
    }

    let bestE1RM = 0;
    let totalVolume = 0;
    let totalCompletedSets = 0;

    for (const log of workoutLogs) {
      const targetGroup = log.exercises.filter(
        (ex) =>
          ex.exerciseId === id ||
          ex.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
      );
      for (const group of targetGroup) {
        for (const set of group.sets) {
          if (set.isCompleted) {
            totalCompletedSets += 1;
            const w = set.weight || 0;
            const r = set.reps || 0;
            totalVolume += w * r;

            const e1rm = calculateE1RM(w, r);
            if (e1rm > bestE1RM) {
              bestE1RM = e1rm;
            }
          }
        }
      }
    }

    return {
      bestE1RM,
      totalVolume: Math.round(totalVolume * 10) / 10,
      totalCompletedSets,
    };
  }, [workoutLogs, exercise, id]);

  // 編輯動作彈窗狀態
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEquipment, setEditEquipment] = useState<EquipmentType>('barbell');
  const [editNotes, setEditNotes] = useState('');
  const [editMuscles, setEditMuscles] = useState<{ muscle: DetailedMuscle; intensity: number }[]>([]);

  // 新增自定義器械平級彈窗
  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);
  const [customEquipmentName, setCustomEquipmentName] = useState('');

  const handleOpenEdit = () => {
    if (!exercise) return;
    setEditName(exercise.name);
    setEditEquipment(exercise.equipment);
    setEditNotes(exercise.notes || '');

    const muscles = Object.entries(exercise.targetMuscles || {}).map(([m, intensity]) => ({
      muscle: m as DetailedMuscle,
      intensity: intensity as number,
    }));
    setEditMuscles(muscles.length > 0 ? muscles : [{ muscle: 'mid_lower_chest', intensity: 100 }]);
    setIsEditOpen(true);
  };

  const handleAddEditMuscle = () => {
    const existing = new Set(editMuscles.map((m) => m.muscle));
    const allDetailed = MAJOR_MUSCLE_GROUPS.flatMap((g) => g.detailedMuscles);
    const available = allDetailed.find((m) => !existing.has(m)) || 'mid_lower_chest';
    setEditMuscles([...editMuscles, { muscle: available, intensity: 50 }]);
  };

  const handleRemoveEditMuscle = (idx: number) => {
    setEditMuscles(editMuscles.filter((_, i) => i !== idx));
  };

  const handleUpdateEditMuscle = (idx: number, muscle: DetailedMuscle) => {
    const next = [...editMuscles];
    next[idx].muscle = muscle;
    setEditMuscles(next);
  };

  const handleUpdateEditIntensity = (idx: number, val: string) => {
    const parsed = parseInt(val, 10);
    const intensity = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
    const next = [...editMuscles];
    next[idx].intensity = intensity;
    setEditMuscles(next);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise || !editName.trim()) return;

    const targetMuscles: Partial<Record<DetailedMuscle, number>> = {};
    for (const item of editMuscles) {
      targetMuscles[item.muscle] = item.intensity;
    }

    await updateExercise(exercise.id, {
      name: editName.trim(),
      equipment: editEquipment,
      targetMuscles,
      notes: editNotes.trim() || undefined,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditOpen(false);
  };

  const handleToggleArchive = async () => {
    if (!exercise) return;
    if (exercise.isArchived) {
      await unarchiveExercise(exercise.id);
      triggerHaptic('success');
      toast.show(t('common.saved'));
    } else {
      const ok = await confirm({
        title: t('common.archive'),
        description: `${t('common.confirm')} ${t('common.archive')} ${exercise.name}?`,
      });
      if (ok) {
        await archiveExercise(exercise.id);
        triggerHaptic('selection');
        toast.show(t('common.saved'));
        navigate('/settings/exercises');
      }
    }
  };

  const handleDelete = async () => {
    if (!exercise) return;
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${t('common.delete')} ${exercise.name}?`,
      variant: 'destructive',
    });
    if (ok) {
      const res = await deleteExercise(exercise.id);
      if (!res.success) {
        if (res.reason === 'has_logs') {
          toast.show(t('workout.exerciseHasLogs'));
        } else if (res.reason === 'has_routines') {
          toast.show(t('workout.exerciseHasRoutines'));
        }
        return;
      }
      triggerHaptic('warning');
      toast.show(t('common.deleted'));
      navigate('/settings/exercises');
    }
  };

  const getMuscleLabel = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    return t(key);
  };

  if (!exercise) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center text-sm font-mono text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  const muscleEntries = Object.entries(exercise.targetMuscles || {}) as [DetailedMuscle, number][];

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-20">
      {/* 動作頂部標題卡片 */}
      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {exercise.name}
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>{getEquipmentDisplayName(exercise.equipment, t)}</span>
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

        {exercise.notes && (
          <p className="text-xs font-mono text-muted-foreground bg-muted/30 p-2 rounded">
            {exercise.notes}
          </p>
        )}
      </div>

      {/* 目標細分肌群刺激區域卡片 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2 font-mono">
          {t('workout.targetMuscles')}
        </div>
        <div className="border border-border rounded-lg bg-card p-3 space-y-2">
          {muscleEntries.length === 0 ? (
            <div className="text-xs font-mono text-muted-foreground text-center py-2">
              未指定刺激肌群
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {muscleEntries.map(([m, intensity]) => (
                <div
                  key={m}
                  className="p-2 rounded border border-border bg-muted/20 flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-foreground">
                    {getMuscleLabel(m)}
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {intensity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 客觀指標三並列卡片 (Grid Cards, 無陰影, 等寬數字) */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2 font-mono">
          客觀指標 (Lifetime Metrics)
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-border rounded-lg p-3 bg-card text-center space-y-1">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">
              {t('workout.bestE1RM')}
            </div>
            <div className="text-lg font-mono font-bold text-foreground">
              {convertBodyWeight(stats.bestE1RM, 'kg', bodyWeightUnit, 1)}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">{bodyWeightUnit}</span>
            </div>
          </div>

          <div className="border border-border rounded-lg p-3 bg-card text-center space-y-1">
            <div className="text-[10px] uppercase font-mono text-muted-foreground truncate">
              {t('workout.totalLifetimeVolume')}
            </div>
            <div className="text-lg font-mono font-bold text-foreground truncate">
              {convertBodyWeight(stats.totalVolume, 'kg', bodyWeightUnit, 1)}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">{bodyWeightUnit}</span>
            </div>
          </div>

          <div className="border border-border rounded-lg p-3 bg-card text-center space-y-1">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">
              {t('workout.totalCompletedSets')}
            </div>
            <div className="text-lg font-mono font-bold text-foreground">
              {stats.totalCompletedSets}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">組</span>
            </div>
          </div>
        </div>
      </div>

      {/* 包含此動作的訓練組合 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2 font-mono">
          {t('workout.relatedRoutines')}
        </div>
        <div className="border border-border rounded-lg bg-card divide-y divide-border overflow-hidden">
          {relatedRoutines.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-muted-foreground">
              {t('workout.noRelatedRoutines')}
            </div>
          ) : (
            relatedRoutines.map((routine) => (
              <Link
                key={routine.id}
                to={`/settings/routines/${routine.id}`}
                className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {routine.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground group-hover:text-foreground">
                  <span>{routine.exercises.length} 個動作</span>
                  <ChevronRight className="size-4 opacity-50 group-hover:opacity-100" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 操作區塊 */}
      <div className="pt-2 space-y-2">
        <Button
          variant="outline"
          onClick={handleToggleArchive}
          className="w-full text-xs font-mono h-10 border-border hover:bg-muted/40 cursor-pointer"
        >
          {exercise.isArchived ? (
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

      {/* 編輯動作彈窗 (Instant Pop, 左取消右確認) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md w-full bg-card p-6 border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-tight">
              {t('workout.editExercise')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('workout.exerciseName')}
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('workout.equipment')}
                </Label>
                <button
                  type="button"
                  onClick={() => setIsAddEquipmentOpen(true)}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
                >
                  ＋ 自定義器械
                </button>
              </div>
              <Select
                value={editEquipment}
                onValueChange={(v) => setEditEquipment(v as EquipmentType)}
              >
                <SelectTrigger className="w-full font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {activeEquipments.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {getEquipmentDisplayName(eq.id, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground block">
                    {t('workout.targetMuscles')}
                  </Label>
                  <span className="text-[11px] text-muted-foreground/80 font-mono">
                    {t('workout.targetMusclesDesc')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEditMuscle}
                  className="h-7 text-xs font-mono px-2 cursor-pointer"
                >
                  <Plus className="size-3 mr-1" />
                  {t('workout.addMuscleStimulus')}
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {editMuscles.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2 rounded border border-border">
                    <div className="flex-1">
                      <Select
                        value={item.muscle}
                        onValueChange={(v) => handleUpdateEditMuscle(idx, v as DetailedMuscle)}
                      >
                        <SelectTrigger className="h-8 text-xs font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {MAJOR_MUSCLE_GROUPS.map((group) => (
                            <div key={group.id} className="py-1">
                              <div className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                {t(`workout.${group.id}`)}
                              </div>
                              {group.detailedMuscles.map((muscle) => (
                                <SelectItem key={muscle} value={muscle}>
                                  {getMuscleLabel(muscle)}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-20 flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.intensity}
                        onChange={(e) => handleUpdateEditIntensity(idx, e.target.value)}
                        className="h-8 text-xs font-mono text-center px-1"
                      />
                      <span className="text-xs font-mono text-muted-foreground">%</span>
                    </div>

                    {editMuscles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEditMuscle(idx)}
                        className="size-7 flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <X className="size-4" />
                      </button>
                    )}
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

      {/* 新增自定義器械平級彈窗 (Flat Sibling Dialog) */}
      <Dialog open={isAddEquipmentOpen} onOpenChange={setIsAddEquipmentOpen}>
        <DialogContent className="max-w-sm w-full bg-card p-5 border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-tight">
              新增自定義器械
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!customEquipmentName.trim()) return;
              const res = await addCustomEquipment(customEquipmentName.trim());
              if (res.success && res.equipment) {
                setEditEquipment(res.equipment.id);
                setIsAddEquipmentOpen(false);
                setCustomEquipmentName('');
                triggerHaptic('success');
                toast.show(t('common.saved'));
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                器械名稱
              </Label>
              <Input
                value={customEquipmentName}
                onChange={(e) => setCustomEquipmentName(e.target.value)}
                placeholder="例如: 安全深蹲槓 SSB"
                className="font-mono text-sm"
              />
            </div>

            <DialogFooter className="flex flex-row items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddEquipmentOpen(false)}
                className="cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-foreground text-background hover:opacity-90 cursor-pointer"
              >
                {t('common.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
