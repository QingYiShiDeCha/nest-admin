import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.validation';
import { REDIS_CLIENT, type RedisClient } from '../../redis/redis.constants';

const CACHE_PREFIX = 'nest-admin:rbac:v1';
const TREE_REVISION_KEY = `${CACHE_PREFIX}:data-scope:tree-revision`;

export interface CachedAuthorization {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface CachedDataScope {
  unrestricted: boolean;
  self: boolean;
  departmentIds: number[];
}

export interface CacheLookup<T> {
  /** null 表示未配置 Redis 或本次 Redis 调用失败，不应回写缓存。 */
  key: string | null;
  value?: T;
}

@Injectable()
export class RbacCacheService {
  private readonly logger = new Logger(RbacCacheService.name);
  private readonly ttlSeconds: number;
  private lastErrorLogAt = 0;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    config: ConfigService<Env, true>,
  ) {
    this.ttlSeconds = config.get('RBAC_CACHE_TTL_SECONDS', { infer: true });
  }

  async lookupAuthorization(
    userId: number,
  ): Promise<CacheLookup<CachedAuthorization>> {
    const revision = await this.userRevision(userId);
    if (revision === null) return { key: null };

    const key = `${CACHE_PREFIX}:authorization:${userId}:${revision}`;
    return this.lookup(key, isCachedAuthorization);
  }

  async lookupDataScope(
    userId: number,
    deptId: number | null,
  ): Promise<CacheLookup<CachedDataScope>> {
    const revisions = await this.revisions(userId);
    if (!revisions) return { key: null };

    const key = [
      CACHE_PREFIX,
      'data-scope',
      revisions.tree,
      userId,
      revisions.user,
      deptId ?? 'none',
    ].join(':');
    return this.lookup(key, isCachedDataScope);
  }

  async store<T>(lookup: CacheLookup<T>, value: T): Promise<void> {
    if (!this.redis || !lookup.key) return;

    await this.redis
      .set(lookup.key, JSON.stringify(value), 'EX', this.ttlSeconds)
      .catch((error: Error) => this.logRedisError('写入 RBAC 缓存', error));
  }

  /** 用户角色、角色权限或角色数据范围变化后，让该用户的两类缓存同时换代。 */
  async invalidateUsers(userIds: number[]): Promise<void> {
    if (!this.redis) return;

    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const userId of uniqueIds) {
      pipeline.incr(this.userRevisionKey(userId));
    }

    try {
      const results = await pipeline.exec();
      const failed = results?.find(([error]) => error !== null)?.[0];
      if (failed) this.logRedisError('失效用户 RBAC 缓存', failed);
    } catch (error) {
      this.logRedisError('失效用户 RBAC 缓存', asError(error));
    }
  }

  /** 部门新增、移动或删除会改变 dept_and_below 的展开结果，统一切换树版本。 */
  async invalidateDepartmentTree(): Promise<void> {
    if (!this.redis) return;

    await this.redis
      .incr(TREE_REVISION_KEY)
      .catch((error: Error) => this.logRedisError('失效部门树缓存', error));
  }

  private async lookup<T>(
    key: string,
    validate: (value: unknown) => value is T,
  ): Promise<CacheLookup<T>> {
    if (!this.redis) return { key: null };

    let raw: string | null;
    try {
      raw = await this.redis.get(key);
    } catch (error) {
      this.logRedisError('读取 RBAC 缓存', asError(error));
      return { key: null };
    }

    if (raw === null) return { key };

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      await this.deleteMalformed(key);
      return { key };
    }

    if (!validate(value)) {
      await this.deleteMalformed(key);
      return { key };
    }

    return { key, value };
  }

  private async userRevision(userId: number): Promise<string | null> {
    if (!this.redis) return null;

    try {
      return (await this.redis.get(this.userRevisionKey(userId))) ?? '0';
    } catch (error) {
      this.logRedisError('读取用户缓存版本', asError(error));
      return null;
    }
  }

  private async revisions(
    userId: number,
  ): Promise<{ tree: string; user: string } | null> {
    if (!this.redis) return null;

    try {
      const [tree, user] = await this.redis.mget(
        TREE_REVISION_KEY,
        this.userRevisionKey(userId),
      );
      return { tree: tree ?? '0', user: user ?? '0' };
    } catch (error) {
      this.logRedisError('读取数据范围缓存版本', asError(error));
      return null;
    }
  }

  private userRevisionKey(userId: number): string {
    return `${CACHE_PREFIX}:user-revision:${userId}`;
  }

  private async deleteMalformed(key: string): Promise<void> {
    if (!this.redis) return;
    await this.redis
      .del(key)
      .catch((error: Error) =>
        this.logRedisError('清理损坏的 RBAC 缓存', error),
      );
  }

  /** Redis 故障时请求会回源数据库；日志限频，避免每个请求都刷一条。 */
  private logRedisError(operation: string, error: Error): void {
    const now = Date.now();
    if (now - this.lastErrorLogAt < 30_000) return;
    this.lastErrorLogAt = now;
    this.logger.warn(`${operation}失败，已回退数据库：${error.message}`);
  }
}

function isCachedAuthorization(value: unknown): value is CachedAuthorization {
  if (!isRecord(value)) return false;
  return (
    isStringArray(value.roles) &&
    isStringArray(value.permissions) &&
    typeof value.isSuperAdmin === 'boolean'
  );
}

function isCachedDataScope(value: unknown): value is CachedDataScope {
  if (!isRecord(value)) return false;
  return (
    typeof value.unrestricted === 'boolean' &&
    typeof value.self === 'boolean' &&
    Array.isArray(value.departmentIds) &&
    value.departmentIds.every(
      (id) => typeof id === 'number' && Number.isInteger(id) && id > 0,
    )
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
