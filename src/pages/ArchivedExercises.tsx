import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExercises } from '@/hooks/useExercises';
import { useEquipments } from '@/hooks/useEquipments';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';
import type { DetailedMuscle } from '@/types';

export default function ArchivedExercises() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { archivedCustomExercises, archivedPresetExercises, unarchiveExercise } = useExercises();
  const { getEquipmentDisplayName } = useEquipments();

  const [activeTab, setActiveTab] = useState<'custom' | 'preset'>('custom');
  const filtered = activeTab === 'custom' ? archivedCustomExercises : archivedPresetExercises;

  const handleUnarchive = async (id: string) => {
    await unarchiveExercise(id);
    triggerHaptic('selection');
    toast.show(t('common.saved'));
  };

  const getMuscleLabel = (muscle: DetailedMuscle) => {
    const key = `workout.muscle${muscle.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    return t(key);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20">
      <SegmentedControl<'custom' | 'preset'>
        value={activeTab}
        onChange={setActiveTab}
        fullWidth
        options={[
          {
            value: 'custom',
            label: t('settings.customFoods'),
          },
          {
            value: 'preset',
            label: t('settings.presetFoods'),
          },
        ]}
      />

      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-muted-foreground">
            {t('workout.noArchivedExercises')}
          </div>
        ) : (
          filtered.map((exercise) => {
            const muscleEntries = Object.entries(exercise.targetMuscles || {}) as [DetailedMuscle, number][];
            return (
              <div
                key={exercise.id}
                className="flex items-center justify-between p-3.5 pl-4 group hover:bg-muted/30 transition-colors"
              >
                <button
                  type="button"
                  className="flex-1 flex flex-col justify-center text-left cursor-pointer min-w-0 select-none space-y-1"
                  onClick={() => navigate(`/settings/exercises/${exercise.id}`)}
                >
                  <span className="font-medium text-sm text-foreground hover:underline truncate">
                    {exercise.name}
                  </span>
                  <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>{getEquipmentDisplayName(exercise.equipment, t)}</span>
                    {muscleEntries.slice(0, 2).map(([m, intensity]) => (
                      <span key={m} className="px-1 py-0.2 bg-muted/40 rounded text-[10px]">
                        {getMuscleLabel(m)} {intensity}
                      </span>
                    ))}
                  </div>
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-mono opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                  onClick={() => handleUnarchive(exercise.id)}
                >
                  <RefreshCcw className="size-3.5 mr-1" />
                  {t('common.unarchive')}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
