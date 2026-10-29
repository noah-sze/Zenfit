import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  FoodRecipeBrowser,
  type FoodSelectMode,
} from '@/components/food/FoodRecipeBrowser';
import type { FoodItem, FoodRecipe } from '@/types';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

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
   * 選取項目後是否自動關閉彈窗
   * @default true
   */
  autoCloseOnSelect?: boolean;
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
  autoCloseOnSelect = true,
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

  // 點擊即選擇：觸發觸覺反饋、回傳選中物件並依設定決定是否關閉彈窗
  const handleItemClick = (item: FoodItem | FoodRecipe, type: 'food' | 'recipe') => {
    triggerHaptic('selection');
    onSelect(item, type);
    if (autoCloseOnSelect) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={zIndexClass}
        className={cn(
          zIndexClass,
          'w-[350px] max-w-[calc(100vw-24px)] sm:w-[350px] sm:max-w-[350px] h-[85vh] sm:h-[80vh] flex flex-col p-4 sm:p-5 bg-card border border-border text-card-foreground overflow-hidden select-none shadow-none font-mono text-xs'
        )}
        initialFocus={false}
      >
        {/* 彈窗標頭 (全新設計：左側 ✕ 圓形取消膠囊，中間標題居中，無底欄) */}
        <DialogHeader className="p-0 pb-2 shrink-0">
          <div className="flex items-center justify-between w-full h-7">
            {/* 左側純圖標：取消 (✕) */}
            <DialogClose
              render={
                <button
                  type="button"
                  className="size-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground hover:bg-border transition-all cursor-pointer shrink-0 active:scale-92"
                  title={t('common.cancel')}
                  aria-label={t('common.cancel')}
                />
              }
            >
              <X className="size-3.5 stroke-[2.2]" />
            </DialogClose>

            {/* 中間標題 (置中對稱) */}
            <DialogTitle className="text-foreground text-sm font-semibold tracking-tight font-sans flex items-center justify-center flex-1 truncate px-2 text-center">
              <span className="truncate">{resolvedTitle}</span>
            </DialogTitle>

            {/* 右側佔位（與左側按鈕等寬，確保標題完美居中） */}
            <div className="size-7 shrink-0 pointer-events-none" aria-hidden="true" />
          </div>
        </DialogHeader>

        {/* 核心瀏覽與選擇區 (點擊即選擇，直達底部) */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden pt-1">
          <FoodRecipeBrowser
            mode={mode}
            interactiveMode="select"
            showArchivedOption={allowArchived}
            disabledIds={disabledIds}
            isItemDisabled={isItemDisabled}
            onItemClick={handleItemClick}
            className="flex-1 min-h-0"
            listContainerClassName="flex-1 min-h-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
