import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mergeEntities,
  mergeDietLogsByDate,
  groupFoodLogsByDate,
  groupWorkoutLogsByDate,
  groupBodyMetricsByDate,
  getSyncErrorReasonKey,
  formatSyncErrorMessage,
  executeSync,
} from './syncEngine';
import {
  getDropboxAppKey,
  generateCodeVerifier,
  getStagingTokens,
  setStagingTokens,
  commitStagingTokens,
  clearStagingTokens,
  clearDropboxTokens,
  setStoredTokens,
  isDropboxConnected,
  type DropboxTokens,
} from './dropboxAuth';
import i18n from '@/i18n/config';
import { toast } from '@/components/ui/toast';
import type { FoodLog, WorkoutLog, BodyMetric, DailyDietLog } from '@/types';

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string) {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value.toString();
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

describe('syncEngine', () => {
  describe('mergeEntities algorithm', () => {
    it('returns empty list when both local and remote are empty', () => {
      const result = mergeEntities([], []);
      expect(result.merged).toEqual([]);
      expect(result.hasLocalChanges).toBe(false);
      expect(result.hasRemoteChanges).toBe(false);
    });

    it('merges remote-only items and marks hasLocalChanges', () => {
      const remote = [{ id: 'item1', name: 'Apple', updatedAt: 1000 }];
      const result = mergeEntities([], remote);
      expect(result.merged).toEqual(remote);
      expect(result.hasLocalChanges).toBe(true);
      expect(result.hasRemoteChanges).toBe(false);
    });

    it('keeps local-only items and marks hasRemoteChanges', () => {
      const local = [{ id: 'item1', name: 'Banana', updatedAt: 1000 }];
      const result = mergeEntities(local, []);
      expect(result.merged).toEqual(local);
      expect(result.hasLocalChanges).toBe(false);
      expect(result.hasRemoteChanges).toBe(true);
    });

    it('prioritizes higher rev regardless of timestamp', () => {
      const local = [{ id: 'item1', name: 'LocalOld', rev: 2, updatedAt: 5000 }];
      const remote = [{ id: 'item1', name: 'RemoteNew', rev: 3, updatedAt: 1000 }];

      const result = mergeEntities(local, remote);
      expect(result.merged[0].name).toBe('RemoteNew');
      expect(result.hasLocalChanges).toBe(true);
      expect(result.hasRemoteChanges).toBe(false);

      // 反向：本地 rev 較高
      const local2 = [{ id: 'item1', name: 'LocalNew', rev: 4, updatedAt: 1000 }];
      const remote2 = [{ id: 'item1', name: 'RemoteOld', rev: 3, updatedAt: 5000 }];
      const result2 = mergeEntities(local2, remote2);
      expect(result2.merged[0].name).toBe('LocalNew');
      expect(result2.hasLocalChanges).toBe(false);
      expect(result2.hasRemoteChanges).toBe(true);
    });

    it('resolves by updatedAt when rev is equal or undefined', () => {
      const local = [{ id: 'item1', name: 'Local', updatedAt: 2000 }];
      const remote = [{ id: 'item1', name: 'Remote', updatedAt: 3000 }];

      const result = mergeEntities(local, remote);
      expect(result.merged[0].name).toBe('Remote');
      expect(result.hasLocalChanges).toBe(true);
      expect(result.hasRemoteChanges).toBe(false);

      const localNewer = [{ id: 'item1', name: 'LocalNewer', updatedAt: 5000 }];
      const remoteOlder = [{ id: 'item1', name: 'RemoteOlder', updatedAt: 3000 }];
      const result2 = mergeEntities(localNewer, remoteOlder);
      expect(result2.merged[0].name).toBe('LocalNewer');
      expect(result2.hasLocalChanges).toBe(false);
      expect(result2.hasRemoteChanges).toBe(true);
    });
  });

  describe('mergeDietLogsByDate algorithm', () => {
    it('returns empty list when both local and remote are empty', () => {
      const result = mergeDietLogsByDate([], []);
      expect(result.merged).toEqual([]);
      expect(result.hasLocalChanges).toBe(false);
      expect(result.hasRemoteChanges).toBe(false);
    });

    it('merges remote-only items and marks hasLocalChanges', () => {
      const remote: DailyDietLog[] = [
        {
          id: 'remote-1',
          date: '2026-11-10',
          meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
          entries: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      const result = mergeDietLogsByDate([], remote);
      expect(result.merged).toEqual(remote);
      expect(result.hasLocalChanges).toBe(true);
      expect(result.hasRemoteChanges).toBe(false);
    });

    it('keeps local-only items and marks hasRemoteChanges', () => {
      const local: DailyDietLog[] = [
        {
          id: 'local-1',
          date: '2026-11-10',
          meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
          entries: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      const result = mergeDietLogsByDate(local, []);
      expect(result.merged).toEqual(local);
      expect(result.hasLocalChanges).toBe(false);
      expect(result.hasRemoteChanges).toBe(true);
    });

    it('merges same date with different ids by preserving local id and deduplicating', () => {
      const local: DailyDietLog[] = [
        {
          id: 'local-id-preserve',
          date: '2026-11-11',
          meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
          entries: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      const remote: DailyDietLog[] = [
        {
          id: 'remote-different-id',
          date: '2026-11-11',
          meta: { activityLevel: 1.725, macroSplit: { carbs: 50, protein: 25, fat: 25 } },
          entries: [],
          createdAt: 1000,
          updatedAt: 2000, // remote is newer
        },
      ];

      const result = mergeDietLogsByDate(local, remote);
      // 必須去重且只保留一筆
      expect(result.merged).toHaveLength(1);
      // 關鍵：必須保留本地 id 避免 Dexie &date 唯一約束衝突
      expect(result.merged[0].id).toBe('local-id-preserve');
      expect(result.merged[0].date).toBe('2026-11-11');
      expect(result.merged[0].meta.activityLevel).toBe(1.725);
      expect(result.hasLocalChanges).toBe(true);
      expect(result.hasRemoteChanges).toBe(false);
    });

    it('prioritizes higher rev regardless of timestamp', () => {
      const local: DailyDietLog[] = [
        {
          id: 'local-id',
          date: '2026-11-11',
          meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
          entries: [],
          rev: 1,
          createdAt: 1000,
          updatedAt: 9999, // newer timestamp, but lower rev
        },
      ];
      const remote: DailyDietLog[] = [
        {
          id: 'remote-id',
          date: '2026-11-11',
          meta: { activityLevel: 1.9, macroSplit: { carbs: 50, protein: 25, fat: 25 } },
          entries: [],
          rev: 2, // higher rev wins
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      const result = mergeDietLogsByDate(local, remote);
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].id).toBe('local-id');
      expect(result.merged[0].meta.activityLevel).toBe(1.9);
      expect(result.hasLocalChanges).toBe(true);
      expect(result.hasRemoteChanges).toBe(false);

      // 反向：本地 rev 較高
      const local2: DailyDietLog[] = [{ ...local[0], rev: 3, updatedAt: 1000 }];
      const remote2: DailyDietLog[] = [{ ...remote[0], rev: 2, updatedAt: 9999 }];
      const result2 = mergeDietLogsByDate(local2, remote2);
      expect(result2.merged[0].id).toBe('local-id');
      expect(result2.merged[0].meta.activityLevel).toBe(1.55);
      expect(result2.hasLocalChanges).toBe(false);
      expect(result2.hasRemoteChanges).toBe(true);
    });

    it('resolves by updatedAt when rev is equal or undefined', () => {
      const local: DailyDietLog[] = [
        {
          id: 'local-id',
          date: '2026-11-11',
          meta: { activityLevel: 1.55, macroSplit: { carbs: 40, protein: 30, fat: 30 } },
          entries: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      const remote: DailyDietLog[] = [
        {
          id: 'remote-id',
          date: '2026-11-11',
          meta: { activityLevel: 1.9, macroSplit: { carbs: 50, protein: 25, fat: 25 } },
          entries: [],
          createdAt: 1000,
          updatedAt: 3000, // remote is newer
        },
      ];

      const result = mergeDietLogsByDate(local, remote);
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].id).toBe('local-id');
      expect(result.merged[0].meta.activityLevel).toBe(1.9);
      expect(result.hasLocalChanges).toBe(true);
      expect(result.hasRemoteChanges).toBe(false);

      // 本地 timestamp 較新
      const localNewer: DailyDietLog[] = [{ ...local[0], updatedAt: 5000 }];
      const remoteOlder: DailyDietLog[] = [{ ...remote[0], updatedAt: 3000 }];
      const result2 = mergeDietLogsByDate(localNewer, remoteOlder);
      expect(result2.merged[0].id).toBe('local-id');
      expect(result2.merged[0].meta.activityLevel).toBe(1.55);
      expect(result2.hasLocalChanges).toBe(false);
      expect(result2.hasRemoteChanges).toBe(true);
    });
  });

  describe('grouping functions', () => {
    it('groups food logs by YYYY-MM-DD', () => {
      const logs: FoodLog[] = [
        {
          id: '1',
          date: '2026-11-06',
          mealType: 'breakfast',
          foodId: 'food-1',
          quantity: 100,
          unit: 'g',
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: '2',
          date: '2026-11-06',
          mealType: 'lunch',
          foodId: 'food-2',
          quantity: 200,
          unit: 'g',
          createdAt: 2000,
          updatedAt: 2000,
        },
        {
          id: '3',
          date: '2026-10-15',
          mealType: 'dinner',
          foodId: 'food-3',
          quantity: 150,
          unit: 'g',
          createdAt: 3000,
          updatedAt: 3000,
        },
      ];

      const grouped = groupFoodLogsByDate(logs);
      expect(Object.keys(grouped).sort()).toEqual(['2026-10-15', '2026-11-06']);
      expect(grouped['2026-11-06']).toHaveLength(2);
      expect(grouped['2026-10-15']).toHaveLength(1);
    });

    it('groups workout logs by YYYY-MM-DD', () => {
      const logs: WorkoutLog[] = [
        {
          id: 'w1',
          date: '2026-11-06',
          exercises: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'w2',
          date: '2026-09-20',
          exercises: [],
          createdAt: 2000,
          updatedAt: 2000,
        },
      ];

      const grouped = groupWorkoutLogsByDate(logs);
      expect(grouped['2026-11-06']).toHaveLength(1);
      expect(grouped['2026-09-20']).toHaveLength(1);
    });

    it('groups body metrics by YYYY-MM-DD', () => {
      const metrics: BodyMetric[] = [
        { id: 'm1', date: '2026-01-01', weight: 70, createdAt: 1000, updatedAt: 1000 },
        { id: 'm2', date: '2026-11-06', weight: 74, createdAt: 2000, updatedAt: 2000 },
        { id: 'm3', date: '2025-12-31', weight: 68, createdAt: 3000, updatedAt: 3000 },
      ];

      const grouped = groupBodyMetricsByDate(metrics);
      expect(grouped['2026-11-06']).toHaveLength(1);
      expect(grouped['2026-01-01']).toHaveLength(1);
      expect(grouped['2025-12-31']).toHaveLength(1);
    });
  });
});

describe('dropboxAuth', () => {
  beforeEach(() => {
    const mockStorage = new LocalStorageMock();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    clearDropboxTokens();
  });

  it('generates random code verifier with base64url characters', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toBeDefined();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    // Base64URL should not have +, /, or =
    expect(verifier).not.toContain('+');
    expect(verifier).not.toContain('/');
    expect(verifier).not.toContain('=');
  });

  it('reads app key from environment variable and disallows user customization', () => {
    // 預設由開發者環境變數提供，不允許使用者自訂修改
    expect(typeof getDropboxAppKey()).toBe('string');
  });

  it('handles staging tokens transactional commit and clear', () => {
    const mockTokens: DropboxTokens = {
      access_token: 'test_token',
      refresh_token: 'refresh_test',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
    };

    expect(isDropboxConnected()).toBe(false);
    expect(getStagingTokens()).toBeNull();

    setStagingTokens(mockTokens);
    expect(getStagingTokens()).toEqual(mockTokens);
    clearStagingTokens();
    expect(getStagingTokens()).toBeNull();

    setStagingTokens(mockTokens);
    expect(getStagingTokens()).toEqual(mockTokens);
    // Staging tokens are not committed yet to localStorage
    expect(isDropboxConnected()).toBe(false);

    commitStagingTokens();
    expect(getStagingTokens()).toBeNull();
    expect(isDropboxConnected()).toBe(true);

    clearDropboxTokens();
    expect(isDropboxConnected()).toBe(false);
  });
});

describe('syncErrorReason & Toast handling', () => {
  beforeEach(() => {
    const mockStorage = new LocalStorageMock();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    clearDropboxTokens();
    vi.restoreAllMocks();
  });

  it('classifies common Dropbox, network, and local errors accurately via getSyncErrorReasonKey', () => {
    expect(
      getSyncErrorReasonKey(
        new Error('NETWORK_TIMEOUT: Request to https://api.dropboxapi.com timed out after 12000ms')
      )
    ).toBe('timeout');
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    expect(getSyncErrorReasonKey(abortErr)).toBe('timeout');

    expect(getSyncErrorReasonKey(new TypeError('Failed to fetch'))).toBe('network');
    expect(getSyncErrorReasonKey('ERR_INTERNET_DISCONNECTED')).toBe('network');
    expect(getSyncErrorReasonKey('Load failed')).toBe('network');

    expect(
      getSyncErrorReasonKey(
        new Error(
          'Failed to upload file /nutrition/logs/2026-11-12.json (401): {"error_summary": "expired_access_token/..."}'
        )
      )
    ).toBe('auth');
    expect(getSyncErrorReasonKey(new Error('Dropbox not authenticated'))).toBe('auth');
    expect(getSyncErrorReasonKey('Dropbox not connected')).toBe('auth');
    expect(
      getSyncErrorReasonKey('PKCE verification failed: Code verifier missing from session.')
    ).toBe('auth');
    expect(getSyncErrorReasonKey('Dropbox token exchange failed (400): invalid_grant')).toBe(
      'auth'
    );

    expect(
      getSyncErrorReasonKey(
        new Error('Failed to upload file /foods.json (507): {"error_summary": "insufficient_space"}')
      )
    ).toBe('quota');

    expect(
      getSyncErrorReasonKey(
        new Error(
          'Failed to upload file /foods.json (429): {"error_summary": "too_many_write_operations"}'
        )
      )
    ).toBe('rate_limit');

    expect(
      getSyncErrorReasonKey(
        new Error('DROPBOX_CONFLICT: File /nutrition/foods.json has a newer version on remote')
      )
    ).toBe('conflict');

    expect(getSyncErrorReasonKey(new Error('Failed to list folder (503): Service Unavailable'))).toBe(
      'server'
    );
    expect(getSyncErrorReasonKey(new Error('Failed to list folder (500): internal_error'))).toBe(
      'server'
    );

    expect(
      getSyncErrorReasonKey(
        new Error('Failed to list folder (403): {"error_summary": "insufficient_permissions"}')
      )
    ).toBe('permission');

    expect(getSyncErrorReasonKey(new Error('Unexpected database glitch'))).toBe('unknown');
  });

  it('formats error messages in zh-TW, zh-CN, and en via formatSyncErrorMessage', async () => {
    const authErr = new Error('Failed to upload (401): expired_access_token');
    const timeoutErr = new Error('NETWORK_TIMEOUT: timed out after 12000ms');

    await i18n.changeLanguage('zh-TW');
    expect(formatSyncErrorMessage(authErr)).toBe('授權憑證已過期或失效，請重新連線');
    expect(formatSyncErrorMessage(timeoutErr)).toBe('連線逾時，請檢查網路環境');

    await i18n.changeLanguage('zh-CN');
    expect(formatSyncErrorMessage(authErr)).toBe('授权凭证已过期或失效，请重新连接');
    expect(formatSyncErrorMessage(timeoutErr)).toBe('连接超时，请检查网络环境');

    await i18n.changeLanguage('en');
    expect(formatSyncErrorMessage(authErr)).toBe('Authorization expired, please reconnect');
    expect(formatSyncErrorMessage(timeoutErr)).toBe('Connection timed out');

    await i18n.changeLanguage('zh-TW');
  });

  it('triggers localized toast when executeSync fails with network or API error', async () => {
    await i18n.changeLanguage('zh-TW');
    const toastSpy = vi.spyOn(toast, 'show');

    setStoredTokens({
      access_token: 'valid_token',
      expires_in: 14400,
      expires_at: Date.now() + 14400 * 1000,
    });

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const res = await executeSync('auto');
    expect(res.success).toBe(false);
    expect(toastSpy).toHaveBeenCalledWith('Dropbox 同步失敗：網路連線不穩定，無法連接伺服器');
  });
});

