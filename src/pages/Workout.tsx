import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useExercises } from '@/hooks/useExercises';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, Trash2, Timer, Dumbbell } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { triggerHaptic } from '@/lib/haptics';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Workout() {
  const { t } = useTranslation();
  const { selectedDate, openAddModal } = useAppStore();
  const {
    workouts,
    deleteWorkout,
    toggleSetCompleted,
    addSetToExercise,
    updateSetValues,
    updateWorkout,
  } = useWorkoutLogs(selectedDate);
  const { exercises } = useExercises();
  const confirm = useConfirm();

  // 休息計時器狀態
  const [restTimerSec, setRestTimerSec] = useState<number | null>(null);
  const [isResting, setIsResting] = useState(false);

  // 新增動作對話框
  const [targetWorkoutId, setTargetWorkoutId] = useState<string | null>(null);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isResting && restTimerSec !== null && restTimerSec > 0) {
      interval = setInterval(() => {
        setRestTimerSec((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (restTimerSec === 0) {
      setIsResting(false);
      triggerHaptic('success');
    }
    return () => clearInterval(interval);
  }, [isResting, restTimerSec]);

  const startRestTimer = (seconds: number) => {
    setRestTimerSec(seconds);
    setIsResting(true);
    triggerHaptic('selection');
  };

  const handleDeleteWorkout = async (id: string, title: string) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${title}?`,
      variant: 'destructive',
    });
    if (ok) {
      await deleteWorkout(id);
    }
  };

  const handleSelectAddExercise = async (exerciseId: string) => {
    if (!targetWorkoutId) return;
    const workout = workouts.find((w) => w.id === targetWorkoutId);
    if (!workout) return;

    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;

    const newExerciseGroup = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      category: ex.category,
      sets: [
        {
          id: Math.random().toString(),
          setNumber: 1,
          weight: 20,
          reps: 10,
          isCompleted: false,
        },
      ],
    };

    await updateWorkout(targetWorkoutId, {
      exercises: [...workout.exercises, newExerciseGroup],
    });

    setIsAddExerciseModalOpen(false);
    triggerHaptic('success');
  };

  return (
    <div className="space-y-4">
      {/* 頂部極簡休息計時器膠囊 */}
      {isResting && (
        <div className="p-3 bg-foreground text-background rounded-lg flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Timer className="size-4 sm:size-5 animate-spin text-background" />
            <span className="text-xs font-mono font-medium">
              {t('workout.restTimer')}: {restTimerSec}s
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsResting(false)}
            className="h-7 text-xs px-2.5 bg-background/20 text-background hover:bg-background/30 border-0 cursor-pointer"
          >
            {t('common.close')}
          </Button>
        </div>
      )}

      {/* 快速開始新訓練按鈕 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-semibold tracking-tight">{t('workout.title')}</h2>
        <Button
          size="sm"
          onClick={() => openAddModal('workout')}
          className="text-xs h-9 px-3 cursor-pointer rounded-lg"
        >
          <Plus className="size-4 mr-1" />
          {t('workout.newWorkout')}
        </Button>
      </div>

      {workouts.length > 0 ? (
        workouts.map((workout) => (
          <Card key={workout.id} className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/40">
              <div>
                <CardTitle className="text-sm font-medium tracking-tight">
                  {workout.title}
                </CardTitle>
                <span className="text-xs font-mono text-muted-foreground">
                  {workout.exercises.length} 動作
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTargetWorkoutId(workout.id);
                    setIsAddExerciseModalOpen(true);
                  }}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Plus className="size-4 mr-1" />
                  {t('workout.addExercise')}
                </Button>
                <button
                  type="button"
                  onClick={() => handleDeleteWorkout(workout.id, workout.title)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {workout.exercises.map((exGroup, exIdx) => (
                <div key={exGroup.exerciseId + exIdx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {exGroup.exerciseName}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => startRestTimer(60)}
                        className="text-xs font-mono px-2 py-0.5 border border-border rounded text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        60s
                      </button>
                      <button
                        type="button"
                        onClick={() => startRestTimer(90)}
                        className="text-xs font-mono px-2 py-0.5 border border-border rounded text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        90s
                      </button>
                    </div>
                  </div>

                  {/* 組數記錄表格 */}
                  <div className="border border-border/60 rounded-lg overflow-hidden divide-y divide-border/40 text-xs">
                    <div className="grid grid-cols-4 px-3 py-2 bg-muted/30 text-xs font-mono uppercase text-muted-foreground">
                      <span>{t('workout.set')}</span>
                      <span>{t('workout.weight')}</span>
                      <span>{t('workout.reps')}</span>
                      <span className="text-right">{t('workout.completed')}</span>
                    </div>

                    {exGroup.sets.map((set, setIdx) => (
                      <div
                        key={set.id || setIdx}
                        className={`grid grid-cols-4 px-3 py-2 items-center transition-colors ${
                          set.isCompleted ? 'bg-muted/40 opacity-75' : 'bg-background'
                        }`}
                      >
                        <span className="font-mono text-xs text-muted-foreground">{setIdx + 1}</span>
                        <div>
                          <Input
                            type="number"
                            value={set.weight || ''}
                            onChange={(e) =>
                              updateSetValues(
                                workout.id,
                                exIdx,
                                setIdx,
                                parseFloat(e.target.value) || 0,
                                set.reps || 0
                              )
                            }
                            className="h-8 w-16 text-sm font-mono px-2"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={set.reps || ''}
                            onChange={(e) =>
                              updateSetValues(
                                workout.id,
                                exIdx,
                                setIdx,
                                set.weight || 0,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="h-8 w-16 text-sm font-mono px-2"
                          />
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => toggleSetCompleted(workout.id, exIdx, setIdx)}
                            className={`size-7 rounded-md border flex items-center justify-center transition-all cursor-pointer ml-auto ${
                              set.isCompleted
                                ? 'bg-foreground border-foreground text-background'
                                : 'border-border bg-background hover:border-foreground/50 text-transparent'
                            }`}
                          >
                            <Check className="size-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSetToExercise(workout.id, exIdx)}
                    className="w-full h-8 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border-dashed"
                  >
                    + {t('workout.addSet')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="border border-border/60 bg-card p-8 text-center space-y-3 rounded-lg">
          <Dumbbell className="size-8 mx-auto text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">{t('common.noData')}</p>
          <Button
            size="sm"
            onClick={() => openAddModal('workout')}
            className="text-xs h-9 px-3 cursor-pointer rounded-lg"
          >
            <Plus className="size-4 mr-1" />
            {t('workout.newWorkout')}
          </Button>
        </Card>
      )}

      {/* 新增動作選擇彈窗 */}
      <Dialog open={isAddExerciseModalOpen} onOpenChange={setIsAddExerciseModalOpen}>
        <DialogContent className="sm:max-w-md p-5 bg-card text-card-foreground border border-border shadow-none rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {t('workout.selectExercise')}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto no-scrollbar space-y-1.5 pt-2">
            {exercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelectAddExercise(ex.id)}
                className="w-full p-2.5 text-left rounded-lg hover:bg-muted/60 border border-transparent hover:border-border transition-colors flex items-center justify-between text-xs cursor-pointer"
              >
                <span className="font-medium text-foreground text-sm">{ex.name}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {t(`workout.${ex.category}`)}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
