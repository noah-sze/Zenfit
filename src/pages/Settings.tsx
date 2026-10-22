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
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFoods } from '@/hooks/useFoods';
import { useRecipes } from '@/hooks/useRecipes';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { useEquipments } from '@/hooks/useEquipments';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const confirm = useConfirm();
  const { customFoods, archivedCustomFoods } = useFoods();
  const { customRecipes, archivedCustomRecipes } = useRecipes();
  const { activeExercises, archivedCustomExercises } = useExercises();
  const { activeRoutines, archivedCustomRoutines } = useRoutines();
  const { activeEquipments, archivedCustomEquipments } = useEquipments();

  const currentLang = i18n.resolvedLanguage || i18n.language || 'en';

  const getThemeLabel = (tVal: string) => {
    if (tVal === 'light') return t('settings.themeLight');
    if (tVal === 'dark') return t('settings.themeDark');
    return t('settings.themeSystem');
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

  // 匯出資料備份
  const handleExportJson = async () => {
    try {
      const [userBaseInfo, foods, dietPlans, foodLogs, exercises, workoutLogs, bodyMetrics] =
        await Promise.all([
          db.user_base_info.toArray(),
          db.foods.toArray(),
          db.diet_plans.toArray(),
          db.food_logs.toArray(),
          db.exercises.toArray(),
          db.workout_logs.toArray(),
          db.body_metrics.toArray(),
        ]);

      const data = {
        version: 2,
        appName: 'Zenfit',
        exportedAt: new Date().toISOString(),
        profile: {
          userBaseInfo: userBaseInfo[0] || null,
        },
        diet: {
          foods,
          dietPlans,
          foodLogs,
        },
        workout: {
          exercises,
          workoutLogs,
        },
        body: {
          bodyMetrics,
        },
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenfit-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      triggerHaptic('success');
      toast.show(t('settings.exported'));
    } catch {
      toast.show(t('common.error'));
    }
  };

  // 清除所有本地資料
  const handleClearData = async () => {
    const ok = await confirm({
      title: t('settings.clearData'),
      description: t('settings.clearDataConfirm'),
      variant: 'destructive',
    });

    if (ok) {
      try {
        await Promise.all([
          db.foods.clear(),
          db.food_logs.clear(),
          db.diet_plans.clear(),
          db.exercises.clear(),
          db.workout_logs.clear(),
          db.body_metrics.clear(),
          db.user_base_info.clear(),
        ]);
        triggerHaptic('warning');
        toast.show(t('settings.dataCleared'));
      } catch {
        toast.show(t('common.error'));
      }
    }
  };


  return (
    <div className="w-full max-w-md mx-auto space-y-6 pb-20">
      {/* 區塊 1：偏好設定 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('settings.preferencesSection')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
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
      </div>

      {/* 區塊 2：飲食資料管理 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('settings.dietSection')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 單品食材管理入口 */}
          <Link
            to="/settings/foods"
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('diet.foodItems')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>
                {t('settings.activeCount', { count: customFoods.length })}
                {archivedCustomFoods.length > 0
                  ? ` · ${t('settings.archivedCount', { count: archivedCustomFoods.length })}`
                  : ''}
              </span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* 菜餚組合管理入口 */}
          <Link
            to="/settings/recipes"
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('diet.recipes')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>
                {t('settings.activeCount', { count: customRecipes.length })}
                {archivedCustomRecipes.length > 0
                  ? ` · ${t('settings.archivedCount', { count: archivedCustomRecipes.length })}`
                  : ''}
              </span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>
      </div>

      {/* 區塊 3：訓練資料管理 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('settings.workoutSection')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 單品動作管理入口 */}
          <Link
            to="/settings/exercises"
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.exercises')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>
                {t('settings.activeCount', { count: activeExercises.length })}
                {archivedCustomExercises.length > 0
                  ? ` · ${t('settings.archivedCount', { count: archivedCustomExercises.length })}`
                  : ''}
              </span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* 訓練組合管理入口 */}
          <Link
            to="/settings/routines"
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.routines')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>
                {t('settings.activeCount', { count: activeRoutines.length })}
                {archivedCustomRoutines.length > 0
                  ? ` · ${t('settings.archivedCount', { count: archivedCustomRoutines.length })}`
                  : ''}
              </span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* 器械管理入口 */}
          <Link
            to="/settings/equipments"
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.equipments')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>
                {t('settings.activeCount', { count: activeEquipments.length })}
                {archivedCustomEquipments.length > 0
                  ? ` · ${t('settings.archivedCount', { count: archivedCustomEquipments.length })}`
                  : ''}
              </span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>
      </div>

      {/* 區塊 4：資料與儲存 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('settings.dataVaultSection')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 匯出資料備份 */}
          <div
            onClick={handleExportJson}
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.exportData')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>JSON</span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>


      {/* 區塊 5：危險操作 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-destructive/80 px-1 mb-2">
          {t('settings.dangerZoneSection')}
        </div>
        <div className="border border-destructive/25 rounded-lg overflow-hidden bg-card">
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
      </div>

      {/* 頁尾版本標記 (完全復刻 Zenance) */}
      <div className="pt-4 text-center font-mono text-xs text-muted-foreground/50">
        Zenfit v1.0.0
      </div>
    </div>
  );
}
