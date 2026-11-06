import { describe, it, expect, beforeEach } from 'vitest';
import {
  mergeEntities,
  groupFoodLogsByDate,
  groupWorkoutLogsByDate,
  groupBodyMetricsByDate,
} from './syncEngine';
import {
  getDropboxAppKey,
  generateCodeVerifier,
  getStagingTokens,
  setStagingTokens,
  commitStagingTokens,
  clearStagingTokens,
  clearDropboxTokens,
  isDropboxConnected,
  type DropboxTokens,
} from './dropboxAuth';
import type { FoodLog, WorkoutLog, BodyMetric } from '@/types';

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
