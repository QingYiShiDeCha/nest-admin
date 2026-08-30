import {
  getRefreshToken,
  saveTokens,
} from '@/utils/auth-token';

export const API_BASE_URL = import.meta.env.VITE_API_BASE || '/api';

let refreshing: Promise<boolean> | null = null;

/** 多个普通请求和 SSE 同时过期时，共用一次 refreshToken 轮换。 */
export function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  refreshing ??= (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = (await response.json().catch(() => null)) as {
        code?: number;
        data?: { accessToken?: string; refreshToken?: string };
      } | null;

      if (
        !response.ok ||
        body?.code !== 0 ||
        !body.data?.accessToken ||
        !body.data.refreshToken
      ) {
        return false;
      }

      saveTokens({
        accessToken: body.data.accessToken,
        refreshToken: body.data.refreshToken,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}
