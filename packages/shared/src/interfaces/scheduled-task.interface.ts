import type { ScheduledTaskExecutionStatus } from '../constants/scheduled-task';
import type { Status } from '../constants/status';

export interface ScheduledTask {
  id: number;
  name: string;
  taskKey: string;
  cronExpression: string;
  timezone: string;
  status: Status;
  builtIn: boolean;
  remark: string | null;
  lastRunAt: string | null;
  lastRunStatus: ScheduledTaskExecutionStatus | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledTaskDefinition {
  key: string;
  name: string;
  description: string;
}

export interface ScheduledTaskLog {
  id: number;
  taskId: number;
  taskName: string;
  taskKey: string;
  triggerType: 'scheduled' | 'manual';
  status: ScheduledTaskExecutionStatus;
  operatorId: number | null;
  operatorUsername: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  result: string | null;
  errorMessage: string | null;
}
