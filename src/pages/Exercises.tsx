import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { Exercise, WorkoutRoutine, Equipment } from '@/types';
import {
  WorkoutManagementBrowser,
  type WorkoutTab,
} from '@/components/workout/WorkoutManagementBrowser';
import {
  ExerciseFormDialog,
  type ExerciseFormData,
} from '@/components/workout/ExerciseFormDialog';
import {
  RoutineFormDialog,
  type RoutineFormData,
} from '@/components/workout/RoutineFormDialog';
import { EquipmentFormDialog } from '@/components/workout/EquipmentFormDialog';

export default function Exercises() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // 頂部視圖切換：動作 ➔ 組合 ➔ 器械 (純本地狀態，不污染 URL 歷史堆疊，遵守 Rule 4)
  const [viewTab, setViewTab] = useState<WorkoutTab>('exercises');

  // 1. 動作資料庫 Hooks
  const {
    addExercise,
    unarchiveExercise,
    deleteExercise,
  } = useExercises();

  // 2. 組合資料庫 Hooks
  const {
    addRoutine,
    unarchiveRoutine,
    deleteRoutine,
  } = useRoutines();

  // 3. 器械資料庫 Hooks
  const {
    addCustomEquipment,
    updateEquipment,
    archiveEquipment,
    unarchiveEquipment,
    deleteEquipment,
  } = useEquipments();

  // 彈窗狀態
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [isAddRoutineOpen, setIsAddRoutineOpen] = useState(false);
  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // Header Portal 錨點
  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderActionEl(document.getElementById('subpage-header-action'));
  }, []);

  // 點擊頂部標頭「+」按鈕
  const handleOpenAdd = () => {
    triggerHaptic('selection');
    if (viewTab === 'exercises') {
      setIsAddExerciseOpen(true);
    } else if (viewTab === 'routines') {
      setIsAddRoutineOpen(true);
    } else {
      setIsAddEquipmentOpen(true);
    }
  };

  // ==========================================
  // 動作操作 Handlers
  // ==========================================
  const handleAddExerciseSubmit = async (formData: ExerciseFormData) => {
    try {
      await addExercise({
        ...formData,
        isCustom: true,
      });
      triggerHaptic('success');
      toast.show(t('common.saved'));
      setIsAddExerciseOpen(false);
    } catch {
      toast.show(t('common.error'));
    }
  };

  const handleDeleteExercise = async (exercise: Exercise) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${exercise.name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

    const res = await deleteExercise(exercise.id);
    if (!res.success) {
      if (res.reason === 'has_logs') {
        toast.show(t('workout.exerciseHasLogs', '該動作已有訓練記錄，無法刪除'));
      } else if (res.reason === 'has_routines') {
        toast.show(t('workout.exerciseHasRoutines', '該動作已被訓練組合引用，無法刪除'));
      } else {
        toast.show(t('common.error'));
      }
      return;
    }

    triggerHaptic('warning');
    toast.show(t('common.deleted'));
  };

  const handleUnarchiveExercise = async (exercise: Exercise) => {
    await unarchiveExercise(exercise.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess', '已取消歸檔'));
  };

  // ==========================================
  // 組合操作 Handlers
  // ==========================================
  const handleAddRoutineSubmit = async (formData: RoutineFormData) => {
    try {
      await addRoutine({
        ...formData,
        isCustom: true,
      });
      triggerHaptic('success');
      toast.show(t('common.saved'));
      setIsAddRoutineOpen(false);
    } catch {
      toast.show(t('common.error'));
    }
  };

  const handleDeleteRoutine = async (routine: WorkoutRoutine) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${routine.name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

    await deleteRoutine(routine.id);
    triggerHaptic('warning');
    toast.show(t('common.deleted'));
  };

  const handleUnarchiveRoutine = async (routine: WorkoutRoutine) => {
    await unarchiveRoutine(routine.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess', '已取消歸檔'));
  };

  // ==========================================
  // 器械操作 Handlers
  // ==========================================
  const handleAddEquipmentSubmit = async (name: string) => {
    const res = await addCustomEquipment(name);
    if (res.success) {
      triggerHaptic('success');
      toast.show(t('common.saved'));
      setIsAddEquipmentOpen(false);
    } else {
      toast.show(t('common.error'));
    }
  };

  const handleEditEquipmentSubmit = async (name: string) => {
    if (!editingEquipment) return;
    const res = await updateEquipment(editingEquipment.id, name);
    if (res.success) {
      triggerHaptic('success');
      toast.show(t('common.saved'));
      setEditingEquipment(null);
    } else {
      toast.show(t('common.error'));
    }
  };

  const handleArchiveEquipment = async (equipment: Equipment) => {
    const ok = await confirm({
      title: t('common.archive'),
      description: `${t('common.confirm')} ${equipment.name}?`,
    });
    if (!ok) return;

    try {
      await archiveEquipment(equipment.id);
      triggerHaptic('warning');
      toast.show(t('common.archivedSuccess', '已歸檔'));
    } catch {
      toast.show(t('common.error'));
    }
  };

  const handleUnarchiveEquipment = async (equipment: Equipment) => {
    try {
      await unarchiveEquipment(equipment.id);
      triggerHaptic('selection');
      toast.show(t('settings.unarchivedSuccess', '已取消歸檔'));
    } catch {
      toast.show(t('common.error'));
    }
  };

  const handleDeleteEquipment = async (equipment: Equipment) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${equipment.name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

    const res = await deleteEquipment(equipment.id);
    if (res.success) {
      triggerHaptic('warning');
      toast.show(t('common.deleted'));
    } else {
      if (res.reason === 'has_exercises') {
        toast.show(t('workout.equipmentHasExercises', '已有動作關聯此器械，無法刪除'));
      } else {
        toast.show(t('common.error'));
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* 頂部操作按鈕 (Portal 映射至 AppLayout 頂部標頭右側) */}
      {headerActionEl &&
        createPortal(
          <Button
            size="icon"
            variant="ghost"
            onClick={handleOpenAdd}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title={t('common.add')}
            aria-label={t('common.add')}
          >
            <Plus className="h-5 w-5" />
          </Button>,
          headerActionEl
        )}

      {/* 核心訓練資料管理瀏覽器 */}
      <WorkoutManagementBrowser
        activeTab={viewTab}
        onTabChange={setViewTab}
        onExerciseClick={(exercise) => {
          navigate(`/settings/exercises/${exercise.id}`);
        }}
        onRoutineClick={(routine) => {
          navigate(`/settings/routines/${routine.id}`);
        }}
        onEditEquipment={(equipment) => {
          setEditingEquipment(equipment);
        }}
        onDeleteExercise={handleDeleteExercise}
        onUnarchiveExercise={handleUnarchiveExercise}
        onDeleteRoutine={handleDeleteRoutine}
        onUnarchiveRoutine={handleUnarchiveRoutine}
        onArchiveEquipment={handleArchiveEquipment}
        onUnarchiveEquipment={handleUnarchiveEquipment}
        onDeleteEquipment={handleDeleteEquipment}
      />

      {/* ========================================================================= */}
      {/* 彈窗區域：平鋪兄弟節點 (No Nested Dialogs, Instant Pop) */}
      {/* ========================================================================= */}

      {/* 新增動作 Dialog */}
      <ExerciseFormDialog
        open={isAddExerciseOpen}
        onOpenChange={setIsAddExerciseOpen}
        onSubmit={handleAddExerciseSubmit}
      />

      {/* 新增組合 Dialog */}
      <RoutineFormDialog
        open={isAddRoutineOpen}
        onOpenChange={setIsAddRoutineOpen}
        onSubmit={handleAddRoutineSubmit}
      />

      {/* 新增器械 Dialog */}
      <EquipmentFormDialog
        open={isAddEquipmentOpen}
        onOpenChange={setIsAddEquipmentOpen}
        onSubmit={handleAddEquipmentSubmit}
      />

      {/* 編輯器械 Dialog */}
      <EquipmentFormDialog
        open={Boolean(editingEquipment)}
        onOpenChange={(open) => !open && setEditingEquipment(null)}
        equipment={editingEquipment}
        onSubmit={handleEditEquipmentSubmit}
      />
    </div>
  );
}
