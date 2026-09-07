import { Global, Module } from '@nestjs/common';

import { SystemConfigModule } from '../../modules/system-config/system-config.module';
import { RedisModule } from '../../redis/redis.module';
import { LoginLockoutPolicyService } from './login-lockout-policy.service';
import { LoginLockoutService } from './login-lockout.service';

/**
 * @Global：登录锁定入口在 auth 模块，解锁入口在 user 模块，
 * 逐个 import 只是噪音。借道 SystemConfigModule 读参数、RedisModule 拿客户端。
 */
@Global()
@Module({
  imports: [SystemConfigModule, RedisModule],
  providers: [LoginLockoutPolicyService, LoginLockoutService],
  exports: [LoginLockoutPolicyService, LoginLockoutService],
})
export class LoginLockoutModule {}
