# nest-admin

基于 NestJS 11、Vue 3、Drizzle ORM 和 MySQL 8 的全栈后台管理系统，采用 pnpm monorepo 组织。项目已经覆盖认证与会话安全、RBAC、用户/角色/菜单/组织架构/岗位管理、部门数据权限、数据字典、通知公告、操作日志、在线用户、文件上传、主题切换和通用表格/图表组件，可直接作为管理后台的开发基础。

## 已实现功能

- **认证与会话**：access/refresh 双 token、refresh token 轮换与重复使用检测、当前设备识别、单设备下线、退出后立即失效。
- **RBAC**：用户、角色、权限码、菜单树、部门数据范围和按钮级权限控制，支持 Redis 授权/数据范围缓存及主动失效，内置超管防自锁规则。
- **系统管理**：用户、组织架构、岗位、角色、菜单、参数配置、数据字典、通知公告、操作日志、在线用户等页面，支持部门迁移原因与历史追踪，统一使用 `ProSearch`、`ProTable` 和 `useTable`。
- **数据字典**：字典类型与字典项 CRUD、状态和排序管理，业务侧通过 `useDict(code)` 复用启用选项，Redis 版本票据保证写后主动失效。
- **通知与消息**：公告草稿、发布、撤回和阅读统计，支持全员、部门、角色、指定用户发送；Header 展示未读角标和最近消息，SSE + Redis Pub/Sub 实时同步多实例事件，断线自动回退轮询。
- **界面基础设施**：浅色/深色/跟随系统主题、可切换主色和菜单风格、KeepAlive 页签、内容区独立刷新、Remix Icon 图标体系。
- **数据展示**：封装折线图、柱状图、饼图/环形图和热力图，统一处理主题、自适应尺寸、空状态和动画。
- **文件与头像**：本地或 S3 兼容存储，个人中心支持上传头像，图片地址统一适配 API 前缀。

## 技术栈

| 层面          | 选型                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| 运行时 / 语言 | Node.js 22、TypeScript（后端 NodeNext / ES2023，前端 Vue TSC）              |
| 后端          | NestJS 11 + Express                                                         |
| 前端          | Vue 3.5 + Vite 8 + Vue Router 5 + Pinia 4                                   |
| UI / 样式     | antdv-next + UnoCSS + Remix Icon                                            |
| 请求 / 图表   | alova + ECharts 6 + vue-echarts                                             |
| ORM           | Drizzle ORM 0.45（`drizzle-orm/mysql2`），迁移用 drizzle-kit                |
| 数据库        | MySQL 8，驱动 mysql2 连接池                                                 |
| Redis         | 全局限流、RBAC/数据字典缓存、消息传播与定时任务分布式锁，可选配置             |
| 配置          | `@nestjs/config` + zod 做启动期环境变量校验                                 |
| 认证          | `@nestjs/jwt` + passport-jwt，双 token（access / refresh），bcryptjs 存密码 |
| 校验          | class-validator / class-transformer，全局 `ValidationPipe`                  |
| 文档          | `@nestjs/swagger`                                                           |
| 文件存储      | 本地文件系统或 AWS S3 / S3 兼容对象存储（`@aws-sdk/client-s3`）             |
| 测试          | Jest 30 + ts-jest、Vitest 4 + Vue Test Utils，e2e 用 supertest              |
| 规范          | ESLint 9 flat config + typescript-eslint + eslint-plugin-vue + Prettier     |
| 仓库结构      | pnpm 11 workspace，跨包脚本用 pnpm 原生 `-r` / `--filter` 编排              |

## 仓库结构

```
nest-admin/
├─ package.json              # 只做编排，不含业务代码
├─ pnpm-workspace.yaml       # apps/* + packages/*
├─ tsconfig.base.json        # 各包 tsconfig 统一继承它
├─ eslint.config.mjs         # 全仓库唯一一份 flat config
├─ .env / .env.example       # 唯一一份环境变量，各包都从仓库根读
├─ apps/
│  ├─ api/                   # @nest-admin/api，NestJS HTTP 服务
│  │  ├─ src/
│  │  │  ├─ main.ts          # 全局前缀、管道、拦截器、过滤器、Swagger
│  │  │  ├─ app.module.ts
│  │  │  ├─ config/          # zod 环境变量 schema、Swagger 装配
│  │  │  ├─ common/          # 装饰器、分页 DTO、异常过滤、响应包装
│  │  │  ├─ database/        # Nest 侧的 DI 封装（token + 全局模块）
│  │  │  └─ modules/         # auth、user、rbac、operation-log、file
│  │  └─ test/               # e2e
│  └─ web/                   # @nest-admin/web，Vue 管理端
│     ├─ src/api/            # alova 请求封装与业务 API
│     ├─ src/components/     # 基础组件、图表、选择器、ProTable/ProSearch
│     ├─ src/layouts/        # 后台布局、菜单、Header、TabBar、设置抽屉
│     ├─ src/stores/         # 认证、菜单、页签和主题状态
│     └─ src/views/          # 仪表盘、个人中心和系统管理页面
└─ packages/
   ├─ database/              # @nest-admin/database
   │  ├─ src/schema/         # Drizzle 表定义，drizzle-kit 的输入
   │  ├─ src/client.ts       # 连接池 + Drizzle 工厂，api 与 seed 共用
   │  ├─ src/types.ts        # DrizzleDB、连接参数类型
   │  ├─ scripts/            # CLI 专用：env 解析、seed（不进 dist）
   │  └─ migrations/         # 生成的迁移 SQL，需要提交
   └─ shared/                # @nest-admin/shared
      ├─ src/                # 前后端契约、权限码、枚举与分页结构
      └─ src/node/           # Node 专用子路径，定位仓库根 .env
```

