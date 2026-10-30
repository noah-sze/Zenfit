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
import { useExercises } from '@/hooks/useExercises';
import type { RoutineExerciseItem } from '@/types';

export interface RoutineFormData {
  name: string;
  notes?: string;
  exercises: RoutineExerciseItem[];
}

export interface RoutineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RoutineFormData) => Promise<void> | void;
}

export function RoutineFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: RoutineFormDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { activeExercises } = useExercises();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RoutineExerciseItem[]>([]);

  useEffect(() => {
    if (open) {
      setName('');
      setNotes('');
      if (activeExercises.length > 0) {
        setItems([{ exerciseId: activeExercises[0].id, defaultSets: 4 }]);
      } else {
        setItems([]);
      }
    }
  }, [open, activeExercises]);

  const handleAddItem = () => {
    if (activeExercises.length === 0) {
      toast.show(t('workout.noExercisesAvailable', '無可用動作，請先新增動作'));
      return;
    }
    setItems([...items, { exerciseId: activeExercises[0].id, defaultSets: 3 }]);
  };

  const handleUpdateExercise = (index: number, exerciseId: string) => {
    const updated = [...items];
    updated[index].exerciseId = exerciseId;
    setItems(updated);
  };

  const handleUpdateSets = (index: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const updated = [...items];
    updated[index].defaultSets = isNaN(val) ? 1 : Math.max(1, Math.min(20, val));
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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

    if (items.length === 0) {
      toast.show(t('workout.atLeastOneExercise', '請至少新增一個動作'));
      return;
    }

    await onSubmit({
      name: trimmed,
      notes: notes.trim() || undefined,
      exercises: items,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PrecisionDialogContent
        title={t('common.add')}
        form={formId}
        onClose={() => onOpenChange(false)}
      >
        <form id={formId} onSubmit={handleSubmit} className="pt-3.5 space-y-3 font-mono text-xs max-h-[75vh] overflow-y-auto pr-1">
          {/* 組合名稱 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              {t('workout.routineName')}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workout.routineNamePlaceholder', '例如：推力日 A (Push A)')}
              className="font-mono text-xs h-9 bg-card border-border"
              maxLength={50}
            />
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

          {/* 動作構成清單 */}
          <div className="space-y-2 pt-1 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                {t('workout.routineExerciseList', '動作構成')} ({items.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-6 text-[10px] font-mono px-2 cursor-pointer"
              >
                <Plus className="size-3 mr-1" />
                {t('workout.addExercise')}
              </Button>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
              {items.length === 0 ? (
                <div className="text-center py-4 text-xs font-mono text-muted-foreground">
                  {t('workout.emptyRoutineItems', '點擊右上角新增動作')}
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-muted/20 p-1.5 rounded border border-border">
                    <div className="flex-1 min-w-0">
                      <Select
                        value={item.exerciseId}
                        onValueChange={(v) => v && handleUpdateExercise(idx, v)}
                      >
                        <SelectTrigger className="h-7 text-[11px] font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-56 font-mono text-xs">
                          {activeExercises.map((ex) => (
                            <SelectItem key={ex.id} value={ex.id}>
                              {ex.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-16 flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={item.defaultSets}
                        onChange={(e) => handleUpdateSets(idx, e.target.value)}
                        className="h-7 text-center font-mono text-[11px] px-1"
                      />
                      <span className="text-[10px] text-muted-foreground">{t('workout.set', '組')}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 cursor-pointer shrink-0"
                      title={t('common.delete')}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>
      </PrecisionDialogContent>
    </Dialog>
  );
}
