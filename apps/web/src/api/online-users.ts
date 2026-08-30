import type { OnlineUserSession, PaginatedResult } from '@nest-admin/shared';

import { httpDelete, httpGet, withQuery } from '@/api/http';

export interface OnlineUserQuery {
  keyword?: string;
  ip?: string;
}

export function apiOnlineUserPage(
  query: OnlineUserQuery & { page: number; pageSize: number },
): Promise<PaginatedResult<OnlineUserSession>> {
  return httpGet<PaginatedResult<OnlineUserSession>>(
    withQuery('/online-users', { ...query }),
  );
}

export function apiRevokeOnlineSession(
  userId: number,
  sessionId: number,
): Promise<void> {
  return httpDelete(`/users/${userId}/sessions/${sessionId}`);
}
