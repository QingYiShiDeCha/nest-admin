import { hash } from 'bcryptjs';
import {
  PERMISSION_DEFINITIONS,
  SUPER_ADMIN_ROLE_CODE,
} from '@nest-admin/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { createDatabaseClient } from '../src/client';
import {
  departments,
  menus,
  permissions,
  posts,
  roles,
  userPosts,
  userRoles,
  users,
} from '../src/schema';
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

const DEFAULT_DEPARTMENT = {
  code: 'headquarters',
  name: '总公司',
};

const DEFAULT_POST = {
  code: 'system_admin',
  name: '系统管理员',
};

interface MenuSeed {
  name: string;
  type: 'directory' | 'external' | 'menu';
  /** 前端路由 path。目录没有 path */
  path?: string;
  /** 相对 apps/web/src/views 的组件路径；留空时前端按 path 推导 */
  component?: string;
  /** 前端 menu-icons.ts 注册表里的键名，未登记的名字前端会当成无图标 */
  icon?: string;
  sort: number;
  /** false = 路由可达但不进侧边栏 */
  visible?: boolean;
  keepAlive?: boolean;
  children?: readonly MenuSeed[];
}

/** 默认菜单树。业务页面由前端根据这里的 path/component 动态注册。 */
const MENU_TREE: readonly MenuSeed[] = [
  {
    name: '首页',
    type: 'menu',
    path: '/dashboard',
    component: 'dashboard/index',
    icon: 'RiDashboardLine',
    sort: 0,
    keepAlive: true,
  },
  {
    name: '系统管理',
    type: 'directory',
    icon: 'RiSettings3Line',
    sort: 10,
    children: [
      {
        name: '用户管理',
        type: 'menu',
        path: '/system/user',
        component: 'system/user/index',
        icon: 'RiUser3Line',
        sort: 0,
        keepAlive: true,
      },
      {
        name: '组织架构',
        type: 'menu',
        path: '/system/department',
        component: 'system/department/index',
        icon: 'RiOrganizationChart',
        sort: 5,
        keepAlive: true,
      },
      {
        name: '岗位管理',
        type: 'menu',
        path: '/system/post',
        component: 'system/post/index',
        icon: 'RiBriefcase4Line',
        sort: 10,
        keepAlive: true,
      },
      {
        name: '角色管理',
        type: 'menu',
        path: '/system/role',
        component: 'system/role/index',
        icon: 'RiTeamLine',
        sort: 20,
        keepAlive: true,
      },
      {
        name: '菜单管理',
        type: 'menu',
        path: '/system/menu',
        component: 'system/menu/index',
        icon: 'RiMenu2Line',
        sort: 30,
        keepAlive: true,
      },
      {
        name: '操作日志',
        type: 'menu',
        path: '/system/log',
        component: 'system/log/index',
        icon: 'RiFileList3Line',
        sort: 40,
        keepAlive: true,
      },
      {
        name: '在线用户',
        type: 'menu',
        path: '/system/online-user',
        component: 'system/online-user/index',
        icon: 'RiGlobalLine',
        sort: 50,
        keepAlive: true,
      },
    ],
  },
  {
    name: '接口文档',
    type: 'external',
    path: 'http://localhost:3000/api/docs',
    icon: 'RiCodeBoxLine',
    sort: 20,
  },
  {
    // visible: false 的示例：路由可达但不出现在侧边栏，
    // 入口在右上角头像的下拉里。前端 sidebarTree 会过滤掉它
    name: '个人中心',
    type: 'menu',
    path: '/profile',
    component: 'profile/index',
    icon: 'RiIdCardLine',
    sort: 30,
    visible: false,
  },
];

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

async function ensureDefaultDepartment(db: DrizzleDB): Promise<number> {
  const [existing] = await db
    .select({ id: departments.id, deletedAt: departments.deletedAt })
    .from(departments)
    .where(eq(departments.code, DEFAULT_DEPARTMENT.code))
    .limit(1);

  if (existing) {
    if (existing.deletedAt) {
      throw new Error(
        `默认部门编码 ${DEFAULT_DEPARTMENT.code} 被已删除部门占用，请先恢复或更换编码`,
      );
    }
    return existing.id;
  }

  const [result] = await db.insert(departments).values({
    ...DEFAULT_DEPARTMENT,
    sort: 0,
    status: 'active',
  });
  console.log(`已创建默认部门 ${DEFAULT_DEPARTMENT.name}`);
  return result.insertId;
}

async function ensureUserDepartment(
  db: DrizzleDB,
  userId: number,
  deptId: number,
): Promise<void> {
  await db
    .update(users)
    .set({ deptId })
    .where(and(eq(users.id, userId), isNull(users.deptId)));
}

