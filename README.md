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

**类型即时生效，运行时需要构建**。`tsconfig.base.json` 里配了 `customConditions: ["@nest-admin/source"]`，各包 `exports` 中对应的分支指向 `src`，所以**编辑器和 `pnpm typecheck` 直接读源码**——改了 `packages` 下的类型，`apps/api` 立刻能看到，不需要先构建。Node 运行时不认识这个自定义条件，会落到 `default` 分支走 `dist`，因此**跑服务或测试前仍要 `pnpm build:packages`**（`pnpm dev` / `pnpm test` 已经内置了这一步）。

这个设计是为了根除一类恼人的问题：早先跨包类型只能来自 `dist`，一旦执行过 `pnpm clean`、切分支或新克隆仓库还没构建，编辑器里所有 `@nest-admin/*` 导入都会解析失败，连带报出成片的 `no-unsafe-assignment` 之类的错误，而命令行却是干净的。注意各包的 `tsconfig.build.json` 里必须保留 `"customConditions": []`，否则 `tsc` 会把别的包的源码当成本包的输入文件，撞上 `rootDir` 限制。

## 约定

**统一响应**。成功由 `TransformInterceptor` 包成 `{ code: 0, message: 'success', data, timestamp }`，controller 只返回业务数据本身。失败由 `AllExceptionsFilter` 包成同构结构，`code` 是 HTTP 状态码；未知异常统一 500，堆栈只进日志不外泄。MySQL 唯一索引冲突会被翻译成 409。

**默认全局鉴权，两道守卫**。`JwtAuthGuard` 与 `PermissionGuard` 都通过 `APP_GUARD` 注册，且**刻意放在 `AppModule` 同一个 providers 数组里**——顺序即执行顺序，前者认证并把 `AuthUser` 挂到 request 上，后者依赖它的产物比对权限码。分散到各自模块时执行顺序取决于模块解析顺序，改动 imports 就可能悄悄失效。

所有路由默认需要 `Authorization: Bearer <accessToken>`，登录、注册、刷新、健康检查用 `@Public()` 显式开放——**新增无需登录的接口时别忘了加它**。

**权限码**。用 `@Permissions(PERMISSIONS.USER_DELETE)` 标注接口，未标注的只要登录即可访问。传多个码是「满足其一即可」；需要「同时满足」时请拆出更细的权限码，那在分配界面上是可见可解释的，叠加是隐式规则。

码值只在 `packages/shared/src/constants/permissions.ts` 定义一次，被三处消费：controller 标注、seed 录入 `sys_permission`、前端按钮级控制。**不要在别处写字面量**，新增权限码时同步往 `PERMISSION_DEFINITIONS` 补一条，再跑 `pnpm db:seed` 录入。

**超管短路**。持有 `super_admin` 角色的用户在 `PermissionGuard` 里直接放行，不参与权限码比对。这不是图省事——没有这条兜底，一旦权限数据配错或被清空，管理员会连「修复权限」的接口都调不了，只能去数据库手工插数据。所以超管的 `permissions` 字段返回空数组，前端见到 `isSuperAdmin: true` 应视为拥有全部权限。

**授权接口是全量替换语义**。`PUT /roles/:id/permissions` 传入的集合就是最终结果，未包含的视为撤销，空数组清空全部。比增量的 add/remove 少一半接口，也不会因为前端漏发某一项而产生「以为撤销了其实没撤销」的偏差。替换在事务里完成（先删后插），已实测插入失败时删除会回滚。

**几条防自锁规则**。内置角色（`is_system`）不可删除、不可停用、不可改角色码——停用超管角色会把所有管理员一起锁在系统外；改角色码会让守卫里的超管短路判断失效。另外不允许修改自己的角色，否则误摘超管后只能去数据库手工恢复。改名称和备注不受限制。

