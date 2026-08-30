import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { STATUS, type Status } from '@nest-admin/shared';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '所属部门 id，包含其全部下级部门' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  deptId?: number;

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
