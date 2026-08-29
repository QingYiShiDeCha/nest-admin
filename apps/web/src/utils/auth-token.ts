/**
 * token 的持久化。单独抽出来而不是塞进 pinia store：
 * http 客户端要在任何组件之外读写它（拦截器、401 刷新），
 * 依赖 pinia 就得先有 active 实例，测试和非组件环境都会变麻烦。
 *
 * 刷新令牌放 localStorage 是取舍过的：HTTP-only cookie 方案需要后端
 * 配合改 CORS 与 SameSite，当前后端就是 body 返回、Bearer 使用的形态，
 * 与之配套的登录、刷新、吊销都已在后端落地。XSS 风险由 Vue 的
 * 模板转义与后续接入 CSP 缓解，不在这里造第二套机制。
 */
const STORAGE_KEY = 'nest-admin.auth';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export function saveTokens(tokens: StoredTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getTokens(): StoredTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;

    if (typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string') {
      return null;
    }

    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
  } catch {
    // 数据损坏等价于未登录，清掉别让它一直坏着
    clearTokens();
    return null;
  }
}

export function getAccessToken(): string | null {
  return getTokens()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return getTokens()?.refreshToken ?? null;
}
