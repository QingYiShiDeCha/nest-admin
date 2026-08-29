// @vitest-environment node
// 本文件刻意用 node 环境：jsdom 没有 fetch，而这里要用真实的 Response
// 对象驱动真实的 alova/fetch 适配器，mock 得越少测出来的问题越真。
// localStorage 由下面的桩提供。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, httpGet, httpPost } from '../http';
import { clearTokens, getTokens, saveTokens } from '@/utils/auth-token';

type FetchMock = ReturnType<typeof vi.fn>;

const store = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => void store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
};

/** 造一个带后端响应体结构的 Response，比裸对象更接近真实行为 */
const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ok = (data: unknown) => jsonResponse(200, { code: 0, message: 'success', data });
const fail = (status: number, message: string) =>
  jsonResponse(status, { code: status, message, data: null });

const TOKENS = { accessToken: 'at-1', refreshToken: 'rt-1' };
const NEW_TOKENS = { accessToken: 'at-2', refreshToken: 'rt-2' };

/** 从 fetch 调用参数里取 URL 与 headers，兼容 Request 对象和 (url, init) 两种形态 */
function callInfo(args: unknown[]): { url: string; headers: Headers } {
  const [input, init] = args as [Request | string, RequestInit | undefined];

  if (typeof input === 'string') {
    return { url: input, headers: new Headers(init?.headers) };
  }

  return { url: input.url, headers: input.headers };
}

let fetchMock: FetchMock;

beforeEach(() => {
  store.clear();
  fetchMock = vi.fn();
  // 每个用例前重新挂桩：afterEach 的 unstubAllGlobals 会把上一轮的桩全部撤掉，
  // 只在顶层 stub 一次的话，第一个用例之后 localStorage 就没了
  vi.stubGlobal('localStorage', localStorageStub);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  clearTokens();
  vi.unstubAllGlobals();
});

describe('http 客户端', () => {
  it('成功响应解出 data，并带上 Authorization 头', async () => {
    saveTokens(TOKENS);
    fetchMock.mockResolvedValueOnce(ok({ hello: 'world' }));

    await expect(httpGet('/things')).resolves.toEqual({ hello: 'world' });

    const { url, headers } = callInfo(fetchMock.mock.calls[0] as unknown[]);
    expect(headers.get('authorization')).toBe('Bearer at-1');
    // baseURL 必须生效：漏掉它请求会打到站点根路径而不是后端
    expect(url).toBe('/api/things');
  });

  it('204 空响应体视为成功而不是解析失败', async () => {
    // 后端的登出、删除、改密等 10 个接口都返回 204，
    // 对空体调 json() 会抛错，早期实现把它误判成了失败
    saveTokens(TOKENS);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(httpPost('/roles/1/menus', { ids: [] })).resolves.toBeUndefined();
  });

  it('业务失败（403/409 等）抛 ApiError 且不触发刷新', async () => {
    saveTokens(TOKENS);
    fetchMock.mockResolvedValueOnce(fail(403, '缺少权限：system:user:delete'));

    await expect(httpDeleteish()).rejects.toMatchObject({
      httpStatus: 403,
      message: '缺少权限：system:user:delete',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401 时刷新一次并重发原请求，令牌被替换', async () => {
    saveTokens(TOKENS);
    // 必须接收并透传全部参数：alova/fetch 是以 (url, init) 形式调用的，
    // 只取第一个参数会把 init 里的 headers 丢掉，看起来就像鉴权头没生效
    fetchMock.mockImplementation(async (...args: unknown[]) => {
      const { url, headers } = callInfo(args);

      if (url.includes('/auth/refresh')) {
        return ok(NEW_TOKENS);
      }

      // 第一次带旧令牌 → 401；重发带新令牌 → 成功
      return headers.get('authorization') === 'Bearer at-1'
        ? fail(401, '令牌过期')
        : ok({ done: true });
    });

    await expect(httpGet('/things')).resolves.toEqual({ done: true });

    const refreshCall = fetchMock.mock.calls
      .map((c) => callInfo(c as unknown[]).url)
      .find((url) => url.includes('/auth/refresh'));
    expect(refreshCall).toBeDefined();
    expect(getTokens()).toEqual(NEW_TOKENS);
  });

  it('并发多个 401 只刷新一次，全部请求都被重发成功', async () => {
    saveTokens(TOKENS);
    let refreshCount = 0;

    fetchMock.mockImplementation(async (...args: unknown[]) => {
      const { url, headers } = callInfo(args);

      if (url.includes('/auth/refresh')) {
        refreshCount += 1;
        // 稍作延迟，确保并发请求都落在同一个刷新窗口里
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ok(NEW_TOKENS);
      }

      return headers.get('authorization') === 'Bearer at-1'
        ? fail(401, '令牌过期')
        : ok({ url });
    });

    const [a, b, c] = await Promise.all([
      httpGet('/a'),
      httpGet('/b'),
      httpGet('/c'),
    ]);

    expect(refreshCount).toBe(1);
    expect(a).toEqual({ url: expect.stringContaining('/a') });
    expect(b).toEqual({ url: expect.stringContaining('/b') });
    expect(c).toEqual({ url: expect.stringContaining('/c') });
  });

  it('刷新失败时清空令牌并把原错误抛给调用方', async () => {
    saveTokens(TOKENS);
    fetchMock.mockImplementation(async (...args: unknown[]) =>
      callInfo(args).url.includes('/auth/refresh')
        ? fail(401, 'refreshToken 无效或已过期')
        : fail(401, '令牌过期'),
    );

    await expect(httpGet('/things')).rejects.toBeInstanceOf(ApiError);
    expect(getTokens()).toBeNull();
  });

  it('登录接口的 401 不触发刷新（本身就是认证入口）', async () => {
    saveTokens(TOKENS);
    fetchMock.mockResolvedValueOnce(fail(401, '用户名或密码错误'));

    await expect(httpPost('/auth/login', {})).rejects.toMatchObject({
      httpStatus: 401,
    });
    expect(
      fetchMock.mock.calls.some((c) =>
        callInfo(c as unknown[]).url.includes('/auth/refresh'),
      ),
    ).toBe(false);
  });

  it('后端宕机等网络错误归一成 httpStatus=0 的 ApiError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(httpGet('/things')).rejects.toMatchObject({
      httpStatus: 0,
      message: '网络异常，请稍后重试',
    });
  });
});

function httpDeleteish(): Promise<unknown> {
  // 单独封一层，避免顶层的测试直接依赖 httpDelete 而让用例名变长
  return httpGet('/protected');
}
