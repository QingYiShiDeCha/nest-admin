import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().default('api'),
  SWAGGER_ENABLED: booleanFromString.default(true),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),
  DB_POOL_LIMIT: z.coerce.number().int().min(1).default(10),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET 至少需要 16 个字符'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('30m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET 至少需要 16 个字符'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  /** 全局限流窗口（秒）与窗口内允许的请求数，按客户端 IP 统计 */
  THROTTLE_TTL: z.coerce.number().int().min(1).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
  /**
   * 是否信任反向代理传来的 X-Forwarded-For。
   * 部署在 nginx 之后必须打开，否则所有请求的来源 IP 都是同一个代理地址，
   * 限流会退化成「全站共用一个配额」，一个人就能把所有人挡在外面。
   * 直接暴露在公网时必须保持关闭，否则客户端可伪造该头绕过限流。
   */
  TRUST_PROXY: booleanFromString.default(false),

  /**
   * 限流计数的存放位置。不配则用进程内存——多实例部署时每个实例各算各的，
   * 实际配额会按实例数翻倍。配上之后各实例共享同一份计数。
   * 格式：redis://[:password@]host:port[/db]
   * 启动日志会明确打印当前用的是哪种，避免线上以为配了其实没生效。
   */
  REDIS_URL: z
    .string()
    .trim()
    // 把 REDIS_URL= 这种留空写法当作「不配置」。
    // 留空是关掉一个可选依赖最自然的方式，不该让应用启动失败。
    .transform((value) => value || undefined)
    .pipe(z.string().url().optional()),
});

export type Env = z.infer<typeof envSchema>;

/**
 * 交给 ConfigModule 的校验函数：启动阶段就让非法配置直接崩掉，
 * 而不是等到第一次连库或签发 token 时才报错。
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');
    throw new Error(`环境变量校验失败：\n${details}`);
  }

  return result.data;
}
