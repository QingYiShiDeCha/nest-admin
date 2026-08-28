import { Global, Module } from '@nestjs/common';

import { OperationLogController } from './operation-log.controller';
import { OperationLogInterceptor } from './operation-log.interceptor';
import { OperationLogService } from './operation-log.service';

/**
 * @Global：拦截器在 AppModule 注册为全局，需要能注入到根注入器。
 */
@Global()
@Module({
  controllers: [OperationLogController],
  providers: [OperationLogService, OperationLogInterceptor],
  exports: [OperationLogService, OperationLogInterceptor],
})
export class OperationLogModule {}
