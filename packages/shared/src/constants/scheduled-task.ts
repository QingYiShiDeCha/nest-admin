export const SCHEDULED_TASK_TRIGGER_TYPE = ['scheduled', 'manual'] as const;

export type ScheduledTaskTriggerType =
  (typeof SCHEDULED_TASK_TRIGGER_TYPE)[number];

export const SCHEDULED_TASK_EXECUTION_STATUS = [
  'running',
  'success',
  'failure',
  'skipped',
] as const;

export type ScheduledTaskExecutionStatus =
  (typeof SCHEDULED_TASK_EXECUTION_STATUS)[number];

export const DEFAULT_SCHEDULED_TASK_TIMEZONE = 'Asia/Shanghai';
