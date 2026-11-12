import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isDropboxConnected,
  initiateDropboxAuth,
  clearDropboxTokens,
  getDropboxAppKey,
} from '@/services/sync/dropboxAuth';
import {
  executeSync,
  scheduleAutoSync,
  onSyncEngineStatusChange,
  getSyncEngineStatus,
  updateSyncEngineStatus,
  formatSyncErrorMessage,
  type SyncEngineStatus,
  type SyncResult,
} from '@/services/sync/syncEngine';
import { toast } from '@/components/ui/toast';
import { startInitialSync } from '@/services/sync/initialSyncManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// 模組級單例守衛：確保應用冷啟動同步全域只執行一次，次級頁面進出不重複觸發
let hasInitialMountSyncExecuted = false;

// 視窗聚焦與分頁可見性切回：全域 30 秒冷卻防護時間戳與離開標記
const FOCUS_COOLDOWN_MS = 30 * 1000;
let lastGlobalFocusCheckTime = Date.now();
let hasBlurredOrHidden = false;

export function useDropboxSync() {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isDropboxConnected());
  const [syncState, setSyncState] = useState<SyncEngineStatus>(getSyncEngineStatus);
  const isOnline = useNetworkStatus();
  const prevIsOnlineRef = useRef(isOnline);
  const hasHandledAuthRef = useRef(false);

  useEffect(() => {
    return onSyncEngineStatusChange(setSyncState);
  }, []);

  // 應用啟動與切回視窗時主動檢查遠端是否有更新
  useEffect(() => {
    // 1. 全應用冷啟動同步：僅首次加載時執行一次
    if (!hasInitialMountSyncExecuted) {
      hasInitialMountSyncExecuted = true;
      if (isDropboxConnected() && isOnline) {
        scheduleAutoSync(1500);
      }
    }

    // 2. 視窗失焦與分頁隱藏記錄
    const handleBlur = () => {
      hasBlurredOrHidden = true;
    };

    const checkAndTriggerFocusSync = () => {
      const now = Date.now();
      if (
        hasBlurredOrHidden &&
        now - lastGlobalFocusCheckTime > FOCUS_COOLDOWN_MS &&
        isDropboxConnected() &&
        isOnline
      ) {
        lastGlobalFocusCheckTime = now;
        hasBlurredOrHidden = false;
        scheduleAutoSync(1000);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hasBlurredOrHidden = true;
      } else if (document.visibilityState === 'visible') {
        checkAndTriggerFocusSync();
      }
    };

    const handleFocus = () => {
      checkAndTriggerFocusSync();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOnline]);

  // 網路恢復時自動補發同步
  useEffect(() => {
    if (!prevIsOnlineRef.current && isOnline) {
      if (isDropboxConnected()) {
        scheduleAutoSync(1000);
      }
    }
    prevIsOnlineRef.current = isOnline;
  }, [isOnline]);

  // 首次載入偵測 OAuth 回調代碼 (?code=...)
  useEffect(() => {
    if (hasHandledAuthRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      hasHandledAuthRef.current = true;
      // 乾淨移除網址上的授權碼參數
      window.history.replaceState({}, document.title, window.location.pathname);

      // 啟動事務性首次同步狀態機
      startInitialSync(code).catch((err) => {
        console.error('Failed to start initial sync:', err);
      });
    }
  }, []);

  // 發起連線
  const connectDropbox = useCallback(async () => {
    const appKey = getDropboxAppKey();
    if (!appKey) {
      toast.show(t('settings.missingAppKey', '未配置 Dropbox App Key'));
      return;
    }

    try {
      await initiateDropboxAuth();
    } catch (err: unknown) {
      console.error('Failed to initiate Dropbox auth:', err);
      const reason = formatSyncErrorMessage(err, t);
      toast.show(t('syncStatus.authFailedToast', { reason }));
    }
  }, [t]);

  // 中斷連線 (登出)
  const disconnectDropbox = useCallback(() => {
    clearDropboxTokens();
    setIsAuthenticated(false);
    updateSyncEngineStatus({ lastSyncError: null, justSynced: false, lastSyncTime: null });
    toast.show(t('settings.disconnectedToast', '已中斷連線'));
  }, [t]);

  // 手動點擊立即同步 (支援指定模式：auto, overwrite_remote, overwrite_local)
  const syncNow = useCallback(
    async (
      mode: 'auto' | 'overwrite_local' | 'overwrite_remote' = 'auto'
    ): Promise<SyncResult> => {
      if (syncState.isSyncing) {
        return { success: false, timestamp: new Date().toISOString(), actionTaken: 'up_to_date' };
      }

      if (!isOnline) {
        toast.show(t('syncStatus.offlineToast'));
        return { success: false, timestamp: new Date().toISOString(), actionTaken: 'up_to_date' };
      }

      try {
        const result = await executeSync(mode);
        if (result.success) {
          toast.show(t('syncStatus.syncSuccessToast'));
        } else if (result.error === 'Dropbox not connected') {
          const reason = formatSyncErrorMessage(result.error, t);
          toast.show(t('syncStatus.syncFailedToast', { reason }));
        }
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown sync error';
        const reason = formatSyncErrorMessage(err, t);
        toast.show(t('syncStatus.syncFailedToast', { reason }));
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: msg,
          actionTaken: 'up_to_date',
        };
      }
    },
    [syncState.isSyncing, isOnline, t]
  );

  return {
    isAuthenticated,
    isSyncing: syncState.isSyncing,
    lastSyncTime: syncState.lastSyncTime,
    lastSyncError: syncState.lastSyncError,
    justSynced: syncState.justSynced,
    isOnline,
    connectDropbox,
    disconnectDropbox,
    syncNow,
  };
}
