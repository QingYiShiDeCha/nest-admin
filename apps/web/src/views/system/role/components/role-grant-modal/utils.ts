import type { MenuNode, PermissionCatalogItem } from '@nest-admin/shared';

/**
 * 角色授权界面的纯逻辑。
 *
 * 抽成纯函数是为了可测：「回显只勾叶子」「父目录进半选」「提交时取并集」
 * 这几条一旦写错，症状是授权被静默放大或缩小——在界面上点一遍很难发现，
 * 往往要等某个角色真的越权、或某个菜单入口凭空消失才暴露。
 */

/** a-tree 需要的节点形状；disabled 由菜单状态折算而来 */
export interface GrantTreeNode {
  key: number;
  title: string;
  disabled: boolean;
  children?: GrantTreeNode[];
}

/** 权限码按业务资源分组后的形状 */
export interface PermissionGroup {
  key: string;
  label: string;
  items: PermissionCatalogItem[];
}

/**
 * 资源段 → 展示名。键取 code 去掉最后一段动作后的末段
 * （system:user:list → user），与侧边栏菜单名保持一致，便于对照。
 * 未登记的键回退成分组键原文，新增权限码不会掉进无名分组。
 */
const RESOURCE_LABELS: Record<string, string> = {
  user: '用户管理',
  dept: '组织架构',
  post: '岗位管理',
  role: '角色管理',
  menu: '菜单管理',
  permission: '权限目录',
  config: '参数配置',
  dict: '数据字典',
  notice: '通知公告',
  'login-log': '登录日志',
  log: '操作日志',
  'scheduled-task': '定时任务',
  file: '文件资源',
  monitor: '系统监控',
  'oauth-provider': 'OAuth 提供商',
  message: '我的消息',
  statistics: '首页统计',
};

/** 关键词归一：去首尾空格后小写；空串表示不过滤 */
export function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

/** 两个 id 集合是否相同（忽略顺序与重复） */
export function sameIdSet(a: readonly number[], b: readonly number[]): boolean {
  const left = new Set(a);
  const right = new Set(b);

  if (left.size !== right.size) {
    return false;
  }

  for (const id of left) {
    if (!right.has(id)) {
      return false;
    }
  }

  return true;
}

/**
 * 批量勾选/取消，返回新集合（不修改入参）。
 * 整组全选、整体清空都走它，避免三处各写一遍 Set 操作。
 */
export function applySelection(
  current: readonly number[],
  ids: readonly number[],
  checked: boolean,
): number[] {
  const next = new Set(current);

  for (const id of ids) {
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }

  return [...next];
}

/** 统计 items 里被选中的数量 */
export function countSelected(
  items: readonly PermissionCatalogItem[],
  selectedIds: readonly number[],
): number {
  const selected = new Set(selectedIds);

  return items.reduce(
    (count, item) => (selected.has(item.id) ? count + 1 : count),
    0,
  );
}

/** 权限码关键词匹配：名称或编码命中即可；空关键词恒真 */
export function matchPermission(
  item: PermissionCatalogItem,
  keyword: string,
): boolean {
  const needle = normalizeKeyword(keyword);

  if (!needle) {
    return true;
  }

  return (
    item.name.toLowerCase().includes(needle) ||
    item.code.toLowerCase().includes(needle)
  );
}

/**
 * 权限码的业务资源键：去掉最后一段动作。
 * system:user:list → system:user；dashboard:view → dashboard。
 */
export function resourceKeyOf(code: string): string {
  const segments = code.split(':').filter((segment) => segment.length > 0);

  if (segments.length <= 1) {
    return segments[0] ?? 'other';
  }

  return segments.slice(0, -1).join(':');
}

/** 资源展示名 */
export function resourceLabelOf(key: string): string {
  const segments = key.split(':');
  const leaf = segments[segments.length - 1] ?? key;

  return RESOURCE_LABELS[leaf] ?? key;
}

/**
 * 权限码分组。
 *
 * 不按后端给的 module 字段分组：当前 71 个权限码的 module 全是 'system'，
 * 按它分组等于只有一组——71 项挤在一个折叠面板里既看不清也点不动。
 * 有区分度的是 code 里的资源段（system:user:* / system:role:* ...），
 * 按它分组后每组 1-10 项，可以直接扫读。
 *
 * 分组顺序跟随入参顺序（后端按 module、code 升序返回），因此是稳定的。
 */
export function groupPermissions(
  catalog: readonly PermissionCatalogItem[],
): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();

  for (const item of catalog) {
    const key = resourceKeyOf(item.code);
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { key, label: resourceLabelOf(key), items: [item] });
    }
  }

  return [...groups.values()];
}

/** 收集树里所有「有孩子」的节点 id */
export function collectParentIds(
  nodes: readonly MenuNode[],
  acc = new Set<number>(),
): Set<number> {
  for (const node of nodes) {
    if (node.children.length > 0) {
      acc.add(node.id);
      collectParentIds(node.children, acc);
    }
  }

  return acc;
}

