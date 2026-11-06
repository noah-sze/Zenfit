/**
 * Dropbox OAuth 2.0 with PKCE (Proof Key for Code Exchange)
 * Client-side authentication without exposing client secret.
 */

const SESSION_VERIFIER_KEY = 'zenfit_dropbox_code_verifier';
const STORAGE_TOKENS_KEY = 'zenfit_dropbox_tokens';

const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    } catch {}
  },
};

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
  },
};

export interface DropboxTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number; // Unix timestamp in ms
  account_id?: string;
  scope?: string;
}

/**
 * 取得當前有效的 Dropbox App Key (由開發者於環境變數 VITE_DROPBOX_APP_KEY 配置，不允許使用者自訂)
 */
export function getDropboxAppKey(): string {
  return ((import.meta.env.VITE_DROPBOX_APP_KEY as string) || '').trim();
}

/**
 * 取得 OAuth 授權完成後的重定向目標 URI
 */
export function getDropboxRedirectUri(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  return `${origin}/settings`;
}

/**
 * 生成符合 RFC 7636 規範的隨機 Code Verifier
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return base64UrlEncode(array);
}

/**
 * 對 Code Verifier 執行 SHA-256 雜湊生成 Code Challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error('WebCrypto subtle digest not supported');
  }
  const hash = await cryptoObj.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * 將 Uint8Array 轉為安全無衝突的 Base64URL 字串
 */
export function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 取得儲存在本地的 Dropbox 憑證 Token
 */
export function getStoredTokens(): DropboxTokens | null {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DropboxTokens;
  } catch {
    return null;
  }
}

/**
 * 儲存 Token 憑證至本地
 */
export function setStoredTokens(tokens: DropboxTokens): void {
  safeLocalStorage.setItem(STORAGE_TOKENS_KEY, JSON.stringify(tokens));
}

let stagingTokens: DropboxTokens | null = null;

export function getStagingTokens(): DropboxTokens | null {
  return stagingTokens;
}

export function setStagingTokens(tokens: DropboxTokens | null): void {
  stagingTokens = tokens;
}

export function commitStagingTokens(): void {
  if (stagingTokens) {
    setStoredTokens(stagingTokens);
    stagingTokens = null;
  }
}

export function clearStagingTokens(): void {
  stagingTokens = null;
  safeSessionStorage.removeItem(SESSION_VERIFIER_KEY);
}

/**
 * 清除已儲存的 Dropbox 登入憑證 (登出)
 */
export function clearDropboxTokens(): void {
  safeLocalStorage.removeItem(STORAGE_TOKENS_KEY);
  safeSessionStorage.removeItem(SESSION_VERIFIER_KEY);
  stagingTokens = null;
}

/**
 * 檢查當前設備是否已登入 Dropbox
 */
export function isDropboxConnected(): boolean {
  const tokens = getStoredTokens();
  return Boolean(tokens?.access_token || tokens?.refresh_token);
}

/**
 * 發起 Dropbox OAuth 2.0 PKCE 授權跳轉
 */
export async function initiateDropboxAuth(): Promise<void> {
  const appKey = getDropboxAppKey();
  if (!appKey) {
    throw new Error('Dropbox App Key is not configured. Please set VITE_DROPBOX_APP_KEY.');
  }

  const verifier = generateCodeVerifier();
  safeSessionStorage.setItem(SESSION_VERIFIER_KEY, verifier);

  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getDropboxRedirectUri();

  const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', appKey);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('token_access_type', 'offline');

  if (typeof window !== 'undefined') {
    window.location.href = authUrl.toString();
  }
}

/**
 * 授權回跳後，透過 Auth Code 與本地 Code Verifier 換取 Token
 */
export async function exchangeCodeForTokens(code: string): Promise<DropboxTokens> {
  const appKey = getDropboxAppKey();
  if (!appKey) throw new Error('Missing Dropbox App Key');

  const verifier = safeSessionStorage.getItem(SESSION_VERIFIER_KEY);
  if (!verifier) {
    throw new Error('PKCE verification failed: Code verifier missing from session.');
  }

  const redirectUri = getDropboxRedirectUri();
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: appKey,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox token exchange failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    account_id?: string;
    scope?: string;
  };

  const expiresAt = Date.now() + (data.expires_in || 14400) * 1000;

  const tokens: DropboxTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 14400,
    expires_at: expiresAt,
    account_id: data.account_id,
    scope: data.scope,
  };

  setStoredTokens(tokens);
  safeSessionStorage.removeItem(SESSION_VERIFIER_KEY);

  return tokens;
}

/**
 * 僅換取 Token 憑證但不持久化至 localStorage (專供首次同步事務暫存)
 */
export async function exchangeCodeForTokensOnly(code: string): Promise<DropboxTokens> {
  const appKey = getDropboxAppKey();
  if (!appKey) throw new Error('Missing Dropbox App Key');

  const verifier = safeSessionStorage.getItem(SESSION_VERIFIER_KEY);
  if (!verifier) {
    throw new Error('PKCE verification failed: Code verifier missing from session.');
  }

  const redirectUri = getDropboxRedirectUri();
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: appKey,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox token exchange failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    account_id?: string;
    scope?: string;
  };

  const expiresAt = Date.now() + (data.expires_in || 14400) * 1000;

  const tokens: DropboxTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 14400,
    expires_at: expiresAt,
    account_id: data.account_id,
    scope: data.scope,
  };

  safeSessionStorage.removeItem(SESSION_VERIFIER_KEY);
  return tokens;
}

/**
 * 自動檢查並刷新過期 Access Token (無感續約)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = stagingTokens || getStoredTokens();
  if (!tokens) return null;

  // 距離過期大於 5 分鐘，直接使用現存 access_token
  const isExpiringSoon = Date.now() > tokens.expires_at - 5 * 60 * 1000;
  if (!isExpiringSoon && tokens.access_token) {
    return tokens.access_token;
  }

  // 若需要刷新且擁有 refresh_token
  if (tokens.refresh_token) {
    const appKey = getDropboxAppKey();
    if (!appKey) return tokens.access_token || null;

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: appKey,
      });

      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          access_token: string;
          expires_in?: number;
        };
        const updatedTokens: DropboxTokens = {
          ...tokens,
          access_token: data.access_token,
          expires_in: data.expires_in || 14400,
          expires_at: Date.now() + (data.expires_in || 14400) * 1000,
        };
        if (stagingTokens) {
          stagingTokens = updatedTokens;
        } else {
          setStoredTokens(updatedTokens);
        }
        return updatedTokens.access_token;
      }

      // 若遠端回傳 400 invalid_grant 或 401，代表使用者已在 Dropbox 撤銷授權
      if (response.status === 400 || response.status === 401) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        if (errorData?.error === 'invalid_grant' || response.status === 401) {
          console.warn('Dropbox refresh token revoked or invalid. Clearing stored credentials.');
          clearDropboxTokens();
          return null;
        }
      }
    } catch (err) {
      console.warn('Failed to refresh Dropbox access token silently:', err);
    }
  }

  return tokens.access_token || null;
}
