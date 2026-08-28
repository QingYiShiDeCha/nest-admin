import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { STATUS, type Status } from '@nest-admin/shared';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '用户名模糊搜索' })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按状态过滤', enum: STATUS })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;
}
