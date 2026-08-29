import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MenuNode } from '@/api/menu';
import { useMenuStore } from '@/stores/menu';

vi.mock('@/api/menu', () => ({ apiMyMenus: vi.fn() }));

const node = (
  id: number,
  name: string,
  overrides: Partial<MenuNode> = {},
): MenuNode => ({
  id,
  parentId: null,
  name,
  type: 'menu',
  path: `/p${id}`,
  component: null,
  icon: null,
  sort: 0,
  visible: true,
  keepAlive: false,
  status: 'active',
  children: [],
  ...overrides,
});

describe('menu store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('侧边栏过滤掉 visible: false 的节点', () => {
    const menu = useMenuStore();
    menu.tree = [node(1, '显示'), node(2, '隐藏', { visible: false })];

    expect(menu.sidebarTree.map((n) => n.name)).toEqual(['显示']);
  });

  it('隐藏节点的子节点一并隐藏——侧边栏里没有入口去展开它们', () => {
    const menu = useMenuStore();
    menu.tree = [
      node(1, '目录', {
        type: 'directory',
        visible: false,
        children: [node(2, '子项')],
      }),
    ];

    expect(menu.sidebarTree).toEqual([]);
  });

  it('父节点可见时保留可见的子节点', () => {
    const menu = useMenuStore();
    menu.tree = [
      node(1, '目录', {
        type: 'directory',
        children: [node(2, '子A'), node(3, '子B', { visible: false })],
      }),
    ];

    expect(menu.sidebarTree[0]!.children.map((n) => n.name)).toEqual(['子A']);
  });

  it('reachablePaths 递归收集所有层级的 path（含隐藏节点）', () => {
    // 隐藏节点的路由仍应可访问（详情页那类），所以可达集合不做 visible 过滤
    const menu = useMenuStore();
    menu.tree = [
      node(1, '目录', {
        type: 'directory',
        path: null,
        children: [node(2, '子A'), node(3, '隐藏子', { visible: false })],
      }),
    ];

    expect([...menu.reachablePaths].sort()).toEqual(['/p2', '/p3']);
  });

  it('reset 清空树与加载标记', () => {
    const menu = useMenuStore();
    menu.tree = [node(1, 'x')];
    menu.loaded = true;

    menu.reset();

    expect(menu.tree).toEqual([]);
    expect(menu.loaded).toBe(false);
  });
});
