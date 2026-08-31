import { DICTIONARY_TONE, type DictionaryOption } from '@nest-admin/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.validation';
import { REDIS_CLIENT, type RedisClient } from '../../redis/redis.constants';

const CACHE_PREFIX = 'nest-admin:dict:v1';
const DICTIONARY_TONES = new Set<string>(DICTIONARY_TONE);

export interface DictionaryCacheLookup {
  key: string | null;
  value?: DictionaryOption[];
}

@Injectable()
export class DictionaryCacheService {
  private readonly logger = new Logger(DictionaryCacheService.name);
  private readonly ttlSeconds: number;
  private lastErrorLogAt = 0;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    config: ConfigService<Env, true>,
  ) {
    this.ttlSeconds = config.get('DICT_CACHE_TTL_SECONDS', { infer: true });
  }

  async lookup(code: string): Promise<DictionaryCacheLookup> {
    if (!this.redis) return { key: null };

    let revision: string;
    try {
      revision = (await this.redis.get(this.revisionKey(code))) ?? '0';
    } catch (error) {
      this.logRedisError('读取字典缓存版本', asError(error));
      return { key: null };
    }

    const key = `${CACHE_PREFIX}:options:${code}:${revision}`;
    let raw: string | null;
    try {
      raw = await this.redis.get(key);
    } catch (error) {
      this.logRedisError('读取字典缓存', asError(error));
      return { key: null };
    }

    if (raw === null) return { key };

    try {
      const value: unknown = JSON.parse(raw);
      if (isDictionaryOptions(value)) return { key, value };
    } catch {
      // 统一按损坏数据处理。
    }

    await this.redis
      .del(key)
      .catch((error: Error) => this.logRedisError('清理损坏的字典缓存', error));
    return { key };
  }

  async store(
    lookup: DictionaryCacheLookup,
    value: DictionaryOption[],
  ): Promise<void> {
    if (!this.redis || !lookup.key) return;

    await this.redis
      .set(lookup.key, JSON.stringify(value), 'EX', this.ttlSeconds)
      .catch((error: Error) => this.logRedisError('写入字典缓存', error));
  }

  async invalidate(...codes: string[]): Promise<void> {
    if (!this.redis) return;

    const uniqueCodes = [...new Set(codes.filter(Boolean))];
    if (uniqueCodes.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const code of uniqueCodes) pipeline.incr(this.revisionKey(code));

    try {
      const results = await pipeline.exec();
      const failed = results?.find(([error]) => error !== null)?.[0];
      if (failed) this.logRedisError('失效字典缓存', failed);
    } catch (error) {
      this.logRedisError('失效字典缓存', asError(error));
    }
  }

  private revisionKey(code: string): string {
    return `${CACHE_PREFIX}:revision:${code}`;
  }

  private logRedisError(operation: string, error: Error): void {
    const now = Date.now();
    if (now - this.lastErrorLogAt < 30_000) return;
    this.lastErrorLogAt = now;
    this.logger.warn(`${operation}失败，已回退数据库：${error.message}`);
  }
}

function isDictionaryOptions(value: unknown): value is DictionaryOption[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.label === 'string' &&
        typeof item.value === 'string' &&
        (item.tone === null ||
          (typeof item.tone === 'string' && DICTIONARY_TONES.has(item.tone))),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