/** 收集停用（不可勾选）的节点 id */
export function collectDisabledIds(
  nodes: readonly MenuNode[],
  acc = new Set<number>(),
): Set<number> {
  for (const node of nodes) {
    if (node.status === 'disabled') {
      acc.add(node.id);
    }

    collectDisabledIds(node.children, acc);
  }

  return acc;
}

/** 可勾选的菜单 id（排除停用节点），供「全选」使用 */
export function collectCheckableIds(nodes: readonly MenuNode[]): number[] {
  const disabledIds = collectDisabledIds(nodes);
  const result: number[] = [];

  const walk = (list: readonly MenuNode[]): void => {
    for (const node of list) {
      if (!disabledIds.has(node.id)) {
        result.push(node.id);
      }

      walk(node.children);
    }
  };

  walk(nodes);

  return result;
}

/** 收集每个已授权节点的全部祖先 id（不含节点自身） */
export function collectAncestorsOfGranted(
  nodes: readonly MenuNode[],
  granted: ReadonlySet<number>,
  path: number[] = [],
  acc = new Set<number>(),
): Set<number> {
  for (const node of nodes) {
    if (granted.has(node.id)) {
      path.forEach((id) => acc.add(id));
    }

    collectAncestorsOfGranted(node.children, granted, [...path, node.id], acc);
  }

  return acc;
}

/**
 * 把「授权集合」折算成 a-tree 的勾选状态：回显、全选、清空、重置共用。
 *
 * checked 只给非父级节点：把目录 id 一起塞进 checkedKeys 会触发 antd 的
 * 父子联动，把它全部子节点自动勾上，界面显示成比实际授权更大的权限。
 * 父目录按授权集合自己算祖先链进 halfChecked——不能指望 @check 回调补，
 * 它只在用户点击时触发，「打开弹窗不动任何勾选就点确定」时它永远是空的，
 * 目录授权会被悄悄丢掉。
 *
 * 停用菜单不进 checked：它本来就不该被勾选，摆成勾选态只会误导。
 */
export function resolveMenuSelection(
  tree: readonly MenuNode[],
  grantedIds: readonly number[],
): { checked: number[]; halfChecked: number[] } {
  const parentIds = collectParentIds(tree);
  const disabledIds = collectDisabledIds(tree);
  const granted = new Set(grantedIds);

  return {
    checked: grantedIds.filter(
      (id) => !parentIds.has(id) && !disabledIds.has(id),
    ),
    halfChecked: [...collectAncestorsOfGranted(tree, granted)],
  };
}

/** 提交：勾选状态 → 后端要保存的菜单 id 集合（去重） */
export function mergeMenuSelection(
  checked: readonly number[],
  halfChecked: readonly number[],
): number[] {
  return [...new Set([...checked, ...halfChecked])];
}

/**
 * 菜单树 → a-tree 数据。
 *
 * 停用菜单置为不可勾选：后端 findUserMenuTree 会剔除停用节点，勾了也不会
 * 出现在任何人的侧边栏，允许勾选只会给角色授权表里塞进一批「看起来授权了、
 * 实际不生效」的死数据。
 */
export function toMenuTreeData(nodes: readonly MenuNode[]): GrantTreeNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: `${node.name}${node.status === 'disabled' ? '（已停用）' : ''}${
      node.visible ? '' : '（隐藏）'
    }`,
    disabled: node.status === 'disabled',
    children:
      node.children.length > 0 ? toMenuTreeData(node.children) : undefined,
  }));
}

/**
 * 菜单树关键词过滤。
 *
 * 命中自身的节点整棵子树保留，否则会出现「搜到目录却看不到里面的菜单」；
 * 仅子孙命中的节点保留自身。同时返回需要展开的 key，
 * 避免过滤后命中项藏在折叠里等于没搜。
 */
export function filterMenuTree(
  nodes: readonly MenuNode[],
  keyword: string,
): { tree: MenuNode[]; expandKeys: number[] } {
  const needle = normalizeKeyword(keyword);

  if (!needle) {
    return { tree: [...nodes], expandKeys: [] };
  }

  const expandKeys: number[] = [];

  const walk = (list: readonly MenuNode[]): MenuNode[] => {
    const result: MenuNode[] = [];

    for (const node of list) {
      const hit =
        node.name.toLowerCase().includes(needle) ||
        (node.path ?? '').toLowerCase().includes(needle);

      if (hit) {
        if (node.children.length > 0) {
          expandKeys.push(node.id);
        }

        result.push(node);
        continue;
      }

      const children = walk(node.children);

      if (children.length > 0) {
        expandKeys.push(node.id);
        result.push({ ...node, children });
      }
    }

    return result;
  };

  return { tree: walk(nodes), expandKeys };
}