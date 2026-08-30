import { Global, Module } from '@nestjs/common';

import { PermissionGuard } from './guards/permission.guard';
import { DataScopeService } from './data-scope.service';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { UserRoleController } from './user-role.controller';
import { UserPostController } from './user-post.controller';

/**
 * 标记为 @Global：JwtStrategy 需要注入 PermissionService，
 * 而 AuthModule 若反过来 import RbacModule 会与后续扩展形成循环依赖。
 */
@Global()
@Module({
  controllers: [
    RoleController,
    PermissionController,
    MenuController,
    UserRoleController,
    DepartmentController,
    PostController,
    UserPostController,
  ],
  providers: [
    PermissionService,
    PermissionGuard,
    RoleService,
    MenuService,
    DepartmentService,
    DataScopeService,
    PostService,
  ],
  exports: [
    PermissionService,
    PermissionGuard,
    RoleService,
    MenuService,
    DepartmentService,
    DataScopeService,
    PostService,
  ],
})
export class RbacModule {}
