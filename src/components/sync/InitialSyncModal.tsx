import { useTranslation } from 'react-i18next';
import {
  Cloud,
  GitMerge,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useInitialSync } from '@/hooks/useInitialSync';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { InitialSyncStep } from '@/services/sync/initialSyncManager';

export function InitialSyncModal() {
  const { t } = useTranslation();
  const {
    isOpen,
    step,
    progressPercent,
    downloadedFilesCount,
    totalFilesCount,
    localCount,
    remoteCount,
    isApplying,
    summary,
    error,
    selectStrategy,
    cancelInitialSync,
    closeInitialSyncModal,
  } = useInitialSync();

  if (!isOpen) return null;

  // 步驟索引計算 (1-5)
  const getStepNumber = (s: InitialSyncStep): number => {
    switch (s) {
      case 'AUTH':
        return 1;
      case 'STRATEGY':
        return 2;
      case 'DOWNLOADING':
        return 3;
      case 'APPLYING':
        return 4;
      case 'COMPLETED':
        return 5;
      default:
        return 1;
    }
  };

  const currentStep = getStepNumber(step);

  const handleCancel = () => {
    if (isApplying) return; // 寫入階段禁止打斷
    cancelInitialSync();
    toast.show(t('initialSync.cancelToast', '已取消同步'));
  };

  const handleComplete = () => {
    closeInitialSyncModal();
    window.location.reload();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-overlay backdrop-blur-[2px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[380px] bg-card border border-border rounded-xl p-5 flex flex-col justify-between select-none shadow-none text-foreground font-mono"
      >
        {/* 頂部 Header */}
        <div className="shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {t('initialSync.stepCounter', { current: `0${currentStep}`, total: '05' })}
            </span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Cloud className="size-3.5" />
              <span className="text-xs">Dropbox</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold tracking-tight text-foreground mt-2">
            {error && t('initialSync.errorTitle', '同步失敗')}
            {!error && step === 'AUTH' && t('initialSync.authTitle', '連線中')}
            {!error && step === 'STRATEGY' && t('initialSync.conflictTitle', '選擇同步方式')}
            {!error && step === 'DOWNLOADING' && t('initialSync.downloadingTitle', '下載資料')}
            {!error && step === 'APPLYING' && t('initialSync.applyingTitle', '寫入資料庫')}
            {!error && step === 'COMPLETED' && t('initialSync.completedTitle', '同步完成')}
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1 line-clamp-2">
            {error && t('initialSync.errorDesc', '連線或處理過程中發生錯誤，請重試。')}
            {!error && step === 'AUTH' && t('initialSync.authDesc', '正在換取憑證並檢查遠端檔案…')}
            {!error && step === 'STRATEGY' &&
              t('initialSync.conflictDesc', {
                remote: remoteCount,
                local: localCount,
                defaultValue: `雲端已有 ${remoteCount} 筆記錄，本地有 ${localCount} 筆記錄，請選擇處理策略：`,
              })}
            {!error && step === 'DOWNLOADING' && t('initialSync.downloadingDesc', '正在從 Dropbox 下載最新資料…')}
            {!error && step === 'APPLYING' && t('initialSync.applyingDesc', '正在執行原子級寫入…')}
            {!error && step === 'COMPLETED' && t('initialSync.completedDesc', '資料已成功對齊並完成同步！')}
          </p>
        </div>

        {/* 中間主體區域 */}
        <div className="py-4 my-auto">
          {/* 錯誤展示 */}
          {error && (
            <div className="py-2">
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed break-all select-text font-mono">
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* 步驟 1: AUTH */}
          {!error && step === 'AUTH' && (
            <div className="flex flex-col items-center justify-center gap-2.5 py-6">
              <Loader2 className="size-6 text-foreground animate-spin" strokeWidth={1.8} />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Connecting...
              </span>
            </div>
          )}

          {/* 步驟 2: STRATEGY 衝突策略選擇 */}
          {!error && step === 'STRATEGY' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => selectStrategy('merge')}
                className="w-full p-2.5 rounded-lg border border-border hover:bg-hover active:scale-[0.98] transition-all text-left flex items-start gap-2.5 cursor-pointer group"
              >
                <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <GitMerge className="size-3 text-foreground" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>{t('initialSync.mergeTitle', '雙向合併')}</span>
                    <span className="text-[9px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded leading-none">
                      {t('initialSync.recommended', '推薦')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {t('initialSync.mergeDesc', '保留雙方所有資料，相同項目取最新')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectStrategy('overwrite_local')}
                className="w-full p-2.5 rounded-lg border border-border hover:bg-hover active:scale-[0.98] transition-all text-left flex items-start gap-2.5 cursor-pointer group"
              >
                <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Download className="size-3 text-foreground" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    {t('initialSync.overwriteLocalTitle', '以雲端覆蓋本機')}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {t('initialSync.overwriteLocalDesc', '清空本地，完全還原雲端內容')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectStrategy('overwrite_remote')}
                className="w-full p-2.5 rounded-lg border border-border hover:bg-hover active:scale-[0.98] transition-all text-left flex items-start gap-2.5 cursor-pointer group"
              >
                <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Upload className="size-3 text-foreground" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    {t('initialSync.overwriteRemoteTitle', '以本機覆蓋雲端')}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {t('initialSync.overwriteRemoteDesc', '用當前設備資料覆寫 Dropbox')}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* 步驟 3: DOWNLOADING */}
          {!error && step === 'DOWNLOADING' && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>
                  {downloadedFilesCount} / {totalFilesCount || '...'} FILES
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Loader2 className="size-3 text-muted-foreground animate-spin" />
                <span className="text-[11px] text-muted-foreground">Downloading...</span>
              </div>
            </div>
          )}

          {/* 步驟 4: APPLYING */}
          {!error && step === 'APPLYING' && (
            <div className="flex flex-col items-center justify-center gap-2.5 py-6">
              <Loader2 className="size-6 text-foreground animate-spin" strokeWidth={1.8} />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Applying to Database...
              </span>
            </div>
          )}

          {/* 步驟 5: COMPLETED */}
          {!error && step === 'COMPLETED' && (
            <div className="space-y-3 text-center py-2">
              <div className="flex justify-center">
                <CheckCircle2 className="size-8 text-emerald-500" strokeWidth={1.8} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-2 rounded border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground">
                    {t('initialSync.summaryFoods', '食材庫')}
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {summary?.foodsCount ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground">
                    {t('initialSync.summaryExercises', '動作庫')}
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {summary?.exercisesCount ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground">
                    {t('initialSync.summaryFoodLogs', '飲食記錄')}
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {summary?.foodLogsCount ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground">
                    {t('initialSync.summaryWorkoutLogs', '訓練記錄')}
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {summary?.workoutLogsCount ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部 Footer */}
        <div className="shrink-0 flex flex-row items-center justify-between pt-3 border-t border-border mt-auto">
          {error ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="text-xs ml-auto"
            >
              {t('common.close', '關閉')}
            </Button>
          ) : (
            <>
              {step !== 'COMPLETED' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isApplying}
                  className="text-xs"
                >
                  {t('common.cancel', '取消')}
                </Button>
              ) : (
                <div />
              )}

              {step === 'COMPLETED' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleComplete}
                  className="text-xs ml-auto"
                >
                  {t('initialSync.startUsingBtn', '開始使用')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
