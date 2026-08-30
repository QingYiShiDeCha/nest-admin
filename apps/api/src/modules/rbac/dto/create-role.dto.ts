import {
  DATA_SCOPE,
  STATUS,
  type DataScope,
  type Status,
} from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
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

export class CreateRoleDto {
  @ApiProperty({
    description: '角色标识，创建后可改但不可与已删除角色重名',
    example: 'editor',
  })
  @IsString()
  @Length(2, 64, { message: '角色码长度需在 2-64 之间' })
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: '角色码只能由小写字母开头，包含小写字母、数字和下划线',
  })
  code: string;

  @ApiProperty({ description: '角色名称', example: '内容编辑' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiPropertyOptional({ description: '排序值，升序，小的在前', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  @IsOptional()
  sort?: number;

  @ApiPropertyOptional({ description: '状态', enum: STATUS, default: 'active' })
  @IsEnum(STATUS, { message: `状态只能是 ${STATUS.join(' / ')}` })
  @IsOptional()
  status?: Status;

  @ApiPropertyOptional({
    description: '数据权限范围',
    enum: DATA_SCOPE,
    default: 'self',
  })
  @IsEnum(DATA_SCOPE)
  @IsOptional()
  dataScope?: DataScope;

  @ApiPropertyOptional({
    description: '自定义数据范围的部门 id 集合，仅 dataScope=custom 时使用',
    type: [Number],
  })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  departmentIds?: number[];

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  remark?: string;
}
