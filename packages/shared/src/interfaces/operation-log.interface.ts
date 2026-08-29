import type { OperationStatus } from '../constants/operation';

/**
 * 操作日志的「线上格式」契约，见 user.interface.ts 的说明。
 *
 * 日志 append-only，没有审计字段与软删除字段。
 */
export interface OperationLog {
  id: number;
  userId: number | null;
  /**
   * 冗余存储的用户名。用户被删除后 user_id 仍在但查不到人，
   * 日志必须能独立回答「是谁做的」，所以不做关联查询。
   */
  username: string | null;
  module: string | null;
  action: string | null;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  /** 请求参数快照（JSON 字符串，后端已脱敏截断） */
  params: string | null;
  status: OperationStatus;
  /** HTTP 状态码，失败时便于快速筛选 */
  statusCode: number | null;
  errorMessage: string | null;
  /** 耗时，毫秒 */
  durationMs: number | null;
  createdAt: string;
}
