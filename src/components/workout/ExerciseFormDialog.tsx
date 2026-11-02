import { useState, useEffect, useRef, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useEquipments } from '@/hooks/useEquipments';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  MAJOR_MUSCLE_GROUPS,
  PREDEFINED_EQUIPMENT_DEFINITIONS,
} from '@/constants/muscles';
import {
  getMuscleRoleBadgeClasses,
  getMuscleRoleLabel,
  normalizeMuscleRole,
} from '@/utils/muscleIntensity';
import type { EquipmentType, DetailedMuscle, MuscleRole, Exercise } from '@/types';
import { EquipmentFormDialog } from './EquipmentFormDialog';

export interface ExerciseFormData {
  name: string;
  equipment: EquipmentType;
  targetMuscles: Partial<Record<DetailedMuscle, MuscleRole>>;
  notes?: string;
}

export interface ExerciseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Exercise | null;
  onSubmit: (data: ExerciseFormData) => Promise<void> | void;
}

// 扁平化所有細分肌群列表
const ALL_DETAILED_MUSCLES: DetailedMuscle[] = MAJOR_MUSCLE_GROUPS.flatMap(
  (g) => g.detailedMuscles
);

// 經典 3 級運動機能學角色選項
const MUSCLE_ROLES: { role: MuscleRole; nameKey: string }[] = [
  { role: 'primary', nameKey: 'workout.muscleRolePrimary' },
  { role: 'secondary', nameKey: 'workout.muscleRoleSecondary' },
  { role: 'stabilizer', nameKey: 'workout.muscleRoleStabilizer' },
];

/**
 * 領域共用組件：新增與編輯動作表單彈窗
 * 1:1 參考 FoodFormDialog 設計規範：
 * - 嚴格基於 PrecisionDialogContent (Variant D 標頭，✕ 取消 / ✓ 提交)
 * - Vercel Usage List (divide-y divide-border) 分段架構
 * - 膠囊形式之單行輸入框與下拉選單 (h-7 rounded-full)
 * - 經典 3 級運動機能學角色下拉選單 (h-7 rounded-full Select)
 */