**菜单树的几条规则**。节点分三类：`directory` 只做分组、不对应页面也不能有 `component`；`menu` 必须有 `path` 和 `component`；`external` 的 `path` 必须是完整 URL。只有目录能当父节点。改 `parentId` 时会拒绝指向自己或自己的后代，避免子树脱离主干成环。删除和「目录改成其他类型」在还有子节点时都会被拒绝——级联删一棵子树不可逆，让调用方显式逐个确认更安全。

`GET /menus/mine` 是前端渲染侧边栏的入口，不需要菜单管理权限。超管拿到全部启用菜单，其余按角色授权返回，并且**会自动补齐授权节点的祖先**：只授子菜单而没授父目录时，子节点会因为找不到父亲而在建树时被丢掉，整块入口就消失了。反过来，停用一个目录会连带隐藏它下面的所有入口。`visible: false` 的节点仍会返回，它表示「不在侧边栏显示但路由可访问」（详情页那类），由前端决定怎么处理。

**refreshToken 可吊销，且每次刷新都轮换**。`sys_refresh_token` 记录每个 refreshToken 的 jti，刷新时作废旧 jti 并签发新的。存 jti 而不存 token 本身：token 是 bearer 凭证，落库等于多一处泄漏面，而签名校验由 JWT 自己完成，这张表只回答「这个 jti 还有效吗」。

**「已吊销」分两种，混为一谈会出 bug**。`replaced_by_jti` 非空表示它是被轮换掉的——正常客户端拿到新 token 后不会再用旧的，旧的再次出现说明被复制走了，此时吊销该用户全部会话并要求重新登录。`replaced_by_jti` 为空则是主动登出、改密或被踢下线，属于预期内失效，只拒绝这一次请求。我最初把两者都当成盗用，结果在一台设备上登出会把其他设备的登录态一起弄掉，`auth.service.spec.ts` 里有专门的回归用例守着这条。

改密码和软删除用户会自动吊销该用户全部会话——密码泄漏后改密是第一反应，如果旧 refreshToken 还能继续换新，改密就等于没改。

**会话列表靠 accessToken 里的 `sid`**。签发时把所属会话的 jti 写进 accessToken 的 `sid` claim，`AuthUser.sessionId` 透出来，列表据此标出「当前设备」。鉴权时不校验 `sid`，accessToken 依然无状态——它只用来回答「这条记录是不是我正在用的这台」。

列表刻意不返回 jti，只给数据库主键 id 用于下线。下线时**归属校验写在 SQL 条件里**（`id = ? AND user_id = ?`），只按 id 查会让任何登录用户猜 id 就能下掉别人的会话。未命中一律返回 404，不区分「不是你的」和「本来就没有」，否则这个接口就成了探测他人会话 id 的工具。

管理员那组接口（`/users/:id/sessions`）与用户自己的那组是分开的：后者只能操作自己、不需要权限，前者能操作任意用户、受权限码保护。读和写也拆成两个码——看是 `system:user:session:list`，踢是 `system:user:force-logout`。管理员下线时会话必须确实属于路径上的那个用户，否则返回 404，避免拼错 id 就把别人的设备下掉。

`revoke-others` 在识别不出当前设备时（用早期版本签发的 accessToken）直接拒绝，而不是退化成「全部下线」——那会把发起操作的人自己也踢掉。

**accessToken 仍是无状态的**，吊销 refreshToken 不会让已签发的 accessToken 立刻失效，它最多再活 `JWT_ACCESS_EXPIRES_IN`（默认 30 分钟）。需要立刻阻断请把用户状态改成 `disabled`，那是每次请求都会校验的。

**操作日志**。所有写操作（POST/PUT/PATCH/DELETE）由 `OperationLogInterceptor` 自动记录，无需在每个 service 里手写。GET 不记——量级太大且没有审计价值，记了只会淹没真正要看的东西。用 `@OperationLog({ module, action })` 补上可读的中文标签，不标也会记录，只是只能靠 method + path 辨认；确实不该记的用 `@SkipOperationLog()`。

