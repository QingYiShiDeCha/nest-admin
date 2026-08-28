# nest-admin

基于 NestJS 11 + Drizzle ORM + MySQL 8 的后台管理系统骨架，pnpm monorepo 结构。当前范围是**基础设施 + 认证**：配置校验、数据库接入、JWT 登录、统一响应、Swagger 文档，以及一套用户 CRUD。RBAC 权限体系尚未实现（见文末「尚未包含」）。

## 技术栈

| 层面 | 选型 |
| --- | --- |
| 运行时 / 语言 | Node.js 22、TypeScript 5.7（`module: nodenext`、`target: ES2023`） |
| 框架 | NestJS 11 + Express |
| ORM | Drizzle ORM 0.45（`drizzle-orm/mysql2`），迁移用 drizzle-kit |
| 数据库 | MySQL 8，驱动 mysql2 连接池 |
| 配置 | `@nestjs/config` + zod 做启动期环境变量校验 |
| 认证 | `@nestjs/jwt` + passport-jwt，双 token（access / refresh），bcryptjs 存密码 |
| 校验 | class-validator / class-transformer，全局 `ValidationPipe` |
| 文档 | `@nestjs/swagger` |
| 测试 | Jest 30 + ts-jest，e2e 用 supertest |
| 规范 | ESLint 9 flat config + typescript-eslint + Prettier |
| 仓库结构 | pnpm 11 workspace，跨包脚本用 pnpm 原生 `-r` / `--filter` 编排 |

## 仓库结构

```
nest-admin/
├─ package.json              # 只做编排，不含业务代码
├─ pnpm-workspace.yaml       # apps/* + packages/*
├─ tsconfig.base.json        # 各包 tsconfig 统一继承它
├─ eslint.config.mjs         # 全仓库唯一一份 flat config
├─ .env / .env.example       # 唯一一份环境变量，各包都从仓库根读
├─ apps/
│  └─ api/                   # @nest-admin/api，NestJS HTTP 服务
│     ├─ src/
│     │  ├─ main.ts          # 全局前缀、管道、拦截器、过滤器、Swagger
│     │  ├─ app.module.ts
│     │  ├─ config/          # zod 环境变量 schema、Swagger 装配
│     │  ├─ common/          # 装饰器、分页 DTO、异常过滤、响应包装
│     │  ├─ database/        # Nest 侧的 DI 封装（token + 全局模块）
│     │  └─ modules/         # auth、user
│     └─ test/               # e2e
└─ packages/
   ├─ database/              # @nest-admin/database
   │  ├─ src/schema/         # Drizzle 表定义，drizzle-kit 的输入
   │  ├─ src/client.ts       # 连接池 + Drizzle 工厂，api 与 seed 共用
   │  ├─ src/types.ts        # DrizzleDB、连接参数类型
   │  ├─ scripts/            # CLI 专用：env 解析、seed（不进 dist）
   │  └─ migrations/         # 生成的迁移 SQL，需要提交
   └─ shared/                # @nest-admin/shared
      ├─ src/                # 响应结构、分页常量、用户状态枚举
      └─ src/node/           # Node 专用子路径，定位仓库根 .env
```

包依赖方向是 `shared ← database ← api`，无环。`pnpm -r` 会按这个拓扑顺序执行。

**为什么这么分**。`shared` 主入口不碰任何运行时框架，将来加 `apps/web` 可以直接引用而不会被 Drizzle 拖进去；Node 专用的工具单独放在 `@nest-admin/shared/node` 子路径导出，避免污染主入口。`database` 只管 schema 和连接，Nest 的 DI 封装留在 `apps/api/src/database`，这样定时任务、CLI 之类的非 Nest 进程也能复用同一套表定义和连接参数。

## 快速开始

```bash
pnpm install

# 1. 准备环境变量：复制模板后填数据库账号密码
cp .env.example .env
# JWT 密钥生成：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. 在 MySQL 里建库（drizzle-kit 只建表，不建库）
#    CREATE DATABASE `nest-admin` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

# 3. 建表 + 写入初始管理员（默认 admin / admin123456，登录后请立刻改密码）
pnpm db:migrate
pnpm db:seed

# 4. 启动
pnpm dev
```

启动后：接口前缀 `http://localhost:3000/api`，文档 `http://localhost:3000/api/docs`，健康检查 `GET /api/health`。

环境变量只在仓库根维护一份。各包运行时 cwd 不同（`pnpm --filter` 会把 cwd 设到包目录），所以定位 `.env` 不靠相对层级，而是由 `@nest-admin/shared/node` 的 `findWorkspaceRoot()` 向上找 `pnpm-workspace.yaml`。本机若要覆盖某几项而不动 `.env`，可以另建 `.env.local`，它优先级更高。

