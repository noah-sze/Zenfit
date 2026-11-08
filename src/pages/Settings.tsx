import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from '@/components/ui/toast';
import { triggerHaptic } from '@/lib/haptics';
import { db } from '@/services/db/db';
import { exportBackupZip } from '@/services/backup/exportBackupZip';
import {
  parseBackupFile,
  executeImport,
  type ParsedBackupData,
  type ImportStrategy,
} from '@/services/backup/importBackup';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { useBodyPreferences } from '@/hooks/useBodyPreferences';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDropboxSync } from '@/hooks/useDropboxSync';
import { DropboxSyncDialog } from '@/components/settings/dialogs/DropboxSyncDialog';
import { ClearDataModal } from '@/components/settings/ClearDataModal';
import { ImportStrategyModal } from '@/components/settings/dialogs/ImportStrategyModal';
import type {
  UnitSystemPreset,
  BodyWeightUnit,
  FoodWeightUnit,
  FoodVolumeUnit,
  LengthUnit,
  EnergyUnit,
  UserBaseInfo,
} from '@/types';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreset, updatePreference } = useUnitPreferences();
  const { bodyPreferences, updateBodyPreference } = useBodyPreferences();
  const { profile } = useUserProfile();
  const confirm = useConfirm();

  const [isDropboxDialogOpen, setIsDropboxDialogOpen] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [isImportStrategyModalOpen, setIsImportStrategyModalOpen] = useState(false);
  const [stagedBackupData, setStagedBackupData] = useState<ParsedBackupData | null>(null);
  const [stagedLocalBase, setStagedLocalBase] = useState<UserBaseInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isAuthenticated: isDropboxAuth,
    isSyncing: isDropboxSyncing,
    lastSyncTime: dropboxLastSyncTime,
    isOnline,
    connectDropbox,
    disconnectDropbox,
    syncNow: dropboxSyncNow,
  } = useDropboxSync();

  const currentLang = i18n.resolvedLanguage || i18n.language || 'en';

  const getThemeLabel = (tVal: string) => {
    if (tVal === 'light') return t('settings.themeLight');
    if (tVal === 'dark') return t('settings.themeDark');
    return t('settings.themeSystem');
  };

  const getPresetLabel = (p: UnitSystemPreset) => {
    if (p === 'metric') return t('settings.unitPresetMetric');
    if (p === 'imperial') return t('settings.unitPresetImperial');
    return t('settings.unitPresetCustom');
  };

  const getLanguageLabel = (lang: string) => {
    if (lang === 'zh-TW' || lang.startsWith('zh-TW') || lang.startsWith('zh-Hant')) {
      return '繁體中文 (台灣)';
    }
    if (lang === 'zh-CN' || lang.startsWith('zh-CN') || lang.startsWith('zh-Hans')) {
      return '简体中文';
    }
    return 'English';
  };

  // 匯出資料備份為 ZIP 檔案（文件結構與 Dropbox 同步目錄一致）
  const handleExportZip = async () => {
    try {
      const blob = await exportBackupZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenfit-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      triggerHaptic('success');
      toast.show(t('settings.exported'));
    } catch {
      toast.show(t('common.error'));
    }
  };

  // 觸發選擇備份檔案
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 處理匯入備份檔案
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 清空 input 數值，允許連續重複選擇同名檔案
    e.target.value = '';

    try {
      // 1. 先行解析備份檔案內容至記憶體
      const parsed = await parseBackupFile(file);

      // 2. 統計本機記錄筆數以判定本機是否已有資料
      const [
        dietLogsCount,
        workoutLogsCount,
        metricsCount,
        customFoodsCount,
        customRecipesCount,
        customExercisesCount,
        customRoutinesCount,
        localBase,
      ] = await Promise.all([
        db.daily_diet_logs.count(),
        db.workout_logs.count(),
        db.body_metrics.count(),
        db.foods.filter((f) => Boolean(f.isCustom)).count(),
        db.recipes.filter((r) => Boolean(r.isCustom)).count(),
        db.exercises.filter((e) => Boolean(e.isCustom)).count(),
        db.routines.filter((r) => Boolean(r.isCustom)).count(),
        db.user_base_info.toCollection().first(),
      ]);

      const localCount =
        dietLogsCount +
        workoutLogsCount +
        metricsCount +
        customFoodsCount +
        customRecipesCount +
        customExercisesCount +
        customRoutinesCount;

      // 3. 若本機完全無任何日誌與自定義數據，直接執行覆寫匯入
      if (localCount === 0) {
        const result = await executeImport(parsed, 'overwrite');
        if (result.success) {
          triggerHaptic('success');
          toast.show(t('settings.imported'));
        }
        return;
      }

      // 4. 若本機已有數據，暫存數據並呼出策略選擇彈窗
      setStagedBackupData(parsed);
      setStagedLocalBase(localBase || null);
      setIsImportStrategyModalOpen(true);
    } catch (err: unknown) {
      triggerHaptic('error');
      if (err instanceof Error && err.message === 'INVALID_BACKUP_FILE') {
        toast.show(t('settings.invalidBackupFile'));
      } else {
        toast.show(t('settings.importFailed'));
      }
    }
  };

  // 執行確認之匯入策略
  const handleExecuteImport = async (strategy: ImportStrategy) => {
    if (!stagedBackupData) return;
    try {
      const result = await executeImport(stagedBackupData, strategy);
      if (result.success) {
        triggerHaptic('success');
        toast.show(t('settings.imported'));
      }
    } catch {
      triggerHaptic('error');
      toast.show(t('settings.importFailed'));
    }
  };

  // 恢復缺失的系統預設資料
  const handleRestoreDefaults = async () => {
    const ok = await confirm({
      title: t('settings.restoreDefaults'),
      description: t('settings.restoreDefaultsConfirm'),
    });

    if (ok) {
      try {
        const res = await db.restoreDefaultData();
        if (res.totalRestored > 0) {
          triggerHaptic('success');
          toast.show(t('settings.defaultsRestoredWithCount', { count: res.totalRestored }));
        } else {
          toast.show(t('settings.noDefaultsToRestore'));
        }
      } catch {
        toast.show(t('common.error'));
      }
    }
  };

  // 開啟清除所有本地資料之高防呆安全確認彈窗
  const handleClearData = () => {
    triggerHaptic('warning');
    setIsClearDataModalOpen(true);
  };


  return (
    <div className="w-full max-w-xl mx-auto space-y-7 pb-20 select-none">
      {/* 區塊 0：個人資料 */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        <div className="sm:col-span-4 space-y-0.5 px-1 sm:px-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
            {t('settings.profileSection')}
          </h2>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
            {t('settings.profileDesc')}
          </p>
        </div>
        <div className="sm:col-span-8 border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          <Link
            to="/profile"
            onClick={() => triggerHaptic('light')}
            className="usage-row hover:bg-hover transition-colors group cursor-pointer"
          >
            <span className="text-sm font-normal text-foreground">{t('settings.profile')}</span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
              <span>{profile.name || '-'}</span>
              <ChevronRight className="size-4" />
            </div>
          </Link>
        </div>
      </section>

      {/* 區塊 1：偏好設定 */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        <div className="sm:col-span-4 space-y-0.5 px-1 sm:px-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
            {t('settings.preferencesSection')}
          </h2>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
            {t('settings.preferencesDesc')}
          </p>
        </div>
        <div className="sm:col-span-8 border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 外觀主題 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">{t('settings.theme')}</span>
            <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {getThemeLabel(theme)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="system">{t('settings.themeSystem')}</SelectItem>
                <SelectItem value="light">{t('settings.themeLight')}</SelectItem>
                <SelectItem value="dark">{t('settings.themeDark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 介面語言 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">{t('settings.language')}</span>
            <Select
              value={currentLang}
              onValueChange={(v) => i18n.changeLanguage(v || 'en')}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {getLanguageLabel(currentLang)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-44">
                <SelectItem value="zh-TW">繁體中文 (台灣)</SelectItem>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* 分割線 */}
      <div className="border-t border-border/60" />

      {/* 區塊 2：度量衡單位偏好 */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        <div className="sm:col-span-4 space-y-0.5 px-1 sm:px-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
            {t('settings.unitsSection')}
          </h2>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
            {t('settings.unitsDesc')}
          </p>
        </div>
        <div className="sm:col-span-8 border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 制式模板 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">{t('settings.unitPreset')}</span>
            <Select
              value={preferences.preset}
              onValueChange={(v) => {
                triggerHaptic('selection');
                updatePreset(v as UnitSystemPreset);
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {getPresetLabel(preferences.preset)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-48">
                <SelectItem value="metric">{t('settings.unitPresetMetric')}</SelectItem>
                <SelectItem value="imperial">{t('settings.unitPresetImperial')}</SelectItem>
                <SelectItem value="custom">{t('settings.unitPresetCustom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 體重與訓練重量 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">{t('settings.unitBodyWeight')}</span>
            <Select
              value={preferences.bodyWeight}
              onValueChange={(v) => {
                triggerHaptic('selection');
                updatePreference('bodyWeight', v as BodyWeightUnit);
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {preferences.bodyWeight}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-28">
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lbs">lbs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 食材重量 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">{t('settings.unitFoodWeight')}</span>
            <Select
              value={preferences.foodWeight}
              onValueChange={(v) => {
                triggerHaptic('selection');
                updatePreference('foodWeight', v as FoodWeightUnit);
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {preferences.foodWeight}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-28">
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="oz">oz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 液體容量 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">{t('settings.unitFoodVolume')}</span>
            <Select
              value={preferences.foodVolume}
              onValueChange={(v) => {
                triggerHaptic('selection');
                updatePreference('foodVolume', v as FoodVolumeUnit);
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {preferences.foodVolume}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-28">
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="fl oz">fl oz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 身高與圍度 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">{t('settings.unitLength')}</span>
            <Select
              value={preferences.length}
              onValueChange={(v) => {
                triggerHaptic('selection');
                updatePreference('length', v as LengthUnit);
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {preferences.length}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-28">
                <SelectItem value="cm">cm</SelectItem>
                <SelectItem value="in">in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 熱量能量 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">{t('settings.unitEnergy')}</span>
            <Select
              value={preferences.energy}
              onValueChange={(v) => {
                triggerHaptic('selection');
                updatePreference('energy', v as EnergyUnit);
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {preferences.energy}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-28">
                <SelectItem value="kcal">kcal</SelectItem>
                <SelectItem value="kJ">kJ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* 分割線 */}
      <div className="border-t border-border/60" />

      {/* 區塊 3：體態指標追蹤與忽略設定 */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        <div className="sm:col-span-4 space-y-0.5 px-1 sm:px-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
            {t('settings.bodyTrackingSection', '體態指標')}
          </h2>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
            {t('settings.bodyTrackingDesc', '自訂需記錄或忽略的圍度範圍')}
          </p>
        </div>
        <div className="sm:col-span-8 border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 1. 胸腰臀 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">
              {t('settings.torsoCircumference', '胸腰臀')}
            </span>
            <Select
              value={bodyPreferences.ignoreTorsoCircumferences ? 'ignore' : 'track'}
              onValueChange={(v) => {
                triggerHaptic('selection');
                updateBodyPreference('ignoreTorsoCircumferences', v === 'ignore');
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {bodyPreferences.ignoreTorsoCircumferences
                    ? t('settings.ignore', '忽略')
                    : t('settings.track', '記錄')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-28">
                <SelectItem value="track">{t('settings.track', '記錄')}</SelectItem>
                <SelectItem value="ignore">{t('settings.ignore', '忽略')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. 手臂、大腿圍 */}
          <div className="usage-row">
            <span className="text-sm font-normal text-foreground">
              {t('settings.limbCircumference', '手臂、大腿圍')}
            </span>
            <Select
              value={bodyPreferences.ignoreLimbCircumferences ? 'ignore' : 'track'}
              onValueChange={(v) => {
                triggerHaptic('selection');
                updateBodyPreference('ignoreLimbCircumferences', v === 'ignore');
              }}
            >
              <SelectTrigger
                size="custom"
                className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <SelectValue className="flex-none text-right">
                  {bodyPreferences.ignoreLimbCircumferences
                    ? t('settings.ignore', '忽略')
                    : t('settings.track', '記錄')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-28">
                <SelectItem value="track">{t('settings.track', '記錄')}</SelectItem>
                <SelectItem value="ignore">{t('settings.ignore', '忽略')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* 分割線 */}
      <div className="border-t border-border/60" />

      {/* 區塊 3：自訂資料庫管理 (飲食庫 + 訓練庫) */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        <div className="sm:col-span-4 space-y-0.5 px-1 sm:px-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
            {t('settings.databaseSection')}
          </h2>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
            {t('settings.databaseDesc')}
          </p>
        </div>
        <div className="sm:col-span-8 border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 飲食資料管理 */}
          <Link
            to="/settings/foods"
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.dietSection')}
            </span>
            <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* 訓練資料管理 */}
          <Link
            to="/settings/exercises"
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.workoutSection')}
            </span>
            <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* 恢復預設數據 */}
          <div
            onClick={handleRestoreDefaults}
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.restoreDefaults')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>{t('settings.restoreDefaultsAction')}</span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </section>

      {/* 分割線 */}
      <div className="border-t border-border/60" />

      {/* 區塊 4：資料與儲存 */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        <div className="sm:col-span-4 space-y-0.5 px-1 sm:px-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
            {t('settings.dataVaultSection')}
          </h2>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
            {t('settings.dataVaultDesc')}
          </p>
        </div>
        <div className="sm:col-span-8 border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* Dropbox 雲端同步 */}
          <div
            onClick={() => {
              triggerHaptic('selection');
              setIsDropboxDialogOpen(true);
            }}
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.dropboxSync', 'Dropbox 同步')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              {!isDropboxAuth ? (
                <span>{t('settings.disconnected', '未連線')}</span>
              ) : isDropboxSyncing ? (
                <span className="text-primary">{t('settings.syncing', '同步中…')}</span>
              ) : (
                <span className="text-emerald-500 font-medium">{t('settings.connected', '已連線')}</span>
              )}
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* 匯出資料備份 */}
          <div
            onClick={handleExportZip}
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.exportData')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>ZIP</span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* 匯入資料備份 */}
          <div
            onClick={handleImportClick}
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.importData')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>ZIP</span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* 隱藏之備份檔案選擇器 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.json,application/zip,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </section>

      {/* 分割線 */}
      <div className="border-t border-border/60" />

      {/* 區塊 5：危險操作 */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        <div className="sm:col-span-4 space-y-0.5 px-1 sm:px-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive font-mono">
            {t('settings.dangerZoneSection')}
          </h2>
          <p className="text-[11px] text-destructive/70 font-mono leading-relaxed">
            {t('settings.dangerZoneDesc')}
          </p>
        </div>
        <div className="sm:col-span-8 border border-destructive/25 rounded-lg overflow-hidden bg-card">
          {/* 清除所有本地資料 */}
          <div
            onClick={handleClearData}
            className="h-12 px-4 flex items-center justify-between hover:bg-destructive-subtle transition-colors cursor-pointer group"
          >
            <span className="text-sm font-normal text-destructive">
              {t('settings.clearData')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-destructive/70 group-hover:text-destructive">
              <span>{t('settings.clearDataAction')}</span>
              <ChevronRight className="size-4 opacity-70" />
            </div>
          </div>
        </div>
      </section>

      {/* 頁尾版本標記 */}
      <div className="pt-4 text-center font-mono text-xs text-muted-foreground/50">
        Zenfit v1.0.0
      </div>

      {/* Dropbox 同步設定彈窗 (遵循 ui-guidelines 平級兄弟節點聲明) */}
      <DropboxSyncDialog
        open={isDropboxDialogOpen}
        onOpenChange={setIsDropboxDialogOpen}
        isAuthenticated={isDropboxAuth}
        isSyncing={isDropboxSyncing}
        lastSyncTime={dropboxLastSyncTime}
        isOnline={isOnline}
        onConnectDropbox={connectDropbox}
        onDisconnectDropbox={disconnectDropbox}
        onSyncNow={dropboxSyncNow}
      />

      {/* 清除本地資料高防呆確認彈窗 (平級兄弟節點聲明) */}
      <ClearDataModal
        isOpen={isClearDataModalOpen}
        onClose={() => setIsClearDataModalOpen(false)}
      />

      {/* 備份匯入衝突策略選擇彈窗 (平級兄弟節點聲明) */}
      <ImportStrategyModal
        isOpen={isImportStrategyModalOpen}
        onClose={() => {
          setIsImportStrategyModalOpen(false);
          setStagedBackupData(null);
        }}
        localBaseInfo={stagedLocalBase}
        backupBaseInfo={stagedBackupData?.baseInfos[0] || null}
        onConfirm={handleExecuteImport}
      />
    </div>
  );
}
