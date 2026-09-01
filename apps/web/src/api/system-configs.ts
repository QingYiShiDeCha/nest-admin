import type {
  PaginatedResult,
  RuntimeSystemConfig,
  Status,
  SystemConfig,
  SystemConfigValueType,
} from '@nest-admin/shared';

import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  withQuery,
} from '@/api/http';

export interface SystemConfigQuery {
  keyword?: string;
  valueType?: SystemConfigValueType | '';
  status?: Status | '';
}

export interface SystemConfigPayload {
  name: string;
  key: string;
  value: string;
  valueType: SystemConfigValueType;
  status: Status;
  remark?: string;
}

export function apiSystemConfigPage(
  query: SystemConfigQuery & { page: number; pageSize: number },
): Promise<PaginatedResult<SystemConfig>> {
  return httpGet(withQuery('/system-configs', { ...query }));
}

export function apiRuntimeSystemConfig(): Promise<RuntimeSystemConfig> {
  return httpGet('/system-configs/runtime');
}

export function apiSystemConfigCreate(
  payload: SystemConfigPayload,
): Promise<SystemConfig> {
  return httpPost('/system-configs', payload);
}

export function apiSystemConfigUpdate(
  id: number,
  payload: Partial<SystemConfigPayload>,
): Promise<SystemConfig> {
  return httpPatch(`/system-configs/${id}`, payload);
}

export function apiSystemConfigRemove(id: number): Promise<void> {
  return httpDelete(`/system-configs/${id}`);
}