## 常用命令

根目录的命令会自动处理包之间的依赖顺序，日常用它们就够了：

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 先构建 packages，再以 watch 模式启动 api |
| `pnpm build` | 按拓扑顺序构建全部包 |
| `pnpm typecheck` / `pnpm lint` | 全仓库类型检查 / ESLint 自动修复 |
| `pnpm test` / `pnpm test:e2e` | 单元测试 / 端到端测试（会先构建依赖包） |
| `pnpm clean` | 删除所有 dist 与 tsbuildinfo |
| `pnpm db:generate` | 对比 schema 生成迁移 SQL 到 `packages/database/migrations` |
| `pnpm db:migrate` | 把未执行的迁移应用到数据库 |
| `pnpm db:push` | 不生成迁移文件直接同步 schema，**仅限本地试验** |
| `pnpm db:studio` | 打开 Drizzle Studio 可视化查看数据 |
| `pnpm db:seed` | 幂等地创建初始管理员 |

要只操作某个包，用 `pnpm --filter @nest-admin/api <script>`。

**改了 packages 下的代码，api 不会自动生效**——跨包引用走的是各包的 `dist`。要么重跑 `pnpm build:packages`，要么开一个终端跑 `pnpm -r --parallel dev` 让 `tsc --watch` 常驻。

## 约定

**统一响应**。成功由 `TransformInterceptor` 包成 `{ code: 0, message: 'success', data, timestamp }`，controller 只返回业务数据本身。失败由 `AllExceptionsFilter` 包成同构结构，`code` 是 HTTP 状态码；未知异常统一 500，堆栈只进日志不外泄。MySQL 唯一索引冲突会被翻译成 409。

**默认全局鉴权**。`JwtAuthGuard` 通过 `APP_GUARD` 全局注册，所有路由默认需要 `Authorization: Bearer <accessToken>`。登录、注册、刷新、健康检查用 `@Public()` 显式开放——**新增无需登录的接口时别忘了加它**。

**注入数据库**。任何 service 里 `@Inject(DRIZZLE) private readonly db: DrizzleDB`，即可获得带完整表结构推断的 Drizzle 实例。`DatabaseModule` 是 `@Global` 的，不必在各模块重复 import。

**密码字段**。`UserService` 里有一个 `safeColumns` 投影，所有对外查询都走它，保证 `password` 不会跟着结果溜出去。auth 校验密码走 `findCredentialsByUsername`，它把哈希和用户信息拆成两个字段返回。

**改表流程**。改 `packages/database/src/schema/*.ts` → `pnpm db:generate` → 检查生成的 SQL → `pnpm db:migrate` → 迁移文件一起提交。迁移 SQL 不进 `dist`，生产环境执行迁移需要源码目录。

## 接口一览

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | 公开 | 健康检查，数据库不通时返回 `degraded` |
| POST | `/api/auth/register` | 公开 | 注册并直接返回 token |
| POST | `/api/auth/login` | 公开 | 账号密码登录 |
| POST | `/api/auth/refresh` | 公开 | 用 refreshToken 换新 token 对 |
| GET | `/api/auth/profile` | 需要 | 当前登录用户信息 |
| GET | `/api/users` | 需要 | 分页查询，支持 `keyword` / `status` |
| POST | `/api/users` | 需要 | 新增用户 |
| GET | `/api/users/:id` | 需要 | 用户详情 |
| PATCH | `/api/users/:id` | 需要 | 更新用户（不含用户名和密码） |
| DELETE | `/api/users/:id` | 需要 | 删除用户 |
| PUT | `/api/users/me/password` | 需要 | 修改自己的密码，需校验旧密码 |

## 尚未包含

按当前范围刻意留白的部分，后续要做时的落点：

- **RBAC 权限**。角色表、菜单/权限表、用户角色关联，以及一个读 `@Permissions()` 元数据的 `PermissionGuard`。
- **refreshToken 吊销**。现在的刷新是无状态的，只验签名和类型，签发后无法单独踢下线。要支持就得把 token 的 `jti` 存进 Redis 做白名单。
- **登录限流**。`@nestjs/throttler` 尚未接入，登录接口目前没有暴力破解防护。
- **操作日志、文件上传、Redis 缓存、软删除**。
- **`JwtStrategy` 每请求回库**。当前每个受保护请求都会按主键查一次用户，好处是禁用/删除立即生效，量大时需要在这里加缓存。
- **构建缓存**。包数量变多、CI 变慢时可以再引入 Turborepo，现在 pnpm 原生编排够用。