**参数快照会脱敏**。命中 `password|token|secret|authorization|cookie|credential` 的键一律替换成 `***`，递归处理嵌套对象和数组。这不是可选项：登录失败的请求同样会被记录，而它的 body 里正好是明文密码。`redact.spec.ts` 专门覆盖了各种形态，包括大小写混写和循环引用。

**日志是旁路，绝不能拖垮业务**。写入不 await、异常在 service 内部吞掉只留一行告警。已实测：把日志表改名制造写入失败后，新增用户依然返回 201 且数据正常落库。

日志表 append-only，没有软删除也没有 `created_by`——日志本身就是「谁在何时做了什么」，再套一层审计字段是循环。`username` 冗余存一份而非做外键：用户被删除后仍要能回答「是谁做的」。接口只提供查询，不提供删除，能被随手删掉的审计日志没有审计价值；清理历史应当是运维层面按 `created_at` 批量删除的定时任务。

**限流**。全局默认按客户端 IP 计数，窗口与配额由 `THROTTLE_TTL` / `THROTTLE_LIMIT` 控制；登录和注册另有更严格的固定阈值（60 秒 5 次，见 `packages/shared` 的 `LOGIN_THROTTLE`）。写成常量而非环境变量是因为 `@Throttle` 是装饰器，在类定义时求值，那会儿 ConfigModule 还没加载 `.env`。

限流守卫注册在守卫链最前面：它必须先于认证执行，否则每次暴力尝试都会先做一遍查库和 bcrypt 比对，防护本身反而成了最贵的一环。健康检查用 `@SkipThrottle()` 豁免，避免被负载均衡和监控的轮询打满。

按 IP 而不按用户名计数是有意的：按用户名会让攻击者用错误密码反复请求就能锁死任意真实账号，把防护变成拒绝服务的入口。**部署在 nginx 之后必须把 `TRUST_PROXY` 设为 true**，否则所有请求的来源 IP 都是代理地址，限流退化成全站共用一个配额；反过来直接暴露公网时必须保持 false，否则客户端可伪造 `X-Forwarded-For` 绕过限流。

**计数存哪由 `REDIS_URL` 决定**。配了就用 Redis，多实例共享同一份计数；不配（或留空）则回退到进程内存，此时每个实例各算各的、实际配额按实例数翻倍。启动日志会明确打印当前用的是哪一种——线上最怕的是以为配了 Redis 其实回退了，所以这行日志是必需的而不是装饰。

**Redis 故障时选择放行（fail-open）。** 换成 Redis 之后，限流从「进程内一个 Map」变成了外部依赖。如果 Redis 抖动就让所有请求 500，等于为了防暴力破解给系统加了个新的单点，代价明显不成比例。`AppThrottlerGuard.handleRequest` 捕获存储异常后放行并打 error 日志，但只吞存储错误——`ThrottlerException` 是「确实超限」的正常结果，必须原样上抛。

**权限变更即时生效**。`JwtStrategy` 每个请求回库查用户与授权，所以改角色授权、禁用角色、禁用用户都不需要重新登录就会生效。代价是每个受保护请求多几次查询；要优化就在 `PermissionService` 加缓存，届时需一并解决「改权限后缓存何时失效」的一致性问题。

**注入数据库**。任何 service 里 `@Inject(DRIZZLE) private readonly db: DrizzleDB`，即可获得带完整表结构推断的 Drizzle 实例。`DatabaseModule` 是 `@Global` 的，不必在各模块重复 import。

**密码字段**。`UserService` 里有一个 `safeColumns` 投影，所有对外查询都走它，保证 `password` 不会跟着结果溜出去。auth 校验密码走 `findCredentialsByUsername`，它把哈希和用户信息拆成两个字段返回。

