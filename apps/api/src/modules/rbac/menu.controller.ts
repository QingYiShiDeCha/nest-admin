import type { MenuRow } from '@nest-admin/database';
import { PERMISSIONS } from '@nest-admin/shared';
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OperationLog } from '../operation-log/operation-log.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuService, type MenuTreeNode } from './menu.service';

@ApiTags('菜单管理')
@ApiBearerAuth()
@Controller('menus')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * 放在 :id 之前，否则 mine 会被当成 id 匹配到详情路由。
   * 不需要菜单管理权限——任何登录用户都得能拿到自己的侧边栏。
   */
  @Get('mine')
  @ApiOperation({
    summary: '当前用户可见的菜单树',
    description:
      '超管返回全部启用菜单；其余按角色授权返回，并自动补齐祖先节点，避免只授子菜单时整块入口消失。已停用的节点及其子树不会返回。',
  })
  findMine(@CurrentUser() user: AuthUser): Promise<MenuTreeNode[]> {
    return this.menuService.findUserMenuTree(user.id, user.isSuperAdmin);
  }

  @Get()
  @Permissions(PERMISSIONS.MENU_LIST)
  @ApiOperation({ summary: '完整菜单树（管理端），含停用与隐藏节点' })
  findTree(): Promise<MenuTreeNode[]> {
    return this.menuService.findTree();
  }

  @Post()
  @Permissions(PERMISSIONS.MENU_CREATE)
  @OperationLog({ module: '菜单管理', action: '新增菜单' })
  @ApiOperation({ summary: '新增菜单' })
  create(@Body() dto: CreateMenuDto): Promise<MenuRow> {
    return this.menuService.create(dto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.MENU_READ)
  @ApiOperation({ summary: '菜单详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<MenuRow> {
    return this.menuService.findDetail(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.MENU_UPDATE)
  @OperationLog({ module: '菜单管理', action: '更新菜单' })
  @ApiOperation({ summary: '更新菜单' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuDto,
  ): Promise<MenuRow> {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MENU_DELETE)
  @OperationLog({ module: '菜单管理', action: '删除菜单' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除菜单（软删除），有子菜单时拒绝' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.menuService.remove(id);
  }
}
