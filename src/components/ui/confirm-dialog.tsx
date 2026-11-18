import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Archive } from 'lucide-react';
import { Dialog, PrecisionDialogContent } from '@/components/ui/dialog';
import { HoldToDeleteButton } from '@/components/ui/HoldToDeleteButton';
import { cn } from '@/lib/utils';

export interface ArchiveConfirmSpec {
  /** 左側標籤（如：食物、食譜、動作、組合、器械） */
  entityLabel: string;
  /** 右側目標對象名稱（維持正常字重 font-normal，不加粗） */
  itemName: string;
  /** 選填：關聯剔除區塊標題（如：同步自食譜剔除 / 同步自組合剔除） */
  affectedLabel?: string;
  /** 選填：受影響的食譜或組合名稱清單；為空時僅顯示基本雙行規格卡 */
  affectedItems?: string[];
}

export interface ConfirmOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** 選填：附加於主說明下方的補充影響區塊（非歸檔模式用） */
  details?: React.ReactNode;
  /** 方案 3 歸檔規格卡資料（variant="archive" 專用） */
  archiveSpec?: ArchiveConfirmSpec;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'archive';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context.confirm;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  details?: React.ReactNode;
  archiveSpec?: ArchiveConfirmSpec;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'archive';
  /** 每次開啟遞增之金鑰，用於重置長按蓄力狀態 */
  sessionKey?: number;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * 全站標準確認彈窗（嚴格遵循 Standard Precision Modal Architecture）
 * - 寬度唯一真理源：300px，內邊距恆定 16px (p-4 sm:p-4)，0 陰影
 * - 一般確認 (default)：Precision Header Variant D（左 ✕ 取消、中標題、右 ✓ 確認）
 * - 歸檔確認 (archive · 方案 3)：Vercel 統一規格卡（項目 + 歷史記錄 + 條件式同步剔除列）+ 底部黑色長按蓄力確認鈕
 * - 高危破壞性確認 (destructive)：左 ✕ 取消、中標題，底部配置全寬實色紅底確認鈕
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  archiveSpec,
  confirmText,
  cancelText,
  variant = 'default',
  sessionKey = 0,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const isDestructive = variant === 'destructive';
  const isArchive = variant === 'archive';
  const usesBottomAction = isDestructive || isArchive;
  const affectedItems = archiveSpec?.affectedItems ?? [];

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
        } else {
          onOpenChange(true);
        }
      }}
    >
      <PrecisionDialogContent
        title={title || t('common.confirm')}
        onClose={handleCancel}
        onSubmit={usesBottomAction ? undefined : handleConfirm}
        submitAriaLabel={confirmText || t('common.confirm')}
        cancelAriaLabel={cancelText || t('common.cancel')}
        overlayClassName="z-[75]"
        className="z-[75]"
        initialFocus={false}
      >
        <div className="pt-3.5 space-y-3 font-sans text-xs">
          {/* 方案 3：歸檔統一規格卡（無關聯時為完整雙行卡，有關聯時動態展開同步剔除列） */}
          {isArchive && archiveSpec ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
              <div className="h-9 px-3 flex items-center justify-between gap-3">
                <span className="text-muted-foreground shrink-0">
                  {archiveSpec.entityLabel}
                </span>
                <span className="font-normal text-foreground truncate">
                  {archiveSpec.itemName}
                </span>
              </div>
              <div className="h-9 px-3 flex items-center justify-between gap-3">
                <span className="text-muted-foreground shrink-0">
                  {t('common.historyRecords', '歷史記錄')}
                </span>
                <span className="font-normal text-muted-foreground">
                  {t('common.preserved', '保留')}
                </span>
              </div>
              {affectedItems.length > 0 && (
                <div className="px-3 py-2.5 bg-muted space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{archiveSpec.affectedLabel}</span>
                    <span className="font-mono">{affectedItems.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {affectedItems.map((name, idx) => (
                      <span
                        key={`${name}-${idx}`}
                        className="inline-flex items-center h-6 px-2 rounded-md border border-border bg-card text-foreground text-xs font-normal"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
              <div className="px-3 py-2.5 text-xs text-foreground leading-relaxed">
                {description}
              </div>
              {details && (
                <div className="px-3 py-2.5 bg-muted text-xs text-muted-foreground leading-relaxed">
                  {details}
                </div>
              )}
            </div>
          )}

          {/* 歸檔長按確認按鈕（黑色單色蓄力充能，復刻長按刪除按鈕交互契約） */}
          {isArchive && (
            <HoldToDeleteButton
              key={sessionKey}
              variant="primary"
              icon={<Archive className="size-3.5 shrink-0" />}
              text={confirmText || (typeof title === 'string' ? title : t('common.archive'))}
              hintText={t('common.holdToArchiveHint', '長按歸檔')}
              onConfirm={handleConfirm}
            />
          )}

          {/* 破壞性高危確認按鈕（實色紅底 + 純白文字，緊隨 space-y-3 節奏） */}
          {isDestructive && (
            <button
              type="button"
              onClick={handleConfirm}
              className={cn(
                'w-full h-9 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80 font-mono text-xs font-semibold transition-all cursor-pointer flex items-center justify-center select-none'
              )}
            >
              {confirmText || (typeof title === 'string' ? title : t('common.confirm'))}
            </button>
          )}
        </div>
      </PrecisionDialogContent>
    </Dialog>
  );
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [sessionKey, setSessionKey] = React.useState(0);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
      setSessionKey((prev) => prev + 1);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setIsOpen(false);
  }, []);

  const handleCancel = React.useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setIsOpen(false);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <ConfirmDialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
          title={options.title}
          description={options.description}
          details={options.details}
          archiveSpec={options.archiveSpec}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          sessionKey={sessionKey}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}
