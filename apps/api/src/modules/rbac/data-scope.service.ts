import {
  departments,
  roleDepartments,
  roles,
  userRoles,
  users,
} from '@nest-admin/database';
import type { DataScope } from '@nest-admin/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core';

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
    return this.buildUserIdCondition(subject, users.id);
  }

  /** 返回任意带 user_id 的业务表应追加的 SQL 条件；undefined 表示不限制。 */
  async buildUserIdCondition(
    subject: DataScopeSubject,
    userIdColumn: AnyMySqlColumn,
  ): Promise<SQL | undefined> {
    if (subject.isSuperAdmin) return undefined;

    const resolved = await this.resolveCachedDataScope(subject);

    if (resolved.unrestricted) return undefined;

    const conditions: SQL[] = [];
    if (resolved.self) conditions.push(eq(userIdColumn, subject.id));
    if (resolved.departmentIds.length > 0) {
      if (userIdColumn === users.id) {
        conditions.push(inArray(users.deptId, resolved.departmentIds));
      } else {
        const scopedUsers = this.db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              isNull(users.deletedAt),
              inArray(users.deptId, resolved.departmentIds),
            ),
          );
        conditions.push(inArray(userIdColumn, scopedUsers));
      }
    }

    return conditions.length > 0 ? or(...conditions) : sql`0 = 1`;
  }

  /** 返回部门资源应追加的 SQL 条件；self 语义映射为用户所属部门。 */
  async buildDepartmentCondition(
    subject: DataScopeSubject,
    departmentIdColumn: AnyMySqlColumn,
  ): Promise<SQL | undefined> {
    if (subject.isSuperAdmin) return undefined;

    const resolved = await this.resolveCachedDataScope(subject);
    if (resolved.unrestricted) return undefined;

    const departmentIds = new Set(resolved.departmentIds);
    if (resolved.self && subject.deptId !== null) {
      departmentIds.add(subject.deptId);
    }

    return departmentIds.size > 0
      ? inArray(departmentIdColumn, [...departmentIds])
      : sql`0 = 1`;
  }

  /** 校验目标用户存在且处于当前主体的数据范围内，越权时统一按不存在处理。 */
  async assertUserAccessible(
    userId: number,
    subject: DataScopeSubject,
  ): Promise<void> {
    const scopeCondition = await this.buildUserIdCondition(subject, users.id);
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt), scopeCondition))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`用户 ${userId} 不存在`);
    }
  }

  /** 校验目标部门存在且处于当前主体的数据范围内，越权时统一按不存在处理。 */
  async assertDepartmentAccessible(
    departmentId: number,
    subject: DataScopeSubject,
  ): Promise<void> {
    const scopeCondition = await this.buildDepartmentCondition(
      subject,
      departments.id,
    );
    const [department] = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          isNull(departments.deletedAt),
          scopeCondition,
        ),
      )
      .limit(1);

    if (!department) {
      throw new NotFoundException(`部门 ${departmentId} 不存在`);
    }
  }

  private async resolveCachedDataScope(
    subject: DataScopeSubject,
  ): Promise<CachedDataScope> {
    const lookup = await this.cache.lookupDataScope(subject.id, subject.deptId);
    const resolved = lookup.value ?? (await this.resolveDataScope(subject));
    if (!lookup.value) await this.cache.store(lookup, resolved);
    return resolved;
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
