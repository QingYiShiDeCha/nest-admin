import type {
  BasicUser,
  PaginatedResult,
  UserListItem,
} from '@nest-admin/shared';
import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  httpPut,
  withQuery,
} from '@/api/http';

export interface UserQuery {
  deptId?: number;
  keyword?: string;
  status?: 'active' | 'disabled' | '';
}

export interface UserPayload {
  deptId?: number | null;
  nickname?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'disabled';
}

export function apiUserPage(
  query: UserQuery & { page: number; pageSize: number },
) {
  return httpGet<PaginatedResult<UserListItem>>(
    withQuery('/users', { ...query }),
  );
}

export function apiUserCreate(
  payload: UserPayload & {
    username: string;
    password: string;
  },
): Promise<BasicUser> {
  return httpPost<BasicUser>('/users', payload);
}

export function apiUserUpdate(
  id: number,
  payload: UserPayload,
): Promise<BasicUser> {
  return httpPatch<BasicUser>(`/users/${id}`, payload);
}

export function apiUpdateOwnAvatar(avatar: string | null): Promise<BasicUser> {
  return httpPatch<BasicUser>('/users/me/avatar', { avatar });
}

export function apiUserRemove(id: number): Promise<void> {
  return httpDelete(`/users/${id}`);
}

/** 查询用户已分配的角色 id，需要 system:user:assign-role 权限 */
export function apiUserRoleIds(id: number): Promise<number[]> {
  return httpGet<number[]>(`/users/${id}/roles`);
}

/** 全量替换用户的角色 */
export function apiUserSetRoles(id: number, ids: number[]): Promise<void> {
  return httpPut(`/users/${id}/roles`, { ids });
}

export function apiUserPostIds(id: number): Promise<number[]> {
  return httpGet<number[]>(`/users/${id}/posts`);
}

export function apiUserSetPosts(id: number, ids: number[]): Promise<void> {
  return httpPut(`/users/${id}/posts`, { ids });
}

/** 强制下线：吊销该用户全部 refreshToken */
export function apiUserForceLogout(
  id: number,
): Promise<{ revokedSessions: number }> {
  return httpPost<{ revokedSessions: number }>(`/users/${id}/force-logout`);
}
