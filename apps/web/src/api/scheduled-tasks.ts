import type {
  PaginatedResult,
  ScheduledTask,
  ScheduledTaskDefinition,
  ScheduledTaskExecutionStatus,
  ScheduledTaskLog,
  ScheduledTaskTriggerType,
  Status,
} from '@nest-admin/shared';

import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  withQuery,
} from '@/api/http';

export interface ScheduledTaskQuery {
  keyword?: string;
  status?: Status | '';
}

export interface ScheduledTaskLogQuery {
  status?: ScheduledTaskExecutionStatus | '';
  triggerType?: ScheduledTaskTriggerType | '';
}

export interface ScheduledTaskPayload {
  name: string;
  taskKey: string;
  cronExpression: string;
  timezone: string;
  status: Status;
  remark?: string;
}

export function apiScheduledTaskPage(
  query: ScheduledTaskQuery & { page: number; pageSize: number },
) {
  return httpGet<PaginatedResult<ScheduledTask>>(
    withQuery('/scheduled-tasks', { ...query }),
  );
}

export function apiScheduledTaskDefinitions() {
  return httpGet<ScheduledTaskDefinition[]>('/scheduled-tasks/definitions');
}

export function apiScheduledTaskCreate(payload: ScheduledTaskPayload) {
  return httpPost<ScheduledTask>('/scheduled-tasks', payload);
}

export function apiScheduledTaskUpdate(
  id: number,
  payload: Partial<ScheduledTaskPayload>,
) {
  return httpPatch<ScheduledTask>(`/scheduled-tasks/${id}`, payload);
}

export function apiScheduledTaskRemove(id: number): Promise<void> {
  return httpDelete<void>(`/scheduled-tasks/${id}`);
}

export function apiScheduledTaskRun(id: number) {
  return httpPost<ScheduledTaskLog>(`/scheduled-tasks/${id}/run`);
}

export function apiScheduledTaskLogPage(
  id: number,
  query: ScheduledTaskLogQuery & { page: number; pageSize: number },
) {
  return httpGet<PaginatedResult<ScheduledTaskLog>>(
    withQuery(`/scheduled-tasks/${id}/logs`, { ...query }),
  );
}
