import { SetMetadata } from '@nestjs/common';

export const OPERATION_LOG_KEY = 'operation-log';
export const SKIP_OPERATION_LOG_KEY = 'skip-operation-log';

export interface OperationLogMeta {
  /** 业务模块，如「用户管理」 */
  module: string;
  /** 操作描述，如「新增用户」 */
  action: string;
}

/**
 * 给接口标注可读的模块与操作名，写进日志方便人看。
 *
 * 不标也会记录（默认所有写操作都记），只是 module / action 为空、
 * 只能靠 method + path 辨认。所以对外部要审计的接口建议都标上。
 */
export const OperationLog = (meta: OperationLogMeta) =>
  SetMetadata(OPERATION_LOG_KEY, meta);

/** 明确不记录该接口，用于高频或无审计价值的写操作 */
export const SkipOperationLog = () => SetMetadata(SKIP_OPERATION_LOG_KEY, true);
