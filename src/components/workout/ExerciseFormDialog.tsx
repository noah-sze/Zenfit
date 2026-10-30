import { useState, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useEquipments } from '@/hooks/useEquipments';
import { MAJOR_MUSCLE_GROUPS } from '@/constants/muscles';
import type { EquipmentType, DetailedMuscle } from '@/types';
import { EquipmentFormDialog } from './EquipmentFormDialog';

export interface ExerciseFormData {
  name: string;
  equipment: EquipmentType;
  targetMuscles: Record<DetailedMuscle, number>;
  notes?: string;
}

export interface ExerciseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExerciseFormData) => Promise<void> | void;
}

export function ExerciseFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: ExerciseFormDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { activeEquipments, addCustomEquipment, getEquipmentDisplayName } = useEquipments();

  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<EquipmentType>('barbell');
  const [notes, setNotes] = useState('');
  const [muscles, setMuscles] = useState<{ muscle: DetailedMuscle; intensity: number }[]>([
    { muscle: 'mid_lower_chest', intensity: 100 },
  ]);

  // 新增器械平級兄弟彈窗
  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setEquipment(activeEquipments[0]?.id || 'barbell');
      setNotes('');
      setMuscles([{ muscle: 'mid_lower_chest', intensity: 100 }]);
    }
  }, [open, activeEquipments]);

  const getMuscleLabel = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    return t(key);
  };

  const handleAddMuscle = () => {
    const usedMuscles = new Set(muscles.map((m) => m.muscle));
    let nextMuscle: DetailedMuscle = 'mid_lower_chest';
    for (const group of MAJOR_MUSCLE_GROUPS) {
      for (const m of group.detailedMuscles) {
        if (!usedMuscles.has(m)) {
          nextMuscle = m;
          break;
        }
      }
    }
    setMuscles([...muscles, { muscle: nextMuscle, intensity: 50 }]);
  };

  const handleUpdateMuscle = (index: number, newMuscle: DetailedMuscle) => {
    const updated = [...muscles];
    updated[index].muscle = newMuscle;
    setMuscles(updated);
  };

  const handleUpdateIntensity = (index: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const updated = [...muscles];
    updated[index].intensity = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
    setMuscles(updated);
  };

  const handleRemoveMuscle = (index: number) => {
    if (muscles.length <= 1) {
      toast.show(t('workout.atLeastOneMuscle', '至少需設定一個目標肌群'));
      return;
    }
    setMuscles(muscles.filter((_, i) => i !== index));
  };

  const handleCreateCustomEquipment = async (customName: string) => {
    const res = await addCustomEquipment(customName);
    if (res.success && res.equipment) {
      setEquipment(res.equipment.id);
      toast.show(t('common.saved'));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmed = name.trim();
    if (!trimmed) {
      toast.show(t('common.required'));
      return;
    }

    const targetMuscles: Record<DetailedMuscle, number> = {} as any;
    for (const item of muscles) {
      targetMuscles[item.muscle] = item.intensity;
    }

    await onSubmit({
      name: trimmed,
      equipment,
      targetMuscles,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <PrecisionDialogContent
          title={t('common.add')}
          form={formId}
          onClose={() => onOpenChange(false)}
        >
          <form id={formId} onSubmit={handleSubmit} className="pt-3.5 space-y-3 font-mono text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* 動作名稱 */}
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                {t('workout.exerciseName')}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('workout.exerciseNamePlaceholder', '例如：啞鈴上斜臥推')}
                className="font-mono text-xs h-9 bg-card border-border"
                maxLength={50}
              />
            </div>

            {/* 所需器械 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  {t('workout.equipment')}
                </Label>
                <button
                  type="button"
                  onClick={() => setIsAddEquipmentOpen(true)}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
                >
                  ＋ {t('workout.customEquipment', '自定義器械')}
                </button>
              </div>
              <Select
                value={equipment}
                onValueChange={(v) => v && setEquipment(v as EquipmentType)}
              >
                <SelectTrigger className="w-full font-mono text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56 font-mono text-xs">
                  {activeEquipments.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {getEquipmentDisplayName(eq.id, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 備註 */}
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                {t('common.notes')}
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('workout.notesPlaceholder', '選填技術要點')}
                className="font-mono text-xs h-9 bg-card border-border"
                maxLength={100}
              />
            </div>

            {/* 目標肌群刺激度配置 */}
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  {t('workout.targetMuscles')}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMuscle}
                  className="h-6 text-[10px] font-mono px-2 cursor-pointer"
                >
                  <Plus className="size-3 mr-1" />
                  {t('workout.addMuscleStimulus', '增加肌群')}
                </Button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                {muscles.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-muted/20 p-1.5 rounded border border-border">
                    <div className="flex-1 min-w-0">
                      <Select
                        value={item.muscle}
                        onValueChange={(v) => v && handleUpdateMuscle(idx, v as DetailedMuscle)}
                      >
                        <SelectTrigger className="h-7 text-[11px] font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-56 font-mono text-xs">
                          {MAJOR_MUSCLE_GROUPS.map((group) => (
                            <div key={group.id} className="py-1">
                              <div className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
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

                    <div className="w-16 flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.intensity}
                        onChange={(e) => handleUpdateIntensity(idx, e.target.value)}
                        className="h-7 text-center font-mono text-[11px] px-1"
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                    </div>

                    {muscles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMuscle(idx)}
                        className="text-muted-foreground hover:text-destructive p-1 cursor-pointer shrink-0"
                        title={t('common.delete')}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>
        </PrecisionDialogContent>
      </Dialog>

      {/* 平級兄弟 Dialog：自定義器械 (遵守 Rule 4) */}
      <EquipmentFormDialog
        open={isAddEquipmentOpen}
        onOpenChange={setIsAddEquipmentOpen}
        onSubmit={handleCreateCustomEquipment}
      />
    </>
  );
}
