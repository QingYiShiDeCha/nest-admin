import { roleDepartments, roles, userRoles, users } from '@nest-admin/database';
import type { DataScope } from '@nest-admin/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { DepartmentService } from './department.service';

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
  ) {}

  /** 返回用户列表应追加的 SQL 条件；undefined 表示不限制。 */
  async buildUserCondition(
    subject: DataScopeSubject,
  ): Promise<SQL | undefined> {
    if (subject.isSuperAdmin) return undefined;

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
      return undefined;
    }

    const conditions: SQL[] = [];
    const scopes = new Set<DataScope>(
      assignedRoles.map((role) => role.dataScope),
    );

    if (scopes.has('self')) {
      conditions.push(eq(users.id, subject.id));
    }

    if (subject.deptId !== null) {
      if (scopes.has('dept')) {
        conditions.push(eq(users.deptId, subject.deptId));
      }

      if (scopes.has('dept_and_below')) {
        const ids = await this.departments.findDescendantIds(subject.deptId);
        conditions.push(inArray(users.deptId, ids));
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
      const departmentIds = rows.map((row) => row.id);
      if (departmentIds.length > 0) {
        conditions.push(inArray(users.deptId, departmentIds));
      }
    }

    return conditions.length > 0 ? or(...conditions) : sql`0 = 1`;
  }
}
