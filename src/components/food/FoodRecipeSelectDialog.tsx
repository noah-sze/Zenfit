import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FoodRecipeBrowser,
  type FoodSelectMode,
} from '@/components/food/FoodRecipeBrowser';
import type { FoodItem, FoodRecipe } from '@/types';
import { cn } from '@/lib/utils';

export interface FoodRecipeSelectDialogProps {
  /** 控制彈窗開關 */
  open: boolean;
  /** 彈窗開關狀態變更回調 */
  onOpenChange: (open: boolean) => void;
  /**
   * 選擇模式：
   * - 'all': 同時支援食材與食譜（提供頂部 Tab 切換）
   * - 'foods': 僅選擇食材（隱藏頂部 Tab）
   * - 'recipes': 僅選擇食譜（隱藏頂部 Tab）
   * @default 'all'
   */
  mode?: FoodSelectMode;
  /** 自訂彈窗標題（預設由 i18n 輸出） */
  title?: string;
  /** 選取回調：回傳選中之物件與其領域型別，並自動關閉彈窗 */
  onSelect: (item: FoodItem | FoodRecipe, type: 'food' | 'recipe') => void;
  /**
   * 多層彈窗層級（Rule 4 規範）：
   * 當此彈窗自次級彈窗呼出時（如在 RecipeDetails 編輯彈窗中），
   * 透過傳入 zIndex 自適應提升遮罩與本體層級至 z-[70] 或更高
   * @default 70
   */
  zIndex?: number;
  /** 是否允許選擇已歸檔項目 @default false */
  allowArchived?: boolean;
  /** 禁用的項目 ID 陣列（將反灰顯示且無法點擊選取） */
  disabledIds?: string[];
  /** 自訂項目是否禁用的判斷函數 */
  isItemDisabled?: (item: FoodItem | FoodRecipe, type: 'food' | 'recipe') => boolean;
}

export function FoodRecipeSelectDialog({
  open,
  onOpenChange,
  mode = 'all',
  title,
  onSelect,
  zIndex = 70,
  allowArchived = false,
  disabledIds,
  isItemDisabled,
}: FoodRecipeSelectDialogProps) {
  const { t } = useTranslation();

  const defaultTitle =
    mode === 'foods'
      ? t('diet.ingredientsTab', '食材')
      : mode === 'recipes'
      ? t('diet.recipesTab', '食譜')
      : t('common.select', '選擇');

  const resolvedTitle = title || defaultTitle;

  const zIndexClass = `z-[${zIndex}]`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={zIndexClass}
        className={cn(
          zIndexClass,
          'w-[350px] max-w-[calc(100vw-24px)] sm:w-[350px] sm:max-w-[350px] h-[85vh] sm:h-[80vh] flex flex-col p-4 bg-card border border-border text-card-foreground overflow-hidden select-none'
        )}
        initialFocus={false}
      >
        <DialogHeader className="shrink-0 pb-1">
          <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
            {resolvedTitle}
          </DialogTitle>
        </DialogHeader>

        {/* 核心瀏覽與選擇區 (100% 複用管理介面 UI 與過濾計算) */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden py-1">
          <FoodRecipeBrowser
            mode={mode}
            interactiveMode="select"
            showArchivedOption={allowArchived}
            disabledIds={disabledIds}
            isItemDisabled={isItemDisabled}
            onItemClick={(item, type) => {
              onSelect(item, type);
              onOpenChange(false);
            }}
            className="flex-1 min-h-0"
            listContainerClassName="flex-1 min-h-0"
          />
        </div>

        {/* 底部動作列 (取消按鈕靠左對齊，符合 Rule 4 規範) */}
        <DialogFooter className="flex flex-row items-center justify-between pt-2 shrink-0 border-t border-border/50">
          <DialogClose
            render={
              <Button
                type="button"
                variant="outline"
                className="border-border cursor-pointer text-xs font-mono h-8"
              >
                {t('common.cancel')}
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
