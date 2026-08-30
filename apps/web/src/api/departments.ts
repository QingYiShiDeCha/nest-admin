import type {
  Department,
  DepartmentNode,
  DepartmentTransfer,
  PaginatedResult,
  Status,
} from '@nest-admin/shared';

import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  withQuery,
} from '@/api/http';

export interface DepartmentQuery {
  keyword?: string;
  status?: Status | '';
}

export interface DepartmentPayload {
  parentId?: number | null;
  name: string;
  code: string;
  leaderId?: number | null;
  phone?: string;
  email?: string;
  sort?: number;
  status?: Status;
  moveReason?: string;
}

export interface DepartmentTransferQuery {
  page: number;
  pageSize: number;
}

export function apiDepartmentTree(
  query: DepartmentQuery = {},
): Promise<DepartmentNode[]> {
  return httpGet<DepartmentNode[]>(withQuery('/departments', { ...query }));
}

export function apiDepartmentCreate(
  payload: DepartmentPayload,
): Promise<Department> {
  return httpPost<Department>('/departments', payload);
}

export function apiDepartmentUpdate(
  id: number,
  payload: Partial<DepartmentPayload>,
): Promise<Department> {
  return httpPatch<Department>(`/departments/${id}`, payload);
}

export function apiDepartmentRemove(id: number): Promise<void> {
  return httpDelete(`/departments/${id}`);
}

export function apiDepartmentTransfers(
  id: number,
  query: DepartmentTransferQuery,
): Promise<PaginatedResult<DepartmentTransfer>> {
  return httpGet<PaginatedResult<DepartmentTransfer>>(
    withQuery(`/departments/${id}/transfers`, { ...query }),
  );
}