依赖方向是 `shared ← database ← api`，Web 只依赖 `shared`，禁止前端跨层引用数据库或 API 内部类型。`pnpm -r` 会按拓扑顺序执行。

**为什么这么分**。`shared` 主入口不碰任何运行时框架，Web 可直接引用线上契约而不会被 Drizzle 拖进去；Node 专用工具从 `@nest-admin/shared/node` 子路径导出，避免污染浏览器入口。`database` 只管 schema 和连接，Nest 的 DI 封装留在 `apps/api/src/database`，这样定时任务、CLI 等非 Nest 进程也能复用同一套表定义和连接参数。

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

启动后：管理端 `http://localhost:5173`，接口前缀 `http://localhost:3000/api`，Swagger `http://localhost:3000/api/docs`，健康检查 `GET /api/health`。

环境变量只在仓库根维护一份。各包运行时 cwd 不同（`pnpm --filter` 会把 cwd 设到包目录），所以定位 `.env` 不靠相对层级，而是由 `@nest-admin/shared/node` 的 `findWorkspaceRoot()` 向上找 `pnpm-workspace.yaml`。本机若要覆盖某几项而不动 `.env`，可以另建 `.env.local`，它优先级更高。

## 常用命令

根目录的命令会自动处理包之间的依赖顺序，日常用它们就够了：

| 命令                              | 说明                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm dev`                        | 先构建 packages，然后**并行**启动 api（:3000）与 web（:5173），带包名前缀的混合输出 |
| `pnpm dev:api` / `pnpm dev:web`   | 只启动其中一端                                                                      |
| `pnpm build`                      | 按拓扑顺序构建全部包                                                                |
| `pnpm typecheck` / `pnpm lint`    | 全仓库类型检查 / ESLint 自动修复（前后端各自的配置）                                |
| `pnpm lint:api` / `pnpm lint:web` | 单独跑后端 / 前端的 lint，两者配置独立                                              |
| `pnpm format` / `pnpm format:web` | 后端 / 前端的 prettier                                                              |
| `pnpm test` / `pnpm test:e2e`     | 单元测试 / 端到端测试（会先构建依赖包）                                             |
| `pnpm clean`                      | 删除所有 dist 与 tsbuildinfo                                                        |
| `pnpm db:generate`                | 对比 schema 生成迁移 SQL 到 `packages/database/migrations`                          |
| `pnpm db:migrate`                 | 把未执行的迁移应用到数据库                                                          |
| `pnpm db:push`                    | 不生成迁移文件直接同步 schema，**仅限本地试验**                                     |
| `pnpm db:studio`                  | 打开 Drizzle Studio 可视化查看数据                                                  |
| `pnpm db:seed`                    | 幂等地创建管理员、组织岗位、权限菜单、内置参数和示例业务字典                       |

要只操作某个包，用 `pnpm --filter @nest-admin/api <script>`。

**修改共享包后先构建**。`apps/web` 的 Vite 开发环境通过 `@nest-admin/source` condition 直接读取 `packages/shared` 源码，但 API 与各包的独立 typecheck 读取构建产物。修改 `packages/shared` 或 `packages/database` 后应先执行 `pnpm build:packages`，否则可能仍看到旧的 `dist` 类型。`pnpm dev`、`pnpm test` 和数据库脚本已经内置这一步。

## 前端（apps/web）

Vue 3.5 + Vite 8 + TypeScript + vue-router 5 + Pinia 4 + antdv-next（按需自动引入）+ UnoCSS（wind4 preset）。`create-vue` 脚手架起步。

前端公共能力已经按用途收敛到 `src/components/core`：

- `tables`：`ProSearch`、`ProTable` 与 `useTable` 组合，统一查询、分页、竞态防护、列显隐、密度、全屏和树表格行为。
- `charts`：`BaseChart`、`LineChart`、`BarChart`、`PieChart`、`HeatmapChart`，统一 ECharts 注册、主题、动画、自适应尺寸和空状态。
- `base` / `selectors`：`AppIcon`、`AppTag` 和精选 Remix Icon 图标选择器，图标 class 由 UnoCSS safelist 保证运行时可用。
- `composables`：`useTable` 统一列表状态机，`useDict(code)` 统一加载动态业务选项并处理请求竞态。
- `layouts`：Sidebar、Header、面包屑、TabBar 和设置抽屉分层组织；页面刷新只重建内容区域，不重载侧栏与头部。

**ESLint 配置前后端是分开的两套**：根那份面向 Node/NestJS（类型感知、flat config），ignore 了 `apps/web`；前端在自己的 `eslint.config.ts` 里用 `eslint-plugin-vue` + `@vue/eslint-config-typescript`（create-vue 官方组合）。互不解析对方的文件。

**TypeScript 版本是故意分叉的**：后端 5.9.3（根依赖）、前端 6.0.x（本包依赖），pnpm 会各装一份。Volar（Vue 语言服务）用包自己的版本，不会互相干扰；但 VS Code 的 `typescript.tsdk` 指向根那份 5.9.3，只对 `.ts` 生效，Vue 文件由 Volar 接管。

**HTTP 请求用 alova**（`src/api/http.ts`）。响应统一解包：后端的 `{ code: 0, data }` 直接解出 `data`，失败一律抛 `ApiError`（带 `httpStatus` 与 `bizCode`），断网超时归一成 `httpStatus: 0`。**204 空响应体视为成功**——登出、删除、改密、配置授权等接口会返回 204，对空体调 `json()` 会抛错。

**401 会静默刷新并重试一次，且多个并发 401 只刷新一次。** 这不是性能优化而是必须：后端的 refreshToken 是轮换式的，第一个刷新成功后旧令牌立即作废，若每个 401 各自去刷，后面的全会失败，还会触发后端的**盗用检测把整个账号踢下线**。刷新本身用裸 fetch 而不是 alova 实例，否则会被自己的 401 逻辑拦住形成递归。`/auth/login`、`/auth/refresh` 等认证入口豁免重试。

GET 的默认缓存被关掉了（`cacheFor: { GET: 0 }`）。alova 默认给 GET 挂 5 分钟内存缓存，后台管理场景下会变成「我明明改了怎么没变」；需要缓存的列表页自己开。

开发时前端把 `/api` 代理到 `http://localhost:3000`（配置在 `vite.config.ts` 的 `server.proxy`），所以前端代码里统一写相对路径 `/api/...`，不需要关心后端端口也不存在跨域问题。

