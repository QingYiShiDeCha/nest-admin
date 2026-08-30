import { roleDepartments, roles, userRoles, users } from '@nest-admin/database';
import type { DataScope } from '@nest-admin/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { DepartmentService } from './department.service';
import { RbacCacheService, type CachedDataScope } from './rbac-cache.service';

export interface DataScopeSubject {
  id: number;
  deptId: number | null;
  isSuperAdmin: boolean;
}

@Injectable()
export class DataScopeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly departments: DepartmentService,
    private readonly cache: RbacCacheService,
  ) {}

  /** 返回用户列表应追加的 SQL 条件；undefined 表示不限制。 */
  async buildUserCondition(
    subject: DataScopeSubject,
  ): Promise<SQL | undefined> {
    if (subject.isSuperAdmin) return undefined;

    const lookup = await this.cache.lookupDataScope(subject.id, subject.deptId);
    const resolved = lookup.value ?? (await this.resolveDataScope(subject));
    if (!lookup.value) await this.cache.store(lookup, resolved);

    if (resolved.unrestricted) return undefined;

    const conditions: SQL[] = [];
    if (resolved.self) conditions.push(eq(users.id, subject.id));
    if (resolved.departmentIds.length > 0) {
      conditions.push(inArray(users.deptId, resolved.departmentIds));
    }

    return conditions.length > 0 ? or(...conditions) : sql`0 = 1`;
  }

  private async resolveDataScope(
    subject: DataScopeSubject,
  ): Promise<CachedDataScope> {
    const assignedRoles = await this.db
      .select({ id: roles.id, dataScope: roles.dataScope })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, subject.id),
          eq(roles.status, 'active'),
          isNull(roles.deletedAt),
        ),
      );

    if (assignedRoles.some((role) => role.dataScope === 'all')) {
      return { unrestricted: true, self: false, departmentIds: [] };
    }

    const scopes = new Set<DataScope>(
      assignedRoles.map((role) => role.dataScope),
    );
    const departmentIds = new Set<number>();

    if (subject.deptId !== null) {
      if (scopes.has('dept')) {
        departmentIds.add(subject.deptId);
      }

      if (scopes.has('dept_and_below')) {
        const ids = await this.departments.findDescendantIds(subject.deptId);
        ids.forEach((id) => departmentIds.add(id));
      }
    }

    const customRoleIds = assignedRoles
      .filter((role) => role.dataScope === 'custom')
      .map((role) => role.id);

    if (customRoleIds.length > 0) {
      const rows = await this.db
        .selectDistinct({ id: roleDepartments.deptId })
        .from(roleDepartments)
        .where(inArray(roleDepartments.roleId, customRoleIds));
      rows.forEach((row) => departmentIds.add(row.id));
    }

    return {
      unrestricted: false,
      self: scopes.has('self'),
      departmentIds: [...departmentIds],
    };
  }
}
