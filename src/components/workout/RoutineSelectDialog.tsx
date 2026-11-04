import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { useRoutines } from '@/hooks/useRoutines';
import { triggerHaptic } from '@/lib/haptics';
import type { WorkoutRoutine } from '@/types';

export interface RoutineSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (routine: WorkoutRoutine) => void;
  zIndex?: number;
}

export const RoutineSelectDialog = memo(function RoutineSelectDialog({
  open,
  onOpenChange,
  onSelect,
  zIndex = 70,
}: RoutineSelectDialogProps) {
  const { t } = useTranslation();
  const { activeRoutines } = useRoutines();

  const handleSelect = (routine: WorkoutRoutine) => {
    triggerHaptic('selection');
    onSelect(routine);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PrecisionDialogContent
        title={t('workout.selectRoutine', '選擇訓練組合')}
        onClose={() => onOpenChange(false)}
        className={zIndex ? `z-[${zIndex}]` : undefined}
      >
        <div className="pt-3.5 space-y-3 font-mono text-xs select-none">
          <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
            {activeRoutines.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                {t('workout.noRoutines', '無組合')}
              </div>
            ) : (
              activeRoutines.map((routine) => {
                const totalSets = routine.exercises.reduce(
                  (sum, it) => sum + (it.defaultSets || 3),
                  0
                );

                return (
                  <div
                    key={routine.id}
                    onClick={() => handleSelect(routine)}
                    className="min-h-12 py-2 px-3 sm:px-4 flex items-center justify-between gap-3 bg-card hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate">
                        {routine.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span>
                          {routine.exercises.length} {t('common.items', '項')}
                        </span>
                        <span className="text-border">·</span>
                        <span>
                          {totalSets} {t('workout.set', '組')}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PrecisionDialogContent>
    </Dialog>
  );
});
