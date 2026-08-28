import { Global, Module } from '@nestjs/common';

import { PermissionGuard } from './guards/permission.guard';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { UserRoleController } from './user-role.controller';

/**
 * 标记为 @Global：JwtStrategy 需要注入 PermissionService，
 * 而 AuthModule 若反过来 import RbacModule 会与后续扩展形成循环依赖。
 */
@Global()
@Module({
  controllers: [RoleController, PermissionController, UserRoleController],
  providers: [PermissionService, PermissionGuard, RoleService],
  exports: [PermissionService, PermissionGuard, RoleService],
})
export class RbacModule {}
