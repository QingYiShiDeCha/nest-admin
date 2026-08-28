import {
  menus,
  permissions,
  roleMenus,
  rolePermissions,
  roles,
  userRoles,
  users,
  type RoleRow,
} from '@nest-admin/database';
import {
  SUPER_ADMIN_ROLE_CODE,
  type PaginatedResult,
} from '@nest-admin/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { QueryRoleDto } from './dto/query-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

export interface RoleDetail extends RoleRow {
  permissionIds: number[];
  menuIds: number[];
}

/** 统一叠加「未软删除」，所有面向业务的角色查询都必须走它 */
function aliveRole(...conditions: (SQL | undefined)[]): SQL {
  return and(isNull(roles.deletedAt), ...conditions)!;
}

@Injectable()
export class RoleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ctx: RequestContext,
  ) {}

  async findPage(query: QueryRoleDto): Promise<PaginatedResult<RoleRow>> {
    const where = aliveRole(
      query.keyword
        ? or(
            like(roles.code, `%${query.keyword}%`),
            like(roles.name, `%${query.keyword}%`),
          )
        : undefined,
      query.status ? eq(roles.status, query.status) : undefined,
    );

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(roles)
        .where(where)
        .orderBy(asc(roles.sort), desc(roles.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(roles).where(where),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  /** 详情带上已授予的权限与菜单 id，供前端授权界面回显勾选状态 */
  async findDetail(id: number): Promise<RoleDetail> {
    const role = await this.findRoleOrFail(id);

    const [permissionRows, menuRows] = await Promise.all([
      this.db
        .select({ id: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, id)),
      this.db
        .select({ id: roleMenus.menuId })
        .from(roleMenus)
        .where(eq(roleMenus.roleId, id)),
    ]);

    return {
      ...role,
      permissionIds: permissionRows.map((row) => row.id),
      menuIds: menuRows.map((row) => row.id),
    };
  }

  async create(dto: CreateRoleDto): Promise<RoleRow> {
    await this.assertCodeAvailable(dto.code);

    const [result] = await this.db
      .insert(roles)
      .values({ ...dto, ...this.ctx.auditOnCreate() });

    return this.findRoleOrFail(result.insertId);
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleRow> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const role = await this.findRoleOrFail(id);

    if (role.isSystem) {
      // 内置角色的标识和启用状态锁死：改了 code 会让超管短路判断失效，
      // 禁用它会把所有超管一起锁在系统外
      if (dto.code !== undefined && dto.code !== role.code) {
        throw new ForbiddenException('内置角色的角色码不允许修改');
      }
      if (dto.status !== undefined && dto.status !== role.status) {
        throw new ForbiddenException('内置角色不允许停用');
      }
    }

    if (dto.code !== undefined && dto.code !== role.code) {
      await this.assertCodeAvailable(dto.code);
    }

    await this.db
      .update(roles)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(aliveRole(eq(roles.id, id)));

    return this.findRoleOrFail(id);
  }

  /**
   * 软删除角色。授权关系（sys_user_role / sys_role_permission / sys_role_menu）
   * 刻意保留不删：PermissionService 查授权时会过滤掉已删除的角色，
   * 所以权限即刻失效；保留关系是为了将来支持恢复。
   */
  async remove(id: number): Promise<void> {
    const role = await this.findRoleOrFail(id);

    if (role.isSystem) {
      throw new ForbiddenException('内置角色不允许删除');
    }

    await this.db
      .update(roles)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
      .where(aliveRole(eq(roles.id, id)));
  }

  /** 全量替换角色的权限码 */
  async setPermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await this.findRoleOrFail(roleId);
    await this.assertAllExist(permissions, permissionIds, '权限');

    await this.db.transaction(async (tx) => {
      await tx
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      if (permissionIds.length > 0) {
        await tx.insert(rolePermissions).values(
          permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
            createdBy: this.ctx.userId,
          })),
        );
      }
    });
  }

  /** 全量替换角色的菜单 */
  async setMenus(roleId: number, menuIds: number[]): Promise<void> {
    await this.findRoleOrFail(roleId);
    await this.assertAllExist(menus, menuIds, '菜单');

    await this.db.transaction(async (tx) => {
      await tx.delete(roleMenus).where(eq(roleMenus.roleId, roleId));

      if (menuIds.length > 0) {
        await tx.insert(roleMenus).values(
          menuIds.map((menuId) => ({
            roleId,
            menuId,
            createdBy: this.ctx.userId,
          })),
        );
      }
    });
  }

  /** 全量替换用户的角色 */
  async setUserRoles(userId: number, roleIds: number[]): Promise<void> {
    // 不允许改自己的角色：否则管理员可以把自己的超管角色摘掉，
    // 或误操作后失去修复权限的能力，只能去数据库手工恢复
    if (userId === this.ctx.userId) {
      throw new ForbiddenException('不允许修改自己的角色，请由其他管理员操作');
    }

    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`用户 ${userId} 不存在`);
    }

    await this.assertAllExist(roles, roleIds, '角色');

    await this.db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));

      if (roleIds.length > 0) {
        await tx.insert(userRoles).values(
          roleIds.map((roleId) => ({
            userId,
            roleId,
            createdBy: this.ctx.userId,
          })),
        );
      }
    });
  }

  /** 查用户当前拥有的角色 id，供分配界面回显 */
  async findUserRoleIds(userId: number): Promise<number[]> {
    const rows = await this.db
      .select({ id: userRoles.roleId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.userId, userId), isNull(roles.deletedAt)));

    return rows.map((row) => row.id);
  }

  private async findRoleOrFail(id: number): Promise<RoleRow> {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(aliveRole(eq(roles.id, id)))
      .limit(1);

    if (!role) {
      throw new NotFoundException(`角色 ${id} 不存在`);
    }

    return role;
  }

  /**
   * 唯一索引覆盖已软删除的行，所以查全量而不是只查未删除的，
   * 否则会先报「可用」再在插入时撞 ER_DUP_ENTRY。
   */
  private async assertCodeAvailable(code: string): Promise<void> {
    if (code === SUPER_ADMIN_ROLE_CODE) {
      throw new ConflictException(`角色码 ${code} 为内置保留值`);
    }

    const [existing] = await this.db
      .select({ id: roles.id, deletedAt: roles.deletedAt })
      .from(roles)
      .where(eq(roles.code, code))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `角色码 ${code} 被一个已删除的角色占用，不可复用`
          : `角色码 ${code} 已存在`,
      );
    }
  }

  /**
   * 校验目标 id 全部存在且未软删除。
   * 外键本身能拦住不存在的 id，但报出来的是 ER_NO_REFERENCED_ROW_2，
   * 既不知道是哪一项出错，也无法区分「不存在」和「已删除」。
   */
  private async assertAllExist(
    table: typeof permissions | typeof menus | typeof roles,
    ids: number[],
    label: string,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const found = await this.db
      .select({ id: table.id })
      .from(table)
      .where(and(inArray(table.id, ids), isNull(table.deletedAt)));

    if (found.length !== ids.length) {
      const foundIds = new Set(found.map((row) => row.id));
      const missing = ids.filter((id) => !foundIds.has(id));

      throw new BadRequestException(
        `以下${label} id 不存在或已删除：${missing.join(', ')}`,
      );
    }
  }
}
