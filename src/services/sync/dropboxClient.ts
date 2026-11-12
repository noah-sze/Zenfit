import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';
import { getValidAccessToken } from './dropboxAuth';

export type SyncErrorReasonKey =
  | 'timeout'
  | 'network'
  | 'auth'
  | 'quota'
  | 'rate_limit'
  | 'conflict'
  | 'server'
  | 'permission'
  | 'unknown';

const SYNC_ERROR_I18N_MAP: Record<SyncErrorReasonKey, { key: string; defaultText: string }> = {
  timeout: {
    key: 'syncStatus.errors.timeout',
    defaultText: '連線逾時，請檢查網路環境',
  },
  network: {
    key: 'syncStatus.errors.network',
    defaultText: '網路連線不穩定，無法連接伺服器',
  },
  auth: {
    key: 'syncStatus.errors.auth',
    defaultText: '授權憑證已過期或失效，請重新連線',
  },
  quota: {
    key: 'syncStatus.errors.quota',
    defaultText: 'Dropbox 儲存空間不足',
  },
  rate_limit: {
    key: 'syncStatus.errors.rateLimit',
    defaultText: '請求過於頻繁，請稍後再試',
  },
  conflict: {
    key: 'syncStatus.errors.conflict',
    defaultText: '資料版本衝突，正在重新合併',
  },
  server: {
    key: 'syncStatus.errors.server',
    defaultText: 'Dropbox 服務暫時異常，請稍後再試',
  },
  permission: {
    key: 'syncStatus.errors.permission',
    defaultText: '存取權限不足，請重新授權',
  },
  unknown: {
    key: 'syncStatus.errors.unknown',
    defaultText: '發生未知錯誤，請稍後再試',
  },
};

/**
 * 將常見的 Dropbox / 網路 / 本地錯誤歸類為清晰的失敗原因鍵值
 */
export function getSyncErrorReasonKey(error: unknown): SyncErrorReasonKey {
  const raw =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : String(error ?? '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('network_timeout') ||
    lower.includes('aborterror') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return 'timeout';
  }

  if (
    lower.includes('dropbox_conflict') ||
    /\b409\b/.test(lower) ||
    lower.includes('conflict')
  ) {
    return 'conflict';
  }

  if (
    /\b401\b/.test(lower) ||
    lower.includes('invalid_access_token') ||
    lower.includes('expired_access_token') ||
    lower.includes('invalid_grant') ||
    lower.includes('not authenticated') ||
    lower.includes('dropbox not connected') ||
    lower.includes('token exchange failed') ||
    lower.includes('pkce verification failed') ||
    lower.includes('unauthorized')
  ) {
    return 'auth';
  }

  if (
    /\b403\b/.test(lower) ||
    lower.includes('insufficient_permissions') ||
    lower.includes('access_denied') ||
    lower.includes('forbidden')
  ) {
    return 'permission';
  }

  if (
    /\b507\b/.test(lower) ||
    lower.includes('insufficient_space') ||
    lower.includes('quota')
  ) {
    return 'quota';
  }

  if (
    /\b429\b/.test(lower) ||
    lower.includes('too_many_requests') ||
    lower.includes('too_many_write_operations') ||
    lower.includes('rate_limit') ||
    lower.includes('rate limit')
  ) {
    return 'rate_limit';
  }

  if (
    /\b(500|502|503|504)\b/.test(lower) ||
    lower.includes('internal_error') ||
    lower.includes('bad gateway') ||
    lower.includes('service unavailable') ||
    lower.includes('gateway timeout')
  ) {
    return 'server';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('err_internet_disconnected') ||
    lower.includes('err_network') ||
    lower.includes('offline') ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return 'network';
  }

  return 'unknown';
}

/**
 * 將同步錯誤轉換為多語系友善失敗原因說明
 */
export function formatSyncErrorMessage(
  error: unknown,
  t?: TFunction | ((key: string, defaultValue?: string) => string)
): string {
  const reasonKey = getSyncErrorReasonKey(error);
  const { key, defaultText } = SYNC_ERROR_I18N_MAP[reasonKey];
  if (t) {
    return (t as (k: string, def?: string) => string)(key, defaultText);
  }
  return i18n.t(key, defaultText);
}

export interface DropboxFileMetadata {
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  client_modified: string;
  server_modified: string;
  rev: string;
  size: number;
}

const DEFAULT_TIMEOUT_MS = 12000;

/**
 * 具有 AbortController 超時防護的 Fetch 請求封裝
 * 防止行動端在弱網、地鐵或電梯環境下永久掛起
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`NETWORK_TIMEOUT: Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 具有自動 401 Token 刷新與重試機制的 Dropbox Fetch 呼叫封裝
 * 若遇到 401 Unauthorized，自動呼叫 getValidAccessToken(true) 刷新憑證並重試一次
 */
