import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';

interface DropboxSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSyncTime?: string | null;
  isOnline: boolean;
  onConnectDropbox: () => void;
  onDisconnectDropbox: () => void;
  onSyncNow: () => Promise<unknown>;
}

export function DropboxSyncDialog({
  open,
  onOpenChange,
  isAuthenticated,
  isSyncing,
  lastSyncTime,
  isOnline,
  onConnectDropbox,
  onDisconnectDropbox,
  onSyncNow,
}: DropboxSyncDialogProps) {
  const { t } = useTranslation();

  const formatTime = (isoTime: string | null | undefined) => {
    if (!isoTime) return t('settings.never', '從未');
    try {
      const d = new Date(isoTime);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return t('settings.never', '從未');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PrecisionDialogContent
        title={t('settings.dropboxSyncModalTitle', 'Dropbox 同步')}
        onClose={() => onOpenChange(false)}
        overlayClassName="z-[70]"
        className="z-[70]"
      >
        <div className="pt-3.5 space-y-3 font-mono text-xs select-none">
          {/* 連線狀態與上次同步清單 */}
          <div className="divide-y divide-border border border-border rounded-lg text-xs bg-card overflow-hidden">
            {/* 連線狀態 */}
            <div className="h-10 px-3.5 flex justify-between items-center">
              <span className="text-muted-foreground font-sans">{t('settings.status', '狀態')}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-1.5 rounded-full shrink-0 ${
                    isAuthenticated ? 'bg-emerald-500' : 'bg-muted-foreground/60'
                  }`}
                />
                <span
                  className={
                    isAuthenticated
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }
                >
                  {isAuthenticated ? t('settings.connected', '已連線') : t('settings.disconnected', '未連線')}
                </span>
              </div>
            </div>

            {/* 上次同步 */}
            {isAuthenticated && (
              <div className="h-10 px-3.5 flex justify-between items-center">
                <span className="text-muted-foreground font-sans">
                  {t('settings.lastSync', '上次同步')}
                </span>
                <span className="text-foreground">{formatTime(lastSyncTime)}</span>
              </div>
            )}
          </div>

          {/* 動作按鈕 */}
          <div className="pt-0.5 space-y-2">
            {!isAuthenticated ? (
              <Button
                type="button"
                className="w-full h-9 text-xs font-mono font-semibold"
                onClick={onConnectDropbox}
              >
                <span>{t('syncStatus.connectAction', '連線')}</span>
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-xs font-mono"
                  onClick={() => onSyncNow()}
                  disabled={isSyncing || !isOnline}
                >
                  <RefreshCw
                    className={`size-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  <span>{isSyncing ? t('settings.syncing', '同步中…') : t('settings.syncNow', '立即同步')}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-8 text-xs font-mono text-muted-foreground hover:text-destructive"
                  onClick={onDisconnectDropbox}
                  disabled={isSyncing}
                >
                  {t('settings.disconnectDropbox', '中斷連線')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </PrecisionDialogContent>
    </Dialog>
  );
}