样式入口是 `main.ts` 里的 `import 'virtual:uno.css'`，UnoCSS 靠这个虚拟模块注入生成的工具类，**漏掉这行插件就整个空跑**（脚手架默认不自带，是手工配的，漏过一次）。模板中的 antdv 组件由 `AntdvNextResolver` 按需自动注册；在 `h()` / TSX 中使用的组件仍需显式 import。

## 文件上传

`POST /api/files/upload` 接收 `multipart/form-data`，文件字段名固定为 `file`，默认需要登录但不要求额外权限码。成功后返回存储 key、访问 URL、原始文件名、MIME、大小和实际使用的存储驱动。

存储由 `UPLOAD_DRIVER` 切换：

- `local`：写入仓库根下的 `UPLOAD_LOCAL_DIR`，默认 `.uploads`，并同时通过直接路径和 API 前缀路径暴露，例如 `/uploads/...` 与 `/api/uploads/...`。
- `s3`：使用 AWS SDK v3 的 `PutObject`，同时支持 AWS S3、MinIO 和提供 S3 兼容接口的 OSS。AWS S3 可不配 endpoint；兼容服务填写 `UPLOAD_S3_ENDPOINT`。凭证留空时走 AWS SDK 默认凭证链。上传请求不会主动设置 `public-read` ACL，公开读取应由 Bucket Policy、对象存储控制台或 CDN 配置负责。

上传使用内存缓冲，`UPLOAD_MAX_FILE_SIZE_MB` 是单文件硬上限，默认 10 MB、最高 100 MB。`UPLOAD_ALLOWED_MIME_TYPES` 是逗号分隔白名单，支持 `image/*` 和 `*/*` 通配符。存储 key 的扩展名由 MIME 映射生成，不采用客户端文件名里的扩展名，避免上传伪装成普通文本的 HTML 后在同域执行。若对象通过私有域名、CDN 或自定义 Bucket 域名访问，配置 `UPLOAD_S3_PUBLIC_BASE_URL`；否则服务会根据 endpoint、bucket 和 region 生成对象 URL。

## 约定

**统一响应**。成功由 `TransformInterceptor` 包成 `{ code: 0, message: 'success', data, timestamp }`，controller 只返回业务数据本身。失败由 `AllExceptionsFilter` 包成同构结构，`code` 是 HTTP 状态码；未知异常统一 500，堆栈只进日志不外泄。MySQL 唯一索引冲突会被翻译成 409。

**默认全局鉴权，两道守卫**。`JwtAuthGuard` 与 `PermissionGuard` 都通过 `APP_GUARD` 注册，且**刻意放在 `AppModule` 同一个 providers 数组里**——顺序即执行顺序，前者认证并把 `AuthUser` 挂到 request 上，后者依赖它的产物比对权限码。分散到各自模块时执行顺序取决于模块解析顺序，改动 imports 就可能悄悄失效。

所有路由默认需要 `Authorization: Bearer <accessToken>`，登录、注册、刷新、健康检查用 `@Public()` 显式开放——**新增无需登录的接口时别忘了加它**。

**权限码**。用 `@Permissions(PERMISSIONS.USER_DELETE)` 标注接口，未标注的只要登录即可访问。传多个码是「满足其一即可」；需要「同时满足」时请拆出更细的权限码，那在分配界面上是可见可解释的，叠加是隐式规则。

码值只在 `packages/shared/src/constants/permissions.ts` 定义一次，被三处消费：controller 标注、seed 录入 `sys_permission`、前端按钮级控制。**不要在别处写字面量**，新增权限码时同步往 `PERMISSION_DEFINITIONS` 补一条，再跑 `pnpm db:seed` 录入。

**超管短路**。持有 `super_admin` 角色的用户在 `PermissionGuard` 里直接放行，不参与权限码比对。这不是图省事——没有这条兜底，一旦权限数据配错或被清空，管理员会连「修复权限」的接口都调不了，只能去数据库手工插数据。所以超管的 `permissions` 字段返回空数组，前端见到 `isSuperAdmin: true` 应视为拥有全部权限。

**授权与分配接口是全量替换语义**。`PUT /roles/:id/permissions` 和 `PUT /users/:id/posts` 传入的集合就是最终结果，未包含的视为撤销，空数组清空全部。比增量的 add/remove 少一半接口，也不会因为前端漏发某一项而产生「以为撤销了其实没撤销」的偏差。替换在事务里完成（先删后插），已实测插入失败时删除会回滚。

**部门与数据范围**。`sys_dept` 是自关联组织树，一个用户最多直属一个部门。角色的 `data_scope` 支持全部、本部门、本部门及下级、仅本人和自定义部门；自定义集合保存在 `sys_role_dept`。同一用户拥有多个角色时取范围并集，超级管理员始终查看全部。部门有子部门或直属用户时拒绝删除，停用部门不可再作为父部门或分配给用户。

**部门迁移可追溯**。变更 `parent_id` 时必须提交迁移原因；部门更新与 `sys_dept_transfer_log` 历史写入在同一事务完成，并用原父级作为更新条件防止并发迁移生成错误记录。历史表保存部门、原父级、新父级和操作人的名称快照，因此后续改名或删除不会改变既有审计语义。

