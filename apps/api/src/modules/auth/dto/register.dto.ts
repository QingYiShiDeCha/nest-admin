import { OmitType } from '@nestjs/swagger';

import { CreateUserDto } from '../../user/dto/create-user.dto';

/** 注册不允许自行指定状态，一律按默认的 active 落库 */
export class RegisterDto extends OmitType(CreateUserDto, ['status'] as const) {}
