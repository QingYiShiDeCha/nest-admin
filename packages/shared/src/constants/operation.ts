/**
 * 操作日志的结果状态。
 *
 * 单一来源在 shared：schema 枚举列、DTO 校验和前端展示都从这里取，
 * 与 STATUS / MENU_TYPE 的模式一致。sys_operation_log 表通过
 * database 包转发引用。
 */
export const OPERATION_STATUS = ['success', 'failure'] as const;

export type OperationStatus = (typeof OPERATION_STATUS)[number];
