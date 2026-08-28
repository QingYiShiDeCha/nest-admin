import { workspaceEnvFiles } from '@nest-admin/shared/node';
import { config } from 'dotenv';

import type { DatabaseClientOptions } from '../src/types';

/**
 * CLI 脚本（drizzle-kit、seed）不走 NestJS 的 ConfigModule，
 * 这里自己从仓库根加载 .env 并拼出连接参数。
 * 只给 scripts 用，不会进 dist，所以可以放心依赖 dotenv 这个 devDependency。
 */
export function resolveDatabaseOptions(): Required<
  Omit<DatabaseClientOptions, 'logger'>
> {
  config({ path: workspaceEnvFiles() });

  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'nest_admin',
    connectionLimit: Number(process.env.DB_POOL_LIMIT ?? 10),
  };
}
