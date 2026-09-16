import type { MenuNode, PermissionCatalogItem } from '@nest-admin/shared';
import { describe, expect, it } from 'vitest';

import {
  applySelection,
  collectCheckableIds,
  collectDisabledIds,
  collectParentIds,
  countSelected,
  filterMenuTree,
  groupPermissions,
  matchPermission,
  mergeMenuSelection,
  resolveMenuSelection,
  resourceKeyOf,
  resourceLabelOf,
  sameIdSet,
  toMenuTreeData,
} from '../utils';

/** 菜单节点工厂：只写关心的字段，其余给稳定默认值 */
function menu(
  id: number,
  name: string,
  children: MenuNode[] = [],
  overrides: Partial<MenuNode> = {},
): MenuNode {
  return {
    id,
    parentId: null,
    name,
    type: 'menu',
    path: `/m${id}`,
    component: null,
    icon: null,
    sort: 0,
    visible: true,
    keepAlive: false,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    children,
    ...overrides,
  };
}

function permission(id: number, code: string, name = code): PermissionCatalogItem {
  return { id, code, name, module: 'system' };
}

/**
 * 一棵三层菜单：系统管理（目录，id=1）下有用户管理（2）与组织架构（3）；
 * 用户管理下挂着停用的"用户导出"（4）。
 */
function sampleTree(): MenuNode[] {
  return [
    menu(1, '系统管理', [
      menu(2, '用户管理', [menu(4, '用户导出', [], { status: 'disabled' })]),
      menu(3, '组织架构'),
    ]),
    menu(5, '首页'),
  ];
}

describe('resourceKeyOf', () => {
  it('去掉最后一段动作，保留完整资源路径', () => {
    expect(resourceKeyOf('system:user:list')).toBe('system:user');
    expect(resourceKeyOf('system:scheduled-task:run')).toBe(
      'system:scheduled-task',
    );
  });

  it('只有两段时取首段，单段时原样返回', () => {
    expect(resourceKeyOf('dashboard:view')).toBe('dashboard');
    expect(resourceKeyOf('dashboard')).toBe('dashboard');
  });

  it('空字符串不会抛出，落到兜底分组', () => {
    expect(resourceKeyOf('')).toBe('other');
  });
});

describe('resourceLabelOf', () => {
  it('已登记的资源用中文名', () => {
    expect(resourceLabelOf('system:user')).toBe('用户管理');
    expect(resourceLabelOf('system:oauth-provider')).toBe('OAuth 提供商');
  });

  it('未登记的资源回退成分组键本身，便于发现漏登记的权限码', () => {
    expect(resourceLabelOf('system:unknown-resource')).toBe(
      'system:unknown-resource',
    );
  });
});

describe('groupPermissions', () => {
  it('按资源段分组，空 module 也能分组', () => {
    const groups = groupPermissions([
      permission(1, 'system:user:list'),
      permission(2, 'system:user:create'),
      permission(3, 'system:role:list'),
    ]);

    expect(groups.map((group) => group.key)).toEqual([
      'system:user',
      'system:role',
    ]);
    expect(groups[0]!.label).toBe('用户管理');
    expect(groups[0]!.items.map((item) => item.id)).toEqual([1, 2]);
  });

  it('保持入参顺序，保证界面分组顺序稳定', () => {
    const groups = groupPermissions([
      permission(1, 'system:role:list'),
      permission(2, 'system:user:list'),
      permission(3, 'system:role:create'),
    ]);

    expect(groups.map((group) => group.key)).toEqual([
      'system:role',
      'system:user',
    ]);
    expect(groups[0]!.items.map((item) => item.id)).toEqual([1, 3]);
  });
});

describe('applySelection / countSelected / sameIdSet', () => {
  it('勾选与取消都不修改入参', () => {
    const current = [1, 2];

    expect(applySelection(current, [3], true)).toEqual([1, 2, 3]);
    expect(applySelection(current, [2], false)).toEqual([1]);
    expect(current).toEqual([1, 2]);
  });

  it('重复勾选不会产生重复项', () => {
    expect(applySelection([1], [1, 2, 2], true)).toEqual([1, 2]);
  });

  it('统计选中数量', () => {
    const items = [permission(1, 'a:b:c'), permission(2, 'a:b:d')];

    expect(countSelected(items, [2, 9])).toBe(1);
    expect(countSelected(items, [])).toBe(0);
  });

  it('集合比较忽略顺序与重复', () => {
    expect(sameIdSet([1, 2], [2, 1])).toBe(true);
    expect(sameIdSet([1, 1, 2], [2, 1])).toBe(true);
    expect(sameIdSet([1], [1, 2])).toBe(false);
    expect(sameIdSet([], [])).toBe(true);
  });
});

