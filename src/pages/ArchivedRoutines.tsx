import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoutines } from '@/hooks/useRoutines';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';

export default function ArchivedRoutines() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { archivedCustomRoutines, unarchiveRoutine } = useRoutines();

  const handleUnarchive = async (id: string) => {
    await unarchiveRoutine(id);
    triggerHaptic('selection');
    toast.show(t('common.saved'));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20">
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground divide-y divide-border">
        {archivedCustomRoutines.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-muted-foreground">
            {t('workout.noArchivedRoutines')}
          </div>
        ) : (
          archivedCustomRoutines.map((routine) => (
            <div
              key={routine.id}
              className="flex items-center justify-between p-3.5 pl-4 group hover:bg-muted/30 transition-colors"
            >
              <button
                type="button"
                className="flex-1 flex flex-col justify-center text-left cursor-pointer min-w-0 select-none space-y-1"
                onClick={() => navigate(`/settings/routines/${routine.id}`)}
              >
                <span className="font-medium text-sm text-foreground hover:underline truncate">
                  {routine.name}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground truncate">
                  {routine.exercises.length} 個動作
                </span>
              </button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-mono opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                onClick={() => handleUnarchive(routine.id)}
              >
                <RefreshCcw className="size-3.5 mr-1" />
                {t('common.unarchive')}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
