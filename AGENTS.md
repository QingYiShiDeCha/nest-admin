# nest-admin

pnpm monorepo 全栈后台管理系统：NestJS 11 + Drizzle ORM/MySQL8 + Redis 后端，Vue 3 + antdv-next 前端。

## 结构与依赖方向

- `packages/shared` — 前后端契约单一来源：线上格式类型（时间戳是 string）、权限码（PermissionCode）、枚举常量（STATUS/MENU_TYPE/DATA_SCOPE/OPERATION_STATUS）、PaginatedResult。无 ORM 依赖
- `packages/database` — Drizzle schema + migrations + seed。只可依赖 shared
- `apps/api` — NestJS。只可依赖 shared/database
- `apps/web` — Vue3 前端。只可依赖 shared（类型经 vite `resolve.conditions: ['@nest-admin/source']` 从 TS 源码解析）
- 依赖方向 `shared ← database ← api`，禁止反向或跨层

## 常用命令

```bash
pnpm dev          # build:packages 后并行启动 api(3000) 与 web(5173)
pnpm build        # 全量构建（web build 含 type-check，二者并行）
pnpm lint         # eslint --fix（api+web）+ web 的样式规则检查
pnpm typecheck    # 各包 tsc/vue-tsc --build
pnpm --filter @nest-admin/web test:unit --run   # vitest
pnpm --filter @nest-admin/api test              # jest 单测
pnpm --filter @nest-admin/api test:e2e          # 需 MySQL/Redis 运行中
pnpm db:migrate / db:seed                       # seed 幂等，可重复执行
```

改了 `packages/shared` 的类型后必须 `pnpm build:packages`，否则各包 typecheck 看到的还是旧 dist 类型（vite dev 走源码 conditions 不受影响）。

## 架构约定（改代码前必读）

- **线上契约**：前端不手写接口类型，从 `@nest-admin/shared` 引。database 行类型与契约的绑定靠 `apps/api/src/wire-contract.ts` 的 Serialized 编译期断言（深度 Date→string）。schema 改列会在这里编译失败
- **RouteMeta 增强**在 `apps/web/src/types/router.d.ts`（不在 routes.ts！vitest 项目只为 spec 编译应用代码，增强放错位置会导致同一文件在不同编译上下文类型不一致）。title 必填、permission 是 PermissionCode 字面量类型
- **权限**：后端 PermissionGuard 对超管直接放行且返回空权限码（防自锁）；前端 `hasPermission`/`checkPermission` 对超管短路，两处共用一份判定（`composables/use-permission.ts`）。按钮控制用 `v-permission`（只 mounted 判一次）或 `v-if="can()"`（响应式）；空权限码失败开放
- **颜色**：单一来源 `apps/web/src/constants/palette.ts`，经 App.vue 的 ConfigProvider 注入 design token。禁止在组件里硬编码项目色；自定义组件取主题色用 `text-primary` 等工具类（presetAntdTailwind4）
- **样式**：一律 UnoCSS 工具类，.vue 禁止 `<style>` 块——`apps/web/scripts/no-native-css.mjs` 接入在 lint 里强制，确需原生 CSS（复杂兄弟/伪元素选择器、@media）在其 ALLOWLIST 登记并写明理由。本项目沉淀的具体规则：
  - 激活/条件样式用 class 三元绑定，互斥的背景色不要与基础类共存（`bg-white` 与激活浅底同时存在时靠样式表顺序定胜负，会翻车）
  - 覆盖第三方库的内联样式要用 `!` 前缀（如 `[&_.ant-table-body]:!max-h-none`），普通类压不过内联样式
  - 常用形态：隐藏滚动条 `[scrollbar-width:none]` + `[&::-webkit-scrollbar]:hidden`；作用到 antd 内部节点的任意变体 `[&_.ant-xxx]:flex`；主题色工具类 `text-primary`/`border-primary`（随 ConfigProvider 换主题自动跟随）
- **图标**：UnoCSS presetIcons，class 形如 `i-ant-design:xxx-outlined`，数据源 `@iconify-json/ant-design`。菜单图标注册表 `apps/web/src/layouts/menu-icons.ts`（键=DB 里的字符串，值=class），它的值同时生成 uno.config 的 safelist——运行时拼的 class 必须进 safelist 否则不生成 CSS
- **单根节点**：每个 .vue SFC 模板只允许一个根元素（`vue/no-multiple-template-root` 在 lint 强制）。多块内容（如 ProTable + 弹窗）用一个语义容器包裹，且容器要接住 flex 高度链（`flex flex-col flex-1 min-h-0`），否则 ProTable 的纵向撑满会断
- **表格页**：查询区用 `ProSearch`、表格用 `ProTable`（`apps/web/src/components/`），数据能力在 `useTable`（竞态防护/翻页回拉/失败保数据）。组件对 filters 的回写走 `setFilter` 函数，不在模板里 v-model props（vue/no-mutating-props）

## 已知坑

- **antdv-next 表格**：单元格自定义必须 `:columns` 数组 + 表格级 `#bodyCell`；`<a-table-column>` 上的 `#default` 会被当成嵌套列定义在收集列时无参调用，直接 TypeError
- `a-modal`/`a-drawer` 用 `v-model:open`（不是 visible）；`a-dropdown :trigger="['click']"` 是数组
- 静态 `message.xxx()` 不吃 ConfigProvider 的主题（官方 FAQ）；做暗色模式时换 App 组件 + useMessage
- ProTable 的表体撑满依赖覆盖 antd 内联样式的 `!important` 链（见组件注释），升级 antdv-next 需回归
- tsconfig 各包**不得加 baseUrl**（会破坏根配置继承的 paths）；根 tsconfig 刻意排除 spec 文件（@types/jest 只在 apps/api）
- `@nestjs/schedule` 锁 6.x：v12 是纯 ESM，会让 api 的 e2e 全灭
- drizzle-kit migrate 曾静默失败，迁移变更后核对 `__drizzle_migrations` 表
- 测试登录接口会触发登录限流（Redis 计数），连续登录失败属预期
- `.env` 已 gitignore，绝不提交；DB 密码是本地开发的弱口令，别写进任何文件
- git 身份已配置在仓库本地：清茶 2521541557@qq.com，不要动 global
