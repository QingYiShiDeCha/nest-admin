import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from '@nest-admin/database';
import {
  SUPER_ADMIN_ROLE_CODE,
  type PermissionCatalogItem,
} from '@nest-admin/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import {
  RbacCacheService,
  type CachedAuthorization,
} from './rbac-cache.service';

export type UserAuthorization = CachedAuthorization;

@Injectable()
export class PermissionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cache: RbacCacheService,
  ) {}

  /**
   * 查出用户的角色码与权限码。
   *
   * 两条查询而不是一条大 JOIN：角色和权限是一对多再多对多，
   * 合并成单条会产生笛卡尔积行，在应用层去重反而更慢也更难读。
   *
   * 每个受保护请求都会走这里（JwtStrategy 调用）。Redis 缓存只保存数据库
   * 计算结果；未配置或连接失败时直接回源，不让缓存成为认证单点。
   */
  async findUserAuthorization(userId: number): Promise<UserAuthorization> {
    const lookup = await this.cache.lookupAuthorization(userId);
    if (lookup.value) return lookup.value;

    const granted = await this.db
      .select({ id: roles.id, code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      // 被禁用或已软删除的角色不授予任何权限
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(roles.status, 'active'),
          isNull(roles.deletedAt),
        ),
      );

    const roleCodes = granted.map((role) => role.code);
    const isSuperAdmin = roleCodes.includes(SUPER_ADMIN_ROLE_CODE);

    // 超管数量极少，且 permissions 本来就是空数组，不缓存这类无意义结果。
    if (isSuperAdmin) {
      return { roles: roleCodes, permissions: [], isSuperAdmin };
    }

    if (granted.length === 0) {
      const result = { roles: roleCodes, permissions: [], isSuperAdmin };
      await this.cache.store(lookup, result);
      return result;
    }

    const roleIds = granted.map((role) => role.id);

    const codes = await this.db
      .selectDistinct({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          inArray(rolePermissions.roleId, roleIds),
          isNull(permissions.deletedAt),
        ),
      );

    const result = {
      roles: roleCodes,
      permissions: codes.map((row) => row.code),
      isSuperAdmin,
    };
    await this.cache.store(lookup, result);
    return result;
  }

  /**
   * 权限码目录，供角色授权界面拉取可选项。
   * 数量是接口个数量级（几十到几百），不分页，一次取完前端按 module 分组即可。
   */
  async findCatalog(): Promise<PermissionCatalogItem[]> {
    return this.db
      .select({
        id: permissions.id,
        code: permissions.code,
        name: permissions.name,
        module: permissions.module,
      })
      .from(permissions)
      .where(isNull(permissions.deletedAt))
      .orderBy(asc(permissions.module), asc(permissions.code));
  }
}