**岗位与用户关系**。`sys_post` 保存岗位主数据，`sys_user_post` 支持一个用户拥有多个岗位。停用岗位不能新增分配，但已有关系可保留或解除；岗位仍有有效用户时拒绝删除。用户岗位接口同样受当前管理员的数据范围约束，不能通过猜测用户 ID 越权分配。

**系统参数不是环境变量**。`sys_system_config` 只保存可由管理员维护的非敏感业务参数，支持文本、数字、布尔和 JSON 四种值类型；JWT 密钥、数据库密码、Redis 地址等部署机密仍只允许放在 `.env`。参数值在写入时按声明类型校验，内置参数允许改值但不允许改键或删除，自定义参数软删除后参数键也不可复用。业务模块可注入 `SystemConfigService` 并通过 `getEnabledValue(key)` 读取已经解析类型的启用参数。

**动态字典不替代核心枚举**。`sys_dict_type` 与 `sys_dict_item` 用于业务人员可配置的显示选项，类型编码和同类型业务值在软删除后都不可复用。`STATUS`、`MENU_TYPE`、`DATA_SCOPE` 等参与权限、路由或状态机判断的核心枚举继续由 `@nest-admin/shared` 静态维护，不能在管理页改写。业务读取接口只返回启用类型下的启用项，并按 `sort/id` 升序；前端通过 `useDict(code)` 消费。

**字典缓存使用版本票据**。读取 `/api/dictionaries/:code` 时缓存键包含字典编码版本，字典类型或字典项写入后只递增版本，不扫描旧键。并发中的旧查询最多回写旧版本键，不会污染新结果；Redis 未配置或故障时直接回源 MySQL，`DICT_CACHE_TTL_SECONDS` 默认 300 秒。

**授权与数据范围使用 Redis 缓存**。`PermissionService` 缓存普通用户的角色与权限码，`DataScopeService` 缓存可序列化的范围结果，不缓存 Drizzle SQL 对象；超级管理员仍直接短路。缓存键带用户版本，数据范围键额外带组织树全局版本：用户角色、角色权限/状态/数据范围或用户所属部门变化时递增用户版本，部门新增、移动、删除时递增树版本。旧版本无需 `SCAN` 删除，最多在 `RBAC_CACHE_TTL_SECONDS` 后自然回收。

**缓存不是认证单点**。未配置 `REDIS_URL` 时直接查数据库；Redis 读取、写入或失效失败同样回源，并对错误日志限频。查询 miss 使用读取版本时生成的票据回写，因此查询期间恰好发生权限变更，也只会把旧结果写入旧版本键，不会污染失效后的新版本。主动失效和 TTL 共同保证一致性，默认 TTL 为 300 秒、最大 3600 秒。

**通知公告使用发布快照**。`sys_notice` 保存正文与生命周期，`sys_notice_target` 保存草稿选择的部门、角色或用户范围；发布时解析当前启用用户并写入 `sys_notice_recipient`。发布后用户换部门、换角色不会改变既有接收历史，撤回只让收件箱停止展示，收件人快照仍保留用于阅读统计和再次发布。

**消息入口与公告管理授权分离**。`/messages` 是所有登录用户都可访问的个人收件箱，Header 始终展示铃铛；没有通知公告菜单只代表不能创建、发布或管理公告。发布时系统按全员、部门、角色或指定用户解析收件人快照，消息查询也始终带当前用户 id，因此每个人只会看到推送给自己的消息。Header 通过 Bearer SSE 接收发布、撤回和已读事件，Redis Pub/Sub 负责多实例传播，Redis 未配置或故障时保留本机推送，浏览器断线期间回退到 60 秒轮询。

**几条防自锁规则**。内置角色（`is_system`）不可删除、不可停用、不可改角色码——停用超管角色会把所有管理员一起锁在系统外；改角色码会让守卫里的超管短路判断失效。另外不允许修改自己的角色，否则误摘超管后只能去数据库手工恢复。改名称和备注不受限制。

**菜单树的几条规则**。节点分三类：`directory` 只做分组、不对应页面也不能有 `component`；`menu` 必须有 `path`，前端根据当前用户菜单动态注册路由，`component` 可填写相对 `apps/web/src/views` 的组件路径，也可留空并按 `path` 自动匹配对应目录下的 `index.vue`；`external` 的 `path` 必须是完整 URL。只有目录能当父节点。改 `parentId` 时会拒绝指向自己或自己的后代，避免子树脱离主干成环。删除和「目录改成其他类型」在还有子节点时都会被拒绝——级联删一棵子树不可逆，让调用方显式逐个确认更安全。

`GET /menus/mine` 是前端渲染侧边栏的入口，不需要菜单管理权限。超管拿到全部启用菜单，其余按角色授权返回，并且**会自动补齐授权节点的祖先**：只授子菜单而没授父目录时，子节点会因为找不到父亲而在建树时被丢掉，整块入口就消失了。反过来，停用一个目录会连带隐藏它下面的所有入口。`visible: false` 的节点仍会返回，它表示「不在侧边栏显示但路由可访问」（详情页那类），由前端决定怎么处理。

**refreshToken 可吊销，且每次刷新都轮换**。`sys_refresh_token` 记录每个 refreshToken 的 jti，刷新时作废旧 jti 并签发新的。存 jti 而不存 token 本身：token 是 bearer 凭证，落库等于多一处泄漏面，而签名校验由 JWT 自己完成，这张表只保存会话状态与客户端信息。

