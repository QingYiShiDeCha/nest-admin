import type { RoleRow } from '@nest-admin/database';
import { PERMISSIONS, type PaginatedResult } from '@nest-admin/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { AssignIdsDto } from './dto/assign-ids.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';
import type { RoleDetail } from './role.service';

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Permissions(PERMISSIONS.ROLE_CREATE)
  @ApiOperation({ summary: '新增角色' })
  create(@Body() dto: CreateRoleDto): Promise<RoleRow> {
    return this.roleService.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.ROLE_LIST)
  @ApiOperation({ summary: '分页查询角色' })
  findPage(@Query() query: QueryRoleDto): Promise<PaginatedResult<RoleRow>> {
    return this.roleService.findPage(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ROLE_READ)
  @ApiOperation({
    summary: '角色详情，含已授予的权限与菜单 id',
    description: '前端授权界面用 permissionIds / menuIds 回显勾选状态',
  })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleDetail> {
    return this.roleService.findDetail(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.ROLE_UPDATE)
  @ApiOperation({ summary: '更新角色，内置角色的角色码与状态不可改' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleRow> {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ROLE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除角色（软删除），内置角色不可删' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.roleService.remove(id);
  }

  @Put(':id/permissions')
  @Permissions(PERMISSIONS.ROLE_ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '全量替换角色的权限码',
    description: '传入集合即最终结果，未包含的视为撤销；空数组清空全部权限',
  })
  setPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignIdsDto,
  ): Promise<void> {
    return this.roleService.setPermissions(id, dto.ids);
  }

  @Put(':id/menus')
  @Permissions(PERMISSIONS.ROLE_ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '全量替换角色的菜单',
    description: '语义同权限分配：传入集合即最终结果',
  })
  setMenus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignIdsDto,
  ): Promise<void> {
    return this.roleService.setMenus(id, dto.ids);
  }
}