export function ExerciseFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: ExerciseFormDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { activeEquipments, addCustomEquipment, getEquipmentDisplayName } = useEquipments();

  const isEdit = Boolean(initialData);

  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<EquipmentType>('barbell');
  const [muscles, setMuscles] = useState<{ muscle: DetailedMuscle; role: MuscleRole }[]>([
    { muscle: 'mid_lower_chest', role: 'primary' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新增自定義器械平級兄弟彈窗
  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);

  // 防丟失：僅在 open 從 false 轉為 true 的瞬間初始化表單狀態
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (!prevOpenRef.current && open) {
      if (initialData) {
        setName(initialData.name || '');
        setEquipment(initialData.equipment || 'barbell');
        const entries = Object.entries(initialData.targetMuscles || {});
        if (entries.length > 0) {
          setMuscles(
            entries.map(([m, r]) => ({
              muscle: m as DetailedMuscle,
              role: normalizeMuscleRole(r),
            }))
          );
        } else {
          setMuscles([{ muscle: 'mid_lower_chest', role: 'primary' }]);
        }
      } else {
        setName('');
        setEquipment(activeEquipments[0]?.id || 'barbell');
        setMuscles([{ muscle: 'mid_lower_chest', role: 'primary' }]);
      }
    }
    prevOpenRef.current = open;
  }, [open, initialData, activeEquipments]);

  // 取得肌群本地化翻譯名稱
  const getMuscleLabel = (muscle: DetailedMuscle): string => {
    const key = `workout.muscle${muscle
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')}`;
    return t(key);
  };

  // 當前已選肌群集合
  const usedMuscles = useMemo(() => new Set(muscles.map((m) => m.muscle)), [muscles]);
  const canAddMoreMuscle = muscles.length < ALL_DETAILED_MUSCLES.length;

  // 新增肌群（線性搜尋第一個未選的肌群，預設為協同肌 secondary）
  const handleAddMuscle = () => {
    const nextMuscle = ALL_DETAILED_MUSCLES.find((m) => !usedMuscles.has(m));
    if (!nextMuscle) {
      toast.show(t('workout.allMusclesAdded', '已包含所有肌群'));
      return;
    }
    triggerHaptic('selection');
    setMuscles([...muscles, { muscle: nextMuscle, role: 'secondary' }]);
  };

  const handleUpdateMuscle = (index: number, newMuscle: DetailedMuscle) => {
    const updated = [...muscles];
    updated[index].muscle = newMuscle;
    setMuscles(updated);
  };

  const handleUpdateRole = (index: number, newRole: MuscleRole) => {
    const updated = [...muscles];
    updated[index].role = newRole;
    setMuscles(updated);
  };

  const handleRemoveMuscle = (index: number) => {
    if (muscles.length <= 1) {
      toast.show(t('workout.atLeastOneMuscle', '至少需設定一個目標肌群'));
      return;
    }
    setMuscles(muscles.filter((_, i) => i !== index));
  };

  const handleCreateCustomEquipment = async (customName: string) => {
    const res = await addCustomEquipment(customName);
    if (res.success && res.equipment) {
      setEquipment(res.equipment.id);
      toast.show(t('common.saved'));
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isAddEquipmentOpen) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmed = name.trim();
    if (!trimmed || muscles.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetMuscles: Partial<Record<DetailedMuscle, MuscleRole>> = {};
      for (const item of muscles) {
        targetMuscles[item.muscle] = item.role;
      }

      await onSubmit({
        name: trimmed,
        equipment,
        targetMuscles,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 器械選項備援清單 (Dexie 初始空時 fallback 至 16 種核心器械)
  const availableEquipments =
    activeEquipments.length > 0
      ? activeEquipments
      : PREDEFINED_EQUIPMENT_DEFINITIONS.map((p) => ({ id: p.id, name: t(p.nameKey) }));

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <PrecisionDialogContent
          title={isEdit ? t('common.edit') : t('common.add')}
          form={formId}
          submitDisabled={!name.trim() || muscles.length === 0 || isSubmitting}
          submitAriaLabel={isEdit ? t('common.save') : t('common.add')}
          cancelAriaLabel={t('common.cancel')}
          overlayClassName="z-[70]"
          className="z-[70] flex flex-col max-h-[85vh] overflow-hidden"
          initialFocus={false}
        >
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="flex-1 min-h-0 flex flex-col pt-3.5 pb-0"
          >
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3.5 pr-0.5">
              {/* 表格段落 1: 基本資訊 (Vercel Usage List) */}
              <div className="space-y-1.5 shrink-0">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground px-0 font-semibold">
                  {t('workout.basicInfo')}
                </div>
                <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm font-sans">
                  {/* 動作名稱行 */}
                  <div className="h-10 px-4 flex items-center justify-between gap-2 bg-card shrink-0">
                    <span className="text-muted-foreground text-xs shrink-0">
                      {t('workout.exerciseName')}
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('workout.exerciseNamePlaceholder', '例如：槓鈴臥推')}
                      className="h-7 px-3 rounded-full border border-border/80 bg-background text-right text-xs font-sans text-foreground font-medium focus:outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-all duration-100 flex-1 max-w-[170px]"
                      maxLength={50}
                    />
                  </div>

                  {/* 所需器械行 */}
                  <div className="h-10 px-4 flex items-center justify-between gap-2 bg-card shrink-0">
                    <span className="text-muted-foreground text-xs shrink-0">
                      {t('workout.equipment')}
                    </span>
                    <Select
                      value={equipment}
                      onValueChange={(val) => {
                        if (val === '__add_custom__') {
                          setIsAddEquipmentOpen(true);
                          return;
                        }
                        if (val) {
                          triggerHaptic('selection');
                          setEquipment(val as EquipmentType);
                        }
                      }}
                    >
                      <SelectTrigger
                        size="custom"
                        iconClassName="size-3 text-muted-foreground/60"
                        className="h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-sans text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-foreground active:scale-95"
                      >
                        <SelectValue className="font-bold text-foreground">
                          {getEquipmentDisplayName(equipment, t)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="end" className="min-w-44 max-h-56 font-mono text-xs">
                        {availableEquipments.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {getEquipmentDisplayName(eq.id, t)}
                          </SelectItem>
                        ))}
                        <SelectItem
                          value="__add_custom__"
                          className="text-xs text-muted-foreground hover:text-foreground font-medium border-t border-border mt-1 pt-1.5 cursor-pointer"
                        >
                          ＋ {t('workout.customEquipment', '自定義器械')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 表格段落 2: 目標肌群 (Vercel Usage List) */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between px-0">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {t('workout.targetMuscles')} ({muscles.length})
                  </div>

                  {/* 微型膠囊按鈕：新增肌群 (1:1 對齊 RecipeFormDialog) */}
                  <button
                    type="button"
                    onClick={handleAddMuscle}
                    disabled={!canAddMoreMuscle}
                    className="h-6 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer text-foreground active:scale-95 select-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="size-3 text-muted-foreground" />
                    <span>{t('common.add')}</span>
                  </button>
                </div>

                {/* 肌群列表卡片 */}
                <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">
                  {muscles.map((item, idx) => {
                    const roleClasses = getMuscleRoleBadgeClasses(item.role);
                    const roleLabel = getMuscleRoleLabel(item.role, t);

                    return (
                      <div
                        key={idx}
                        className="h-11 px-3 flex items-center justify-between gap-1.5 bg-card shrink-0"
                      >
                        {/* 左側：肌群選單 (膠囊風格，佔滿剩餘寬度) */}
                        <div className="flex-1 min-w-0">
                          <Select
                            value={item.muscle}
                            onValueChange={(v) => {
                              if (v) {
                                triggerHaptic('selection');
                                handleUpdateMuscle(idx, v as DetailedMuscle);
                              }
                            }}
                          >
                            <SelectTrigger
                              size="custom"
                              iconClassName="size-3 text-muted-foreground/60 shrink-0"
                              className="h-7 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-sans text-xs flex items-center gap-1 transition-colors cursor-pointer text-foreground active:scale-95 w-full justify-between"
                            >
                              <SelectValue className="font-medium text-foreground truncate text-left">
                                {getMuscleLabel(item.muscle)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-56 font-mono text-xs" align="start">
                              {MAJOR_MUSCLE_GROUPS.map((group) => (
                                <SelectGroup key={group.id}>
                                  <SelectLabel className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                                    {t(`workout.${group.id}`)}
                                  </SelectLabel>
                                  {group.detailedMuscles.map((m) => {
                                    const isUsedByOther = usedMuscles.has(m) && m !== item.muscle;
                                    return (
                                      <SelectItem
                                        key={m}
                                        value={m}
                                        disabled={isUsedByOther}
                                        className={cn(isUsedByOther && 'opacity-40')}
                                      >
                                        <span className="truncate">{getMuscleLabel(m)}</span>
                                        {isUsedByOther && (
                                          <span className="text-[10px] text-muted-foreground ml-auto">
                                            ({t('common.selected', '已選')})
                                          </span>
                                        )}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 中右側：機能學角色下拉選單 (主動肌/協同肌/穩定肌) */}
                        <Select
                          value={item.role}
                          onValueChange={(val) => {
                            if (val) {
                              triggerHaptic('selection');
                              handleUpdateRole(idx, val as MuscleRole);
                            }
                          }}
                        >
                          <SelectTrigger
                            size="custom"
                            iconClassName="size-3 text-current opacity-80 shrink-0"
                            className={cn(
                              'h-7 px-2.5 rounded-full border text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer shrink-0 active:scale-95 select-none',
                              roleClasses.container
                            )}
                          >
                            <SelectValue className="font-semibold text-current truncate">
                              {roleLabel}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent align="end" className="min-w-32 font-mono text-xs">
                            {MUSCLE_ROLES.map(({ role, nameKey }) => {
                              const badgeClasses = getMuscleRoleBadgeClasses(role);
                              return (
                                <SelectItem key={role} value={role}>
                                  <span
                                    className={cn(
                                      'px-1.5 py-0.5 rounded text-[10px] font-mono border',
                                      badgeClasses.container
                                    )}
                                  >
                                    {t(nameKey)}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        {/* 刪除按鈕 (少於等於 1 個時禁用防誤刪並維持幾何對齊防抖) */}
                        <button
                          type="button"
                          disabled={muscles.length <= 1}
                          onClick={() => {
                            triggerHaptic('selection');
                            handleRemoveMuscle(idx);
                          }}
                          className={cn(
                            'size-7 rounded-full flex items-center justify-center transition-colors shrink-0',
                            muscles.length <= 1
                              ? 'opacity-20 cursor-not-allowed text-muted-foreground'
                              : 'text-muted-foreground hover:text-destructive hover:bg-muted cursor-pointer active:scale-95'
                          )}
                          title={t('common.delete')}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </form>
        </PrecisionDialogContent>
      </Dialog>

      {/* 平級兄弟 Dialog：自定義器械 (遵守 Rule 4 扁平兄弟架構) */}
      <EquipmentFormDialog
        open={isAddEquipmentOpen}
        onOpenChange={setIsAddEquipmentOpen}
        onSubmit={handleCreateCustomEquipment}
      />
    </>
  );
}
