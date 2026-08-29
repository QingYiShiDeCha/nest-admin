import { httpGet } from '@/api/http';

/** 与后端 sys_menu 对齐的节点，children 由后端建好树后返回 */
export interface MenuNode {
  id: number;
  parentId: number | null;
  name: string;
  type: 'directory' | 'menu' | 'external';
  path: string | null;
  component: string | null;
  icon: string | null;
  sort: number;
  visible: boolean;
  keepAlive: boolean;
  status: 'active' | 'disabled';
  children: MenuNode[];
}

/**
 * 当前用户可见的菜单树。后端已按角色授权过滤、补齐祖先节点，
 * 并剔除了停用节点，前端直接渲染即可。
 */
export function apiMyMenus(): Promise<MenuNode[]> {
  return httpGet<MenuNode[]>('/menus/mine');
}
