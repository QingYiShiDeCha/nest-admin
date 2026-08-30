import { STATUS, type Status } from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryDepartmentDto {
  @ApiPropertyOptional({ description: '按部门名称或编码搜索' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按状态过滤', enum: STATUS })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;
}
