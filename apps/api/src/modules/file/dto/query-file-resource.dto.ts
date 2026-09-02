import {
  FILE_CATEGORY,
  FILE_STORAGE_DRIVER,
  type FileCategory,
  type FileStorageDriver,
} from '@nest-admin/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryFileResourceDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按文件名、MIME、对象键或上传人搜索' })
  @IsString()
  @MaxLength(128)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '文件分类', enum: FILE_CATEGORY })
  @IsEnum(FILE_CATEGORY)
  @IsOptional()
  category?: FileCategory;

  @ApiPropertyOptional({ description: '存储驱动', enum: FILE_STORAGE_DRIVER })
  @IsEnum(FILE_STORAGE_DRIVER)
  @IsOptional()
  storage?: FileStorageDriver;
}
