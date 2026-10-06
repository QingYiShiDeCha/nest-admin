import type { MenuNode } from '@nest-admin/shared';

import { resolveMenuIcon } from './menu-icons';

export interface MenuEntry {
  id: number;
  name: string;
  path: string;
  /** 已解析成 UnoCSS class 或图片 URL；未登记的图标名为空 */
  icon?: string;
  external: boolean;
}

/**
 * 把菜单树拍平成可跳转条目。
 *
 * 目录节点没有 path，不产生条目但要继续往下走；外链节点保留下来，
 * 由调用方决定用 window.open 而不是 router.push。
 */
export function flattenMenuEntries(nodes: MenuNode[]): MenuEntry[] {
  return nodes.flatMap((node) => [
    ...(node.path
      ? [
          {
            id: node.id,
            name: node.name,
            path: node.path,
            icon: resolveMenuIcon(node.icon),
            external: node.type === 'external',
          },
        ]
      : []),
    ...flattenMenuEntries(node.children),
  ]);
}

/** 按名称或路径模糊匹配；空关键词原样返回，交给调用方决定默认展示什么 */
export function matchMenuEntries(
  entries: MenuEntry[],
  keyword: string,
): MenuEntry[] {
  const search = keyword.trim().toLocaleLowerCase();

  if (!search) {
    return entries;
  }

  return entries.filter(
    (entry) =>
      entry.name.toLocaleLowerCase().includes(search) ||
      entry.path.toLocaleLowerCase().includes(search),
  );
}
