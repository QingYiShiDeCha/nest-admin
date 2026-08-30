import type { MenuNode } from '@nest-admin/shared';
import type { Component } from 'vue';
import type { RouteRecordRaw, Router } from 'vue-router';

export const ADMIN_ROUTE_NAME = 'admin-root';

type ViewModule = { default: Component };
type ViewModuleLoader = () => Promise<ViewModule>;
type ViewModuleMap = Record<string, ViewModuleLoader>;

interface RegisteredRoute {
  remove: () => void;
  signature: string;
}

export interface DynamicRouteManager {
  reset: () => void;
  sync: (router: Router, tree: MenuNode[]) => void;
}

const viewModules = import.meta.glob<ViewModule>('../views/**/*.vue');

/**
 * 后端菜单只描述页面，组件加载仍由 Vite 在构建期收集。
 * 这个模块集中处理路径兼容、路由增删和 KeepAlive 元数据，守卫只需 sync/reset。
 */
export function createDynamicRouteManager(
  modules: ViewModuleMap,
  warn: (message: string) => void = console.warn,
): DynamicRouteManager {
  const loaders = indexViewModules(modules);
  const registered = new Map<string, RegisteredRoute>();
  let activeRouter: Router | undefined;

  function reset(): void {
    for (const route of registered.values()) {
      route.remove();
    }

    registered.clear();
    activeRouter = undefined;
  }

  function sync(router: Router, tree: MenuNode[]): void {
    if (activeRouter && activeRouter !== router) {
      reset();
    }
    activeRouter = router;

    const desiredNames = new Set<string>();

    walkMenus(tree, (menu) => {
      if (menu.type !== 'menu' || !menu.path) {
        return;
      }

      if (!menu.path.startsWith('/')) {
        warn(`菜单「${menu.name}」的路由路径必须以 / 开头，已跳过动态路由注册`);
        return;
      }

      const componentPath = resolveComponentPath(menu);
      const loader = componentPath ? loaders.get(componentPath) : undefined;

      if (!componentPath || !loader) {
        warn(
          `菜单「${menu.name}」无法匹配前端组件：${componentPath ?? menu.path}`,
        );
        return;
      }

      const name = `dynamic-menu-${menu.id}`;
      const signature = JSON.stringify([
        menu.path,
        componentPath,
        menu.name,
        menu.icon,
        menu.keepAlive,
      ]);
      desiredNames.add(name);

      if (registered.get(name)?.signature === signature) {
        return;
      }

      registered.get(name)?.remove();

      const route: RouteRecordRaw = {
        path: menu.path,
        name,
        component: () => loader().then((module) => module.default),
        meta: {
          title: menu.name,
          icon: menu.icon ?? undefined,
          affix: menu.path === '/dashboard',
          keepAlive: menu.keepAlive,
          cacheName: menu.keepAlive
            ? inferCacheName(componentPath)
            : undefined,
        },
      };

      registered.set(name, {
        remove: router.addRoute(ADMIN_ROUTE_NAME, route),
        signature,
      });
    });

    for (const [name, route] of registered) {
      if (!desiredNames.has(name)) {
        route.remove();
        registered.delete(name);
      }
    }
  }

  return { reset, sync };
}

const manager = createDynamicRouteManager(viewModules);

export function syncDynamicRoutes(router: Router, tree: MenuNode[]): void {
  manager.sync(router, tree);
}

export function resetDynamicRoutes(): void {
  manager.reset();
}

function indexViewModules(modules: ViewModuleMap): Map<string, ViewModuleLoader> {
  return new Map(
    Object.entries(modules).map(([path, loader]) => [
      normalizeComponentPath(path),
      loader,
    ]),
  );
}

function resolveComponentPath(menu: MenuNode): string | undefined {
  if (menu.component?.trim()) {
    return normalizeComponentPath(menu.component);
  }

  const routePath = menu.path?.split(/[?#]/, 1)[0];
  const normalizedPath = routePath?.replace(/^\/+|\/+$/g, '');

  return normalizedPath ? `${normalizedPath}/index.vue` : undefined;
}

function normalizeComponentPath(value: string): string {
  let path = value.trim().replace(/\\/g, '/');
  const viewsMarker = path.lastIndexOf('/views/');

  if (viewsMarker >= 0) {
    path = path.slice(viewsMarker + '/views/'.length);
  } else {
    path = path.replace(/^@\//, '').replace(/^views\//, '');
  }

  path = path.replace(/^\.\//, '').replace(/^\/+/, '');

  return path.endsWith('.vue') ? path : `${path}.vue`;
}

function inferCacheName(componentPath: string): string {
  const parts = componentPath.replace(/\.vue$/, '').split('/');
  const fileName = parts.pop() ?? '';
  const source = fileName === 'index' ? (parts.pop() ?? fileName) : fileName;
  const pascalName = source
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `${pascalName}Page`;
}

function walkMenus(nodes: MenuNode[], visit: (node: MenuNode) => void): void {
  for (const node of nodes) {
    visit(node);
    walkMenus(node.children, visit);
  }
}
