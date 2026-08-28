import type { Redis } from 'ioredis';

/**
 * 注入 Redis 客户端用的 token。未配置 REDIS_URL 时注入的是 null，
 * 调用方必须判空。
 *
 * 单独成文件是为了打破循环依赖：RedisLockService 要用这个 token，
 * 而 RedisModule 又要 provide RedisLockService，两个文件互相 import
 * 会让 Nest 在扫描阶段直接抛 CircularDependencyException。
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

export type RedisClient = Redis | null;
