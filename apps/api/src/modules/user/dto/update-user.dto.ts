import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';

/**
 * 更新用户：用户名不可改，密码走独立的重置接口，
 * 避免在同一个入口里混合校验规则。
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['username', 'password'] as const),
) {}
