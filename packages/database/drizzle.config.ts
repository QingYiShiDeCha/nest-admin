import { defineConfig } from 'drizzle-kit';

import { resolveDatabaseOptions } from './scripts/env';

const { host, port, user, password, database } = resolveDatabaseOptions();

export default defineConfig({
  dialect: 'mysql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: { host, port, user, password, database },
  verbose: true,
  strict: true,
});
