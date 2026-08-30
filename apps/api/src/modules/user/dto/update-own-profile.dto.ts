import type { UpdateOwnProfilePayload } from '@nest-admin/shared';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsMobilePhone,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateOwnProfileDto implements UpdateOwnProfilePayload {
  @ApiPropertyOptional({ description: '昵称，传 null 可清空', nullable: true })
  @Transform(trimString)
  @IsString()
  @Length(1, 32, { message: '昵称长度需在 1-32 之间' })
  @IsOptional()
  nickname?: string | null;

  @ApiPropertyOptional({ description: '邮箱，传 null 可清空', nullable: true })
  @Transform(trimString)
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({
    description: '手机号（中国大陆），传 null 可清空',
    nullable: true,
  })
  @Transform(trimString)
  @IsMobilePhone('zh-CN', {}, { message: '手机号格式不正确' })
  @IsOptional()
  phone?: string | null;
}
