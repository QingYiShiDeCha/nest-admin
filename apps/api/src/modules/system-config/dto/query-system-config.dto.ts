import {
  STATUS,
  SYSTEM_CONFIG_VALUE_TYPE,
  type Status,
  type SystemConfigValueType,
} from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QuerySystemConfigDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按参数名称或参数键模糊搜索' })
  @IsString()
  @MaxLength(128)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({
    description: '按值类型过滤',
    enum: SYSTEM_CONFIG_VALUE_TYPE,
  })
  @IsEnum(SYSTEM_CONFIG_VALUE_TYPE)
  @IsOptional()
  valueType?: SystemConfigValueType;

  @ApiPropertyOptional({ description: '按状态过滤', enum: STATUS })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;
}
