import { STATUS, type Status } from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPostDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按岗位编码或名称模糊搜索' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按状态过滤', enum: STATUS })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;
}
