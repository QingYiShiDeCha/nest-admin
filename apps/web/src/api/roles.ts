import type {
  PaginatedResult,
  Role,
  RoleDetail,
  RoleGrants,
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

/**
 * 授权界面的聚合读：角色已授权的权限码/菜单（回显），
 * 加上可授权的权限码目录与完整菜单树（候选项）。
 */
export function apiRoleGrants(id: number): Promise<RoleGrants> {
  return httpGet<RoleGrants>(`/roles/${id}/grants`);
}

/**
 * 一次提交权限码与菜单。后端在同一事务里替换两张关联表，
 * 不会出现「权限码改了、菜单没改」的半授权状态。
 */
export function apiRoleSetGrants(
  id: number,
  payload: { permissionIds: number[]; menuIds: number[] },
): Promise<void> {
  return httpPut(`/roles/${id}/grants`, payload);
}
