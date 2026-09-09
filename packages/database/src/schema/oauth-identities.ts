import {
  index,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { foreignId, primaryId } from './columns';
import { users } from './users';

export const oauthIdentities = mysqlTable(
  'sys_oauth_identity',
  {
    id: primaryId(),
    userId: foreignId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerKey: varchar('provider_key', { length: 32 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    username: varchar('username', { length: 128 }),
    email: varchar('email', { length: 255 }),
    avatar: varchar('avatar', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uk_sys_oauth_identity_provider_subject').on(
      table.providerKey,
      table.subject,
    ),
    index('idx_sys_oauth_identity_user_id').on(table.userId),
  ],
);

export type OAuthIdentityRow = typeof oauthIdentities.$inferSelect;
