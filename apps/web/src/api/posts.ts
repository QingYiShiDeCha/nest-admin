import type { PaginatedResult, Post, PostListItem } from '@nest-admin/shared';

import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  withQuery,
} from '@/api/http';

export interface PostQuery {
  keyword?: string;
  status?: 'active' | 'disabled' | '';
}

export interface PostPayload {
  code: string;
  name: string;
  sort?: number;
  status?: 'active' | 'disabled';
  remark?: string;
}

export function apiPostPage(
  query: PostQuery & { page: number; pageSize: number },
) {
  return httpGet<PaginatedResult<PostListItem>>(
    withQuery('/posts', { ...query }),
  );
}

export function apiPostCreate(payload: PostPayload): Promise<Post> {
  return httpPost<Post>('/posts', payload);
}

export function apiPostUpdate(
  id: number,
  payload: Partial<PostPayload>,
): Promise<Post> {
  return httpPatch<Post>(`/posts/${id}`, payload);
}

export function apiPostRemove(id: number): Promise<void> {
  return httpDelete(`/posts/${id}`);
}
