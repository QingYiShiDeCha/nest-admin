import { Global, Module } from '@nestjs/common';

import { PermissionGuard } from './guards/permission.guard';
import { PermissionService } from './permission.service';

/**
 * 标记为 @Global：JwtStrategy 需要注入 PermissionService，
 * 而 AuthModule 若反过来 import RbacModule 会与后续的角色管理形成循环依赖
 * （角色管理要用 UserService，UserService 又被 AuthModule 使用）。
 */
@Global()
@Module({
  providers: [PermissionService, PermissionGuard],
  exports: [PermissionService, PermissionGuard],
})
export class RbacModule {}
