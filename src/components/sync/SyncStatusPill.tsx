import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { useNetworkStatus, checkConnectivity } from '@/hooks/useNetworkStatus';
import { useDropboxSync } from '@/hooks/useDropboxSync';
import { toast } from '@/components/ui/toast';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function SyncStatusPill() {
  const { t } = useTranslation();
  const isOnline = useNetworkStatus();
  const {
    isAuthenticated,
    isSyncing,
    lastSyncTime,
    lastSyncError,
    justSynced,
    connectDropbox,
    syncNow,
  } = useDropboxSync();

  const [isConnectOpen, setIsConnectOpen] = useState(false);

  type PillStatus = 'offline' | 'syncing' | 'disconnected' | 'failed' | 'synced' | 'connected';

  let status: PillStatus = 'connected';
  if (!isOnline) {
    status = 'offline';
  } else if (isSyncing) {
    status = 'syncing';
  } else if (!isAuthenticated) {
    status = 'disconnected';
  } else if (lastSyncError) {
    status = 'failed';
  } else if (justSynced) {
    status = 'synced';
  } else {
    status = 'connected';
  }

  const handleClick = async () => {
    triggerHaptic('light');
    switch (status) {
      case 'offline': {
        toast.show(t('syncStatus.reconnectingToast'));
        const online = await checkConnectivity();
        if (!online) {
          toast.show(t('syncStatus.offlineToast'));
        }
        break;
      }
      case 'syncing':
        break;
      case 'disconnected':
        setIsConnectOpen(true);
        break;
      case 'failed':
        toast.show(t('syncStatus.retryToast'));
        await syncNow();
        break;
      case 'synced':
      case 'connected':
        await syncNow();
        break;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'offline':
        return t('syncStatus.offline');
      case 'syncing':
        return t('syncStatus.syncing');
      case 'disconnected':
        return t('syncStatus.disconnected');
      case 'failed':
        return t('syncStatus.failed');
      case 'synced':
        return t('syncStatus.synced');
      case 'connected':
        return t('syncStatus.connected');
    }
  };

  const formatTime = (isoTime: string | null) => {
    if (!isoTime) return '';
    try {
      const d = new Date(isoTime);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return '';
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'offline':
        return t('syncStatus.offlineToast');
      case 'syncing':
        return t('syncStatus.syncing');
      case 'disconnected':
        return t('syncStatus.connectDialogTitle');
      case 'failed':
        return lastSyncError
          ? `${t('syncStatus.failed')}: ${lastSyncError}`
          : t('syncStatus.retryAction');
      case 'synced':
      case 'connected':
        if (lastSyncTime) {
          return `${t('syncStatus.lastSyncPrefix')}: ${formatTime(lastSyncTime)} · ${t('syncStatus.syncNowAction')}`;
        }
        return t('syncStatus.syncNowAction');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'syncing'}
        title={getTitle()}
        className={cn(
          'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-mono select-none transition-all outline-none',
          status === 'syncing'
            ? 'cursor-not-allowed opacity-80 border-border bg-card text-foreground'
            : 'cursor-pointer active:scale-[0.97] hover:bg-hover',
          status === 'offline' && 'border-border text-muted-foreground bg-card',
          status === 'disconnected' && 'border-border text-muted-foreground bg-card hover:text-foreground',
          status === 'failed' && 'border-destructive text-destructive bg-destructive-subtle hover:opacity-90',
          (status === 'connected' || status === 'synced') && 'border-border text-muted-foreground hover:text-foreground bg-card'
        )}
      >
        {status === 'syncing' ? (
          <Loader2 className="size-3 animate-spin text-foreground shrink-0" />
        ) : status === 'offline' ? (
          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
        ) : status === 'failed' ? (
          <span className="size-1.5 rounded-full bg-destructive shrink-0" />
        ) : status === 'disconnected' ? (
          <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
        ) : (
          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
        )}

        <span>{getLabel()}</span>
      </button>

      {/* 連接 Dropbox 彈窗 */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <PrecisionDialogContent
          title={t('syncStatus.connectDialogTitle')}
          onClose={() => setIsConnectOpen(false)}
          onSubmit={() => {
            setIsConnectOpen(false);
            connectDropbox();
          }}
          submitAriaLabel={t('syncStatus.connectAction')}
          cancelAriaLabel={t('common.cancel')}
          overlayClassName="z-[70]"
          className="z-[70]"
        >
          <div className="pt-3.5 space-y-3 font-mono text-xs select-none">
            {/* Vercel Usage List 條目 */}
            <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
              <div className="h-10 px-3.5 flex items-center justify-between">
                <span className="text-muted-foreground font-sans">{t('syncStatus.service', '服務')}</span>
                <span className="text-foreground font-medium font-mono">Dropbox</span>
              </div>
              <div className="h-10 px-3.5 flex items-center justify-between">
                <span className="text-muted-foreground font-sans">{t('syncStatus.status', '狀態')}</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                  <span className="text-muted-foreground">{t('syncStatus.disconnected', '未連線')}</span>
                </div>
              </div>
              <div className="h-10 px-3.5 flex items-center justify-between">
                <span className="text-muted-foreground font-sans">{t('syncStatus.scope', '範圍')}</span>
                <span className="text-foreground font-mono text-[11px]">{t('syncStatus.scopeAll', '飲食 · 訓練 · 體態')}</span>
              </div>
            </div>

            {/* 客觀說明文本 */}
            <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5 font-sans">
              {t('syncStatus.connectDialogDesc')}
            </p>

            {/* 滿寬連線操作按鈕 */}
            <Button
              type="button"
              onClick={() => {
                setIsConnectOpen(false);
                connectDropbox();
              }}
              className="w-full h-9 rounded-lg bg-foreground text-background font-mono text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              {t('syncStatus.connectAction')}
            </Button>
          </div>
        </PrecisionDialogContent>
      </Dialog>
    </>
  );
}
