import { useState, useEffect, useCallback } from 'react';
import type { BodyPreferences } from '@/types';
import { DEFAULT_BODY_PREFERENCES } from '@/types';

export const STORAGE_KEY = 'zenfit_body_preferences';
export const EVENT_KEY = 'zenfit_body_preferences_change';

export function readStoredBodyPreferences(): BodyPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BODY_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ignoreTorsoCircumferences: Boolean(parsed.ignoreTorsoCircumferences),
      ignoreLimbCircumferences: Boolean(parsed.ignoreLimbCircumferences),
    };
  } catch {
    return DEFAULT_BODY_PREFERENCES;
  }
}

export function persistBodyPreferences(nextPrefs: BodyPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPrefs));
    window.dispatchEvent(new Event(EVENT_KEY));
  } catch {
    // Ignore storage errors
  }
}

/**
 * 全域體態追蹤與忽略偏好 Hook (Global Body Preferences Hook)
 * 支援即時響應式狀態、多分頁同步與單項偏好更新
 */
export function useBodyPreferences() {
  const [bodyPreferences, setBodyPreferences] = useState<BodyPreferences>(readStoredBodyPreferences);

  useEffect(() => {
    const handleUpdate = () => {
      setBodyPreferences(readStoredBodyPreferences());
    };

    window.addEventListener(EVENT_KEY, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateBodyPreference = useCallback(
    <K extends keyof BodyPreferences>(key: K, value: BodyPreferences[K]) => {
      setBodyPreferences((prev) => {
        const next = { ...prev, [key]: value };
        persistBodyPreferences(next);
        return next;
      });
    },
    []
  );

  const toggleBodyPreference = useCallback((key: keyof BodyPreferences) => {
    setBodyPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persistBodyPreferences(next);
      return next;
    });
  }, []);

  return {
    bodyPreferences,
    updateBodyPreference,
    toggleBodyPreference,
  };
}