**改表流程**。改 `packages/database/src/schema/*.ts` → `pnpm db:generate` → 检查生成的 SQL → `pnpm db:migrate` → 迁移文件一起提交。迁移 SQL 不进 `dist`，生产环境执行迁移需要源码目录。

## 数据模型

RBAC 采用**菜单与权限分离**：`sys_menu` 只回答「看得见什么」（前端路由树），`sys_permission` 只回答「能做什么」（接口级权限码），两者各自关联角色。

```
sys_user ──< sys_user_role >── sys_role ──< sys_role_permission >── sys_permission
                                   │
                                   └──< sys_role_menu >── sys_menu (自引用树)
```

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `sys_user` | 用户 | `username` 唯一 |
| `sys_role` | 角色 | `code` 唯一；`data_scope` 数据权限范围；`is_system` 内置角色保护 |
| `sys_permission` | 权限码，如 `system:user:delete` | `code` 唯一；`module` 用于分配界面分组 |
| `sys_menu` | 前端路由菜单树 | `parent_id` 自引用，`type` 为 directory / menu / external |
| `sys_user_role` | 用户授角色 | 联合主键 |
| `sys_role_permission` | 角色授权限 | 联合主键 |
| `sys_role_menu` | 角色授菜单 | 联合主键 |

几条贯穿全表的约定：

**软删除**。业务主表都有 `deleted_at`，非空即已删除。所有业务查询必须叠加 `isNull(deletedAt)`——`UserService` 里的 `alive()` 辅助函数就是干这个的，新写查询时照抄。三张关联表不软删除：解绑就是真删行，授权关系只有"有"和"没有"两种状态。

**唯一码删除后不可复用**。`sys_role.code`、`sys_permission.code`、`sys_user.username` 的唯一索引覆盖已软删除的行。这是有意为之：权限码会被前端和守卫元数据引用，让新角色复用一个被删除的旧码，等于把历史授权语义悄悄还给了它。相应地，`UserService.create` 的重名预检查查的是全量而非仅未删除的行，否则会先告诉调用方"可用"再在插入时撞 `ER_DUP_ENTRY`。

**关联表带外键且 `ON DELETE CASCADE`**。主表虽走软删除、级联极少触发，但一旦真的物理清理数据，不会留下悬空的授权行。

**审计字段自动填充**。`created_by` / `updated_by` 由 `RequestContext` 统一写入，service 里只要 `...this.ctx.auditOnCreate()` 或 `...this.ctx.auditOnUpdate()`，不需要把 `operatorId` 从 controller 一路当参数传下来。

底层是 `nestjs-cls`（AsyncLocalStorage）：上下文由 `ClsMiddleware` 建立，当前用户 id 由 `CurrentUserInterceptor` 写入。**用拦截器而不是中间件**是关键——中间件在守卫之前执行，那时 `request.user` 还不存在；拦截器一定在所有守卫之后运行。

字段仍然可空，这是正常的：`@Public()` 接口（比如自助注册）没有登录态，seed 和定时任务这类非 HTTP 入口连 CLS 上下文都没有，两种情况都会写入 `null`。`RequestContext` 里用 `cls.isActive()` 做了保护，在没有上下文时返回 `null` 而不是抛错。

