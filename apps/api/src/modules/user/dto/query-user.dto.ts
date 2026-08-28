import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { USER_STATUS, type UserStatus } from '@nest-admin/shared';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '用户名模糊搜索' })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按状态过滤', enum: USER_STATUS })
  @IsEnum(USER_STATUS)
  @IsOptional()
  status?: UserStatus;
}