describe('matchPermission', () => {
  const item = permission(1, 'system:user:list', '查询用户');

  it('名称或编码命中即可，忽略大小写与首尾空格', () => {
    expect(matchPermission(item, '用户')).toBe(true);
    expect(matchPermission(item, 'USER')).toBe(true);
    expect(matchPermission(item, '  system:user  ')).toBe(true);
  });

  it('空关键词恒真，不命中返回 false', () => {
    expect(matchPermission(item, '')).toBe(true);
    expect(matchPermission(item, '   ')).toBe(true);
    expect(matchPermission(item, '菜单')).toBe(false);
  });
});

describe('菜单树的勾选语义', () => {
  it('collectParentIds 只收「有孩子」的节点', () => {
    expect([...collectParentIds(sampleTree())]).toEqual([1, 2]);
  });

  it('collectDisabledIds 递归收集停用节点', () => {
    expect([...collectDisabledIds(sampleTree())]).toEqual([4]);
  });

  it('collectCheckableIds 排除停用节点', () => {
    expect(collectCheckableIds(sampleTree())).toEqual([1, 2, 3, 5]);
  });

  it('回显只勾叶子，父目录不进 checkedKeys', () => {
    // 角色被授予「用户管理」这整棵子树：4 是停用的，2 有子节点
    const { checked } = resolveMenuSelection(sampleTree(), [1, 2, 4, 3]);

    expect(checked).toEqual([3]);
    expect(checked).not.toContain(1);
    expect(checked).not.toContain(2);
  });

  it('回显按授权集合补出祖先链，避免「打开就点确定」丢掉目录授权', () => {
    const { halfChecked } = resolveMenuSelection(sampleTree(), [3]);

    expect([...halfChecked].sort()).toEqual([1]);
  });

  it('停用节点不算已勾选', () => {
    const { checked } = resolveMenuSelection(sampleTree(), [4]);

    expect(checked).toEqual([]);
  });

  it('只授权目录本身时，目录只出现在半选里而不是勾选里', () => {
    // 目录 id 进 checkedKeys 会让 antd 把子菜单全勾上，显示成更大的权限
    const { checked, halfChecked } = resolveMenuSelection(sampleTree(), [1]);

    expect(checked).toEqual([]);
    expect(halfChecked).toEqual([]);
  });

  it('mergeMenuSelection 取并集并去重', () => {
    expect(mergeMenuSelection([2, 3], [1, 2])).toEqual([2, 3, 1]);
  });
});

describe('toMenuTreeData', () => {
  it('停用节点标记为不可勾选并标注状态', () => {
    const tree = toMenuTreeData(sampleTree());
    const userMenu = tree[0]!.children?.[0];
    const exportMenu = userMenu?.children?.[0];

    expect(exportMenu?.disabled).toBe(true);
    expect(exportMenu?.title).toBe('用户导出（已停用）');
    expect(userMenu?.disabled).toBe(false);
  });

  it('隐藏节点在标题上标注，不带 disabled', () => {
    const node = toMenuTreeData([
      menu(1, '隐藏页', [], { visible: false }),
    ])[0]!;

    expect(node.title).toBe('隐藏页（隐藏）');
    expect(node.disabled).toBe(false);
  });

  it('叶子节点不带 children 字段', () => {
    const node = toMenuTreeData([menu(1, '首页')])[0]!;

    expect(node.children).toBeUndefined();
  });
});

describe('filterMenuTree', () => {
  it('空关键词返回整棵树且不要求展开', () => {
    const { tree, expandKeys } = filterMenuTree(sampleTree(), '  ');

    expect(tree).toHaveLength(2);
    expect(expandKeys).toEqual([]);
  });

  it('命中自身的节点保留整棵子树，避免搜到目录却看不到子菜单', () => {
    const { tree, expandKeys } = filterMenuTree(sampleTree(), '系统管理');

    expect(tree).toHaveLength(1);
    expect(tree[0]!.children).toHaveLength(2);
    expect(expandKeys).toEqual([1]);
  });

  it('仅子孙命中时保留祖先链并展开路径', () => {
    const { tree, expandKeys } = filterMenuTree(sampleTree(), '组织架构');

    expect(tree.map((node) => node.id)).toEqual([1]);
    expect(tree[0]!.children?.map((node) => node.id)).toEqual([3]);
    expect([...expandKeys].sort()).toEqual([1]);
  });

  it('按路径也能命中', () => {
    const { tree } = filterMenuTree(sampleTree(), '/m3');

    expect(tree[0]!.children?.map((node) => node.id)).toEqual([3]);
  });

  it('没有命中时返回空树', () => {
    const { tree, expandKeys } = filterMenuTree(sampleTree(), '不存在的菜单');

    expect(tree).toEqual([]);
    expect(expandKeys).toEqual([]);
  });
});