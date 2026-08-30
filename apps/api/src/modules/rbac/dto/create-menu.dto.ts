import {
  MENU_TYPE,
  STATUS,
  type MenuType,
  type Status,
} from '@nest-admin/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMenuDto {
  @ApiPropertyOptional({
    description: '父节点 id，不传表示根节点。父节点必须是 directory 类型',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  parentId?: number;

  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiProperty({
    description:
      'directory 只做分组不对应页面；menu 需要 path；external 需要 path 为完整 URL',
    enum: MENU_TYPE,
    default: 'menu',
  })
  @IsEnum(MENU_TYPE, { message: `类型只能是 ${MENU_TYPE.join(' / ')}` })
  @IsOptional()
  type?: MenuType;

  @ApiPropertyOptional({ description: '路由路径，external 类型填完整 URL' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({
    description:
      '相对前端 views 的组件路径；可不填，前端会根据路由 path 自动匹配',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  component?: string;

  @ApiPropertyOptional({ description: '图标标识' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: '同级排序，升序', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  @IsOptional()
  sort?: number;

  @ApiPropertyOptional({
    description:
      '是否在侧边栏显示。false 时路由仍可访问，用于详情页这类隐藏路由',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  visible?: boolean;

  @ApiPropertyOptional({ description: '前端是否缓存该页面', default: false })
  @IsBoolean()
  @IsOptional()
  keepAlive?: boolean;

  @ApiPropertyOptional({ description: '状态', enum: STATUS, default: 'active' })
  @IsEnum(STATUS)
  @IsOptional()
  status?: Status;
}
