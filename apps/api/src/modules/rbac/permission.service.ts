import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from '@nest-admin/database';
import { SUPER_ADMIN_ROLE_CODE } from '@nest-admin/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';

export interface UserAuthorization {
  /** 角色码集合 */
  roles: string[];
  /** 权限码集合，已去重 */
  permissions: string[];
  /** 是否持有内置超管角色，持有则跳过权限比对 */
  isSuperAdmin: boolean;
}

@Injectable()
export class PermissionService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * 查出用户的角色码与权限码。
   *
   * 两条查询而不是一条大 JOIN：角色和权限是一对多再多对多，
   * 合并成单条会产生笛卡尔积行，在应用层去重反而更慢也更难读。
   *
   * 每个受保护请求都会走这里（JwtStrategy 调用），目前直接查库不加缓存。
   * 好处是改了角色授权立即生效；等 QPS 上来再考虑 Redis，
   * 届时要一并解决「改权限后缓存何时失效」的一致性问题。
   */
  async findUserAuthorization(userId: number): Promise<UserAuthorization> {
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

    // 超管跳过权限比对，没必要再查一遍权限表
    if (isSuperAdmin || granted.length === 0) {
      return { roles: roleCodes, permissions: [], isSuperAdmin };
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

    return {
      roles: roleCodes,
      permissions: codes.map((row) => row.code),
      isSuperAdmin,
    };
  }
}
