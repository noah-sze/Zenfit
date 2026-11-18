import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, RefreshCcw, Trash2 } from 'lucide-react';
import { Dialog, PrecisionDialogContent } from '@/components/ui/dialog';
import { HoldToDeleteButton } from '@/components/ui/HoldToDeleteButton';
import { cn } from '@/lib/utils';

export interface EntityConfirmSpec {
  /** 左側標籤（如：食物、食譜、動作、組合、器械） */
  entityLabel: string;
  /** 右側目標對象名稱（維持正常字重 font-normal，不加粗） */
  itemName: string;
  /** 選填：第二行左側標籤（未提供時依 variant 自動套用預設語意） */
  statusLabel?: string;
  /** 選填：第二行右側數值（未提供時依 variant 自動套用預設語意） */
  statusValue?: string;
  /** 選填：關聯剔除區塊標題（如：從食譜剔除 / 從組合剔除） */
  affectedLabel?: string;
  /** 選填：受影響的食譜或組合名稱清單；為空時僅顯示基本雙行規格卡 */
  affectedItems?: string[];
}

export type ArchiveConfirmSpec = EntityConfirmSpec;

export type ConfirmVariant = 'default' | 'destructive' | 'archive' | 'restore';

export interface ConfirmOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** 選填：附加於主說明下方的補充影響區塊（非規格卡模式用） */
  details?: React.ReactNode;
  /** 方案 3 實體規格卡資料（歸檔 / 恢復 / 刪除通用） */
  entitySpec?: EntityConfirmSpec;
  /** 向下相容別名：等同 entitySpec */
  archiveSpec?: ArchiveConfirmSpec;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
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
  entitySpec?: EntityConfirmSpec;
  archiveSpec?: ArchiveConfirmSpec;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  /** 每次開啟遞增之金鑰，用於重置長按蓄力狀態 */
  sessionKey?: number;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * 全站標準確認彈窗（嚴格遵循 Standard Precision Modal Architecture）
 * - 寬度唯一真理源：300px，內邊距恆定 16px (p-4 sm:p-4)，0 陰影
 * - 一般確認 (default)：Precision Header Variant D（左 ✕ 取消、中標題、右 ✓ 確認）
 * - 歸檔 / 恢復 / 實體刪除 (方案 3 規格卡)：Vercel 統一規格卡（項目 + 狀態/影響 + 條件式剔除列）+ 底部長按蓄力確認鈕
 * - 其他破壞性確認 (destructive 無規格卡)：左 ✕ 取消、中標題，底部配置全寬實色紅底確認鈕
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  entitySpec,
  archiveSpec,
  confirmText,
  cancelText,
  variant = 'default',
  sessionKey = 0,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const spec = entitySpec ?? archiveSpec;
  const isDestructive = variant === 'destructive';
  const isArchive = variant === 'archive';
  const isRestore = variant === 'restore';
  const usesEntitySpecCard = Boolean(spec) && (isArchive || isRestore || isDestructive);
  const usesBottomAction = isDestructive || isArchive || isRestore;
  const affectedItems = spec?.affectedItems ?? [];

  const defaultStatusLabel = isArchive
    ? t('common.historyRecords', '歷史記錄')
    : isRestore
      ? t('common.statusLabel', '狀態')
      : t('common.actionLabel', '操作');

  const defaultStatusValue = isArchive
    ? t('common.preserved', '保留')
    : isRestore
      ? t('common.active', '使用中')
      : t('common.irreversible', '無法復原');

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
          {/* 方案 3：統一實體規格卡（歸檔 / 恢復 / 實體刪除皆採用一致佈局） */}
          {usesEntitySpecCard && spec ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
              <div className="h-9 px-3 flex items-center justify-between gap-3">
                <span className="text-muted-foreground shrink-0">
                  {spec.entityLabel}
                </span>
                <span className="font-normal text-foreground truncate">
                  {spec.itemName}
                </span>
              </div>
              <div className="h-9 px-3 flex items-center justify-between gap-3">
                <span className="text-muted-foreground shrink-0">
                  {spec.statusLabel ?? defaultStatusLabel}
                </span>
                <span className="font-normal text-muted-foreground">
                  {spec.statusValue ?? defaultStatusValue}
                </span>
              </div>
              {affectedItems.length > 0 && (
                <div className="px-3 py-2.5 bg-muted space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{spec.affectedLabel}</span>
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

          {/* 歸檔長按確認按鈕（黑色單色蓄力充能） */}
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

          {/* 恢復長按確認按鈕（黑色單色蓄力充能，完全復刻歸檔交互） */}
          {isRestore && (
            <HoldToDeleteButton
              key={sessionKey}
              variant="primary"
              icon={<RefreshCcw className="size-3.5 shrink-0" />}
              text={confirmText || (typeof title === 'string' ? title : t('common.restore'))}
              hintText={t('common.holdToRestoreHint', '長按恢復')}
              onConfirm={handleConfirm}
            />
          )}

          {/* 實體刪除長按確認按鈕（紅色蓄力充能，完全復刻歸檔交互） */}
          {isDestructive && usesEntitySpecCard && (
            <HoldToDeleteButton
              key={sessionKey}
              variant="destructive"
              icon={<Trash2 className="size-3.5 shrink-0" />}
              text={confirmText || (typeof title === 'string' ? title : t('common.delete'))}
              hintText={t('common.holdToDeleteHint', '長按 1s 刪除')}
              onConfirm={handleConfirm}
            />
          )}

          {/* 其他破壞性確認按鈕（無實體規格卡時保留實色紅底確認鈕） */}
          {isDestructive && !usesEntitySpecCard && (
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
          entitySpec={options.entitySpec}
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
