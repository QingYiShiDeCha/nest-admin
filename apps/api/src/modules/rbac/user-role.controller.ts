import { PERMISSIONS } from '@nest-admin/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { AssignIdsDto } from './dto/assign-ids.dto';
import { RoleService } from './role.service';

/**
 * 用户与角色的绑定关系。路由挂在 users 下（资源归属用户），
 * 但实现放在 rbac 模块——它本质是授权操作，
 * 所以用的是 system:user:assign-role 而不是改用户资料的权限。
 */
@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
export class UserRoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get(':id/roles')
  @Permissions(PERMISSIONS.USER_ASSIGN_ROLE)
  @ApiOperation({ summary: '查询用户已分配的角色 id，供分配界面回显' })
  findUserRoles(@Param('id', ParseIntPipe) id: number): Promise<number[]> {
    return this.roleService.findUserRoleIds(id);
  }

  @Put(':id/roles')
  @Permissions(PERMISSIONS.USER_ASSIGN_ROLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '全量替换用户的角色',
    description: '不允许修改自己的角色，避免误摘超管后失去修复能力',
  })
  setUserRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignIdsDto,
  ): Promise<void> {
    return this.roleService.setUserRoles(id, dto.ids);
  }
}
