import {
  departments,
  posts,
  roles,
  userPosts,
  userRoles,
  users,
  type SafeUser,
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
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
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
import { LoginLockoutService } from '../../common/login-lockout/login-lockout.service';
import { PasswordPolicyService } from '../../common/password/password-policy.service';
import { RefreshTokenService } from '../auth/refresh-token.service';
import {
  DataScopeService,
  type DataScopeSubject,
} from '../rbac/data-scope.service';
import { DepartmentService } from '../rbac/department.service';
import { RbacCacheService } from '../rbac/rbac-cache.service';
import type { Env } from '../../config/env.validation';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { QueryUserDto } from './dto/query-user.dto';
import type { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

/** 复用的投影，保证 password 永远不会跟着查询结果溜出去 */
const safeColumns = {
  id: users.id,
  deptId: users.deptId,
  username: users.username,
  nickname: users.nickname,
  email: users.email,
  phone: users.phone,
  avatar: users.avatar,
  status: users.status,
  lockedUntil: users.lockedUntil,
  passwordChangedAt: users.passwordChangedAt,
  lastLoginAt: users.lastLoginAt,
  createdBy: users.createdBy,
  updatedBy: users.updatedBy,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

export interface UserListItemRecord extends SafeUser {
  postNames: string[];
}

/**
 * 拼接查询条件时统一叠加「未软删除」。
 * 所有面向业务的查询都必须走它，漏掉一处就会把已删除用户捞出来。
 */
function alive(...conditions: (SQL | undefined)[]): SQL {
  return and(isNull(users.deletedAt), ...conditions)!;
}

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService<Env, true>,
    private readonly ctx: RequestContext,
    private readonly refreshTokens: RefreshTokenService,
    private readonly departments: DepartmentService,
    private readonly dataScopes: DataScopeService,
    private readonly rbacCache: RbacCacheService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly loginLockout: LoginLockoutService,
  ) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    if (dto.deptId !== undefined && dto.deptId !== null) {
      await this.departments.assertDepartmentsUsable([dto.deptId]);
    }
    await this.passwordPolicy.assertSatisfied(dto.password);

    // 唯一索引覆盖已软删除的行，所以这里查全量而不是只查未删除的，
    // 否则会先告诉调用方「可用」，再在插入时撞上 ER_DUP_ENTRY
    const [existing] = await this.db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `用户名 ${dto.username} 被一个已删除的账号占用，无法复用`
          : `用户名 ${dto.username} 已被占用`,
      );
    }

    const [result] = await this.db.insert(users).values({
      ...dto,
      password: await this.hashPassword(dto.password),
      // 管理员创建时设置的密码视同「已设置」，不触发首次登录强制改密
      passwordChangedAt: sql`CURRENT_TIMESTAMP`,
      ...this.ctx.auditOnCreate(),
    });

    return this.findById(result.insertId);
  }

  async findPage(
    query: QueryUserDto,
    subject: DataScopeSubject,
  ): Promise<PaginatedResult<UserListItemRecord>> {
    const [scopeCondition, departmentIds] = await Promise.all([
      this.dataScopes.buildUserCondition(subject),
      query.deptId
        ? this.departments.findDescendantIds(query.deptId)
        : Promise.resolve(undefined),
    ]);

    const where = alive(
      query.keyword
        ? or(
            like(users.username, `%${query.keyword}%`),
            like(users.nickname, `%${query.keyword}%`),
          )
        : undefined,
      query.status ? eq(users.status, query.status) : undefined,
      departmentIds ? inArray(users.deptId, departmentIds) : undefined,
      scopeCondition,
    );

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select(safeColumns)
        .from(users)
        .where(where)
        .orderBy(desc(users.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(users).where(where),
    ]);

    const postRows =
      list.length === 0
        ? []
        : await this.db
            .select({ userId: userPosts.userId, postName: posts.name })
            .from(userPosts)
            .innerJoin(posts, eq(posts.id, userPosts.postId))
            .where(
              and(
                inArray(
                  userPosts.userId,
                  list.map((user) => user.id),
                ),
                isNull(posts.deletedAt),
              ),
            )
            .orderBy(asc(posts.sort), asc(posts.id));

    const postNamesByUser = new Map<number, string[]>();
    for (const row of postRows) {
      const names = postNamesByUser.get(row.userId) ?? [];
      names.push(row.postName);
      postNamesByUser.set(row.userId, names);
    }

    return {
      list: list.map((user) => ({
        ...user,
        postNames: postNamesByUser.get(user.id) ?? [],
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: number): Promise<SafeUser> {
    const [user] = await this.db
      .select(safeColumns)
      .from(users)
      .where(alive(eq(users.id, id)))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }

    return user;
  }

  /**
   * 供 auth 模块校验密码使用。刻意把哈希和用户信息拆成两个字段，
   * 这样调用方不会拿到一个混着 password 的用户对象再手动剔除。
   */
  async findCredentialsByUsername(
    username: string,
  ): Promise<{ user: SafeUser; passwordHash: string } | undefined> {
    const [row] = await this.db
      .select({ user: safeColumns, passwordHash: users.password })
      .from(users)
      .where(alive(eq(users.username, username)))
      .limit(1);

    return row;
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    subject: DataScopeSubject,
  ): Promise<SafeUser> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    await this.assertManagedUser(id, subject);

    if (dto.deptId !== undefined && dto.deptId !== null) {
      await this.departments.assertDepartmentsUsable([dto.deptId]);
    }

    // 先确认存在，否则 MySQL 的 update 影响 0 行时无法区分「不存在」和「值没变」
    await this.findById(id);

    if (dto.status === 'disabled') {
      await this.db.transaction(async (tx) => {
        await tx
          .update(departments)
          .set({ leaderId: null, ...this.ctx.auditOnUpdate() })
          .where(
            and(eq(departments.leaderId, id), isNull(departments.deletedAt)),
          );
        await tx
          .update(users)
          .set({ ...dto, ...this.ctx.auditOnUpdate() })
          .where(alive(eq(users.id, id)));
      });
      // 禁用要连已有会话一起断掉，与 remove 同一套收尾：
      // 只改状态会让对方手里的 refreshToken 继续换新，
      // 而缓存失效挂在 deptId 上时，这次改动的授权结果根本不会被清。
      await this.refreshTokens.revokeAllForUser(id);
      await this.rbacCache.invalidateUsers([id]);
      return this.findById(id);
    }

    await this.db
      .update(users)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(alive(eq(users.id, id)));

    if (dto.deptId !== undefined) {
      await this.rbacCache.invalidateUsers([id]);
    }

    return this.findById(id);
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<void> {
    const [user] = await this.db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(alive(eq(users.id, id)))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }

    if (!(await compare(dto.oldPassword, user.password))) {
      throw new UnauthorizedException('当前密码不正确');
    }

    await this.passwordPolicy.assertSatisfied(dto.newPassword);

    await this.db
      .update(users)
      .set({
        password: await this.hashPassword(dto.newPassword),
        passwordChangedAt: sql`CURRENT_TIMESTAMP`,
        ...this.ctx.auditOnUpdate(),
      })
      .where(alive(eq(users.id, id)));

    // 改完密码让所有会话失效：密码泄漏后改密是第一反应，
    // 如果旧的 refreshToken 还能继续换新，改密就等于没改
    await this.refreshTokens.revokeAllForUser(id);
  }

  async updateAvatar(id: number, avatar: string | null): Promise<SafeUser> {
    await this.findById(id);

    await this.db
      .update(users)
      .set({ avatar, ...this.ctx.auditOnUpdate() })
      .where(alive(eq(users.id, id)));

    return this.findById(id);
  }

  async updateOwnProfile(
    id: number,
    dto: UpdateOwnProfileDto,
  ): Promise<SafeUser> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的资料');
    }

    await this.findById(id);

    await this.db
      .update(users)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(alive(eq(users.id, id)));

    return this.findById(id);
  }

  /** 管理员强制某用户下线，返回被吊销的会话数 */
  async forceLogout(
    id: number,
    subject: DataScopeSubject,
  ): Promise<{ revokedSessions: number }> {
    await this.dataScopes.assertUserAccessible(id, subject);

    return { revokedSessions: await this.refreshTokens.revokeAllForUser(id) };
  }

  async assertAccessible(id: number, subject: DataScopeSubject): Promise<void> {
    await this.dataScopes.assertUserAccessible(id, subject);
  }

  /**
   * 管理写操作（更新/删除）的统一前置校验：
   * 1. 目标用户必须落在调用者的数据范围内（与列表、强制下线同一套判定，越权按不存在处理）
   * 2. 非超管不允许操作超管账号——否则持有 system:user:update 就能禁用/删除全部超管，
   *    让「内置角色锁死」的保护形同虚设
   */
  private async assertManagedUser(
    id: number,
    subject: DataScopeSubject,
  ): Promise<void> {
    await this.dataScopes.assertUserAccessible(id, subject);
    if (subject.isSuperAdmin) return;

    const [superAdminBinding] = await this.db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, id),
          eq(roles.code, SUPER_ADMIN_ROLE_CODE),
          isNull(roles.deletedAt),
        ),
      )
      .limit(1);

    if (superAdminBinding) {
      throw new ForbiddenException('无权操作超级管理员账号');
    }
  }

  /** 管理员手动解锁因登录失败被锁定的账号 */
  async unlock(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.loginLockout.clearLock(user.username, user.id);
  }

  /** 软删除。用数据库端的 CURRENT_TIMESTAMP，与 created_at/updated_at 同源避免时钟偏差 */
  async remove(id: number, subject: DataScopeSubject): Promise<void> {
    await this.assertManagedUser(id, subject);

    await this.db.transaction(async (tx) => {
      await tx
        .update(departments)
        .set({ leaderId: null, ...this.ctx.auditOnUpdate() })
        .where(
          and(eq(departments.leaderId, id), isNull(departments.deletedAt)),
        );

      await tx
        .update(users)
        .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
        .where(alive(eq(users.id, id)));
    });

    // 人都删了，残留的会话没有存在意义
    await this.refreshTokens.revokeAllForUser(id);
    await this.rbacCache.invalidateUsers([id]);
  }

  async touchLastLogin(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: sql`CURRENT_TIMESTAMP` })
      .where(alive(eq(users.id, id)));
  }

  hashPassword(plain: string): Promise<string> {
    return hash(plain, this.config.get('BCRYPT_SALT_ROUNDS', { infer: true }));
  }

  verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
