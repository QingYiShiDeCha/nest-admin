# nest-admin

基于 NestJS 和 Vue 3 的全栈后台管理系统，使用 pnpm monorepo 组织。

项目内置用户、角色、菜单、部门、权限、日志、通知、文件管理等常用后台功能，可作为管理系统的基础项目使用。

## 技术栈

- 后端：NestJS 11、Drizzle ORM、MySQL 8、Redis
- 前端：Vue 3、Vite、Pinia、antdv-next、UnoCSS
- 工具：TypeScript、pnpm、Jest、Vitest

## 项目结构

```text
apps/
├─ api/       # NestJS 后端
└─ web/       # Vue 管理端

packages/
├─ shared/    # 前后端共享类型和常量
└─ database/  # 数据库 Schema、迁移和初始化数据
```

## 快速开始

环境要求：Node.js 22+、pnpm 11+、MySQL 8，以及可选的 Redis。

```bash
pnpm install
cp .env.example .env
```

根据本地环境修改 `.env`，然后执行数据库迁移和初始化：

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

启动后访问：

- 管理端：http://localhost:5273
- API：http://localhost:3100/api
- Swagger：http://localhost:3100/api/docs

默认管理员账号为 `admin`，密码为 `admin123`，首次登录后请及时修改密码。

## 常用命令

```bash
pnpm dev         # 启动前后端开发环境
pnpm build       # 构建全部项目
pnpm typecheck   # 类型检查
pnpm lint        # 代码检查
pnpm test        # 运行单元测试
pnpm test:e2e    # 运行端到端测试
pnpm db:migrate  # 执行数据库迁移
pnpm db:seed     # 初始化基础数据
```

## Docker

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker run --rm db-seed
```

## 文档

- [计划.md](计划.md)：设计决策与实施进度，架构约定改代码前必读
- [docs/roadmap.md](docs/roadmap.md)：能力现状对照表，哪些设想已落地
- [AGENTS.md](AGENTS.md)：monorepo 依赖方向、样式与组件约定
- Swagger：`http://localhost:3100/api/docs`
