import { memo } from 'react';
import { ExerciseSelectDialog } from '@/components/workout/ExerciseSelectDialog';
import type { WorkoutRoutine } from '@/types';

export interface RoutineSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (routine: WorkoutRoutine) => void;
  zIndex?: number;
  title?: string;
  autoCloseOnSelect?: boolean;
  disabledIds?: string[];
  isItemDisabled?: (routine: WorkoutRoutine) => boolean;
}

export const RoutineSelectDialog = memo(function RoutineSelectDialog({
  open,
  onOpenChange,
  onSelect,
  zIndex = 70,
  title,
  autoCloseOnSelect = true,
  disabledIds,
  isItemDisabled,
}: RoutineSelectDialogProps) {
  return (
    <ExerciseSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="routines"
      title={title}
      zIndex={zIndex}
      autoCloseOnSelect={autoCloseOnSelect}
      disabledIds={disabledIds}
      isItemDisabled={
        isItemDisabled
          ? (item, type) => (type === 'routine' ? isItemDisabled(item as WorkoutRoutine) : false)
          : undefined
      }
      onSelect={(item, type) => {
        if (type === 'routine') {
          onSelect(item as WorkoutRoutine);
        }
      }}
    />
  );
});