**不同失效原因采用不同保留策略**。轮换后的旧记录保留 `replaced_by_jti`，旧 token 再次出现时视为可能被复制，系统会吊销该用户全部会话。改密、删除用户或管理员强制下线会写入 `revoked_at`。用户主动退出时则物理删除当前有效会话，不留下仍被在线列表识别的记录。

**accessToken 与会话状态绑定**。签发时把所属会话的 jti 写进 accessToken 的 `sid` claim；`JwtStrategy` 每次鉴权都会确认该会话仍有效且属于 token 中的用户。退出、改密或强制下线后，对应 accessToken 会立即被拒绝，不必等待自身过期。

改密码和软删除用户会自动吊销该用户全部会话——密码泄漏后改密是第一反应，如果旧会话还能继续访问，改密就等于没改。

列表刻意不返回 jti，只给数据库主键 id 用于下线。下线时**归属校验写在 SQL 条件里**（`id = ? AND user_id = ?`），只按 id 查会让任何登录用户猜 id 就能下掉别人的会话。未命中一律返回 404，不区分「不是你的」和「本来就没有」，否则这个接口就成了探测他人会话 id 的工具。

管理员会话接口与用户自己的接口分开：后者只能操作自己、不需要权限，前者能操作任意用户、受权限码保护。`GET /online-users` 按有效登录设备分页展示用户、IP、User-Agent、登录时间和过期时间；读取使用 `system:user:session:list`，下线使用 `system:user:force-logout`。管理员下线时会话必须确实属于路径上的用户，否则返回 404，避免拼错 id 就把别人的设备下掉。

`revoke-others` 在识别不出当前设备时（用早期版本签发的 accessToken）直接拒绝，而不是退化成「全部下线」——那会把发起操作的人自己也踢掉。没有 `sid` 的旧 accessToken 同样会被鉴权拒绝，要求重新登录。

**操作日志**。所有写操作（POST/PUT/PATCH/DELETE）由 `OperationLogInterceptor` 自动记录，无需在每个 service 里手写。GET 不记——量级太大且没有审计价值，记了只会淹没真正要看的东西。用 `@OperationLog({ module, action })` 补上可读的中文标签，不标也会记录，只是只能靠 method + path 辨认；确实不该记的用 `@SkipOperationLog()`。

**参数快照会脱敏**。命中 `password|token|secret|authorization|cookie|credential` 的键一律替换成 `***`，递归处理嵌套对象和数组。这不是可选项：登录失败的请求同样会被记录，而它的 body 里正好是明文密码。`redact.spec.ts` 专门覆盖了各种形态，包括大小写混写和循环引用。

**日志是旁路，绝不能拖垮业务**。写入不 await、异常在 service 内部吞掉只留一行告警。已实测：把日志表改名制造写入失败后，新增用户依然返回 201 且数据正常落库。

**过期日志由定时任务清理**。保留天数、cron、开关都在环境变量里（默认保留 90 天、每天 3 点）。cron 表达式来自配置，所以用 `SchedulerRegistry` 动态注册而不是 `@Cron()` 装饰器——装饰器参数在类定义时求值，那会儿读不到配置。

**删除是分批的。** 一条 `DELETE WHERE created_at < ?` 打在几百万行上会长时间持锁、撑爆 undo 和 binlog，线上表现就是整个库卡住。这里每批 1000 行、单次最多 100 批，超出部分留到下一轮。

**多实例下靠 Redis 锁保证只跑一份。** 没有锁的话 N 个实例会同时删同一批数据，互相竞争行锁。锁用 `SET NX PX` 获取、Lua 脚本比对持有者后删除——分两步做的话，恰好在两步之间锁过期被别人抢到，就会误删对方的锁。抢不到锁直接跳过而不排队：定时任务错过一轮无所谓，排队反而会堆积。没配 Redis 时不加锁直接执行，单实例部署本就不需要它。

清理时顺带删掉已经没用的会话记录（已过期的，或吊销时间超过保留期的）。`RefreshTokenService` 只在签发时清理当前用户的过期记录，已吊销但未过期、以及不再登录的用户留下的行不会被碰到，这里补上。

日志表 append-only，没有软删除也没有 `created_by`——日志本身就是「谁在何时做了什么」，再套一层审计字段是循环。`username` 冗余存一份而非做外键：用户被删除后仍要能回答「是谁做的」。接口只提供查询，不提供删除，能被随手删掉的审计日志没有审计价值；清理历史应当是运维层面按 `created_at` 批量删除的定时任务。

**限流**。全局默认按客户端 IP 计数，窗口与配额由 `THROTTLE_TTL` / `THROTTLE_LIMIT` 控制；登录和注册另有更严格的固定阈值（60 秒 5 次，见 `packages/shared` 的 `LOGIN_THROTTLE`）。写成常量而非环境变量是因为 `@Throttle` 是装饰器，在类定义时求值，那会儿 ConfigModule 还没加载 `.env`。

限流守卫注册在守卫链最前面：它必须先于认证执行，否则每次暴力尝试都会先做一遍查库和 bcrypt 比对，防护本身反而成了最贵的一环。健康检查用 `@SkipThrottle()` 豁免，避免被负载均衡和监控的轮询打满。

按 IP 而不按用户名计数是有意的：按用户名会让攻击者用错误密码反复请求就能锁死任意真实账号，把防护变成拒绝服务的入口。**部署在 nginx 之后必须把 `TRUST_PROXY` 设为 true**，否则所有请求的来源 IP 都是代理地址，限流退化成全站共用一个配额；反过来直接暴露公网时必须保持 false，否则客户端可伪造 `X-Forwarded-For` 绕过限流。

**计数存哪由 `REDIS_URL` 决定**。配了就用 Redis，多实例共享同一份计数；不配（或留空）则回退到进程内存，此时每个实例各算各的、实际配额按实例数翻倍。启动日志会明确打印当前用的是哪一种——线上最怕的是以为配了 Redis 其实回退了，所以这行日志是必需的而不是装饰。

