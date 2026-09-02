import { LOGIN_STATUS, type LoginStatus } from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryLoginLogDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按用户名模糊搜索' })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: '按登录结果过滤', enum: LOGIN_STATUS })
  @IsEnum(LOGIN_STATUS)
  @IsOptional()
  status?: LoginStatus;

  @ApiPropertyOptional({ description: '起始时间（含），ISO 8601 格式' })
  @Type(() => Date)
  @IsDate({ message: 'startAt 必须是合法时间' })
  @IsOptional()
  startAt?: Date;

  @ApiPropertyOptional({ description: '截止时间（含），ISO 8601 格式' })
  @Type(() => Date)
  @IsDate({ message: 'endAt 必须是合法时间' })
  @IsOptional()
  endAt?: Date;
}
