import { OAUTH_PROVIDER_KEYS } from '@nest-admin/shared';
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, primaryId } from './columns';

export const oauthProviders = mysqlTable(
  'sys_oauth_provider',
  {
    id: primaryId(),
    key: mysqlEnum('provider_key', OAUTH_PROVIDER_KEYS).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    clientId: varchar('client_id', { length: 255 }).notNull(),
    clientSecretEncrypted: text('client_secret_encrypted').notNull(),
    authorizationUrl: varchar('authorization_url', { length: 500 }).notNull(),
    tokenUrl: varchar('token_url', { length: 500 }).notNull(),
    userInfoUrl: varchar('user_info_url', { length: 500 }).notNull(),
    scopes: text('scopes').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    autoRegister: boolean('auto_register').notNull().default(false),
    sort: int('sort').notNull().default(0),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_oauth_provider_key').on(table.key),
    index('idx_sys_oauth_provider_enabled').on(table.enabled),
  ],
);

export type OAuthProviderRow = typeof oauthProviders.$inferSelect;
export type NewOAuthProviderRow = typeof oauthProviders.$inferInsert;
