import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { createDatabaseClient } from '../src/client';
import { users } from '../src/schema';
import { resolveDatabaseOptions } from './env';

const DEFAULT_ADMIN = {
  username: process.env.SEED_ADMIN_USERNAME ?? 'admin',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'admin123456',
  nickname: '超级管理员',
};

/**
 * 幂等的初始化脚本：只在管理员不存在时创建，已存在则跳过。
 * 用 pnpm db:seed 执行，前提是已经跑过 db:migrate。
 */
async function seed(): Promise<void> {
  const { pool, db } = createDatabaseClient(resolveDatabaseOptions());

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, DEFAULT_ADMIN.username))
      .limit(1);

    if (existing.length > 0) {
      console.log(`用户 ${DEFAULT_ADMIN.username} 已存在，跳过初始化`);
      return;
    }

    await db.insert(users).values({
      username: DEFAULT_ADMIN.username,
      password: await hash(
        DEFAULT_ADMIN.password,
        Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
      ),
      nickname: DEFAULT_ADMIN.nickname,
      status: 'active',
    });

    console.log(
      `已创建管理员 ${DEFAULT_ADMIN.username} / ${DEFAULT_ADMIN.password}，请登录后立即修改密码`,
    );
  } finally {
    await pool.end();
  }
}

void seed().catch((error: unknown) => {
  console.error('初始化失败：', error);
  process.exit(1);
});
