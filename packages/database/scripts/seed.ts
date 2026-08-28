import { hash } from 'bcryptjs';
import {
  PERMISSION_DEFINITIONS,
  SUPER_ADMIN_ROLE_CODE,
} from '@nest-admin/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { createDatabaseClient } from '../src/client';
import { permissions, roles, userRoles, users } from '../src/schema';
import type { DrizzleDB } from '../src/types';
import { resolveDatabaseOptions } from './env';

const DEFAULT_ADMIN = {
  username: process.env.SEED_ADMIN_USERNAME ?? 'admin',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'admin123456',
  nickname: '超级管理员',
};

const SUPER_ADMIN_ROLE = {
  code: SUPER_ADMIN_ROLE_CODE,
  name: '超级管理员',
  remark: '内置角色，拥有全部权限，不参与权限校验',
};

/** 返回管理员用户 id，不存在则创建 */
async function ensureAdminUser(db: DrizzleDB): Promise<number> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.username, DEFAULT_ADMIN.username), isNull(users.deletedAt)),
    )
    .limit(1);

  if (existing) {
    console.log(`用户 ${DEFAULT_ADMIN.username} 已存在，跳过创建`);
    return existing.id;
  }

  const [result] = await db.insert(users).values({
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

  return result.insertId;
}

/** 返回超管角色 id，不存在则创建 */
async function ensureSuperAdminRole(db: DrizzleDB): Promise<number> {
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, SUPER_ADMIN_ROLE.code))
    .limit(1);

  if (existing) {
    console.log(`角色 ${SUPER_ADMIN_ROLE.code} 已存在，跳过创建`);
    return existing.id;
  }

  const [result] = await db.insert(roles).values({
    code: SUPER_ADMIN_ROLE.code,
    name: SUPER_ADMIN_ROLE.name,
    remark: SUPER_ADMIN_ROLE.remark,
    dataScope: 'all',
    // 内置角色，service 层会拒绝删除或改码
    isSystem: true,
    sort: 0,
    status: 'active',
  });

  console.log(`已创建内置角色 ${SUPER_ADMIN_ROLE.code}（数据权限：全部）`);

  return result.insertId;
}

async function ensureUserRole(
  db: DrizzleDB,
  userId: number,
  roleId: number,
): Promise<void> {
  const [existing] = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
    .limit(1);

  if (existing) {
    console.log('管理员与超管角色的绑定已存在，跳过');
    return;
  }

  await db.insert(userRoles).values({ userId, roleId });
  console.log(`已将角色 ${roleId} 授予用户 ${userId}`);
}

/**
 * 按 PERMISSION_DEFINITIONS 幂等录入权限码目录。
 * 只新增缺失的码，不改动也不删除已有记录——线上可能已有人工调整过的名称，
 * 而删除会连带级联清掉角色的授权关系。
 */
async function ensurePermissions(db: DrizzleDB): Promise<void> {
  const codes = PERMISSION_DEFINITIONS.map((item) => item.code);

  const existing = await db
    .select({ code: permissions.code })
    .from(permissions)
    .where(inArray(permissions.code, [...codes]));

  const known = new Set(existing.map((row) => row.code));
  const missing = PERMISSION_DEFINITIONS.filter(
    (item) => !known.has(item.code),
  );

  if (missing.length === 0) {
    console.log(`权限码目录已是最新（共 ${codes.length} 条），跳过`);
    return;
  }

  await db.insert(permissions).values(
    missing.map((item) => ({
      code: item.code,
      name: item.name,
      module: item.module,
    })),
  );

  console.log(
    `已录入 ${missing.length} 条权限码：${missing.map((i) => i.code).join(', ')}`,
  );
}

/**
 * 幂等的初始化脚本，重复执行不会产生副作用。
 * 用 pnpm db:seed 执行，前提是已经跑过 db:migrate。
 *
 * 超管角色不需要绑定权限码——PermissionGuard 对它直接短路放行。
 * 权限码目录仍要录入，因为分配给普通角色时要从这张表里挑。
 */
async function seed(): Promise<void> {
  const { pool, db } = createDatabaseClient(resolveDatabaseOptions());

  try {
    const userId = await ensureAdminUser(db);
    const roleId = await ensureSuperAdminRole(db);
    await ensureUserRole(db, userId, roleId);
    await ensurePermissions(db);
    console.log('初始化完成');
  } finally {
    await pool.end();
  }
}

void seed().catch((error: unknown) => {
  console.error('初始化失败：', error);
  process.exit(1);
});
