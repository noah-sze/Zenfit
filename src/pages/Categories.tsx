import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFoods } from '@/hooks/useFoods';
import { useRecipes } from '@/hooks/useRecipes';
import type { FoodItem, FoodRecipe } from '@/types';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { FoodFormDialog, type FoodFormData } from '@/components/food/FoodFormDialog';
import { RecipeFormDialog, type RecipeFormData } from '@/components/food/RecipeFormDialog';
import { FoodRecipeBrowser } from '@/components/food/FoodRecipeBrowser';

export default function Categories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // 頂部視圖切換：食材 vs 食譜 (純本地狀態，不污染 URL，遵守 Rule 4)
  const [viewTab, setViewTab] = useState<'foods' | 'recipes'>('foods');

  // 食物原子庫 (Foods)
  const {
    addFood,
    unarchiveFood,
    deleteFood,
  } = useFoods();

  // 單品新增彈窗狀態
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);

  // 食譜庫
  const {
    addRecipe,
    unarchiveRecipe,
    deleteRecipe,
  } = useRecipes();

  // 食譜彈窗狀態
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);

  const handleOpenAddRecipe = () => {
    setIsRecipeDialogOpen(true);
  };

  const handleAddRecipeSubmit = async (formData: RecipeFormData) => {
    await addRecipe({
      ...formData,
      isCustom: true,
    });
    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsRecipeDialogOpen(false);
  };

  const handleDeleteRecipe = async (recipe: FoodRecipe) => {
    const isOk = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${recipe.name}?`,
      variant: 'destructive',
    });
    if (!isOk) return;

    await deleteRecipe(recipe.id);
    triggerHaptic('warning');
    toast.show(t('common.deleted'));
  };

  const handleUnarchiveRecipe = async (recipe: FoodRecipe) => {
    await unarchiveRecipe(recipe.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess'));
  };

  // ==========================================
  // 食物 Handlers
  // ==========================================
  const handleAddFoodSubmit = async (formData: FoodFormData) => {
    await addFood({
      ...formData,
      isCustom: true,
    });

    triggerHaptic('success');
    toast.show(t('common.saved'));
    setIsAddFoodOpen(false);
  };

  const handleDeleteFood = async (food: FoodItem) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${food.name}?`,
      variant: 'destructive',
    });
    if (!ok) return;

    const res = await deleteFood(food.id);
    if (!res.success) {
      if (res.reason === 'has_logs') {
        toast.show(t('settings.foodHasLogsCannotDelete'));
      } else if (res.reason === 'has_recipes') {
        toast.show(t('diet.foodHasRecipes', '已被菜餚引用'));
      } else {
        toast.show(t('common.error'));
      }
      return;
    }
    triggerHaptic('warning');
    toast.show(t('common.deleted'));
  };

  const handleUnarchiveFood = async (food: FoodItem) => {
    await unarchiveFood(food.id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess'));
  };

  // Header Portal 錨點
  const [headerActionEl, setHeaderActionEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderActionEl(document.getElementById('subpage-header-action'));
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* 頂部操作按鈕 (Portal 映射至 AppLayout 頂部標頭右側，依當前 Tab 動態映射) */}
      {headerActionEl &&
        createPortal(
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (viewTab === 'foods') {
                setIsAddFoodOpen(true);
              } else {
                handleOpenAddRecipe();
              }
            }}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title={viewTab === 'foods' ? t('settings.addCustomFood') : t('diet.addRecipe')}
            aria-label={viewTab === 'foods' ? t('settings.addCustomFood') : t('diet.addRecipe')}
          >
            <Plus className="h-5 w-5" />
          </Button>,
          headerActionEl
        )}

      {/* 核心食物與食譜管理瀏覽器 (100% 複用共用元件) */}
      <FoodRecipeBrowser
        mode="all"
        activeTab={viewTab}
        onTabChange={setViewTab}
        interactiveMode="manage"
        showArchivedOption={true}
        onItemClick={(item, type) => {
          if (type === 'food') {
            navigate(`/settings/foods/${item.id}`);
          } else {
            navigate(`/settings/recipes/${item.id}`);
          }
        }}
        onDeleteFood={handleDeleteFood}
        onUnarchiveFood={handleUnarchiveFood}
        onDeleteRecipe={handleDeleteRecipe}
        onUnarchiveRecipe={handleUnarchiveRecipe}
      />

      {/* ========================================================================= */}
      {/* 彈窗區域：平鋪兄弟節點聲明 (No Nested Dialogs, Instant Pop) */}
      {/* ========================================================================= */}

      {/* 新增單品食物 Dialog */}
      <FoodFormDialog
        open={isAddFoodOpen}
        onOpenChange={setIsAddFoodOpen}
        onSubmit={handleAddFoodSubmit}
      />

      {/* 新增食譜 Dialog */}
      <RecipeFormDialog
        open={isRecipeDialogOpen}
        onOpenChange={setIsRecipeDialogOpen}
        onSubmit={handleAddRecipeSubmit}
      />
    </div>
  );
}
