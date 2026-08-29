import type { MenuNode, MenuType, Status } from '@nest-admin/shared';

import { httpDelete, httpGet, httpPatch, httpPost } from '@/api/http';

/**
 * 菜单相关的线上类型（MenuNode 等）已上移到 @nest-admin/shared，
 * 这里只保留请求封装与请求体形状（请求体是前端发起方定义的调用约定，
 * 后端有对应的 DTO 类做校验）。
 */

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
  type: MenuType;
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  visible?: boolean;
  keepAlive?: boolean;
  status?: Status;
}

export function apiMenuCreate(payload: MenuPayload): Promise<MenuNode> {
  return httpPost<MenuNode>('/menus', payload);
}

export function apiMenuUpdate(id: number, payload: Partial<MenuPayload>): Promise<MenuNode> {
  return httpPatch<MenuNode>(`/menus/${id}`, payload);
}

/** 有子菜单时后端会拒绝 */
export function apiMenuRemove(id: number): Promise<void> {
  return httpDelete(`/menus/${id}`);
}
