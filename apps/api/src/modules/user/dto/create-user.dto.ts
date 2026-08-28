import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

import { STATUS, type Status } from '@nest-admin/shared';

export class CreateUserDto {
  @ApiProperty({ description: '登录账号', example: 'admin' })
  @IsString()
  @Length(3, 32, { message: '用户名长度需在 3-32 之间' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和中划线',
  })
  username: string;

  @ApiProperty({
    description: '密码，至少 8 位且需含字母和数字',
    example: 'admin123456',
  })
  @IsString()
  @Length(8, 64, { message: '密码长度需在 8-64 之间' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: '密码必须同时包含字母和数字',
  })
  password: string;

  @ApiPropertyOptional({ description: '昵称' })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: '手机号（中国大陆）' })
  @IsMobilePhone('zh-CN', {}, { message: '手机号格式不正确' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '头像地址' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: STATUS,
    default: 'active',
  })
  @IsEnum(STATUS, { message: `状态只能是 ${STATUS.join(' / ')}` })
  @IsOptional()
  status?: Status;
}
