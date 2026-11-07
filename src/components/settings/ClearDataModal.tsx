import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, PrecisionDialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { db } from '@/services/db/db';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClearDataModal({ isOpen, onClose }: ClearDataModalProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const confirmPhrase = t('settings.clearDataConfirmPhrase', '清空所有數據');
  const isMatch = inputText.trim() === confirmPhrase.trim();

  const handleClose = () => {
    if (isClearing) return;
    setInputText('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!isMatch || isClearing) return;

    setIsClearing(true);
    triggerHaptic('warning');

    try {
      // 1. 執行出廠重置核心 (清除日誌與自定義實體、恢復預設實體、斷開雲端、清空快取)
      await db.resetToFactoryDefaults();

      toast.show(t('settings.dataCleared'));

      // 2. 延遲 300ms 後重載並跳轉至首頁儀表板，以 100% 首次打開的純淨環境重新加載
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }, 300);
    } catch (err) {
      console.error('Failed to reset database:', err);
      toast.show(t('common.error'));
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <PrecisionDialogContent
        title={t('settings.clearData', '清除本地資料')}
        onClose={handleClose}
        overlayClassName="z-[70]"
        className="z-[70]"
        initialFocus={false}
      >
        <div className="flex flex-col space-y-3 pt-3.5 select-none font-mono text-xs">
          {/* 客觀警示卡片 */}
          <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-destructive space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <AlertTriangle className="size-4 shrink-0 text-destructive" />
              <span>{t('settings.clearData', '清除本地資料')}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground font-sans">
              {t('settings.clearDataWarning')}
            </p>
          </div>

          {/* 輸入確認防呆引導 */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground block font-sans">
              {t('settings.clearDataInputPrompt', { phrase: confirmPhrase })}
            </span>
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={confirmPhrase}
              className="h-8 text-xs font-mono bg-background border-border"
              disabled={isClearing}
              autoFocus={false}
            />
          </div>

          {/* 破壞性高危確認按鈕 (Rule 4 實色紅底 + 純白文字) */}
          <button
            type="button"
            disabled={!isMatch || isClearing}
            onClick={handleConfirm}
            className={cn(
              'w-full h-9 rounded-md font-mono text-xs font-semibold transition-all select-none flex items-center justify-center',
              isMatch && !isClearing
                ? 'bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80 cursor-pointer'
                : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
            )}
          >
            {isClearing ? '...' : t('settings.clearDataButton', '清空')}
          </button>
        </div>
      </PrecisionDialogContent>
    </Dialog>
  );
}