**Redis 故障时选择放行（fail-open）。** 换成 Redis 之后，限流从「进程内一个 Map」变成了外部依赖。如果 Redis 抖动就让所有请求 500，等于为了防暴力破解给系统加了个新的单点，代价明显不成比例。`AppThrottlerGuard.handleRequest` 捕获存储异常后放行并打 error 日志，但只吞存储错误——`ThrottlerException` 是「确实超限」的正常结果，必须原样上抛。

**权限变更不要求重新登录**。`JwtStrategy` 每个请求仍回库校验用户和会话，角色与权限查询由 Redis 缓存承担。角色授权、角色状态、数据范围和用户角色关系的写接口在数据库提交后主动切换缓存版本；Redis 不可用时回退数据库，因此不会因为缓存故障阻断认证。

**注入数据库**。任何 service 里 `@Inject(DRIZZLE) private readonly db: DrizzleDB`，即可获得带完整表结构推断的 Drizzle 实例。`DatabaseModule` 是 `@Global` 的，不必在各模块重复 import。

**密码字段**。`UserService` 里有一个 `safeColumns` 投影，所有对外查询都走它，保证 `password` 不会跟着结果溜出去。auth 校验密码走 `findCredentialsByUsername`，它把哈希和用户信息拆成两个字段返回。

**改表流程**。改 `packages/database/src/schema/*.ts` → `pnpm db:generate` → 检查生成的 SQL → `pnpm db:migrate` → 迁移文件一起提交。迁移 SQL 不进 `dist`，生产环境执行迁移需要源码目录。

## 数据模型

RBAC 采用**菜单与权限分离**：`sys_menu` 只回答「看得见什么」（前端路由树），`sys_permission` 只回答「能做什么」（接口级权限码），两者各自关联角色。

```
sys_user ──< sys_user_role >── sys_role ──< sys_role_permission >── sys_permission
    │                              ├──< sys_role_menu >── sys_menu (自引用树)
    ├── sys_dept (自引用树)        └──< sys_role_dept >── sys_dept
    │       └──< sys_dept_transfer_log
    └──< sys_user_post >── sys_post
    └──< sys_notice_recipient >── sys_notice ──< sys_notice_target
sys_system_config (独立业务参数表)
```

| 表                    | 作用                            | 关键约束                                                         |
| --------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `sys_user`            | 用户                            | `username` 唯一；`dept_id` 指向直属部门                          |
| `sys_dept`            | 部门组织树                      | `code` 唯一；`parent_id` 组成层级                                |
| `sys_dept_transfer_log` | 部门迁移历史                  | append-only；保存迁移前后父级、原因与操作人名称快照              |
| `sys_post`            | 岗位主数据                      | `code` 唯一；停用后不可新增用户分配                              |
| `sys_system_config`   | 非敏感业务参数                  | 参数键唯一；按声明类型校验；内置参数不可改键或删除                |
| `sys_role`            | 角色                            | `code` 唯一；`data_scope` 数据权限范围；`is_system` 内置角色保护 |
| `sys_permission`      | 权限码，如 `system:user:delete` | `code` 唯一；`module` 用于分配界面分组                           |
| `sys_menu`            | 前端路由菜单树                  | `parent_id` 自引用，`type` 为 directory / menu / external        |
| `sys_user_role`       | 用户授角色                      | 联合主键                                                         |
| `sys_user_post`       | 用户分配岗位                    | 联合主键                                                         |
| `sys_role_permission` | 角色授权限                      | 联合主键                                                         |
| `sys_role_menu`       | 角色授菜单                      | 联合主键                                                         |
| `sys_role_dept`       | 角色自定义部门范围              | 联合主键                                                         |
| `sys_refresh_token`   | 登录设备会话                    | `jti` 唯一；记录过期、吊销、轮换链、IP 与 User-Agent             |
| `sys_operation_log`   | 操作审计日志                    | append-only；保存脱敏参数、结果、耗时与客户端信息                |
| `sys_notice`          | 通知公告主表                    | 草稿 / 已发布 / 已撤回；保存发布人名称快照                       |
| `sys_notice_target`   | 公告定向范围                    | 部门、角色或用户多态目标；联合主键防重复                         |
| `sys_notice_recipient` | 用户收件箱                     | 发布时生成快照；公告与用户联合唯一；`read_at` 记录已读           |

几条贯穿全表的约定：

**软删除**。业务主表都有 `deleted_at`，非空即已删除。所有业务查询必须叠加 `isNull(deletedAt)`——`UserService` 里的 `alive()` 辅助函数就是干这个的，新写查询时照抄。关联表不软删除：解绑就是真删行，关系只有"有"和"没有"两种状态。

**唯一码删除后不可复用**。`sys_role.code`、`sys_post.code`、`sys_permission.code`、`sys_user.username` 的唯一索引覆盖已软删除的行。这是有意为之：权限码和业务编码会被授权关系、菜单或历史数据引用，复用旧码会把历史语义悄悄交给新记录。相应地，创建前的重名预检查查的是全量而非仅未删除的行，否则会先告诉调用方"可用"再在插入时撞 `ER_DUP_ENTRY`。

**关联表带外键且 `ON DELETE CASCADE`**。主表虽走软删除、级联极少触发，但一旦真的物理清理数据，不会留下悬空的授权行。用户所属部门使用 `ON DELETE RESTRICT`，物理清理前也必须先处理归属关系。

**审计字段自动填充**。`created_by` / `updated_by` 由 `RequestContext` 统一写入，service 里只要 `...this.ctx.auditOnCreate()` 或 `...this.ctx.auditOnUpdate()`，不需要把 `operatorId` 从 controller 一路当参数传下来。

