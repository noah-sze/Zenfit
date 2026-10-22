import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  Archive,
  ChevronDown,
  RefreshCcw,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFoods } from '@/hooks/useFoods';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FoodItem, FoodCategory } from '@/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function Categories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // 食物原子庫 Hooks
  const {
    customFoods,
    presetFoods,
    archivedCustomFoods,
    archivedPresetFoods,
    addFood,
    updateFood,
    archiveFood,
    unarchiveFood,
    deleteFood,
  } = useFoods();

  const [activeTab, setActiveTab] = useState<'custom' | 'preset'>('custom');
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived'>('active');
  const [selectedCategory, setSelectedCategory] = useState<'all' | FoodCategory>('all');

  // 單品新增狀態
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<FoodCategory>('natural');
  const [newBrand, setNewBrand] = useState('');
  const [newServingSize, setNewServingSize] = useState('100');
  const [newServingUnit, setNewServingUnit] = useState('g');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');

  // 單品編輯狀態
  const [isEditFoodOpen, setIsEditFoodOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<FoodCategory>('natural');
  const [editBrand, setEditBrand] = useState('');
  const [editServingSize, setEditServingSize] = useState('100');
  const [editServingUnit, setEditServingUnit] = useState('g');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');

  const handleTabChange = (tab: 'custom' | 'preset') => {
    triggerHaptic('selection');
    setActiveTab(tab);
    setFilterStatus('active');
  };

  // 當前食物列表 (支援分類過濾)
  const currentFoods = useMemo(() => {
    let list: FoodItem[] = [];
    if (activeTab === 'custom') {
      list = filterStatus === 'archived' ? archivedCustomFoods : customFoods;
    } else {
      list = filterStatus === 'archived' ? archivedPresetFoods : presetFoods;
    }
    if (selectedCategory !== 'all') {
      list = list.filter((item) => (item.category || 'natural') === selectedCategory);
    }
    return list;
  }, [activeTab, filterStatus, selectedCategory, customFoods, presetFoods, archivedCustomFoods, archivedPresetFoods]);

  // 單品編輯與處理
  const handleOpenEditFood = (food: FoodItem) => {
    setEditingFood(food);
    setEditName(food.name);
    setEditCategory(food.category || 'natural');
    setEditBrand(food.brand || '');
    setEditServingSize(String(food.servingSize || 100));
    setEditServingUnit(food.servingUnit || 'g');
    setEditCalories(String(food.calories || 0));
    setEditProtein(String(food.protein || 0));
    setEditCarbs(String(food.carbs || 0));
    setEditFat(String(food.fat || 0));
    setIsEditFoodOpen(true);
  };

  const handleEditFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFood || !editName.trim()) return;

    await updateFood(editingFood.id, {
      name: editName.trim(),
      category: editCategory,
      brand: editBrand.trim() || undefined,
      servingSize: parseFloat(editServingSize) || 100,
      servingUnit: editServingUnit.trim() || 'g',
      calories: parseFloat(editCalories) || 0,
      protein: parseFloat(editProtein) || 0,
      carbs: parseFloat(editCarbs) || 0,
      fat: parseFloat(editFat) || 0,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsEditFoodOpen(false);
    setEditingFood(null);
  };

  const handleDeleteFood = async (food: FoodItem) => {
    const isOk = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${food.name}?`,
      variant: 'destructive',
    });
    if (!isOk) return;

    const res = await deleteFood(food.id);
    if (!res.success) {
      if (res.reason === 'has_logs') {
        toast.show(t('settings.foodHasLogsCannotDelete'));
      } else {
        toast.show(t('common.error'));
      }
      return;
    }
    triggerHaptic('warning');
    toast.show(t('common.deleted', '已刪除'));
  };

  const handleArchiveFood = async (food: FoodItem) => {
    await archiveFood(food.id);
    triggerHaptic('selection');
    toast.show(t('settings.archivedSuccess', '已歸檔'));
  };

  const handleUnarchiveFood = async (food: FoodItem) => {
    await unarchiveFood(food.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess', '已取消歸檔'));
  };

  const handleAddFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await addFood({
      name: newName.trim(),
      category: newCategory,
      brand: newBrand.trim() || undefined,
      servingSize: parseFloat(newServingSize) || 100,
      servingUnit: newServingUnit.trim() || 'g',
      calories: parseFloat(newCalories) || 0,
      protein: parseFloat(newProtein) || 0,
      carbs: parseFloat(newCarbs) || 0,
      fat: parseFloat(newFat) || 0,
      isCustom: true,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setNewName('');
    setNewCategory('natural');
    setNewBrand('');
    setNewServingSize('100');
    setNewServingUnit('g');
    setNewCalories('');
    setNewProtein('');
    setNewCarbs('');
    setNewFat('');
    setIsAddFoodOpen(false);
  };

  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderActionEl(document.getElementById('subpage-header-action'));
  }, []);

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20">
      {/* 頂部操作按鈕 (Portal 映射至 AppLayout 頂部標頭右側) */}
      {headerActionEl &&
        filterStatus === 'active' &&
        activeTab === 'custom' &&
        createPortal(
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsAddFoodOpen(true)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title={t('settings.addCustomFood')}
            aria-label={t('settings.addCustomFood')}
          >
            <Plus className="h-5 w-5" />
          </Button>,
          headerActionEl
        )}

      {/* 雙向篩選選單 (自訂 vs 預設 / 使用中 vs 已歸檔) */}
      <SegmentedControl<'custom' | 'preset'>
        value={activeTab}
        onChange={handleTabChange}
        fullWidth
        options={[
          {
            value: 'custom',
            label: (
              <span className="flex items-center gap-1">
                <span>
                  {activeTab === 'custom' && filterStatus === 'archived'
                    ? t('settings.archived')
                    : t('settings.customFoods')}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </span>
            ),
            dropdown: (
              <DropdownMenuContent align="start" sideOffset={6} className="min-w-[130px]">
                <DropdownMenuItem
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setFilterStatus('active')}
                >
                  <span>{t('settings.customFoods')}</span>
                  {filterStatus === 'active' && activeTab === 'custom' && (
                    <Check className="h-3.5 w-3.5 ml-2" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setFilterStatus('archived')}
                >
                  <span>{t('settings.archived')}</span>
                  {filterStatus === 'archived' && activeTab === 'custom' && (
                    <Check className="h-3.5 w-3.5 ml-2" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            ),
          },
          {
            value: 'preset',
            label: (
              <span className="flex items-center gap-1">
                <span>
                  {activeTab === 'preset' && filterStatus === 'archived'
                    ? t('settings.archived')
                    : t('settings.presetFoods')}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </span>
            ),
            dropdown: (
              <DropdownMenuContent align="end" sideOffset={6} className="min-w-[130px]">
                <DropdownMenuItem
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setFilterStatus('active')}
                >
                  <span>{t('settings.presetFoods')}</span>
                  {filterStatus === 'active' && activeTab === 'preset' && (
                    <Check className="h-3.5 w-3.5 ml-2" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setFilterStatus('archived')}
                >
                  <span>{t('settings.archived')}</span>
                  {filterStatus === 'archived' && activeTab === 'preset' && (
                    <Check className="h-3.5 w-3.5 ml-2" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            ),
          },
        ]}
      />

      {/* 分類篩選與數量統計 */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-mono text-muted-foreground">
          {t('diet.foodsCount', { count: currentFoods.length })}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1 px-2 border border-border/60 bg-card rounded"
              >
                <span>
                  {selectedCategory === 'all'
                    ? t('diet.foodCategory.all')
                    : t(`diet.foodCategory.${selectedCategory}`)}
                </span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-[140px]">
            <DropdownMenuItem
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setSelectedCategory('all')}
            >
              <span>{t('diet.foodCategory.all')}</span>
              {selectedCategory === 'all' && <Check className="h-3.5 w-3.5 ml-2" />}
            </DropdownMenuItem>
            {(['natural', 'processed', 'oil', 'condiment'] as FoodCategory[]).map((cat) => (
              <DropdownMenuItem
                key={cat}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setSelectedCategory(cat)}
              >
                <span>{t(`diet.foodCategory.${cat}`)}</span>
                {selectedCategory === cat && <Check className="h-3.5 w-3.5 ml-2" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 單品食材清單容器 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {currentFoods.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {filterStatus === 'archived'
                ? t('settings.noArchivedFoods')
                : t('settings.noCustomFoods')}
            </div>
          ) : (
            currentFoods.map((food) => (
              <div
                key={food.id}
                className="h-14 flex items-stretch justify-between transition-colors hover:bg-muted/40 group"
              >
                {filterStatus === 'archived' ? (
                  <>
                    <button
                      type="button"
                      className="flex-1 flex flex-col justify-center h-full pl-4 pr-2 text-left font-medium text-sm text-muted-foreground cursor-pointer min-w-0 select-none"
                      onClick={() => navigate(`/settings/foods/${food.id}`)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{food.name}</span>
                        <span className="text-[10px] font-mono border border-border px-1 py-0.2 rounded text-muted-foreground/80 shrink-0 leading-normal">
                          {t(`diet.foodCategory.${food.category || 'natural'}`)}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground/70 truncate">
                        {food.calories} kcal · {food.servingSize} {food.servingUnit}
                      </span>
                    </button>
                    <div className="flex items-center h-full pr-3 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-primary opacity-90 hover:opacity-100 cursor-pointer"
                        onClick={() => handleUnarchiveFood(food)}
                      >
                        <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                        {t('settings.unarchive')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex-1 flex flex-col justify-center h-full pl-4 pr-2 text-left font-medium text-sm cursor-pointer min-w-0 select-none"
                      onClick={() => navigate(`/settings/foods/${food.id}`)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-foreground font-medium">{food.name}</span>
                        <span className="text-[10px] font-mono border border-border px-1 py-0.2 rounded text-muted-foreground shrink-0 leading-normal">
                          {t(`diet.foodCategory.${food.category || 'natural'}`)}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground truncate">
                        {food.calories} kcal · {food.servingSize} {food.servingUnit}
                        {food.brand ? ` · ${food.brand}` : ''}
                      </span>
                    </button>

                    <div className="flex items-center h-full pr-3 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-[160px]">
                          {food.isCustom && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleOpenEditFood(food)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleArchiveFood(food)}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            {t('settings.archive')}
                          </DropdownMenuItem>

                          {food.isCustom && (
                            <DropdownMenuItem
                              className={cn(
                                "text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                              )}
                              onClick={() => handleDeleteFood(food)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 新增單品食物 Dialog */}
      <Dialog open={isAddFoodOpen} onOpenChange={setIsAddFoodOpen}>
        <DialogContent
          overlayClassName="z-[70]"
          className="z-[70] w-[360px] max-w-[calc(100vw-32px)] sm:w-[380px] sm:max-w-[380px] bg-card border border-border text-card-foreground p-5"
        >
          <DialogHeader>
            <DialogTitle className="text-card-foreground text-base font-semibold">
              {t('settings.addCustomFood')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddFoodSubmit} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('diet.foodName')}
              </Label>
              <Input
                placeholder={t('diet.foodNamePlaceholder')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('diet.foodCategory.title')}
              </Label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as FoodCategory)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="natural">{t('diet.foodCategory.natural')}</option>
                <option value="processed">{t('diet.foodCategory.processed')}</option>
                <option value="oil">{t('diet.foodCategory.oil')}</option>
                <option value="condiment">{t('diet.foodCategory.condiment')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('diet.brandOptional')}
              </Label>
              <Input
                placeholder={t('diet.brandPlaceholder')}
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.serving')}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="100"
                  value={newServingSize}
                  onChange={(e) => setNewServingSize(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.unit')}
                </Label>
                <Input
                  placeholder="g 或 ml"
                  value={newServingUnit}
                  onChange={(e) => setNewServingUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.calories')} (kcal)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={newCalories}
                  onChange={(e) => setNewCalories(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.protein')} (g)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={newProtein}
                  onChange={(e) => setNewProtein(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.carbs')} (g)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={newCarbs}
                  onChange={(e) => setNewCarbs(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.fat')} (g)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={newFat}
                  onChange={(e) => setNewFat(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3">
              <DialogClose render={<Button type="button" variant="outline" className="border-border cursor-pointer" />}>
                {t('common.cancel')}
              </DialogClose>
              <Button type="submit" disabled={!newName.trim()} className="cursor-pointer">
                {t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 編輯單品食物 Dialog */}
      <Dialog
        open={isEditFoodOpen}
        onOpenChange={(open) => {
          setIsEditFoodOpen(open);
          if (!open) setEditingFood(null);
        }}
      >
        <DialogContent
          overlayClassName="z-[70]"
          className="z-[70] w-[360px] max-w-[calc(100vw-32px)] sm:w-[380px] sm:max-w-[380px] bg-card border border-border text-card-foreground p-5"
        >
          <DialogHeader>
            <DialogTitle className="text-card-foreground text-base font-semibold">
              {t('settings.editCustomFood')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditFoodSubmit} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('diet.foodName')}
              </Label>
              <Input
                placeholder={t('diet.foodNamePlaceholder')}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('diet.foodCategory.title')}
              </Label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as FoodCategory)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="natural">{t('diet.foodCategory.natural')}</option>
                <option value="processed">{t('diet.foodCategory.processed')}</option>
                <option value="oil">{t('diet.foodCategory.oil')}</option>
                <option value="condiment">{t('diet.foodCategory.condiment')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('diet.brandOptional')}
              </Label>
              <Input
                placeholder={t('diet.brandPlaceholder')}
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.serving')}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="100"
                  value={editServingSize}
                  onChange={(e) => setEditServingSize(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.unit')}
                </Label>
                <Input
                  placeholder="g 或 ml"
                  value={editServingUnit}
                  onChange={(e) => setEditServingUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.calories')} (kcal)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={editCalories}
                  onChange={(e) => setEditCalories(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.protein')} (g)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={editProtein}
                  onChange={(e) => setEditProtein(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.carbs')} (g)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={editCarbs}
                  onChange={(e) => setEditCarbs(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('diet.fat')} (g)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={editFat}
                  onChange={(e) => setEditFat(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3">
              <DialogClose render={<Button type="button" variant="outline" className="border-border cursor-pointer" />}>
                {t('common.cancel')}
              </DialogClose>
              <Button type="submit" disabled={!editName.trim()} className="cursor-pointer">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