## 接口一览

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | 公开 | 健康检查，数据库不通时返回 `degraded` |
| POST | `/api/auth/register` | 公开 | 注册并直接返回 token |
| POST | `/api/auth/login` | 公开 | 账号密码登录 |
| POST | `/api/auth/refresh` | 公开 | 用 refreshToken 换新 token 对（会轮换旧的） |
| POST | `/api/auth/logout` | 公开 | 登出，吊销本次提交的 refreshToken |
| GET | `/api/auth/sessions` | 仅需登录 | 我的登录设备列表，当前设备排最前 |
| DELETE | `/api/auth/sessions/:id` | 仅需登录 | 下线自己的指定设备 |
| POST | `/api/auth/sessions/revoke-others` | 仅需登录 | 下线除当前设备外的全部会话 |
| GET | `/api/auth/profile` | 需要 | 当前登录用户信息，含角色码与权限码 |
| GET | `/api/users` | `system:user:list` | 分页查询，支持 `keyword` / `status` |
| POST | `/api/users` | `system:user:create` | 新增用户 |
| GET | `/api/users/:id` | `system:user:read` | 用户详情 |
| PATCH | `/api/users/:id` | `system:user:update` | 更新用户（不含用户名和密码） |
| DELETE | `/api/users/:id` | `system:user:delete` | 删除用户 |
| GET | `/api/users/:id/sessions` | `system:user:session:list` | 查看指定用户的在线设备 |
| DELETE | `/api/users/:id/sessions/:sessionId` | `system:user:force-logout` | 下线该用户的某台设备 |
| POST | `/api/users/:id/force-logout` | `system:user:force-logout` | 强制该用户下线，吊销其全部会话 |
| PUT | `/api/users/me/password` | 仅需登录 | 修改自己的密码，需校验旧密码 |
| GET | `/api/users/:id/roles` | `system:user:assign-role` | 用户已分配的角色 id，供分配界面回显 |
| PUT | `/api/users/:id/roles` | `system:user:assign-role` | 全量替换用户的角色 |
| GET | `/api/roles` | `system:role:list` | 分页查询角色 |
| POST | `/api/roles` | `system:role:create` | 新增角色 |
| GET | `/api/roles/:id` | `system:role:read` | 角色详情，含 `permissionIds` / `menuIds` |
| PATCH | `/api/roles/:id` | `system:role:update` | 更新角色 |
| DELETE | `/api/roles/:id` | `system:role:delete` | 删除角色（软删除） |
| PUT | `/api/roles/:id/permissions` | `system:role:assign` | 全量替换角色的权限码 |
| PUT | `/api/roles/:id/menus` | `system:role:assign` | 全量替换角色的菜单 |
| GET | `/api/permissions` | `system:permission:list` | 权限码目录，供授权界面拉取可选项 |
| GET | `/api/operation-logs` | `system:log:list` | 分页查询操作日志，支持用户名/模块/结果/时间范围过滤 |
| GET | `/api/operation-logs/:id` | `system:log:read` | 日志详情，含脱敏后的请求参数快照 |
| GET | `/api/menus/mine` | 仅需登录 | 当前用户可见的菜单树，前端渲染侧边栏 |
| GET | `/api/menus` | `system:menu:list` | 完整菜单树（管理端），含停用与隐藏节点 |
| POST | `/api/menus` | `system:menu:create` | 新增菜单 |
| GET | `/api/menus/:id` | `system:menu:read` | 菜单详情 |
| PATCH | `/api/menus/:id` | `system:menu:update` | 更新菜单 |
| DELETE | `/api/menus/:id` | `system:menu:delete` | 删除菜单（软删除），有子菜单时拒绝 |

## 尚未包含

按当前范围刻意留白的部分，后续要做时的落点：

- **日志的归档与清理**。`sys_operation_log` 只增不减，长期运行需要按 `created_at` 定期归档或分区。
- **部门表与数据权限**。`sys_role.data_scope` 已经落库但还没有任何地方消费它，需要先有 `sys_dept` 才能把「本部门」「本部门及以下」这些范围翻译成查询条件。
- **Redis 的其他用途**。目前只有限流在用它，`RedisModule` 已经把客户端抽出来了，后续做缓存、分布式锁可以直接注入 `REDIS_CLIENT`。
- **操作日志、文件上传、Redis 缓存、软删除**。
- **`JwtStrategy` 每请求回库**。当前每个受保护请求都会按主键查一次用户，好处是禁用/删除立即生效，量大时需要在这里加缓存。
- **构建缓存**。包数量变多、CI 变慢时可以再引入 Turborepo，现在 pnpm 原生编排够用。
