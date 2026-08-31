import type {
  DictionaryItem,
  DictionaryOption,
  DictionaryTone,
  DictionaryType,
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

export interface DictionaryTypeQuery {
  keyword?: string;
  status?: Status | '';
}

export interface DictionaryItemQuery {
  keyword?: string;
  status?: Status | '';
}

export interface DictionaryTypePayload {
  name: string;
  code: string;
  status: Status;
  remark?: string;
}

export interface DictionaryItemPayload {
  label: string;
  value: string;
  tone?: DictionaryTone | null;
  sort: number;
  status: Status;
  remark?: string;
}

export function apiDictionaryTypePage(
  query: DictionaryTypeQuery & { page: number; pageSize: number },
): Promise<PaginatedResult<DictionaryType>> {
  return httpGet(withQuery('/dictionary-types', { ...query }));
}

export function apiDictionaryTypeCreate(
  payload: DictionaryTypePayload,
): Promise<DictionaryType> {
  return httpPost('/dictionary-types', payload);
}

export function apiDictionaryTypeUpdate(
  id: number,
  payload: Partial<DictionaryTypePayload>,
): Promise<DictionaryType> {
  return httpPatch(`/dictionary-types/${id}`, payload);
}

export function apiDictionaryTypeRemove(id: number): Promise<void> {
  return httpDelete(`/dictionary-types/${id}`);
}

export function apiDictionaryItems(
  typeId: number,
  query: DictionaryItemQuery,
): Promise<DictionaryItem[]> {
  return httpGet(withQuery(`/dictionary-types/${typeId}/items`, { ...query }));
}

export function apiDictionaryItemCreate(
  typeId: number,
  payload: DictionaryItemPayload,
): Promise<DictionaryItem> {
  return httpPost(`/dictionary-types/${typeId}/items`, payload);
}

export function apiDictionaryItemUpdate(
  id: number,
  payload: Partial<DictionaryItemPayload>,
): Promise<DictionaryItem> {
  return httpPatch(`/dictionary-items/${id}`, payload);
}

export function apiDictionaryItemRemove(id: number): Promise<void> {
  return httpDelete(`/dictionary-items/${id}`);
}

export function apiDictionaryOptions(
  code: string,
): Promise<DictionaryOption[]> {
  return httpGet(`/dictionaries/${encodeURIComponent(code)}`);
}
