import type { Method, RequestBody } from 'alova';
import { createAlova } from 'alova';
import { createServerTokenAuthentication } from 'alova/client';
import adapterFetch from 'alova/fetch';
import VueHook from 'alova/vue';

import {
  finishGlobalProgress,
  startGlobalProgress,
} from '@/composables/use-global-progress';
import { emitUnauthorized } from '@/utils/auth-events';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
  type StoredTokens,
} from '@/utils/auth-token';

export const API_BASE_URL = import.meta.env.VITE_API_BASE || '/api';

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

type AuthRole = 'login' | 'refreshToken' | null;

const AUTH_ROLES = new Map<string, AuthRole>([
  ['/auth/login', 'login'],
  ['/auth/register', null],
  ['/auth/refresh', 'refreshToken'],
  ['/auth/logout', null],
]);

function withAuthRole<TMethod extends Method>(
  url: string,
  method: TMethod,
): TMethod {
  const queryIndex = url.indexOf('?');
  const path = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const authRole = AUTH_ROLES.get(path);

  if (authRole !== undefined) {
    method.meta = { ...method.meta, authRole };
  }

  return method;
}

/**
 * Alova 官方认证拦截器会协调普通请求的并发刷新；这里额外保留同一个
 * Promise，让独立的 SSE 连接与普通请求同时过期时也只轮换一次令牌。
 */
let refreshing: Promise<boolean> | null = null;

const { onAuthRequired, onResponseRefreshToken } =
  createServerTokenAuthentication<typeof VueHook>({
    assignToken(method) {
      if (method.meta?.authRole === 'refreshToken') return;

      const token = getAccessToken();
      if (token) method.config.headers.Authorization = `Bearer ${token}`;
    },
    refreshTokenOnSuccess: {
      isExpired: (response) => response.status === 401,
      async handler() {
        if (await refreshAccessToken()) return;

        clearTokens();
        emitUnauthorized();
        // 官方拦截器要求刷新失败必须抛错，避免继续重发失效请求。
        throw new ApiError(401, '登录状态已失效');
      },
    },
  });

const assignAuthToken = onAuthRequired();
const requestProgressTasks = new WeakMap<Method, symbol>();

async function beforeRequest(method: Method): Promise<void> {
  let progressTask = requestProgressTasks.get(method);

  if (!progressTask) {
    progressTask = Symbol('request-progress');
    requestProgressTasks.set(method, progressTask);
    startGlobalProgress(progressTask);
  }

  try {
    await assignAuthToken(method);
  } catch (error) {
    requestProgressTasks.delete(method);
    finishGlobalProgress(progressTask);
    throw error;
  }
}

function completeRequest(method: Method): void {
  const progressTask = requestProgressTasks.get(method);

  if (progressTask) {
    requestProgressTasks.delete(method);
    finishGlobalProgress(progressTask);
  }
}

export const alova = createAlova({
  // 少了它所有请求都会打到站点根路径（/users 而不是 /api/users）。
  // 开发时 vite 代理只转发 /api 前缀，缺失会直接命中前端页面而不是后端
  baseURL: API_BASE_URL,
  statesHook: VueHook,
  requestAdapter: adapterFetch(),
  timeout: 15_000,
  /**
   * 关闭 GET 的响应缓存。后台管理讲究「改完立刻看到」，
   * alova 默认给 GET 挂 5 分钟内存缓存，那会变成「我明明改了怎么没变」。
   * 真需要缓存的列表页由页面自己决定开。
   */
  cacheFor: { GET: 0 },
  beforeRequest,
  responded: onResponseRefreshToken({
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
    onComplete: completeRequest,
  }),
});

/**
 * 创建官方要求的 refreshToken Method。该 Method 通过 metadata 标记后，
 * 不会再次触发「401 → 刷新」，从而避免刷新接口递归调用自身。
 */
export function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  refreshing ??= (async () => {
    try {
      const tokens = await withAuthRole(
        '/auth/refresh',
        alova.Post<StoredTokens>('/auth/refresh', { refreshToken }),
      );

      if (
        typeof tokens?.accessToken !== 'string' ||
        typeof tokens.refreshToken !== 'string'
      ) {
        return false;
      }

      saveTokens(tokens);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/**
 * 把筛选对象拼成查询串。空值（undefined/null/空字符串）一律不传——
 * 后端 status 这类枚举字段收到空字符串会直接 400，而不是当成「不过滤」。
 */
export function withQuery(
  url: string,
  params: Record<string, unknown>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }

  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

export function httpGet<T>(url: string): Promise<T> {
  return withAuthRole(url, alova.Get<T>(url));
}

export function httpPost<T>(url: string, data?: RequestBody): Promise<T> {
  return withAuthRole(url, alova.Post<T>(url, data));
}

export function httpPut<T>(url: string, data?: RequestBody): Promise<T> {
  return withAuthRole(url, alova.Put<T>(url, data));
}

export function httpPatch<T>(url: string, data?: RequestBody): Promise<T> {
  return withAuthRole(url, alova.Patch<T>(url, data));
}

export function httpDelete<T>(url: string): Promise<T> {
  return withAuthRole(url, alova.Delete<T>(url));
}