async function ensureDefaultPost(db: DrizzleDB): Promise<number> {
  const [existing] = await db
    .select({ id: posts.id, deletedAt: posts.deletedAt })
    .from(posts)
    .where(eq(posts.code, DEFAULT_POST.code))
    .limit(1);

  if (existing) {
    if (existing.deletedAt) {
      throw new Error(
        `默认岗位编码 ${DEFAULT_POST.code} 被已删除岗位占用，请先恢复或更换编码`,
      );
    }
    return existing.id;
  }

  const [result] = await db.insert(posts).values({
    ...DEFAULT_POST,
    sort: 0,
    status: 'active',
  });
  console.log(`已创建默认岗位 ${DEFAULT_POST.name}`);
  return result.insertId;
}

async function ensureUserPost(
  db: DrizzleDB,
  userId: number,
  postId: number,
): Promise<void> {
  const [existing] = await db
    .select({ userId: userPosts.userId })
    .from(userPosts)
    .where(and(eq(userPosts.userId, userId), eq(userPosts.postId, postId)))
    .limit(1);

  if (!existing) {
    await db.insert(userPosts).values({ userId, postId });
    console.log(`已将岗位 ${postId} 分配给用户 ${userId}`);
  }
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
 * 幂等录入菜单树，返回新建条数。
 *
 * 匹配已有记录的方式：有 path 的按 path 认（path 就是路由，全局唯一），
 * 目录没有 path，按「同一父节点下的同名节点」认。也就是说在后台把菜单
 * 改了名又重跑 seed，会被当成新节点插一条——seed 只保证「默认菜单存在」，
 * 不做双向同步。
 *
 * 必须串行：子节点要用父节点的自增 id 当 parentId。
 */
async function ensureMenuTree(
  db: DrizzleDB,
  seeds: readonly MenuSeed[],
  parentId: number | null = null,
): Promise<number> {
  let created = 0;

  for (const seed of seeds) {
    const matcher = seed.path
      ? eq(menus.path, seed.path)
      : and(
          eq(menus.name, seed.name),
          parentId === null
            ? isNull(menus.parentId)
            : eq(menus.parentId, parentId),
        );

    const [existing] = await db
      .select({ id: menus.id, component: menus.component })
      .from(menus)
      .where(and(isNull(menus.deletedAt), matcher))
      .limit(1);

    let id: number;

    if (existing) {
      id = existing.id;

      if (seed.component && !existing.component) {
        await db
          .update(menus)
          .set({
            component: seed.component,
            ...(seed.keepAlive === undefined
              ? {}
              : { keepAlive: seed.keepAlive }),
          })
          .where(eq(menus.id, id));
      }
    } else {
      const [result] = await db.insert(menus).values({
        parentId,
        name: seed.name,
        type: seed.type,
        path: seed.path ?? null,
        component: seed.component ?? null,
        icon: seed.icon ?? null,
        sort: seed.sort,
        visible: seed.visible ?? true,
        keepAlive: seed.keepAlive ?? false,
        status: 'active',
      });

      id = result.insertId;
      created += 1;
    }

    if (seed.children?.length) {
      created += await ensureMenuTree(db, seed.children, id);
    }
  }

  return created;
}

/**
 * 幂等的初始化脚本，重复执行不会产生副作用。
 * 用 pnpm db:seed 执行，前提是已经跑过 db:migrate。
 *
 * 超管角色不需要绑定权限码或菜单——PermissionGuard 对它直接短路放行，
 * findUserMenuTree 也对它返回全部启用菜单。
 * 权限码目录与菜单树仍要录入，因为分配给普通角色时要从这两张表里挑。
 */
async function seed(): Promise<void> {
  const { pool, db } = createDatabaseClient(resolveDatabaseOptions());

  try {
    const userId = await ensureAdminUser(db);
    const deptId = await ensureDefaultDepartment(db);
    await ensureUserDepartment(db, userId, deptId);
    const postId = await ensureDefaultPost(db);
    await ensureUserPost(db, userId, postId);
    const roleId = await ensureSuperAdminRole(db);
    await ensureUserRole(db, userId, roleId);
    await ensurePermissions(db);

    const createdMenus = await ensureMenuTree(db, MENU_TREE);
    console.log(
      createdMenus > 0
        ? `已录入 ${createdMenus} 个菜单节点`
        : '默认菜单已存在，跳过',
    );

    console.log('初始化完成');
  } finally {
    await pool.end();
  }
}

void seed().catch((error: unknown) => {
  console.error('初始化失败：', error);
  process.exit(1);
});
