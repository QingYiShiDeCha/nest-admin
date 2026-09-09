import Redis from 'ioredis';

export function configureE2eEnvironment(redisDatabase: number): void {
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST =
    process.env.E2E_DB_HOST ?? process.env.DB_HOST ?? '127.0.0.1';
  process.env.DB_PORT =
    process.env.E2E_DB_PORT ?? process.env.DB_PORT ?? '3306';
  process.env.DB_USER =
    process.env.E2E_DB_USER ?? process.env.DB_USER ?? 'root';
  process.env.DB_PASSWORD =
    process.env.E2E_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '';
  process.env.DB_NAME =
    process.env.E2E_DB_NAME ?? process.env.DB_NAME ?? 'nest_admin_test';
  process.env.REDIS_URL = redisUrlForDatabase(redisDatabase);
  process.env.JWT_ACCESS_SECRET =
    process.env.E2E_JWT_ACCESS_SECRET ??
    'e2e-access-secret-must-be-long-enough';
  process.env.JWT_REFRESH_SECRET =
    process.env.E2E_JWT_REFRESH_SECRET ??
    'e2e-refresh-secret-must-be-long-enough';
  process.env.SWAGGER_ENABLED = 'false';
  process.env.TRUST_PROXY = 'false';
  process.env.THROTTLE_LIMIT = '1000';
}

export async function resetE2eRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) return;

  const redis = new Redis(url);

  try {
    await redis.flushdb();
  } finally {
    await redis.quit();
  }
}

function redisUrlForDatabase(database: number): string {
  const configured = process.env.E2E_REDIS_URL;
  if (!configured) return `redis://127.0.0.1:6379/${database}`;

  const url = new URL(configured);
  url.pathname = `/${database}`;
  return url.toString();
}
