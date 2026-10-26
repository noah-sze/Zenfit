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
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import type {
  UnitSystemPreset,
  BodyWeightUnit,
  FoodWeightUnit,
  FoodVolumeUnit,
  LengthUnit,
  EnergyUnit,
} from '@/types';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreset, updatePreference } = useUnitPreferences();
  const confirm = useConfirm();
  const { activeFoods, archivedFoods } = useFoods();
  const { activeRecipes, archivedRecipes } = useRecipes();
  const { activeExercises, archivedExercises } = useExercises();
  const { activeRoutines, archivedRoutines } = useRoutines();
  const { activeEquipments, archivedEquipments } = useEquipments();

  const totalActiveFoods = activeFoods.length;
  const totalArchivedFoods = archivedFoods.length;

  const totalActiveRecipes = activeRecipes.length;
  const totalArchivedRecipes = archivedRecipes.length;

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
    <div className="w-full max-w-xl mx-auto space-y-6 pb-20">
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

      {/* 區塊：度量衡單位偏好 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('settings.unitsSection')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
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
      </div>

      {/* 區塊 2：飲食資料管理 */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
          {t('settings.dietSection')}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
          {/* 食材與食譜合一入口 */}
          <Link
            to="/settings/foods"
            className="usage-row cursor-pointer group"
          >
            <span className="text-sm font-normal text-foreground">
              {t('settings.dietSection')}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground group-hover:text-foreground">
              <span>
                {totalArchivedFoods + totalArchivedRecipes > 0
                  ? t('settings.dietCombinedSubtitleWithArchived', {
                      foods: totalActiveFoods,
                      recipes: totalActiveRecipes,
                      archived: totalArchivedFoods + totalArchivedRecipes,
                    })
                  : t('settings.dietCombinedSubtitle', {
                      foods: totalActiveFoods,
                      recipes: totalActiveRecipes,
                    })}
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
          {/* 器械入口 */}
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
                {archivedEquipments.length > 0
                  ? ` · ${t('settings.archivedCount', { count: archivedEquipments.length })}`
                  : ''}
              </span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* 動作入口 */}
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
                {archivedExercises.length > 0
                  ? ` · ${t('settings.archivedCount', { count: archivedExercises.length })}`
                  : ''}
              </span>
              <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* 訓練組合入口 */}
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
                {archivedRoutines.length > 0
                  ? ` · ${t('settings.archivedCount', { count: archivedRoutines.length })}`
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
