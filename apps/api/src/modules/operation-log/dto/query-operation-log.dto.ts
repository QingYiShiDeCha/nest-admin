import { OPERATION_STATUS, type OperationStatus } from '@nest-admin/database';
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

export class QueryOperationLogDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按用户名模糊搜索' })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: '按业务模块精确过滤，如「用户管理」' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  module?: string;

  @ApiPropertyOptional({ description: '按结果过滤', enum: OPERATION_STATUS })
  @IsEnum(OPERATION_STATUS)
  @IsOptional()
  status?: OperationStatus;

  @ApiPropertyOptional({
    description: '起始时间（含），ISO 8601 格式',
    example: '2026-08-01T00:00:00.000Z',
  })
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
