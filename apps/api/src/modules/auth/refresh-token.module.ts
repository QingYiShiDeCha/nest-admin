import { Global, Module } from '@nestjs/common';

import { RefreshTokenService } from './refresh-token.service';

/**
 * 单独成模块并标记 @Global：除了 AuthModule，
 * UserService 改密与管理员踢下线也要吊销会话。
 * 若让 UserModule 去 import AuthModule 会形成循环依赖
 * （AuthModule 已经 import 了 UserModule）。
 */
@Global()
@Module({
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
