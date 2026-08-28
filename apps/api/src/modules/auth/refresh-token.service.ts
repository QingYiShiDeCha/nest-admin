import { refreshTokens, type RefreshTokenRow } from '@nest-admin/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gt, isNull, lt, ne, sql } from 'drizzle-orm';

import { randomUUID } from 'node:crypto';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';

/** 校验一个 jti 的结果，交给调用方决定怎么响应 */
export type RefreshTokenCheck =
  | { ok: true; record: RefreshTokenRow }
  | { ok: false; reason: 'unknown' | 'expired' | 'revoked' | 'reused' };

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** 生成一个新的 jti 并落库，返回 jti 供签发 JWT 时写入 */
  async issue(
    userId: number,
    expiresAt: Date,
    client: { ip?: string | null; userAgent?: string | null } = {},
  ): Promise<string> {
    const jti = randomUUID();

    await this.db.insert(refreshTokens).values({
      userId,
      jti,
      expiresAt,
      ip: client.ip ?? null,
      userAgent: client.userAgent?.slice(0, 255) ?? null,
    });

    // 顺手清掉这个用户已过期的记录，避免表无限增长。
    // 只清自己的、且只在签发时做，代价有界，不需要额外的定时任务。
    void this.purgeExpired(userId);

    return jti;
  }

  /**
   * 校验 jti 是否仍可用。
   *
   * 关键在于区分两种「已吊销」：
   * - replacedByJti 非空 = 它被轮换掉了。正常客户端拿到新 token 后不会再用旧的，
   *   旧的再次出现说明被复制走了，返回 reused，由调用方吊销该用户全部会话。
   * - replacedByJti 为空 = 主动登出、改密、被踢下线。这是预期内的失效，
   *   返回 revoked，只拒绝这一次请求，绝不能连坐其他设备——
   *   否则用户在一台设备上登出，会把手机上的登录态也一起弄掉。
   */
  async check(jti: string): Promise<RefreshTokenCheck> {
    const [record] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.jti, jti))
      .limit(1);

    if (!record) {
      return { ok: false, reason: 'unknown' };
    }

    if (record.revokedAt) {
      return {
        ok: false,
        reason: record.replacedByJti ? 'reused' : 'revoked',
      };
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: 'expired' };
    }

    return { ok: true, record };
  }

  /**
   * 轮换：作废旧 jti 并签发新的，两步在事务里完成。
   * 若只作废不签发（或反过来），用户会莫名其妙掉线或留下一个永不失效的旧 token。
   */
  async rotate(
    oldJti: string,
    userId: number,
    expiresAt: Date,
    client: { ip?: string | null; userAgent?: string | null } = {},
  ): Promise<string> {
    const newJti = randomUUID();

    await this.db.transaction(async (tx) => {
      await tx.insert(refreshTokens).values({
        userId,
        jti: newJti,
        expiresAt,
        ip: client.ip ?? null,
        userAgent: client.userAgent?.slice(0, 255) ?? null,
      });

      await tx
        .update(refreshTokens)
        .set({ revokedAt: sql`CURRENT_TIMESTAMP`, replacedByJti: newJti })
        .where(eq(refreshTokens.jti, oldJti));
    });

    return newJti;
  }

  /**
   * 某用户当前有效的会话，按最近创建排序。
   * 只返回未吊销且未过期的——已失效的记录对「我的登录设备」没有意义。
   */
  listActive(userId: number): Promise<RefreshTokenRow[]> {
    return this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(refreshTokens.createdAt));
  }

  /**
   * 按主键吊销，但**必须同时匹配 userId**——这是防越权的关键。
   * 只用 id 查会让任何登录用户猜 id 就能把别人的会话下掉。
   * 返回 false 表示没有命中（不存在、已失效、或不属于该用户），
   * 调用方一律按「不存在」响应，不泄漏究竟是哪种情况。
   */
  async revokeOwned(id: number, userId: number): Promise<boolean> {
    const [record] = await this.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.id, id),
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .limit(1);

    if (!record) {
      return false;
    }

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(refreshTokens.id, id));

    return true;
  }

  /** 吊销该用户除当前会话外的所有会话，返回被踢掉的数量 */
  async revokeOthers(userId: number, keepJti: string): Promise<number> {
    const others = await this.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
          ne(refreshTokens.jti, keepJti),
        ),
      );

    if (others.length === 0) {
      return 0;
    }

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
          ne(refreshTokens.jti, keepJti),
        ),
      );

    return others.length;
  }

  /** 吊销单个 token，用于主动登出 */
  async revoke(jti: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(refreshTokens.jti, jti), isNull(refreshTokens.revokedAt)));
  }

  /**
   * 吊销某用户的全部有效 token。
   * 用于改密、管理员踢下线、以及检测到盗用时的应急处置。
   * 返回受影响的会话数，便于日志和接口回显。
   */
  async revokeAllForUser(userId: number): Promise<number> {
    const active = await this.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );

    if (active.length === 0) {
      return 0;
    }

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );

    return active.length;
  }

  private async purgeExpired(userId: number): Promise<void> {
    try {
      await this.db
        .delete(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, userId),
            lt(refreshTokens.expiresAt, new Date()),
          ),
        );
    } catch (error) {
      // 清理失败不影响签发
      this.logger.warn(
        `清理用户 ${userId} 的过期 refreshToken 失败：${String(error)}`,
      );
    }
  }
}
