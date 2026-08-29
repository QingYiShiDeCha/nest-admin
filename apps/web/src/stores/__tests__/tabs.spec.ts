import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTabsStore, type TabRoute } from '@/stores/tabs';

/** 构造一个最小可用的路由对象，meta 按用例需要给 */
const routeOf = (path: string, meta: Partial<TabRoute['meta']> = {}): TabRoute => ({
  fullPath: path,
  meta: { title: path, ...meta },
});

const dashboard = () => routeOf('/dashboard', { title: '首页', affix: true, cacheName: 'DashboardPage' });
const user = () => routeOf('/system/user?id=3', { title: '用户管理', cacheName: 'UserPage' });
const role = () => routeOf('/system/role', { title: '角色管理' });

describe('tabs store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('visit 把非公开路由记为页签，带出钉住标记与缓存名', () => {
    const tabs = useTabsStore();

    tabs.visit(dashboard());
    tabs.visit(user());

    expect(tabs.tabs.map((t) => t.path)).toEqual(['/dashboard', '/system/user?id=3']);
    expect(tabs.tabs[0]).toMatchObject({ affix: true, cacheName: 'DashboardPage', title: '首页' });
  });

  it('visit 按 fullPath 去重，已存在时刷新标题', () => {
    const tabs = useTabsStore();

    tabs.visit(user());
    tabs.visit(routeOf('/system/user?id=3', { title: '用户改名了' }));

    expect(tabs.tabs).toHaveLength(1);
    expect(tabs.tabs[0]!.title).toBe('用户改名了');
  });

  it('公开页（登录/错误页）不进页签', () => {
    const tabs = useTabsStore();

    tabs.visit(routeOf('/login', { title: '登录', public: true }));
    tabs.visit(dashboard());

    expect(tabs.tabs.map((t) => t.path)).toEqual(['/dashboard']);
  });

  it('cachedNames 只含声明缓存的页签且去重', () => {
    const tabs = useTabsStore();

    tabs.visit(dashboard());
    tabs.visit(user());
    tabs.visit(role()); // 未声明缓存

    expect(tabs.cachedNames).toEqual(['DashboardPage', 'UserPage']);
  });

  it('close 移除页签；关掉激活页时返回右侧邻居，否则左边', () => {
    const tabs = useTabsStore();
    tabs.visit(dashboard());
    tabs.visit(routeOf('/a'));
    tabs.visit(user());
    tabs.visit(routeOf('/b'));

    // 关中间的激活页 → 右边邻居
    expect(tabs.close('/system/user?id=3', '/system/user?id=3')).toBe('/b');
    // 关非激活页 → 不导航
    expect(tabs.close('/a', '/b')).toBeUndefined();
    // 关最右的激活页 → 只剩左边（user 页签在第一步已被关掉）
    expect(tabs.close('/b', '/b')).toBe('/dashboard');

    expect(tabs.tabs.map((t) => t.path)).toEqual(['/dashboard']);
  });

  it('close 拒绝钉住的页签', () => {
    const tabs = useTabsStore();
    tabs.visit(dashboard());

    expect(tabs.close('/dashboard', '/dashboard')).toBeUndefined();
    expect(tabs.tabs).toHaveLength(1);
  });

  it('closeOthers 保留钉住与目标页签；目标非激活时要求跳转过去', () => {
    const tabs = useTabsStore();
    tabs.visit(dashboard());
    tabs.visit(user());
    tabs.visit(role());

    expect(tabs.closeOthers('/system/role', '/system/role')).toBeUndefined();
    expect(tabs.tabs.map((t) => t.path)).toEqual(['/dashboard', '/system/role']);

    // 目标不是当前页时返回目标路径，由调用方导航
    tabs.visit(user());
    expect(tabs.closeOthers('/system/role', '/system/user?id=3')).toBe('/system/role');
  });

  it('closeAll 只留钉住页签；当前页不在其中时要求跳回首屏', () => {
    const tabs = useTabsStore();
    tabs.visit(dashboard());
    tabs.visit(user());
    tabs.visit(role());

    // 关全部时正停在非钉住页 → 跳回首屏
    expect(tabs.closeAll('/system/role')).toBe('/dashboard');
    expect(tabs.tabs.map((t) => t.path)).toEqual(['/dashboard']);

    // 已经在首屏 → 无需导航
    expect(tabs.closeAll('/dashboard')).toBeUndefined();
  });

  it('reset 清空全部（登出/登录态失效用）', () => {
    const tabs = useTabsStore();
    tabs.visit(dashboard());

    tabs.reset();

    expect(tabs.tabs).toHaveLength(0);
    expect(tabs.cachedNames).toEqual([]);
  });
});
