import type {
  PaginatedResult,
  PermissionCatalogItem,
  Role,
  RoleDetail,
} from '@nest-admin/shared';
import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  httpPut,
  withQuery,
} from '@/api/http';

export interface RoleQuery {
  keyword?: string;
  status?: 'active' | 'disabled' | '';
}

export interface RolePayload {
  code: string;
  name: string;
  sort?: number;
  status?: 'active' | 'disabled';
  dataScope?: Role['dataScope'];
  departmentIds?: number[];
  remark?: string;
}

export function apiRolePage(
  query: RoleQuery & { page: number; pageSize: number },
) {
  return httpGet<PaginatedResult<Role>>(withQuery('/roles', { ...query }));
}

export function apiRoleCreate(payload: RolePayload): Promise<Role> {
  return httpPost<Role>('/roles', payload);
}

export function apiRoleUpdate(
  id: number,
  payload: Partial<RolePayload>,
): Promise<Role> {
  return httpPatch<Role>(`/roles/${id}`, payload);
}

export function apiRoleRemove(id: number): Promise<void> {
  return httpDelete(`/roles/${id}`);
}

/** 角色详情，permissionIds/menuIds 供授权界面回显 */
export function apiRoleDetail(id: number): Promise<RoleDetail> {
  return httpGet<RoleDetail>(`/roles/${id}`);
}

/** 全量替换角色的权限码，空数组即清空 */
export function apiRoleSetPermissions(
  id: number,
  ids: number[],
): Promise<void> {
  return httpPut(`/roles/${id}/permissions`, { ids });
}

/** 全量替换角色的菜单 */
export function apiRoleSetMenus(id: number, ids: number[]): Promise<void> {
  return httpPut(`/roles/${id}/menus`, { ids });
}

/** 权限码目录，只读 */
export function apiPermissionCatalog(): Promise<PermissionCatalogItem[]> {
  return httpGet<PermissionCatalogItem[]>('/permissions');
}
