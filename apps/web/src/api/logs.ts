import type { OperationLog, OperationStatus, Paginated } from '@/api/types';
import { httpGet, httpPost, withQuery } from '@/api/http';

export interface LogQuery {
  username?: string;
  module?: string;
  status?: OperationStatus | '';
  /** ISO 8601，含起始时刻 */
  startAt?: string;
  /** ISO 8601，含截止时刻 */
  endAt?: string;
}

export function apiLogPage(query: LogQuery & { page: number; pageSize: number }) {
  return httpGet<Paginated<OperationLog>>(withQuery('/operation-logs', { ...query }));
}

/** 清理结果：日志行数与连带过期的 refreshToken 数 */
export interface CleanupResult {
  operationLogs: number;
  refreshTokens: number;
}

/** 预览按保留期会清理掉多少行 */
export function apiLogCleanupPreview(): Promise<CleanupResult> {
  return httpGet<CleanupResult>('/operation-logs/cleanup/preview');
}

/** 手动执行一次清理，与定时任务共用同一把 Redis 锁 */
export function apiLogCleanup(): Promise<CleanupResult> {
  return httpPost<CleanupResult>('/operation-logs/cleanup');
}
