import { useState, useEffect, useCallback } from 'react';
import type {
  UnitPreferences,
  UnitSystemPreset,
} from '@/types';
import { DEFAULT_UNIT_PREFERENCES } from '@/types';
import { db } from '@/services/db/db';

const STORAGE_KEY = 'zenfit_unit_preferences';
const EVENT_KEY = 'zenfit_unit_preferences_change';

const METRIC_PRESETS: Omit<UnitPreferences, 'preset'> = {
  bodyWeight: 'kg',
  foodWeight: 'g',
  foodVolume: 'ml',
  length: 'cm',
  energy: 'kcal',
};

const IMPERIAL_PRESETS: Omit<UnitPreferences, 'preset'> = {
  bodyWeight: 'lbs',
  foodWeight: 'oz',
  foodVolume: 'fl oz',
  length: 'in',
  energy: 'kcal',
};

function readStoredPreferences(): UnitPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_UNIT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      preset: parsed.preset || 'metric',
      bodyWeight: parsed.bodyWeight || 'kg',
      foodWeight: parsed.foodWeight || 'g',
      foodVolume: parsed.foodVolume || 'ml',
      length: parsed.length || 'cm',
      energy: parsed.energy || 'kcal',
    };
  } catch {
    return DEFAULT_UNIT_PREFERENCES;
  }
}

function determinePreset(prefs: Omit<UnitPreferences, 'preset'>): UnitSystemPreset {
  const isMetric =
    prefs.bodyWeight === METRIC_PRESETS.bodyWeight &&
    prefs.foodWeight === METRIC_PRESETS.foodWeight &&
    prefs.foodVolume === METRIC_PRESETS.foodVolume &&
    prefs.length === METRIC_PRESETS.length &&
    prefs.energy === METRIC_PRESETS.energy;

  if (isMetric) return 'metric';

  const isImperial =
    prefs.bodyWeight === IMPERIAL_PRESETS.bodyWeight &&
    prefs.foodWeight === IMPERIAL_PRESETS.foodWeight &&
    prefs.foodVolume === IMPERIAL_PRESETS.foodVolume &&
    prefs.length === IMPERIAL_PRESETS.length &&
    prefs.energy === IMPERIAL_PRESETS.energy;

  if (isImperial) return 'imperial';

  return 'custom';
}

function persistPreferences(nextPrefs: UnitPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPrefs));
    window.dispatchEvent(new Event(EVENT_KEY));

    // 同步既有資料庫中的 user_base_info.weightUnit (相容性保障)
    db.user_base_info.toCollection().first().then((info) => {
      if (info && info.weightUnit !== nextPrefs.bodyWeight) {
        db.user_base_info.update(info.id, {
          weightUnit: nextPrefs.bodyWeight,
          updatedAt: Date.now(),
        }).catch(() => {});
      }
    }).catch(() => {});
  } catch {
    // Ignore storage errors
  }
}

/**
 * 全域度量衡單位偏好 Hook (Global Unit Preferences Hook)
 * 提供即時響應式狀態、制式模板快速套用與各維度單項自訂
 */
export function useUnitPreferences() {
  const [preferences, setPreferences] = useState<UnitPreferences>(readStoredPreferences);

  useEffect(() => {
    const handleUpdate = () => {
      setPreferences(readStoredPreferences());
    };

    window.addEventListener(EVENT_KEY, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // 一鍵套用模板制式 (公制 / 英制 / 自定義)
  const updatePreset = useCallback((preset: UnitSystemPreset) => {
    let next: UnitPreferences;
    if (preset === 'metric') {
      next = { preset: 'metric', ...METRIC_PRESETS };
    } else if (preset === 'imperial') {
      next = { preset: 'imperial', ...IMPERIAL_PRESETS };
    } else {
      next = { ...readStoredPreferences(), preset: 'custom' };
    }
    setPreferences(next);
    persistPreferences(next);
  }, []);

  // 更新單一維度偏好 (若偏離模板自動設為 custom)
  const updatePreference = useCallback(
    <K extends keyof UnitPreferences>(key: K, value: UnitPreferences[K]) => {
      const current = readStoredPreferences();
      if (key === 'preset') {
        updatePreset(value as UnitSystemPreset);
        return;
      }

      const nextRaw = {
        ...current,
        [key]: value,
      };
      const nextPreset = determinePreset(nextRaw);
      const next: UnitPreferences = {
        ...nextRaw,
        preset: nextPreset,
      };

      setPreferences(next);
      persistPreferences(next);
    },
    [updatePreset]
  );

  return {
    preferences,
    updatePreset,
    updatePreference,
    // 常用快捷屬性
    bodyWeightUnit: preferences.bodyWeight,
    foodWeightUnit: preferences.foodWeight,
    foodVolumeUnit: preferences.foodVolume,
    lengthUnit: preferences.length,
    energyUnit: preferences.energy,
  };
}
