import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { useExercises } from '@/hooks/useExercises';
import { useEquipments } from '@/hooks/useEquipments';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { EquipmentType, DetailedMuscle, Exercise } from '@/types';
import { MAJOR_MUSCLE_GROUPS } from '@/constants/muscles';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export default function Exercises() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const handleTabChange = (tab: 'active' | 'archived') => {
    triggerHaptic('selection');
    setActiveTab(tab);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');

  const {
    activeExercises,
    archivedExercises,
    addExercise,
    unarchiveExercise,
    deleteExercise,
  } = useExercises();

  const {
    activeEquipments,
    addCustomEquipment,
    getEquipmentDisplayName,
  } = useEquipments();

  // 新增動作彈窗狀態
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEquipment, setNewEquipment] = useState<EquipmentType>('barbell');
  const [newNotes, setNewNotes] = useState('');
  // 細分肌群刺激: Array<{ muscle: DetailedMuscle; intensity: number }>
  const [newMuscles, setNewMuscles] = useState<{ muscle: DetailedMuscle; intensity: number }[]>([
    { muscle: 'mid_lower_chest', intensity: 100 },
  ]);

  // 新增自定義器械彈窗（平級兄弟彈窗）
  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);
  const [customEquipmentName, setCustomEquipmentName] = useState('');

  const currentList = activeTab === 'archived' ? archivedExercises : activeExercises;

  // 取得動作庫中實際出現過的所有器械 ID（用於頂部快篩標籤）
  const filterEquipmentList = useMemo(() => {
    const set = new Set<string>();
    for (const ex of currentList) {
      if (ex.equipment) set.add(ex.equipment);
    }
    return Array.from(set);
  }, [currentList]);

  const filteredExercises = useMemo(() => {
    return currentList
      .filter((item) => {
        if (selectedEquipment !== 'all' && item.equipment !== selectedEquipment) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            item.name.toLowerCase().includes(q) ||
            (item.notes && item.notes.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentList, selectedEquipment, searchQuery]);

  const getMuscleLabel = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    return t(key);
  };

  const handleAddMuscle = () => {
    const existing = new Set(newMuscles.map((m) => m.muscle));
    const allDetailed = MAJOR_MUSCLE_GROUPS.flatMap((g) => g.detailedMuscles);
    const available = allDetailed.find((m) => !existing.has(m)) || 'mid_lower_chest';
    setNewMuscles([...newMuscles, { muscle: available, intensity: 50 }]);
  };

  const handleRemoveMuscle = (idx: number) => {
    setNewMuscles(newMuscles.filter((_, i) => i !== idx));
  };

  const handleUpdateMuscle = (idx: number, muscle: DetailedMuscle) => {
    const next = [...newMuscles];
    next[idx].muscle = muscle;
    setNewMuscles(next);
  };

  const handleUpdateIntensity = (idx: number, val: string) => {
    const parsed = parseInt(val, 10);
    const intensity = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
    const next = [...newMuscles];
    next[idx].intensity = intensity;
    setNewMuscles(next);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.show(t('common.required'));
      return;
    }

    const targetMuscles: Partial<Record<DetailedMuscle, number>> = {};
    for (const item of newMuscles) {
      targetMuscles[item.muscle] = item.intensity;
    }

    await addExercise({
      name: newName.trim(),
      equipment: newEquipment,
      targetMuscles,
      notes: newNotes.trim() || undefined,
      isCustom: true,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsAddOpen(false);
    setNewName('');
    setNewNotes('');
    setNewMuscles([{ muscle: 'mid_lower_chest', intensity: 100 }]);
  };

  const handleCreateCustomEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEquipmentName.trim()) {
      toast.show(t('common.required'));
      return;
    }

    const res = await addCustomEquipment(customEquipmentName.trim());
    if (!res.success || !res.equipment) {
      toast.show(t('common.error'));
      return;
    }

    setNewEquipment(res.equipment.id);
    setIsAddEquipmentOpen(false);
    setCustomEquipmentName('');
    triggerHaptic('success');
    toast.show(t('common.saved'));
  };

  const handleUnarchive = async (e: React.MouseEvent, exercise: Exercise) => {
    e.stopPropagation();
    await unarchiveExercise(exercise.id);
    triggerHaptic('selection');
    toast.show(t('common.saved'));
  };

  const handleDelete = async (e: React.MouseEvent, exercise: Exercise) => {
    e.stopPropagation();
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${t('common.delete')} ${exercise.name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

    const res = await deleteExercise(exercise.id);
    if (!res.success) {
      if (res.reason === 'has_logs') {
        toast.show(t('workout.exerciseHasLogs'));
      } else if (res.reason === 'has_routines') {
        toast.show(t('workout.exerciseHasRoutines'));
      } else {
        toast.show(t('common.error'));
      }
      return;
    }

    triggerHaptic('warning');
    toast.show(t('common.deleted'));
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
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
            onClick={() => setIsAddOpen(true)}
            size="icon"
            className="size-10 shrink-0 bg-foreground text-background hover:opacity-90 cursor-pointer"
            title={t('common.add')}
            aria-label={t('common.add')}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </div>

      {/* 器械橫向切換標籤 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setSelectedEquipment('all');
            triggerHaptic('selection');
          }}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-mono transition-colors shrink-0 cursor-pointer border',
            selectedEquipment === 'all'
              ? 'bg-foreground text-background border-foreground font-medium'
              : 'bg-card text-muted-foreground border-border hover:text-foreground'
          )}
        >
          {t('common.all', '全部')}
        </button>
        {filterEquipmentList.map((eqId) => (
          <button
            key={eqId}
            onClick={() => {
              setSelectedEquipment(eqId);
              triggerHaptic('selection');
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-mono transition-colors shrink-0 cursor-pointer border',
              selectedEquipment === eqId
                ? 'bg-foreground text-background border-foreground font-medium'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            )}
          >
            {getEquipmentDisplayName(eqId, t)}
          </button>
        ))}
      </div>

      {/* 狀態列：計數顯示 */}
      <div className="flex items-center justify-between px-1 text-xs font-mono text-muted-foreground">
        <span>
          {activeTab === 'active'
            ? t('settings.activeCount', { count: filteredExercises.length })
            : t('settings.archivedCount', { count: filteredExercises.length })}
        </span>
      </div>

      {/* 動作清單 (Usage List 佈局，無陰影，純邊框) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
        {filteredExercises.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-muted-foreground">
            {t('workout.noExercises')}
          </div>
        ) : (
          filteredExercises.map((exercise) => {
            const muscleEntries = Object.entries(exercise.targetMuscles || {}) as [DetailedMuscle, number][];
            return (
              <div
                key={exercise.id}
                onClick={() => navigate(`/settings/exercises/${exercise.id}`)}
                className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="space-y-1 pr-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {exercise.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap">
                    <span>{getEquipmentDisplayName(exercise.equipment, t)}</span>
                    {muscleEntries.length > 0 && (
                      <>
                        <span>·</span>
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
                            <span className="text-[10px] opacity-60">+{muscleEntries.length - 3}</span>
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
                      onClick={(e) => handleUnarchive(e, exercise)}
                      className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={t('common.restore')}
                      aria-label={t('common.restore')}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, exercise)}
                      className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 新增動作彈窗 (Instant Pop, 平級兄弟聲明, 左取消右確認) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md w-full bg-card p-6 border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-tight">
              {t('workout.addExercise')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('workout.exerciseName')}
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如: 啞鈴上斜臥推"
                className="font-mono text-sm"
              />
            </div>

            {/* 所需器械（主阻力載體） */}
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
                value={newEquipment}
                onValueChange={(v) => setNewEquipment(v as EquipmentType)}
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

            {/* 目標細分肌群刺激設定 */}
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
                  onClick={handleAddMuscle}
                  className="h-7 text-xs font-mono px-2 cursor-pointer"
                >
                  <Plus className="size-3 mr-1" />
                  {t('workout.addMuscleStimulus')}
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {newMuscles.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2 rounded border border-border">
                    <div className="flex-1">
                      <Select
                        value={item.muscle}
                        onValueChange={(v) => handleUpdateMuscle(idx, v as DetailedMuscle)}
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
                        onChange={(e) => handleUpdateIntensity(idx, e.target.value)}
                        className="h-8 text-xs font-mono text-center px-1"
                      />
                      <span className="text-xs font-mono text-muted-foreground">%</span>
                    </div>

                    {newMuscles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMuscle(idx)}
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

      {/* 新增自定義器械平級彈窗 (Flat Sibling Dialog) */}
      <Dialog open={isAddEquipmentOpen} onOpenChange={setIsAddEquipmentOpen}>
        <DialogContent className="max-w-sm w-full bg-card p-5 border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-tight">
              新增自定義器械
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCustomEquipment} className="space-y-4">
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