async function fetchDropboxWithAuth(
  url: string,
  optionsFactory: (token: string) => RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  let token = await getValidAccessToken();
  if (!token) throw new Error('Dropbox not authenticated');

  let response = await fetchWithTimeout(url, optionsFactory(token), timeoutMs);

  if (response.status === 401) {
    const refreshedToken = await getValidAccessToken(true);
    if (refreshedToken) {
      token = refreshedToken;
      response = await fetchWithTimeout(url, optionsFactory(token), timeoutMs);
    }
  }

  return response;
}

interface DropboxListFolderEntry {
  '.tag': string;
  name: string;
  path_lower: string;
  path_display?: string;
  id: string;
  client_modified: string;
  server_modified: string;
  rev: string;
  size: number;
}

interface DropboxListFolderResponse {
  entries: DropboxListFolderEntry[];
  cursor?: string;
  has_more: boolean;
}

/**
 * 遞歸列出 Dropbox App 目錄下的所有檔案與修訂版本號 (rev)
 * 單次呼叫即可感知所有檔案的遠端版本變動
 */
export async function listRemoteFolder(folderPath = ''): Promise<DropboxFileMetadata[]> {
  const initialToken = await getValidAccessToken();
  if (!initialToken) throw new Error('Dropbox not authenticated');

  const files: DropboxFileMetadata[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  try {
    while (hasMore) {
      const requestUrl: string = cursor
        ? 'https://api.dropboxapi.com/2/files/list_folder/continue'
        : 'https://api.dropboxapi.com/2/files/list_folder';

      const requestBody: string = cursor
        ? JSON.stringify({ cursor })
        : JSON.stringify({ path: folderPath, recursive: true, include_deleted: false });

      const res: Response = await fetchDropboxWithAuth(requestUrl, (token) => ({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      }));

      if (res.status === 409) {
        // 目錄尚不存在（初次使用）
        return [];
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to list folder (${res.status}): ${errorText}`);
      }

      const resData = (await res.json()) as DropboxListFolderResponse;
      const entries = resData.entries || [];

      for (const entry of entries) {
        if (entry['.tag'] === 'file') {
          files.push({
            name: entry.name,
            path_lower: entry.path_lower,
            path_display: entry.path_display || entry.path_lower,
            id: entry.id,
            client_modified: entry.client_modified,
            server_modified: entry.server_modified,
            rev: entry.rev,
            size: entry.size,
          });
        }
      }

      hasMore = Boolean(resData.has_more);
      cursor = resData.cursor || null;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('path/not_found')) {
      return [];
    }
    throw err;
  }

  return files;
}

/**
 * 從指定遠端路徑下載單一 JSON 檔案並解析
 */
export async function downloadJsonFile<T>(filePath: string): Promise<T | null> {
  const initialToken = await getValidAccessToken();
  if (!initialToken) throw new Error('Dropbox not authenticated');

  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

  const response = await fetchDropboxWithAuth(
    'https://content.dropboxapi.com/2/files/download',
    (token) => ({
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: normalizedPath }),
      },
    })
  );

  if (response.status === 409) {
    // 檔案不存在
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`Download skipped for ${filePath} (${response.status}): ${errorText}`);
    return null;
  }

  try {
    const raw = (await response.json()) as T;
    return raw;
  } catch (err) {
    console.warn(`Failed to parse json for ${filePath}:`, err);
    return null;
  }
}

/**
 * 上傳指定 JSON 資料至特定遠端路徑
 * 若提供 expectedRev，則使用 Dropbox 樂觀鎖更新模式（防止覆蓋其他設備最新版本）；否則使用 overwrite
 * @returns 該檔案上傳後 Dropbox 生成的最新 rev 修訂版本號
 */
export async function uploadJsonFile<T>(
  filePath: string,
  data: T,
  expectedRev?: string
): Promise<string> {
  const initialToken = await getValidAccessToken();
  if (!initialToken) throw new Error('Dropbox not authenticated');

  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

  // 採用緊湊序列化，節省雲端傳輸體積
  const bodyContent = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bodyBuffer = encoder.encode(bodyContent);

  const uploadMode = expectedRev
    ? { '.tag': 'update', update: expectedRev }
    : 'overwrite';

  const response = await fetchDropboxWithAuth(
    'https://content.dropboxapi.com/2/files/upload',
    (token) => ({
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: normalizedPath,
          mode: uploadMode,
          autorename: false,
          mute: true,
        }),
      },
      body: bodyBuffer,
    })
  );

  if (!response.ok) {
    const errorText = await response.text();
    // 檢測樂觀鎖衝突 (HTTP 409 或回應包含 conflict)
    if (response.status === 409 || errorText.includes('conflict')) {
      throw new Error(`DROPBOX_CONFLICT: File ${filePath} has a newer version on remote`);
    }
    console.error(`Upload failed for ${filePath} (${response.status}):`, errorText);
    throw new Error(`Failed to upload file ${filePath} (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as { rev: string };
  return result.rev;
}

/**
 * 刪除遠端指定檔案或資料夾
 */
export async function deleteRemotePath(path: string): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) return;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    await fetchDropboxWithAuth('https://api.dropboxapi.com/2/files/delete_v2', (t) => ({
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: normalizedPath }),
    }));
  } catch {
    // Ignore deletion errors for missing files
  }
}
