/**
 * 登录态失效的通知渠道。
 *
 * http 拦截器发现 refreshToken 也救不回来时需要让应用跳登录页，
 * 但它不能 import router：一个纯请求模块依赖路由实例会让单测必须
 * 先造一个 router，也让「谁依赖谁」变得混乱。
 *
 * 所以这里做一个极薄的发布订阅：http 只管喊一声，
 * main.ts 订阅后决定跳哪里。
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onUnauthorized(listener: Listener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function emitUnauthorized(): void {
  for (const listener of listeners) {
    listener();
  }
}
