import type {
  FileCategory,
  FileResource,
  FileStorageDriver,
  FileUploadResult,
  PaginatedResult,
} from '@nest-admin/shared';

import { httpDelete, httpGet, httpPost, withQuery } from '@/api/http';

export interface FileResourceQuery {
  keyword?: string;
  category?: FileCategory | '';
  storage?: FileStorageDriver | '';
}

export function apiUploadFile(file: File): Promise<FileUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  return httpPost<FileUploadResult>('/files/upload', formData);
}

export function apiFileResourcePage(
  query: FileResourceQuery & { page: number; pageSize: number },
): Promise<PaginatedResult<FileResource>> {
  return httpGet<PaginatedResult<FileResource>>(
    withQuery('/files/resources', { ...query }),
  );
}

export function apiMyFileResourcePage(
  query: FileResourceQuery & { page: number; pageSize: number },
): Promise<PaginatedResult<FileResource>> {
  return httpGet<PaginatedResult<FileResource>>(
    withQuery('/files/resources/mine', { ...query }),
  );
}

export function apiFileResourceDetail(id: number): Promise<FileResource> {
  return httpGet<FileResource>(`/files/resources/${id}`);
}

export function apiFileResourceRemove(id: number): Promise<void> {
  return httpDelete<void>(`/files/resources/${id}`);
}
