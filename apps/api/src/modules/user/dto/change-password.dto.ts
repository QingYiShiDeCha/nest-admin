import { PASSWORD_MIN_LENGTH_RANGE } from '@nest-admin/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MaxLength } from 'class-validator';

/**
 * 这里只做结构性约束（长度硬边界），复杂度规则交给 PasswordPolicyService
 * 按参数动态校验——写死在 DTO 里会让参数改了也不生效。
 */
export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  @MaxLength(64)
  oldPassword: string;

  @ApiProperty({ description: '新密码，需满足系统参数配置的密码策略' })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH_RANGE.min, PASSWORD_MIN_LENGTH_RANGE.max, {
    message: `新密码长度需在 ${PASSWORD_MIN_LENGTH_RANGE.min}-${PASSWORD_MIN_LENGTH_RANGE.max} 之间`,
  })
  newPassword: string;
}
