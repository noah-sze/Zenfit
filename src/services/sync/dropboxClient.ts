import { getValidAccessToken } from './dropboxAuth';

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
  const token = await getValidAccessToken();
  if (!token) throw new Error('Dropbox not authenticated');

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

      const res: Response = await fetchWithTimeout(requestUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

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
  const token = await getValidAccessToken();
  if (!token) throw new Error('Dropbox not authenticated');

  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

  const response = await fetchWithTimeout('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: normalizedPath }),
    },
  });

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
  const token = await getValidAccessToken();
  if (!token) throw new Error('Dropbox not authenticated');

  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

  // 採用緊湊序列化，節省雲端傳輸體積
  const bodyContent = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bodyBuffer = encoder.encode(bodyContent);

  const uploadMode = expectedRev
    ? { '.tag': 'update', update: expectedRev }
    : 'overwrite';

  const response = await fetchWithTimeout('https://content.dropboxapi.com/2/files/upload', {
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
  });

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
    await fetchWithTimeout('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: normalizedPath }),
    });
  } catch {
    // Ignore deletion errors for missing files
  }
}
