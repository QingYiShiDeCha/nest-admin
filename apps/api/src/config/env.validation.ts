import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const emptyStringToUndefined = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().optional(),
);

const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional(),
);

const baseEnvSchema = z.object({
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
  /** 操作日志保留天数，超过则被定时任务物理删除 */
  LOG_RETENTION_DAYS: z.coerce.number().int().min(1).default(90),
  /** 内置清理计划首次创建时的 cron 初值 */
  LOG_CLEANUP_CRON: z.string().default('0 3 * * *'),
  /** 内置清理计划首次创建时的启用状态 */
  LOG_CLEANUP_ENABLED: booleanFromString.default(true),

  UPLOAD_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(100).default(10),
  UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .default(
      'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/zip',
    ),
  UPLOAD_LOCAL_DIR: z.string().min(1).default('.uploads'),
  UPLOAD_LOCAL_URL_PREFIX: z.string().min(1).default('/uploads'),
  UPLOAD_S3_ENDPOINT: optionalUrl,
  UPLOAD_S3_REGION: z.string().min(1).default('us-east-1'),
  UPLOAD_S3_BUCKET: optionalString,
  UPLOAD_S3_ACCESS_KEY_ID: optionalString,
  UPLOAD_S3_SECRET_ACCESS_KEY: optionalString,
  UPLOAD_S3_FORCE_PATH_STYLE: booleanFromString.default(false),
  UPLOAD_S3_PUBLIC_BASE_URL: optionalUrl,

  REDIS_URL: optionalUrl,
  /** 用户授权与数据范围缓存 TTL；主动失效失败时由它限制最久陈旧时间。 */
  RBAC_CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(3600)
    .default(300),
  /** 数据字典缓存 TTL；写操作通过版本票据主动失效。 */
  DICT_CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(3600)
    .default(300),
});

export const envSchema = baseEnvSchema.superRefine((env, context) => {
  if (env.UPLOAD_DRIVER === 's3' && !env.UPLOAD_S3_BUCKET) {
    context.addIssue({
      code: 'custom',
      path: ['UPLOAD_S3_BUCKET'],
      message: 'UPLOAD_DRIVER=s3 时必须配置 UPLOAD_S3_BUCKET',
    });
  }

  const hasAccessKey = Boolean(env.UPLOAD_S3_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(env.UPLOAD_S3_SECRET_ACCESS_KEY);

  if (hasAccessKey !== hasSecretKey) {
    context.addIssue({
      code: 'custom',
      path: [
        hasAccessKey
          ? 'UPLOAD_S3_SECRET_ACCESS_KEY'
          : 'UPLOAD_S3_ACCESS_KEY_ID',
      ],
      message: 'S3 Access Key 与 Secret Key 必须同时配置或同时留空',
    });
  }
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
