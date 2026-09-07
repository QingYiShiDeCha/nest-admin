import { Global, Module } from '@nestjs/common';

import { SystemConfigModule } from '../../modules/system-config/system-config.module';
import { PasswordPolicyService } from './password-policy.service';

/**
 * @Global：密码校验入口分散在 auth 与 user 模块，逐个 import 只是噪音。
 * 借道 SystemConfigModule 拿参数读取能力。
 */
@Global()
@Module({
  imports: [SystemConfigModule],
  providers: [PasswordPolicyService],
  exports: [PasswordPolicyService],
})
export class PasswordPolicyModule {}
