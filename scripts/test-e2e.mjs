import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const requireFromDatabase = createRequire(
  resolve('packages/database/package.json'),
);
const { config: loadEnv } = requireFromDatabase('dotenv');
const { createConnection } = requireFromDatabase('mysql2/promise');

loadEnv({ path: resolve('.env.local'), quiet: true });
loadEnv({ path: resolve('.env'), quiet: true });

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DB_HOST: process.env.E2E_DB_HOST ?? process.env.DB_HOST ?? '127.0.0.1',
  DB_PORT: process.env.E2E_DB_PORT ?? process.env.DB_PORT ?? '3306',
  DB_USER: process.env.E2E_DB_USER ?? process.env.DB_USER ?? 'root',
  DB_PASSWORD: process.env.E2E_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '',
  DB_NAME: process.env.E2E_DB_NAME ?? 'nest_admin_test',
  REDIS_URL:
    process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6379/15',
  JWT_ACCESS_SECRET:
    process.env.E2E_JWT_ACCESS_SECRET ??
    'e2e-access-secret-must-be-long-enough',
  JWT_REFRESH_SECRET:
    process.env.E2E_JWT_REFRESH_SECRET ??
    'e2e-refresh-secret-must-be-long-enough',
  E2E_DB_NAME: process.env.E2E_DB_NAME ?? 'nest_admin_test',
  E2E_ADMIN_PASSWORD:
    process.env.E2E_ADMIN_PASSWORD ??
    process.env.SEED_ADMIN_PASSWORD ??
    'admin123456',
  SEED_ADMIN_PASSWORD:
    process.env.E2E_ADMIN_PASSWORD ??
    process.env.SEED_ADMIN_PASSWORD ??
    'admin123456',
};

function run(command, args) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function ensureDatabase() {
  const connection = await createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  try {
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      [env.DB_NAME],
    );
  } finally {
    await connection.end();
  }
}

await ensureDatabase();
run('pnpm', ['build:packages']);
run('pnpm', ['--filter', '@nest-admin/database', 'db:migrate']);
run('pnpm', ['--filter', '@nest-admin/database', 'db:seed']);
run('pnpm', ['--filter', '@nest-admin/api', 'test:e2e']);
