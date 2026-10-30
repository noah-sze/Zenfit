import { useState, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import type { Equipment } from '@/types';

export interface EquipmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  onSubmit: (name: string) => Promise<void> | void;
}

export function EquipmentFormDialog({
  open,
  onOpenChange,
  equipment,
  onSubmit,
}: EquipmentFormDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState('');

  const isEdit = Boolean(equipment);

  useEffect(() => {
    if (open) {
      if (equipment) {
        setName(equipment.name);
      } else {
        setName('');
      }
    }
  }, [open, equipment]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmed = name.trim();
    if (!trimmed) {
      toast.show(t('common.required'));
      return;
    }

    await onSubmit(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PrecisionDialogContent
        title={isEdit ? t('common.edit') : t('common.add')}
        form={formId}
        onClose={() => onOpenChange(false)}
      >
        <form id={formId} onSubmit={handleSubmit} className="pt-3.5 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('workout.equipmentName', '器械名稱')}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workout.equipmentPlaceholder', '例如：滑輪下拉機、腿屈伸機')}
              className="font-mono text-xs h-9 bg-card border-border"
              maxLength={40}
            />
          </div>
        </form>
      </PrecisionDialogContent>
    </Dialog>
  );
}
