import type { RequestBody } from 'alova';
import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '@/utils/auth-token';

/** 统一的接口错误。httpStatus 是 HTTP 状态码，bizCode 是响应体里的 code */
export class ApiError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
    readonly bizCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

/**
 * 不参与「401 → 刷新 → 重试」的接口。它们本身就是认证入口：
 * 带着旧令牌去刷只会死循环，登录失败就该停在登录页。
 */
const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

/**
 * 正在进行的刷新。多个请求同时撞上 401 时只发一次刷新，
 * 其余等同一个 Promise——否则每个 401 都去刷新，
 * 第一个成功后旧 refreshToken 已被轮换作废，后面的会全部失败，
 * 还会触发后端的盗用检测把账号整个踢下线。
 */
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  refreshing ??= (async () => {
    try {
      // 用裸 fetch：走 alova 实例会被自己的 401 逻辑拦住，形成递归
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = (await response.json().catch(() => null)) as {
        code?: number;
        data?: { accessToken?: string; refreshToken?: string };
      } | null;

      if (!response.ok || body?.code !== 0 || !body.data?.accessToken || !body.data.refreshToken) {
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

export const alova = createAlova({
  // 少了它所有请求都会打到站点根路径（/users 而不是 /api/users）。
  // 开发时 vite 代理只转发 /api 前缀，缺失会直接命中前端页面而不是后端
  baseURL: BASE_URL,
  requestAdapter: adapterFetch(),
  timeout: 15_000,
  /**
   * 关闭 GET 的响应缓存。后台管理讲究「改完立刻看到」，
   * alova 默认给 GET 挂 5 分钟内存缓存，那会变成「我明明改了怎么没变」。
   * 真需要缓存的列表页由页面自己决定开。
   */
  cacheFor: { GET: 0 },
  beforeRequest(method) {
    const token = getAccessToken();

    if (token) {
      method.config.headers.Authorization = `Bearer ${token}`;
    }
  },
  responded: {
    /**
     * 后端成功是 { code: 0, message, data }，失败一律带对应 HTTP 状态码
     * 和 { code: 状态码, message }。这里把两种都归一：
     * 成功直接解出 data，失败抛 ApiError——调用方只关心业务数据和一个异常类型。
     */
    onSuccess: async (response) => {
      // 后端有一批接口刻意返回 204 空响应体（登出、删除、改密、配置授权等，
      // 共 10 个）。对空体调 json() 会抛错，不能把它当成失败——
      // 204 本身就表示「成功且无内容」。
      if (response.status === 204) {
        return undefined as never;
      }

      const body = (await response.json().catch(() => null)) as {
        code?: number;
        message?: string;
        data?: unknown;
      } | null;

      if (response.ok && body?.code === 0) {
        return body.data as never;
      }

      throw new ApiError(
        response.status,
        body?.message ?? (response.statusText || '请求失败'),
        body?.code,
      );
    },
    onError: (error) => {
      // fetch 层的失败（断网、超时、DNS）到这里是 TypeError，统一成 ApiError
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(0, '网络异常，请稍后重试');
    },
  },
});

/**
 * 发请求并处理「401 → 静默刷新 → 重发一次」。
 *
 * 重发是重新调 factory 而不是复用旧 Method：新 Method 走 beforeRequest
 * 才能拿到刚刷新的 token。refresh 失败时清掉本地令牌——
 * 留着只会让后续每个请求都白走一遍 401。
 */
async function sendWithRetry<T>(
  url: string,
  create: () => Promise<T>,
): Promise<T> {
  try {
    return await create();
  } catch (error) {
    const shouldRetry =
      error instanceof ApiError &&
      error.httpStatus === 401 &&
      !NO_REFRESH_PATHS.some((path) => url.includes(path)) &&
      (await tryRefresh());

    if (!shouldRetry) {
      if (error instanceof ApiError && error.httpStatus === 401) {
        clearTokens();
      }

      throw error;
    }

    return create();
  }
}

export function httpGet<T>(url: string): Promise<T> {
  return sendWithRetry(url, () => alova.Get<T>(url));
}

export function httpPost<T>(url: string, data?: RequestBody): Promise<T> {
  return sendWithRetry(url, () => alova.Post<T>(url, data));
}

export function httpPut<T>(url: string, data?: RequestBody): Promise<T> {
  return sendWithRetry(url, () => alova.Put<T>(url, data));
}

export function httpPatch<T>(url: string, data?: RequestBody): Promise<T> {
  return sendWithRetry(url, () => alova.Patch<T>(url, data));
}

export function httpDelete<T>(url: string): Promise<T> {
  return sendWithRetry(url, () => alova.Delete<T>(url));
}
