import { STATUS, type Status } from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ description: '岗位编码', example: 'product_manager' })
  @IsString()
  @Length(2, 64)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: '岗位编码只能由小写字母开头，包含小写字母、数字和下划线',
  })
  code: string;

  @ApiProperty({ description: '岗位名称', example: '产品经理' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiPropertyOptional({ description: '排序值，升序', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  @IsOptional()
  sort?: number;

  @ApiPropertyOptional({ description: '状态', enum: STATUS, default: 'active' })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  remark?: string;
}
