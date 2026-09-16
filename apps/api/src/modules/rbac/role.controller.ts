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

import { OperationLog } from '../operation-log/operation-log.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AssignGrantsDto } from './dto/assign-grants.dto';
import { AssignIdsDto } from './dto/assign-ids.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { MenuService } from './menu.service';
import { PermissionService } from './permission.service';
import { RoleService } from './role.service';
import type { RoleDetail, RoleGrantsRecord } from './role.service';

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
    private readonly menuService: MenuService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.ROLE_CREATE)
  @OperationLog({ module: '角色管理', action: '新增角色' })
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

  /**
   * 授权界面的聚合读：角色已授权项 + 可授权的候选项，一次取回。
   *
   * 只要求 system:role:assign。菜单树与权限码目录在这里是「授权功能的候选项」，
   * 不是独立的系统级资源，所以不复用 system:menu:list / system:permission:list——
   * 否则管理员分配角色授权时得同时记得勾上那两个没有菜单入口的码。
   */
  @Get(':id/grants')
  @Permissions(PERMISSIONS.ROLE_ASSIGN)
  @ApiOperation({
    summary: '查询角色授权（已授权项与候选项）',
    description:
      '返回角色已授权的 permissionIds / menuIds，以及可授权的权限码目录与完整菜单树。',
  })
  async findGrants(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RoleGrantsRecord> {
    const [detail, catalog, menuTree] = await Promise.all([
      this.roleService.findDetail(id),
      this.permissionService.findCatalog(),
      this.menuService.findTree(),
    ]);

    return {
      permissionIds: detail.permissionIds,
      menuIds: detail.menuIds,
      catalog,
      menuTree,
    };
  }

  /**
   * 一次提交权限码与菜单。两项在同一事务内替换，不会出现只成功一半的授权状态。
   */
  @Put(':id/grants')
  @OperationLog({ module: '角色管理', action: '配置角色授权' })
  @Permissions(PERMISSIONS.ROLE_ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '全量替换角色的权限码与菜单',
    description:
      '语义同权限分配：传入集合即最终结果，未包含的视为撤销，空数组清空该项。',
  })
  setGrants(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGrantsDto,
  ): Promise<void> {
    return this.roleService.setGrants(id, dto);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.ROLE_UPDATE)
  @OperationLog({ module: '角色管理', action: '更新角色' })
  @ApiOperation({ summary: '更新角色，内置角色的角色码与状态不可改' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleRow> {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ROLE_DELETE)
  @OperationLog({ module: '角色管理', action: '删除角色' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除角色（软删除），内置角色不可删' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.roleService.remove(id);
  }

  @Put(':id/permissions')
  @OperationLog({ module: '角色管理', action: '配置角色权限' })
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
  @OperationLog({ module: '角色管理', action: '配置角色菜单' })
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
