import { STATUS, type Status } from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDictionaryTypeDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按字典名称或编码模糊搜索' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按状态过滤', enum: STATUS })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;
}
