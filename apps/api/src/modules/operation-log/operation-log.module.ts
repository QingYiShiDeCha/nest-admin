import { Global, Module } from '@nestjs/common';

import { LogCleanupService } from './log-cleanup.service';
import { OperationLogController } from './operation-log.controller';
import { OperationLogInterceptor } from './operation-log.interceptor';
import { OperationLogService } from './operation-log.service';

/**
 * @Global：拦截器在 AppModule 注册为全局，需要能注入到根注入器。
 */
@Global()
@Module({
  controllers: [OperationLogController],
  providers: [OperationLogService, OperationLogInterceptor, LogCleanupService],
  exports: [OperationLogService, OperationLogInterceptor, LogCleanupService],
})
export class OperationLogModule {}
