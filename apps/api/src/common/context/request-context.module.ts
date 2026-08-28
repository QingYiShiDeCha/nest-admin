import { Global, Module } from '@nestjs/common';

import { RequestContext } from './request-context.service';

/**
 * @Global：几乎每个写数据的 service 都要用它填审计字段，
 * 逐个模块 import 只是噪音。
 */
@Global()
@Module({
  providers: [RequestContext],
  exports: [RequestContext],
})
export class RequestContextModule {}
