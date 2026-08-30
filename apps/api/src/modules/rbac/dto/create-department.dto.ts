import { STATUS, type Status } from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
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

export class CreateDepartmentDto {
  @ApiPropertyOptional({ description: '父部门 id，不传表示顶级部门' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  parentId?: number | null;

  @ApiProperty({ description: '部门名称', example: '研发中心' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiProperty({ description: '部门编码', example: 'rd_center' })
  @IsString()
  @Length(2, 64)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: '部门编码需以字母开头，只能包含字母、数字、下划线和中划线',
  })
  code: string;

  @ApiPropertyOptional({ description: '负责人用户 id', nullable: true })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  leaderId?: number | null;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+() -]+$/, { message: '联系电话格式不正确' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '联系邮箱' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  @IsOptional()
  email?: string;

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
}
