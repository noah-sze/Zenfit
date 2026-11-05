import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  readStoredBodyPreferences,
  persistBodyPreferences,
  STORAGE_KEY,
  EVENT_KEY,
} from './useBodyPreferences';
import { DEFAULT_BODY_PREFERENCES } from '@/types';

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('useBodyPreferences 核心儲存與解析邏輯', () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;
  let mockStorage: LocalStorageMock;

  beforeEach(() => {
    mockStorage = new LocalStorageMock();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    if (!globalThis.window) {
      Object.defineProperty(globalThis, 'window', {
        value: {
          dispatchEvent: () => true,
        },
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    if (!originalWindow) {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it('無本機快取時應返回預設偏好設定', () => {
    const prefs = readStoredBodyPreferences();
    expect(prefs).toEqual(DEFAULT_BODY_PREFERENCES);
    expect(prefs.ignoreTorsoCircumferences).toBe(false);
    expect(prefs.ignoreLimbCircumferences).toBe(false);
  });

  it('應能正確持久化並讀取忽略胸腰臀偏好', () => {
    persistBodyPreferences({
      ignoreTorsoCircumferences: true,
      ignoreLimbCircumferences: false,
    });

    const prefs = readStoredBodyPreferences();
    expect(prefs.ignoreTorsoCircumferences).toBe(true);
    expect(prefs.ignoreLimbCircumferences).toBe(false);

    const storedRaw = mockStorage.getItem(STORAGE_KEY);
    expect(storedRaw).toContain('"ignoreTorsoCircumferences":true');
  });

  it('應能正確持久化並讀取忽略手臂大腿圍偏好', () => {
    persistBodyPreferences({
      ignoreTorsoCircumferences: false,
      ignoreLimbCircumferences: true,
    });

    const prefs = readStoredBodyPreferences();
    expect(prefs.ignoreTorsoCircumferences).toBe(false);
    expect(prefs.ignoreLimbCircumferences).toBe(true);
  });

  it('儲存損壞的 JSON 時應安全回退至預設值', () => {
    mockStorage.setItem(STORAGE_KEY, 'invalid-json{{{');
    const prefs = readStoredBodyPreferences();
    expect(prefs).toEqual(DEFAULT_BODY_PREFERENCES);
  });

  it('持久化時應調用 window.dispatchEvent', () => {
    let dispatched = false;
    globalThis.window.dispatchEvent = (event: Event) => {
      if (event.type === EVENT_KEY) {
        dispatched = true;
      }
      return true;
    };

    persistBodyPreferences({
      ignoreTorsoCircumferences: true,
      ignoreLimbCircumferences: true,
    });

    expect(dispatched).toBe(true);
  });
});
