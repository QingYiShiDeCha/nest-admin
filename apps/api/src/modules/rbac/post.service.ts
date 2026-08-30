import { posts, userPosts, users, type PostRow } from '@nest-admin/database';
import type { PaginatedResult } from '@nest-admin/shared';
import {
  BadRequestException,
  ConflictException,
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
import type { CreatePostDto } from './dto/create-post.dto';
import type { QueryPostDto } from './dto/query-post.dto';
import type { UpdatePostDto } from './dto/update-post.dto';
import { DataScopeService, type DataScopeSubject } from './data-scope.service';

export interface PostListRecord extends PostRow {
  userCount: number;
}

function alivePost(...conditions: (SQL | undefined)[]): SQL {
  return and(isNull(posts.deletedAt), ...conditions)!;
}

@Injectable()
export class PostService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ctx: RequestContext,
    private readonly dataScopes: DataScopeService,
  ) {}

  async findPage(
    query: QueryPostDto,
  ): Promise<PaginatedResult<PostListRecord>> {
    const where = alivePost(
      query.keyword
        ? or(
            like(posts.code, `%${query.keyword}%`),
            like(posts.name, `%${query.keyword}%`),
          )
        : undefined,
      query.status ? eq(posts.status, query.status) : undefined,
    );

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(posts)
        .where(where)
        .orderBy(asc(posts.sort), desc(posts.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(posts).where(where),
    ]);

    const counts = await this.findUserCounts(list.map((post) => post.id));
    return {
      list: list.map((post) => ({
        ...post,
        userCount: counts.get(post.id) ?? 0,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  findDetail(id: number): Promise<PostRow> {
    return this.findPostOrFail(id);
  }

  async create(dto: CreatePostDto): Promise<PostRow> {
    await this.assertCodeAvailable(dto.code);

    const [result] = await this.db
      .insert(posts)
      .values({ ...dto, ...this.ctx.auditOnCreate() });

    return this.findPostOrFail(result.insertId);
  }

  async update(id: number, dto: UpdatePostDto): Promise<PostRow> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const current = await this.findPostOrFail(id);
    if (dto.code !== undefined && dto.code !== current.code) {
      await this.assertCodeAvailable(dto.code);
    }

    await this.db
      .update(posts)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(alivePost(eq(posts.id, id)));

    return this.findPostOrFail(id);
  }

  async remove(id: number): Promise<void> {
    await this.findPostOrFail(id);
    const counts = await this.findUserCounts([id]);

    if ((counts.get(id) ?? 0) > 0) {
      throw new ConflictException('该岗位仍有用户，请先解除用户岗位关系');
    }

    await this.db
      .update(posts)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
      .where(alivePost(eq(posts.id, id)));
  }

  async findUserPostIds(
    userId: number,
    subject: DataScopeSubject,
  ): Promise<number[]> {
    await this.assertUserAccessible(userId, subject);

    const rows = await this.db
      .select({ id: userPosts.postId })
      .from(userPosts)
      .innerJoin(posts, eq(posts.id, userPosts.postId))
      .where(and(eq(userPosts.userId, userId), isNull(posts.deletedAt)));

    return rows.map((row) => row.id);
  }

  async setUserPosts(
    userId: number,
    postIds: number[],
    subject: DataScopeSubject,
  ): Promise<void> {
    await this.assertUserAccessible(userId, subject);

    const currentRows = await this.db
      .select({ id: userPosts.postId })
      .from(userPosts)
      .where(eq(userPosts.userId, userId));
    const currentIds = new Set(currentRows.map((row) => row.id));

    const selectedPosts =
      postIds.length === 0
        ? []
        : await this.db
            .select({ id: posts.id, status: posts.status })
            .from(posts)
            .where(and(inArray(posts.id, postIds), isNull(posts.deletedAt)));

    if (selectedPosts.length !== postIds.length) {
      const foundIds = new Set(selectedPosts.map((post) => post.id));
      const missing = postIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `以下岗位 id 不存在或已删除：${missing.join(', ')}`,
      );
    }

    const unavailable = selectedPosts
      .filter((post) => post.status !== 'active' && !currentIds.has(post.id))
      .map((post) => post.id);
    if (unavailable.length > 0) {
      throw new BadRequestException(
        `以下岗位已停用，不能新增分配：${unavailable.join(', ')}`,
      );
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(userPosts).where(eq(userPosts.userId, userId));

      if (postIds.length > 0) {
        await tx.insert(userPosts).values(
          postIds.map((postId) => ({
            userId,
            postId,
            createdBy: this.ctx.userId,
          })),
        );
      }
    });
  }

  private async findPostOrFail(id: number): Promise<PostRow> {
    const [post] = await this.db
      .select()
      .from(posts)
      .where(alivePost(eq(posts.id, id)))
      .limit(1);

    if (!post) {
      throw new NotFoundException(`岗位 ${id} 不存在`);
    }

    return post;
  }

  private async assertUserAccessible(
    id: number,
    subject: DataScopeSubject,
  ): Promise<void> {
    const scopeCondition = await this.dataScopes.buildUserCondition(subject);
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt), scopeCondition))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
  }

  private async assertCodeAvailable(code: string): Promise<void> {
    const [existing] = await this.db
      .select({ deletedAt: posts.deletedAt })
      .from(posts)
      .where(eq(posts.code, code))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `岗位编码 ${code} 被已删除岗位占用，不可复用`
          : `岗位编码 ${code} 已存在`,
      );
    }
  }

  private async findUserCounts(ids: number[]): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();

    const rows = await this.db
      .select({ postId: userPosts.postId, userCount: count() })
      .from(userPosts)
      .innerJoin(
        users,
        and(eq(users.id, userPosts.userId), isNull(users.deletedAt)),
      )
      .where(inArray(userPosts.postId, ids))
      .groupBy(userPosts.postId);

    return new Map(rows.map((row) => [row.postId, row.userCount]));
  }
}
