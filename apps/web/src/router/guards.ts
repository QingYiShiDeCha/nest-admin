import type { Router } from 'vue-router';

import {
  finishGlobalProgress,
  startGlobalProgress,
} from '@/composables/use-global-progress';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useSystemConfigStore } from '@/stores/system-config';
import { useTabsStore } from '@/stores/tabs';
import { getAccessToken } from '@/utils/auth-token';
import { resetDynamicRoutes, syncDynamicRoutes } from './dynamic-routes';

const ROUTE_PROGRESS_TASK = 'route-navigation';

export function setupGuards(router: Router): void {
  router.beforeEach(async (to) => {
    startGlobalProgress(ROUTE_PROGRESS_TASK);
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

    const menu = useMenuStore();

    // profile 与菜单各自判断：登录接口会先拿到 profile，但这时菜单仍未加载。
    if (!auth.profile || !menu.loaded) {
      try {
        await Promise.all([
          auth.profile ? Promise.resolve(auth.profile) : auth.loadProfile(),
          menu.loaded ? Promise.resolve(menu.tree) : menu.load(),
        ]);
      } catch {
        // 拉取失败通常是令牌已失效（http 层已清 token），回登录页重新来。
        // 页签是上个会话的痕迹，一并清掉
        auth.reset();
        menu.reset();
        useTabsStore().reset();
        resetDynamicRoutes();

        return { name: 'login', query: { redirect: to.fullPath } };
      }
    }

    syncDynamicRoutes(router, menu.tree);

    // 首次进入业务地址时原 matcher 会先命中 catch-all。动态路由注册后
    // 重新解析一次原地址，让它进入刚添加的页面组件。
    if (
      to.name === 'not-found' &&
      router.resolve(to.fullPath).name !== 'not-found'
    ) {
      return { path: to.path, query: to.query, hash: to.hash, replace: true };
    }

    // 权限不足跳 403 而不是登录页：跳登录会让用户以为登录态失效，
    // 反复登录仍然进不去，是很糟的体验
    if (to.meta.permission && !auth.hasPermission(to.meta.permission)) {
      return { name: 'forbidden' };
    }

    return true;
  });

  router.afterEach((to) => {
    finishGlobalProgress(ROUTE_PROGRESS_TASK);
    document.title = `${to.meta.title} · ${useSystemConfigStore().systemName}`;
  });

  router.onError(() => {
    finishGlobalProgress(ROUTE_PROGRESS_TASK);
  });
}
