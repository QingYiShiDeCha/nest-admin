import type { MenuProps } from 'antdv-next';
import { h } from 'vue';

import type { MenuNode } from '@nest-admin/shared';
import { resolveMenuIcon } from './menu-icons';

/** a-menu 的 items 类型。Menu 的 ItemType 没单独导出，只能从 props 上索引 */
export type MenuItems = NonNullable<MenuProps['items']>;

/**
 * 菜单节点在 a-menu 里的 key。
 * 目录类型没有 path，用 id 兜底，保证同一棵树里 key 不重复。
 */
export function menuKeyOf(node: MenuNode): string {
  return node.path ?? `menu-${node.id}`;
}

/**
 * 后端菜单树转成 antdv 的 items 结构。
 *
 * 用 items 而不是在模板里嵌套 a-sub-menu：菜单深度由后端数据决定，
 * 模板写死两层的话第三层就渲染不出来，而递归组件比一个纯函数更绕。
 */
export function toMenuItems(nodes: MenuNode[]): MenuItems {
  return nodes.map((node) => {
    const icon = resolveMenuIcon(node.icon);
    const item = {
      key: menuKeyOf(node),
      label: node.name,
      // title 是侧栏收起后 tooltip 的文字，不给的话收起时只剩一个图标
      title: node.name,
      ...(icon ? { icon: h(icon) } : {}),
    };

    return node.children.length > 0
      ? { ...item, children: toMenuItems(node.children) }
      : item;
  });
}

/** 按 key 反查节点，用于区分外链与内部路由 */
export function findByKey(nodes: MenuNode[], key: string): MenuNode | undefined {
  for (const node of nodes) {
    if (menuKeyOf(node) === key) {
      return node;
    }

    const hit = findByKey(node.children, key);

    if (hit) {
      return hit;
    }
  }

  return undefined;
}

/** 找到则返回从当前层到目标的父级 key 链，找不到返回 null */
function ancestorTrail(nodes: MenuNode[], targetPath: string): string[] | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      // 自己就是目标，它是叶子，没有需要展开的祖先
      return [];
    }

    const deeper = ancestorTrail(node.children, targetPath);

    // 注意判空要区分 [] 与 null：空数组表示「找到了且无祖先」
    if (deeper) {
      return [menuKeyOf(node), ...deeper];
    }
  }

  return null;
}

/**
 * 当前路径所在分支上的全部父级 key，用来自动展开对应目录。
 * 直接访问 /system/user 时若不展开「系统管理」，侧边栏看着像是没有这一项。
 */
export function findAncestorKeys(nodes: MenuNode[], targetPath: string): string[] {
  return ancestorTrail(nodes, targetPath) ?? [];
}
