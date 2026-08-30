import { index, mysqlTable, primaryKey } from 'drizzle-orm/mysql-core';

import { foreignId, grantColumns } from './columns';
import { posts } from './posts';
import { users } from './users';

export const userPosts = mysqlTable(
  'sys_user_post',
  {
    userId: foreignId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: foreignId('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    ...grantColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    index('idx_sys_user_post_post_id').on(table.postId),
  ],
);

export type UserPostRow = typeof userPosts.$inferSelect;
