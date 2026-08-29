import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { resolveMenuIcon } from '@/layouts/menu-icons';

/**
 * 页签关心的路由切片，本地声明而非依赖 vue-router 的 RouteMeta 全局增强。
 * 原因：增强声明在 router/routes.ts，而 vitest 项目只为 spec 编译本文件
 * （tsconfig.vitest 只 include __tests__），那个程序里没有 routes.ts，
 * 依赖增强会让同一个文件在两种编译模式下行为不一致。
 * 结构化类型：afterEach 的真实路由对象可直接传入。
 */
export interface TabRoute {
  fullPath: string;
  meta: {
    title?: string;
    icon?: string;
    public?: boolean;
    affix?: boolean;
    cacheName?: string;
  };
}

/** 页签条上的一个标签 */
export interface TabItem {
  /** 用 fullPath 作身份：同路径不同 query 是不同页签 */
  path: string;
  title: string;
  iconClass?: string;
  /** 钉住的页签不可关闭（首页这类常驻入口），不受「关闭全部」影响 */
  affix: boolean;
  /** KeepAlive 的组件名；undefined = 该页签只导航不缓存状态 */
  cacheName?: string;
}

/**
 * 多页签状态。
 *
 * 页签 = 访问过的非公开路由。刻意不持久化：刷新后组件实例本来就没了，
 * 恢复出来的页签只是空壳，还会把上个用户会话的痕迹带进来。
 * 登录态失效时由 reset() 清空。
 */
export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<TabItem[]>([]);

  /** KeepAlive 的 include：当前开着、且声明了缓存的页签组件名 */
  const cachedNames = computed(() =>
    [...new Set(tabs.value.map((t) => t.cacheName).filter((n): n is string => !!n))],
  );

  /**
   * 路由切换时调用（router.afterEach）。公开页（登录/错误页）不进页签。
   * 参数用结构化窄类型：afterEach 的真实路由对象可直接传入，
   * 测试也只需构造两个字段，不必背负 vue-router 泛型 meta 的 oddities
   */
  function visit(route: TabRoute): void {
    if (route.meta.public) {
      return;
    }

    const path = route.fullPath;
    const existing = tabs.value.find((tab) => tab.path === path);

    if (existing) {
      // 菜单改名这类场景：标题跟着路由刷新
      existing.title = route.meta.title ?? existing.title;
      return;
    }

    tabs.value.push({
      path,
      title: route.meta.title ?? path,
      iconClass: route.meta.icon ? resolveMenuIcon(route.meta.icon) : undefined,
      affix: route.meta.affix === true,
      cacheName: route.meta.cacheName,
    });
  }

  /**
   * 关闭页签。返回应导航到的路径——仅当关掉的是当前所在页签时才有值，
   * 优先取它右边的邻居，没有则取左边；由调用方负责跳转。
   * 钉住的页签关不掉（返回 undefined 且状态不变）。
   */
  function close(path: string, activePath?: string): string | undefined {
    const index = tabs.value.findIndex((tab) => tab.path === path);

    if (index === -1 || tabs.value[index]!.affix) {
      return undefined;
    }

    tabs.value.splice(index, 1);

    if (path !== activePath) {
      return undefined;
    }

    const next = tabs.value[index] ?? tabs.value[index - 1];
    return next?.path;
  }

  /** 关闭其他：保留钉住的页签和目标页签 */
  function closeOthers(path: string, activePath?: string): string | undefined {
    tabs.value = tabs.value.filter((tab) => tab.affix || tab.path === path);
    return path !== activePath ? path : undefined;
  }

  /** 关闭全部：只留钉住的页签 */
  function closeAll(activePath?: string): string | undefined {
    tabs.value = tabs.value.filter((tab) => tab.affix);

    if (activePath && tabs.value.some((tab) => tab.path === activePath)) {
      return undefined;
    }

    return tabs.value[0]?.path;
  }

  function reset(): void {
    tabs.value = [];
  }

  return { tabs, cachedNames, visit, close, closeOthers, closeAll, reset };
});
