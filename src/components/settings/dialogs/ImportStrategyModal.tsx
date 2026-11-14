import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, PrecisionDialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { GitMerge, RotateCcw } from 'lucide-react';
import type { UserBaseInfo } from '@/types';
import type { ImportStrategy } from '@/services/backup/importBackup';

export interface ImportStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  localBaseInfo: UserBaseInfo | null;
  backupBaseInfo: UserBaseInfo | null;
  onConfirm: (strategy: ImportStrategy) => Promise<void>;
}

export function ImportStrategyModal({
  isOpen,
  onClose,
  localBaseInfo,
  backupBaseInfo,
  onConfirm,
}: ImportStrategyModalProps) {
  const { t } = useTranslation();

  const localName = localBaseInfo?.name?.trim() || '';
  const backupName = backupBaseInfo?.name?.trim() || '';
  const isNameMismatch = Boolean(localName && backupName && localName !== backupName);

  const [strategy, setStrategy] = useState<ImportStrategy>(isNameMismatch ? 'overwrite' : 'merge');
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當彈窗開啟或備份資料變動時，重置策略與輸入內容
  useEffect(() => {
    if (isNameMismatch) {
      setStrategy('overwrite');
    } else {
      setStrategy('merge');
    }
    setInputText('');
    setIsSubmitting(false);
  }, [isNameMismatch, isOpen]);

  // 取得目標確認詞
  const targetPhrase =
    strategy === 'merge'
      ? t('settings.confirmMergePhrase', '確認合併')
      : t('settings.confirmOverwritePhrase', '確認覆蓋');

  const isMatch = inputText.trim() === targetPhrase.trim();

  const handleClose = () => {
    if (isSubmitting) return;
    setInputText('');
    onClose();
  };

  const handleSelectStrategy = (newStrategy: ImportStrategy) => {
    if (isNameMismatch && newStrategy === 'merge') return;
    setStrategy(newStrategy);
    setInputText('');
  };

  const handleConfirm = async () => {
    if (!isMatch || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(strategy);
      handleClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const formatGender = (gender?: string) => {
    if (!gender) return '-';
    if (gender === 'male') return t('profile.male', '男');
    if (gender === 'female') return t('profile.female', '女');
    return gender;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <PrecisionDialogContent
        title={t('settings.importStrategyModalTitle', '匯入方式')}
        onClose={handleClose}
        overlayClassName="z-[70]"
        className="z-[70]"
        initialFocus={false}
      >
        <div className="flex flex-col space-y-3 pt-3.5 select-none font-mono text-xs">
          {/* 1. 個人資訊對比卡片 */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-0.5 block font-mono">
              {t('settings.profileComparison', '個人資訊對比')}
            </span>

            <div className="border border-border rounded-lg divide-y divide-border overflow-hidden bg-background text-[11px] font-mono">
              {/* 表頭 */}
              <div className="grid grid-cols-7 px-2.5 py-1.5 bg-muted/40 text-[10px] text-muted-foreground font-medium">
                <span className="col-span-2">{t('settings.item', '項目')}</span>
                <span className="col-span-2 text-center">{t('settings.local', '本機')}</span>
                <span className="col-span-3 text-right">{t('settings.backup', '備份')}</span>
              </div>

              {/* 姓名對比 */}
              <div
                className={cn(
                  'grid grid-cols-7 px-2.5 py-1.5 items-center transition-colors',
                  isNameMismatch && 'bg-destructive/5'
                )}
              >
                <span className="col-span-2 text-muted-foreground">{t('profile.name', '姓名')}</span>
                <span className="col-span-2 text-center font-medium">
                  {localBaseInfo?.name || '-'}
                </span>
                <span
                  className={cn(
                    'col-span-3 text-right font-medium',
                    isNameMismatch ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {backupBaseInfo?.name || '-'}
                </span>
              </div>

              {/* 性別對比 */}
              <div className="grid grid-cols-7 px-2.5 py-1.5 items-center">
                <span className="col-span-2 text-muted-foreground">{t('profile.gender', '性別')}</span>
                <span className="col-span-2 text-center text-muted-foreground">
                  {formatGender(localBaseInfo?.gender)}
                </span>
                <span className="col-span-3 text-right text-muted-foreground">
                  {formatGender(backupBaseInfo?.gender)}
                </span>
              </div>

              {/* 出生對比 */}
              <div className="grid grid-cols-7 px-2.5 py-1.5 items-center">
                <span className="col-span-2 text-muted-foreground">{t('profile.birth', '出生')}</span>
                <span className="col-span-2 text-center text-muted-foreground">
                  {localBaseInfo?.birthDate || '-'}
                </span>
                <span className="col-span-3 text-right text-muted-foreground">
                  {backupBaseInfo?.birthDate || '-'}
                </span>
              </div>

              {/* 身高對比 */}
              <div className="grid grid-cols-7 px-2.5 py-1.5 items-center">
                <span className="col-span-2 text-muted-foreground">{t('profile.height', '身高')}</span>
                <span className="col-span-2 text-center text-muted-foreground">
                  {localBaseInfo?.heightCm ? `${localBaseInfo.heightCm}cm` : '-'}
                </span>
                <span className="col-span-3 text-right text-muted-foreground">
                  {backupBaseInfo?.heightCm ? `${backupBaseInfo.heightCm}cm` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. 策略選擇卡片清單 */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-0.5 block font-mono">
              {t('settings.strategyTitle', '處理策略')}
            </span>

            {/* 策略 A: 合併資料 */}
            <button
              type="button"
              disabled={isNameMismatch}
              onClick={() => handleSelectStrategy('merge')}
              className={cn(
                'w-full p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all select-none',
                isNameMismatch
                  ? 'opacity-40 cursor-not-allowed pointer-events-none border-border bg-card'
                  : strategy === 'merge'
                  ? 'border-foreground bg-hover cursor-pointer'
                  : 'border-border hover:bg-hover cursor-pointer'
              )}
            >
              <div className="size-5 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <GitMerge className="size-3 text-foreground" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>{t('settings.mergeStrategy', '合併資料')}</span>
                  {isNameMismatch ? (
                    <span className="text-[9px] font-mono font-medium text-muted-foreground bg-muted px-1 py-0.2 rounded leading-tight">
                      {t('settings.cannotMergeBadge', '不可合併')}
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded leading-tight">
                      {t('settings.recommendedBadge', '推薦')}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {isNameMismatch
                    ? t('settings.cannotMergeNameMismatch', '姓名不一致，僅支援覆蓋')
                    : t('settings.mergeStrategyDesc', '保留現有資料並匯入新項目，相同項目以備份更新。')}
                </p>
              </div>
            </button>

            {/* 策略 B: 完全覆蓋 */}
            <button
              type="button"
              onClick={() => handleSelectStrategy('overwrite')}
              className={cn(
                'w-full p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer select-none',
                strategy === 'overwrite'
                  ? 'border-destructive bg-destructive/5'
                  : 'border-border hover:bg-hover'
              )}
            >
              <div className="size-5 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <RotateCcw className="size-3 text-foreground" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>{t('settings.overwriteStrategy', '完全覆蓋')}</span>
                  <span className="text-[9px] font-mono text-destructive border border-destructive/30 px-1 py-0.2 rounded leading-tight">
                    {t('settings.resetBadge', '清空重置')}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {t('settings.overwriteStrategyDesc', '清空現有本地所有數據，完全以備份內容還原。')}
                </p>
              </div>
            </button>
          </div>

          {/* 3. 打字確認防呆引導 */}
          <div className="space-y-1.5 pt-0.5">
            <span className="text-[11px] text-muted-foreground block font-sans">
              {t('settings.confirmInputPrompt', { phrase: targetPhrase })}
            </span>
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={targetPhrase}
              className="h-8 text-xs font-mono bg-background border-border"
              disabled={isSubmitting}
              autoFocus={false}
            />
          </div>

          {/* 4. 底部動作確認按鈕 */}
          <button
            type="button"
            disabled={!isMatch || isSubmitting}
            onClick={handleConfirm}
            className={cn(
              'w-full h-9 rounded-md font-mono text-xs font-semibold transition-all select-none flex items-center justify-center',
              isMatch && !isSubmitting
                ? strategy === 'merge'
                  ? 'bg-foreground text-background hover:opacity-90 active:scale-[0.98] cursor-pointer'
                  : 'bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.98] cursor-pointer'
                : 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed'
            )}
          >
            {isSubmitting
              ? '...'
              : strategy === 'merge'
              ? t('settings.confirmMergeAction', '確認合併')
              : t('settings.confirmOverwriteAction', '確認覆蓋')}
          </button>
        </div>
      </PrecisionDialogContent>
    </Dialog>
  );
}
