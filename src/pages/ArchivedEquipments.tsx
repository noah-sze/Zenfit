import { useTranslation } from 'react-i18next';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEquipments } from '@/hooks/useEquipments';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';

export default function ArchivedEquipments() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const {
    archivedCustomEquipments,
    unarchiveEquipment,
    deleteEquipment,
  } = useEquipments();

  const handleUnarchive = async (id: string) => {
    await unarchiveEquipment(id);
    triggerHaptic('selection');
    toast.show(t('common.saved'));
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${t('common.delete')} ${name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

    const res = await deleteEquipment(id);
    if (!res.success) {
      if (res.reason === 'has_exercises') {
        toast.show('已有動作使用此器械，無法直接刪除');
      } else {
        toast.show(t('common.error'));
      }
      return;
    }

    triggerHaptic('warning');
    toast.show(t('common.deleted'));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20">
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground divide-y divide-border">
        {archivedCustomEquipments.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-muted-foreground">
            {t('common.noData')}
          </div>
        ) : (
          archivedCustomEquipments.map((eq) => (
            <div
              key={eq.id}
              className="flex items-center justify-between p-3.5 pl-4 group hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0 pr-2">
                <span className="font-medium text-sm text-foreground truncate block">
                  {eq.name}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  已封存自定義器械
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-mono opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                  onClick={() => handleUnarchive(eq.id)}
                >
                  <RefreshCcw className="size-3.5 mr-1" />
                  {t('common.unarchive')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                  onClick={() => handleDelete(eq.id, eq.name)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
