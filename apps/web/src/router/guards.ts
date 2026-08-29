import type { Router } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useTabsStore } from '@/stores/tabs';
import { getAccessToken } from '@/utils/auth-token';

const APP_TITLE = 'nest-admin';

export function setupGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();

    // 公开页放行。注意登录页也在其中，否则会和下面的重定向形成死循环
    if (to.meta.public) {
      // 已登录还去登录页就送回首页，避免出现「已登录却停在登录框」
      if (to.name === 'login' && getAccessToken()) {
        return { path: '/' };
      }

      return true;
    }

    if (!getAccessToken()) {
      // 带上原目标，登录后跳回去
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    // 刷新页面后 store 是空的但 token 还在，这里补齐用户信息与菜单。
    // 两个请求并行——串行会让首屏白屏时间翻倍。
    if (!auth.profile) {
      const menu = useMenuStore();

      try {
        await Promise.all([auth.loadProfile(), menu.load()]);
      } catch {
        // 拉取失败通常是令牌已失效（http 层已清 token），回登录页重新来。
        // 页签是上个会话的痕迹，一并清掉
        auth.reset();
        menu.reset();
        useTabsStore().reset();

        return { name: 'login', query: { redirect: to.fullPath } };
      }
    }

    // 权限不足跳 403 而不是登录页：跳登录会让用户以为登录态失效，
    // 反复登录仍然进不去，是很糟的体验
    if (to.meta.permission && !auth.hasPermission(to.meta.permission)) {
      return { name: 'forbidden' };
    }

    return true;
  });

  router.afterEach((to) => {
    document.title = `${to.meta.title} · ${APP_TITLE}`;
  });
}