底层是 `nestjs-cls`（AsyncLocalStorage）：上下文由 `ClsMiddleware` 建立，当前用户 id 由 `RequestContextInterceptor` 写入。**用拦截器而不是中间件**是关键——中间件在守卫之前执行，那时 `request.user` 还不存在；拦截器一定在所有守卫之后运行。

字段仍然可空，这是正常的：尚未自行验明身份的 `@Public()` 接口、seed 和定时任务都可能没有操作人。refresh 接口会在 refreshToken 验签后通过 `RequestContext.setUser()` 写入可信身份，不能直接相信请求体里的 JWT 声明。`RequestContext` 在没有 CLS 上下文时返回 `null` 而不是抛错。

## 接口一览

| 方法   | 路径                                  | 鉴权                       | 说明                                                |
| ------ | ------------------------------------- | -------------------------- | --------------------------------------------------- |
| GET    | `/api/health`                         | 公开                       | 健康检查，数据库不通时返回 `degraded`               |
| POST   | `/api/auth/register`                  | 公开                       | 注册并直接返回 token                                |
| POST   | `/api/auth/login`                     | 公开                       | 账号密码登录                                        |
| POST   | `/api/auth/refresh`                   | 公开                       | 用 refreshToken 换新 token 对（会轮换旧的）         |
| POST   | `/api/auth/logout`                    | 公开                       | 登出，物理删除本次提交的当前有效会话                |
| GET    | `/api/auth/sessions`                  | 仅需登录                   | 我的登录设备列表，当前设备排最前                    |
| DELETE | `/api/auth/sessions/:id`              | 仅需登录                   | 下线自己的指定设备                                  |
| POST   | `/api/auth/sessions/revoke-others`    | 仅需登录                   | 下线除当前设备外的全部会话                          |
| GET    | `/api/auth/profile`                   | 需要                       | 当前登录用户信息，含角色码与权限码                  |
| GET    | `/api/users`                          | `system:user:list`         | 按数据范围分页，支持用户、状态和部门筛选            |
| POST   | `/api/users`                          | `system:user:create`       | 新增用户                                            |
| GET    | `/api/users/:id`                      | `system:user:read`         | 用户详情                                            |
| PATCH  | `/api/users/:id`                      | `system:user:update`       | 更新用户（不含用户名和密码）                        |
| DELETE | `/api/users/:id`                      | `system:user:delete`       | 删除用户                                            |
| PATCH  | `/api/users/me/profile`               | 仅需登录                   | 修改自己的昵称、邮箱和手机号，支持清空              |
| PATCH  | `/api/users/me/avatar`                | 仅需登录                   | 更新当前用户头像地址，传 `null` 恢复默认头像        |
| GET    | `/api/users/:id/sessions`             | `system:user:session:list` | 查看指定用户的在线设备                              |
| DELETE | `/api/users/:id/sessions/:sessionId`  | `system:user:force-logout` | 下线该用户的某台设备                                |
| POST   | `/api/users/:id/force-logout`         | `system:user:force-logout` | 强制该用户下线，吊销其全部会话                      |
| GET    | `/api/online-users`                   | `system:user:session:list` | 分页查询全部有效登录设备，支持用户与 IP 筛选        |
| PUT    | `/api/users/me/password`              | 仅需登录                   | 修改自己的密码，需校验旧密码                        |
| GET    | `/api/users/:id/roles`                | `system:user:assign-role`  | 用户已分配的角色 id，供分配界面回显                 |
| PUT    | `/api/users/:id/roles`                | `system:user:assign-role`  | 全量替换用户的角色                                  |
| GET    | `/api/users/:id/posts`                | `system:user:assign-post`  | 用户已分配的岗位 id                                 |
| PUT    | `/api/users/:id/posts`                | `system:user:assign-post`  | 全量替换用户岗位                                    |
| GET    | `/api/posts`                          | `system:post:list`         | 分页查询岗位及用户数                                |
| POST   | `/api/posts`                          | `system:post:create`       | 新增岗位                                            |
| GET    | `/api/posts/:id`                      | `system:post:read`         | 查询岗位详情                                        |
| PATCH  | `/api/posts/:id`                      | `system:post:update`       | 更新岗位                                            |
| DELETE | `/api/posts/:id`                      | `system:post:delete`       | 删除未分配用户的岗位                                |
| GET    | `/api/roles`                          | `system:role:list`         | 分页查询角色                                        |
| POST   | `/api/roles`                          | `system:role:create`       | 新增角色                                            |
| GET    | `/api/roles/:id`                      | `system:role:read`         | 角色详情，含权限、菜单和自定义部门 id               |
| PATCH  | `/api/roles/:id`                      | `system:role:update`       | 更新角色                                            |
| DELETE | `/api/roles/:id`                      | `system:role:delete`       | 删除角色（软删除）                                  |
| PUT    | `/api/roles/:id/permissions`          | `system:role:assign`       | 全量替换角色的权限码                                |
| PUT    | `/api/roles/:id/menus`                | `system:role:assign`       | 全量替换角色的菜单                                  |
| GET    | `/api/permissions`                    | `system:permission:list`   | 权限码目录，供授权界面拉取可选项                    |
| GET    | `/api/operation-logs`                 | `system:log:list`          | 分页查询操作日志，支持用户名/模块/结果/时间范围过滤 |
| GET    | `/api/operation-logs/:id`             | `system:log:read`          | 日志详情，含脱敏后的请求参数快照                    |
| GET    | `/api/operation-logs/cleanup/preview` | `system:log:clean`         | 预览本次清理会删掉多少行                            |
| POST   | `/api/operation-logs/cleanup`         | `system:log:clean`         | 立即执行一次清理                                    |
| POST   | `/api/files/upload`                   | 仅需登录                   | 上传单个文件，multipart 字段名为 `file`             |
| GET    | `/api/menus/mine`                     | 仅需登录                   | 当前用户可见的菜单树，前端渲染侧边栏                |
| GET    | `/api/menus`                          | `system:menu:list`         | 完整菜单树（管理端），含停用与隐藏节点              |
| POST   | `/api/menus`                          | `system:menu:create`       | 新增菜单                                            |
| GET    | `/api/menus/:id`                      | `system:menu:read`         | 菜单详情                                            |
| PATCH  | `/api/menus/:id`                      | `system:menu:update`       | 更新菜单                                            |
| DELETE | `/api/menus/:id`                      | `system:menu:delete`       | 删除菜单（软删除），有子菜单时拒绝                  |
| GET    | `/api/departments`                    | `system:dept:list`         | 查询部门树，搜索时保留祖先节点                      |
| POST   | `/api/departments`                    | `system:dept:create`       | 新增部门                                            |
| GET    | `/api/departments/:id`                | `system:dept:read`         | 查询部门详情                                        |
| GET    | `/api/departments/:id/transfers`      | `system:dept:transfer:list` | 分页查询部门迁移历史                               |
| PATCH  | `/api/departments/:id`                | `system:dept:update`       | 更新或移动部门；移动时迁移原因必填                  |
| DELETE | `/api/departments/:id`                | `system:dept:delete`       | 删除空部门，有下级或直属用户时拒绝                  |
| GET    | `/api/notices`                        | `system:notice:list`       | 分页查询通知公告与阅读统计                          |
| POST   | `/api/notices`                        | `system:notice:create`     | 新增公告草稿                                        |
| GET    | `/api/notices/target-options`         | 新增或更新公告权限         | 查询可选部门、角色或用户                            |
| GET    | `/api/notices/:id`                    | `system:notice:read`       | 公告详情与接收范围                                  |
| PATCH  | `/api/notices/:id`                    | `system:notice:update`     | 更新未发布或已撤回公告                              |
| POST   | `/api/notices/:id/publish`            | `system:notice:publish`    | 发布并生成收件人快照                                |
| POST   | `/api/notices/:id/withdraw`           | `system:notice:withdraw`   | 撤回已发布公告                                      |
| DELETE | `/api/notices/:id`                    | `system:notice:delete`     | 删除未发布或已撤回公告                              |
| GET    | `/api/system-configs`                 | `system:config:list`       | 分页查询系统参数                                    |
| POST   | `/api/system-configs`                 | `system:config:create`     | 新增自定义系统参数                                  |
| GET    | `/api/system-configs/:id`             | `system:config:read`       | 查询系统参数详情                                    |
| PATCH  | `/api/system-configs/:id`             | `system:config:update`     | 更新系统参数；内置参数不可改键                      |
| DELETE | `/api/system-configs/:id`             | `system:config:delete`     | 删除非内置系统参数                                  |
| GET    | `/api/dictionary-types`               | `system:dict:list`         | 分页查询字典类型                                    |
| POST   | `/api/dictionary-types`               | `system:dict:create`       | 新增字典类型                                        |
| GET    | `/api/dictionary-types/:id`           | `system:dict:read`         | 查询字典类型详情                                    |
| PATCH  | `/api/dictionary-types/:id`           | `system:dict:update`       | 更新字典类型                                        |
| DELETE | `/api/dictionary-types/:id`           | `system:dict:delete`       | 删除字典类型及所属字典项                            |
| GET    | `/api/dictionary-types/:id/items`     | `system:dict:list`         | 查询指定类型的字典项                                |
| POST   | `/api/dictionary-types/:id/items`     | `system:dict:create`       | 新增字典项                                          |
| PATCH  | `/api/dictionary-items/:id`           | `system:dict:update`       | 更新字典项、排序与状态                              |
| DELETE | `/api/dictionary-items/:id`           | `system:dict:delete`       | 删除字典项                                          |
| GET    | `/api/dictionaries/:code`             | 仅需登录                   | 按编码读取启用字典选项                              |
| GET    | `/api/messages`                       | 仅需登录                   | 分页查询我的消息                                    |
| GET    | `/api/messages/recent`                | 仅需登录                   | Header 最近五条消息                                 |
| GET    | `/api/messages/unread-count`          | 仅需登录                   | 查询未读消息数量                                    |
| GET    | `/api/messages/stream`                | 仅需登录                   | 订阅站内消息 SSE 实时事件                           |
| GET    | `/api/messages/:id`                   | 仅需登录                   | 查询属于自己的消息详情                              |
| PATCH  | `/api/messages/:id/read`              | 仅需登录                   | 标记一条消息已读                                    |
| PATCH  | `/api/messages/read-all`              | 仅需登录                   | 全部标记已读                                        |

## 尚未包含

按当前范围刻意留白的部分，后续要做时的落点：

- **日志归档到冷存储**。目前超期日志是直接物理删除。若有合规要求需要长期留存，应在 `LogCleanupService` 删除前先导出到对象存储或归档表。
- **通用数据权限适配**。部门数据范围当前已用于用户列表；后续业务模块需要在各自查询入口复用 `DataScopeService`，按资源所有者或部门字段追加条件。
- **实时在线状态**。在线用户当前按有效登录会话判断，不包含 WebSocket 心跳、最后活跃时间或 IP 地理位置；浏览器关闭但会话未过期时仍会显示在线。
- **实时消息不做历史事件重放**。SSE 重连后会主动同步当前未读数和可见消息，Redis 只传播轻量失效事件；消息正文、收件人快照和已读状态仍以 MySQL 为准。
- **构建缓存**。包数量变多、CI 变慢时可以再引入 Turborepo，现在 pnpm 原生编排够用。
