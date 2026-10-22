import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Archive, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useEquipments } from '@/hooks/useEquipments';
import { useExercises } from '@/hooks/useExercises';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import type { Equipment } from '@/types';

export default function Equipments() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') === 'archived' ? 'archived' : 'active') as 'active' | 'archived';
  const handleTabChange = (tab: 'active' | 'archived') => {
    triggerHaptic('selection');
    if (tab === 'archived') {
      setSearchParams({ tab: 'archived' });
    } else {
      setSearchParams({});
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const {
    activeEquipments,
    archivedEquipments,
    addCustomEquipment,
    updateEquipment,
    archiveEquipment,
    unarchiveEquipment,
    deleteEquipment,
    getEquipmentDisplayName,
  } = useEquipments();

  const { allExercises } = useExercises();

  // 計算每個器械被多少個動作使用
  const equipmentUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of allExercises) {
      counts[ex.equipment] = (counts[ex.equipment] || 0) + 1;
    }
    return counts;
  }, [allExercises]);

  // 新增器械彈窗
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState('');

  // 編輯器械彈窗
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editEquipmentName, setEditEquipmentName] = useState('');

  const currentList = activeTab === 'archived' ? archivedEquipments : activeEquipments;

  const filteredEquipments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return currentList
      .filter((eq) => {
        const displayName = getEquipmentDisplayName(eq.id, t).toLowerCase();
        if (!q) return true;
        return displayName.includes(q) || eq.name.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const nameA = getEquipmentDisplayName(a.id, t);
        const nameB = getEquipmentDisplayName(b.id, t);
        return nameA.localeCompare(nameB);
      });
  }, [currentList, searchQuery, getEquipmentDisplayName, t]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipmentName.trim()) {
      toast.show(t('common.required'));
      return;
    }

    const res = await addCustomEquipment(newEquipmentName.trim());
    if (!res.success) {
      toast.show(t('common.error'));
      return;
    }

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsAddOpen(false);
    setNewEquipmentName('');
  };

  const handleOpenEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setEditEquipmentName(eq.name);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment || !editEquipmentName.trim()) return;

    const res = await updateEquipment(editingEquipment.id, editEquipmentName.trim());
    if (!res.success) {
      toast.show(t('common.error'));
      return;
    }

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditOpen(false);
    setEditingEquipment(null);
  };

  const handleArchive = async (eq: Equipment) => {
    const ok = await confirm({
      title: t('common.archive'),
      description: `${t('common.confirm')} ${t('common.archive')} ${eq.name}?`,
    });
    if (!ok) return;

    await archiveEquipment(eq.id);
    triggerHaptic('selection');
    toast.show(t('common.saved'));
  };

  const handleUnarchive = async (eq: Equipment) => {
    await unarchiveEquipment(eq.id);
    triggerHaptic('selection');
    toast.show(t('common.saved'));
  };

  const handleDelete = async (eq: Equipment) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${t('common.delete')} ${eq.name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

    const res = await deleteEquipment(eq.id);
    if (!res.success) {
      if (res.reason === 'has_exercises') {
        toast.show('已有動作使用此器械，無法直接刪除，建議封存');
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
      {/* 頂部 Tab 欄 (使用中 / 已歸檔) */}
      <SegmentedControl<'active' | 'archived'>
        value={activeTab}
        onChange={handleTabChange}
        fullWidth
        options={[
          { value: 'active', label: t('common.active') },
          { value: 'archived', label: t('common.archived') },
        ]}
      />

      {/* 搜尋與新增按鈕 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="pl-9 h-10 bg-card border-border font-mono text-sm"
          />
        </div>
        {activeTab === 'active' && (
          <Button
            onClick={() => {
              setNewEquipmentName('');
              setIsAddOpen(true);
            }}
            size="icon"
            className="size-10 shrink-0 bg-foreground text-background hover:opacity-90 cursor-pointer"
            title={t('common.add')}
            aria-label={t('common.add')}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </div>

      {/* 狀態列：計數顯示 */}
      <div className="flex items-center justify-between px-1 text-xs font-mono text-muted-foreground">
        <span>
          {activeTab === 'active'
            ? t('settings.activeCount', { count: filteredEquipments.length })
            : t('settings.archivedCount', { count: filteredEquipments.length })}
        </span>
      </div>

      {/* 器械列表 (Usage List 佈局，無陰影，純邊框) */}
      <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
        {filteredEquipments.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-muted-foreground">
            {t('common.noData')}
          </div>
        ) : (
          filteredEquipments.map((eq) => {
            const usage = equipmentUsageCount[eq.id] || 0;
            const displayName = getEquipmentDisplayName(eq.id, t);
            return (
              <div
                key={eq.id}
                className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors group"
              >
                <div className="space-y-1 pr-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {displayName}
                    </span>
                    {eq.isCustom ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground shrink-0">
                        {t('settings.customFoods')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground shrink-0">
                        {t('settings.systemPreset')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    <span>{usage} 個動作關聯</span>
                  </div>
                </div>

                {activeTab === 'active' ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {eq.isCustom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(eq)}
                        className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchive(eq)}
                      className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={t('common.archive')}
                      aria-label={t('common.archive')}
                    >
                      <Archive className="size-3.5" />
                    </Button>
                    {eq.isCustom && usage === 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(eq)}
                        className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUnarchive(eq)}
                      className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={t('common.restore')}
                      aria-label={t('common.restore')}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                    {eq.isCustom && usage === 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(eq)}
                        className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 新增自定義器械彈窗 (Instant Pop, 左取消右確認) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md w-full bg-card p-6 border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-tight">
              新增自定義器械
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                器械名稱
              </Label>
              <Input
                value={newEquipmentName}
                onChange={(e) => setNewEquipmentName(e.target.value)}
                placeholder="例如: 安全深蹲槓 SSB、鐘擺深蹲機"
                className="font-mono text-sm"
              />
            </div>

            <DialogFooter className="flex flex-row items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-foreground text-background hover:opacity-90 cursor-pointer"
              >
                {t('common.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 編輯自定義器械彈窗 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md w-full bg-card p-6 border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-tight">
              編輯器械名稱
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                器械名稱
              </Label>
              <Input
                value={editEquipmentName}
                onChange={(e) => setEditEquipmentName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <DialogFooter className="flex flex-row items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-foreground text-background hover:opacity-90 cursor-pointer"
              >
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
