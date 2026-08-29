import { httpDelete, httpGet, httpPatch, httpPost } from '@/api/http';
import type { MenuRecord } from '@/api/types';

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

// ---- 以下为菜单管理页（/system/menu）使用的管理端接口 ----

/** 完整菜单树，含停用与隐藏节点，需要 system:menu:list 权限 */
export function apiMenuTree(): Promise<MenuNode[]> {
  return httpGet<MenuNode[]>('/menus');
}

export interface MenuPayload {
  parentId?: number;
  name: string;
  type: MenuNode['type'];
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  visible?: boolean;
  keepAlive?: boolean;
  status?: MenuNode['status'];
}

export function apiMenuCreate(payload: MenuPayload): Promise<MenuRecord> {
  return httpPost<MenuRecord>('/menus', payload);
}

export function apiMenuUpdate(id: number, payload: Partial<MenuPayload>): Promise<MenuRecord> {
  return httpPatch<MenuRecord>(`/menus/${id}`, payload);
}

/** 有子菜单时后端会拒绝 */
export function apiMenuRemove(id: number): Promise<void> {
  return httpDelete(`/menus/${id}`);
}
