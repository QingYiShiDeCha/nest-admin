import { describe, expect, it } from 'vitest';

import type { MenuNode } from '@nest-admin/shared';
import {
  findAncestorKeys,
  findByKey,
  findMenuTrail,
  menuKeyOf,
  toMenuItems,
} from '@/layouts/menu-tree';
import { resolveMenuIcon } from '@/layouts/menu-icons';

const node = (
  overrides: Partial<MenuNode> & Pick<MenuNode, 'id' | 'name'>,
): MenuNode => ({
  parentId: null,
  type: 'menu',
  path: null,
  component: null,
  icon: null,
  sort: 0,
  visible: true,
  keepAlive: false,
  status: 'active',
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
  children: [],
  ...overrides,
});

/** 首页 + 系统管理（含两个子项），贴近 seed 出来的真实结构 */
const tree: MenuNode[] = [
  node({ id: 1, name: '首页', path: '/dashboard', icon: 'RiDashboardLine' }),
  node({
    id: 2,
    name: '系统管理',
    type: 'directory',
    icon: 'RiSettings3Line',
    children: [
      node({ id: 3, name: '用户管理', path: '/system/user', parentId: 2 }),
      node({ id: 4, name: '角色管理', path: '/system/role', parentId: 2 }),
    ],
  }),
];

describe('menuKeyOf', () => {
  it('有 path 用 path，目录没有 path 时用 id 兜底', () => {
    expect(menuKeyOf(tree[0]!)).toBe('/dashboard');
    expect(menuKeyOf(tree[1]!)).toBe('menu-2');
  });
});

describe('toMenuItems', () => {
  it('保留层级并带上 label/title', () => {
    const items = toMenuItems(tree);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      key: '/dashboard',
      label: '首页',
      title: '首页',
    });
    // 有子节点的才有 children，叶子上不该出现空 children——
    // antdv 见到 children 就会把它当成 SubMenu 渲染出箭头
    expect(items[0]).not.toHaveProperty('children');
    expect(items[1]).toHaveProperty('children');
  });

  it('子节点按原顺序递归转换', () => {
    const items = toMenuItems(tree) as Array<{
      children?: Array<{ key: string }>;
    }>;

    expect(items[1]?.children?.map((c) => c.key)).toEqual([
      '/system/user',
      '/system/role',
    ]);
  });

  it('图标名未登记时不渲染图标，也不抛错', () => {
    // 图标是装饰，数据库里写错一个名字不该让整个后台打不开
    const items = toMenuItems([
      node({ id: 9, name: '外部系统', path: '/x', icon: '不存在的图标' }),
    ]);

    expect(items[0]).not.toHaveProperty('icon');
    expect(items[0]).toMatchObject({ key: '/x', label: '外部系统' });
  });

  it('图片图标交给 AppIcon 渲染', () => {
    const items = toMenuItems([
      node({
        id: 10,
        name: '图片菜单',
        path: '/image',
        icon: '/uploads/menu.svg',
      }),
    ]) as Array<{ icon?: { props?: { icon?: string } } }>;

    expect(items[0]?.icon?.props?.icon).toBe('/uploads/menu.svg');
  });

  it('图标不覆盖颜色，由菜单文字的 currentColor 控制', () => {
    const items = toMenuItems(tree) as Array<{
      icon?: { props?: { style?: unknown } };
    }>;

    expect(items[0]?.icon?.props?.style).toBeUndefined();
  });
});

describe('resolveMenuIcon', () => {
  it('解析 Remix Icon 名称', () => {
    expect(resolveMenuIcon('RiDashboardLine')).toBe('i-ri:dashboard-line');
  });

  it('兼容数据库里已有的旧图标名', () => {
    expect(resolveMenuIcon('DashboardOutlined')).toBe('i-ri:dashboard-line');
  });

  it('原样保留图片 URL', () => {
    expect(resolveMenuIcon('/uploads/menu.svg?v=1')).toBe(
      '/uploads/menu.svg?v=1',
    );
    expect(resolveMenuIcon('https://example.com/menu')).toBe(
      'https://example.com/menu',
    );
  });
});

describe('findByKey', () => {
  it('能深入子树找到节点', () => {
    expect(findByKey(tree, '/system/role')?.name).toBe('角色管理');
  });

  it('找不到返回 undefined', () => {
    expect(findByKey(tree, '/nope')).toBeUndefined();
  });
});

describe('findAncestorKeys', () => {
  it('返回目标所在分支上的父级 key，用于自动展开目录', () => {
    expect(findAncestorKeys(tree, '/system/user')).toEqual(['menu-2']);
  });

  it('顶层节点没有祖先', () => {
    expect(findAncestorKeys(tree, '/dashboard')).toEqual([]);
  });

  it('路径不在菜单里时返回空，不应误展开某个目录', () => {
    // 个人中心这类 visible:false 的页面不在侧边栏树里，
    // 进这种页时侧边栏不该乱展开一块
    expect(findAncestorKeys(tree, '/profile')).toEqual([]);
  });
});

describe('findMenuTrail', () => {
  it('返回目录到当前页面的完整节点链', () => {
    expect(
      findMenuTrail(tree, '/system/user').map((item) => item.name),
    ).toEqual(['系统管理', '用户管理']);
  });

  it('路径不在菜单树时返回空数组', () => {
    expect(findMenuTrail(tree, '/profile')).toEqual([]);
  });
});
