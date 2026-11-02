import { useState, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
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
        overlayClassName="z-[80]"
        className="z-[80]"
        submitDisabled={!name.trim()}
      >
        <form id={formId} onSubmit={handleSubmit} className="pt-3.5 space-y-3.5">
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground px-0 font-semibold">
              {t('workout.basicInfo')}
            </div>
            <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm font-sans">
              <div className="h-10 px-4 flex items-center justify-between gap-2 bg-card">
                <span className="text-muted-foreground text-xs shrink-0">{t('workout.equipmentName', '器械名稱')}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('workout.equipmentPlaceholder', '例如：滑輪機')}
                  className="h-7 px-3 rounded-full border border-border/80 bg-background text-right text-xs font-sans text-foreground font-medium focus:outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-all duration-100 flex-1 max-w-[170px]"
                  maxLength={40}
                />
              </div>
            </div>
          </div>
        </form>
      </PrecisionDialogContent>
    </Dialog>
  );
}
