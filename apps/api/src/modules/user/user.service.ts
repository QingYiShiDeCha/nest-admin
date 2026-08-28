import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import { and, count, desc, eq, like, sql } from 'drizzle-orm';

import type { PaginatedResult } from '@nest-admin/shared';
import type { Env } from '../../config/env.validation';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { users, type SafeUser } from '@nest-admin/database';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { QueryUserDto } from './dto/query-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

/** 复用的投影，保证 password 永远不会跟着查询结果溜出去 */
const safeColumns = {
  id: users.id,
  username: users.username,
  nickname: users.nickname,
  email: users.email,
  phone: users.phone,
  avatar: users.avatar,
  status: users.status,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const exists = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (exists.length > 0) {
      throw new ConflictException(`用户名 ${dto.username} 已被占用`);
    }

    const [result] = await this.db.insert(users).values({
      ...dto,
      password: await this.hashPassword(dto.password),
    });

    return this.findById(result.insertId);
  }

  async findPage(query: QueryUserDto): Promise<PaginatedResult<SafeUser>> {
    const conditions = [
      query.keyword ? like(users.username, `%${query.keyword}%`) : undefined,
      query.status ? eq(users.status, query.status) : undefined,
    ].filter((condition) => condition !== undefined);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

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

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: number): Promise<SafeUser> {
    const [user] = await this.db
      .select(safeColumns)
      .from(users)
      .where(eq(users.id, id))
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
      .where(eq(users.username, username))
      .limit(1);

    return row;
  }

  async update(id: number, dto: UpdateUserDto): Promise<SafeUser> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    // 先确认存在，否则 MySQL 的 update 影响 0 行时无法区分「不存在」和「值没变」
    await this.findById(id);
    await this.db.update(users).set(dto).where(eq(users.id, id));

    return this.findById(id);
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<void> {
    const [user] = await this.db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }

    if (!(await compare(dto.oldPassword, user.password))) {
      throw new UnauthorizedException('当前密码不正确');
    }

    await this.db
      .update(users)
      .set({ password: await this.hashPassword(dto.newPassword) })
      .where(eq(users.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db.delete(users).where(eq(users.id, id));
  }

  async touchLastLogin(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, id));
  }

  hashPassword(plain: string): Promise<string> {
    return hash(plain, this.config.get('BCRYPT_SALT_ROUNDS', { infer: true }));
  }

  verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
