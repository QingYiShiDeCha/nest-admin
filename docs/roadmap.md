# nest-admin 能力现状对照表

> 这份文档回答一个问题：**哪些设想已经落地，哪些还没有，哪些已经不适用。**
>
> 最后核对：2026-10-01（对照提交 `84aa65d` 及工作区在途改动）
>
> 原文档是 2026-01-09 写的能力设想，正文里的代码示例多为假设写法，与项目后来确立的约定冲突
> （例如它假设装饰器式缓存，而代码里统一是**版本票据 + 主动失效 + fail-open**）。设想细节已删除，
> 只保留条目与结论；设计约定的唯一来源是根目录 [`计划.md`](../计划.md)，本表不重复。

## 状态图例

| 标记 | 含义 |
| --- | --- |
| ✅ 已实现 | 代码里有对应实现，路径在下表的「落点」列 |
| 🟡 部分实现 | 核心有了，但与设想有实质差距（差距写在备注里） |
| ⬜ 未实现 | 代码里没有，无等价替代 |
| ⛔ 已不适用 | 当时的写法与现行约定冲突，若照做会引入倒退 |
| ❓ 未验证 | 无法从代码静态判断，需要实测 |

---

## P0 生产必备

### 1. 健康检查增强

| | |
| --- | --- |
| 设想 | `GET /health/liveness`、`/readiness`、`/metrics` 三个端点，含磁盘/内存阈值，503/degraded 语义 |
| 状态 | 🟡 部分实现 |
| 落点 | `apps/api/src/app.service.ts` 的 `GET /api/health` → `{ status, database, uptime }`；`apps/api/src/modules/system-monitor/` 另有数据库与 Redis 探测、主机/进程信息、CPU 与内存趋势（保留最近 20 次采样） |
| 差距 | 没有 liveness/readiness/metrics 分端点，没有磁盘与内存阈值，`health` 只探数据库不探 Redis。system-monitor 是**当前实例的只读快照**，需要登录态，不是 K8s 探针能用的形态 |
| 备注 | system-monitor 已有独立降级逻辑：数据库或 Redis 探测失败时分别降级显示，不阻断其他信息返回 |

### 2. 数据库备份策略

| | |
| --- | --- |
| 设想 | `scripts/backup-database.sh` + Cron + S3 上传 + 恢复流程文档 |
| 状态 | ⬜ 未实现 |
| 落点 | 无。`scripts/` 下只有 `test-e2e.mjs` |
| 差距 | 无脚本、无定时配置、无 `docs/disaster-recovery.md`。仓库里有 `docker-compose.yml` 与独立迁移/seed 镜像，可作为备份脚本的挂载参考 |

### 3. 慢查询监控

| | |
| --- | --- |
| 设想 | `PerformanceInterceptor`，超过 1 秒的请求打 warn 日志（method/url/duration/userId），阈值可配 |
| 状态 | ⛔ 已不适用 |
| 落点 | `apps/api/src/database/query-logger.ts` 的 `DrizzleQueryLoggerService`：debug 级别打印全部 SQL，截断到 300 字符，并从 CLS 取 `method`/`path` 标注来源 |
| 理由 | 「只打慢请求」的方向与现状相反，而且靠请求耗时无法判断慢在 SQL 上。现有的做法是**全量 SQL 日志 + 交给外部日志系统筛**，更适合本地与生产两种场景。请求级耗时统计目前没有专门埋点 |

### 4. 告警机制

| | |
| --- | --- |
| 设想 | `AlertService` + 邮件/钉钉渠道，规则覆盖 DB 连接失败、Redis 失联、登录失败率、磁盘、CPU |
| 状态 | ⬜ 未实现 |
| 落点 | 无。系统里没有任何主动外发通道 |
| 备注 | 代码里已有可观测性的**原料**但没有消费端：登录锁定事件（`locked` 状态独立计数）、定时任务执行日志、系统监控指标。接告警时不必从零埋点 |

---

## P1 用户价值

### 5. 数据导出功能

| | |
| --- | --- |
| 设想 | 通用 `ExportService`，5 个模块（用户/操作日志/登录日志/部门/角色）导出 Excel |
| 状态 | ⬜ 未实现 |
| 落点 | 无。没有任何导出接口，依赖里也没有 Excel 库 |
| 备注 | 若要做，先决条件是导出必须走**与列表接口相同的数据范围过滤**——本项目已有 `DataScopeService` 与各模块的 `aliveXxx(scopeCondition)` 套路可复用 |

### 6. 批量操作

| | |
| --- | --- |
| 设想 | 用户批量启停/分配角色/删除、角色批量启停删除、通知批量发布撤回、文件批量删除 |
| 状态 | ⬜ 未实现 |
| 落点 | 无 |
| 备注 | 设想里的 DTO 形态（`{ ids, status }`）与现行约定一致，可直接采用；事务与审计要求也已在 `operation-log.interceptor` 中有对应机制 |

### 7. 通知偏好设置

| | |
| --- | --- |
| 设想 | `sys_user_notification_settings` 表，用户配置渠道开关、通知类型、推送频率（实时/小时/每日汇总） |
| 状态 | ⬜ 未实现 |
| 落点 | 无。站内消息链路完整（公告 → 收件人快照 → `sys_notice_recipient` → SSE 推送 → 未读计数），但没有「用户可选不收」的维度 |
| 备注 | 现有实现是**全员可达**：公告按全员/部门/角色/指定用户四种范围展开收件人快照。加入偏好属于发布链路的过滤条件，改动点集中在发布时展开收件人那一步 |

### 8. 敏感操作二次验证

| | |
| --- | --- |
| 设想 | `RequirePasswordConfirmation()` 装饰器 + `PasswordConfirmationGuard`，用于删用户、改超管角色、清空日志、改关键配置 |
| 状态 | ⬜ 未实现 |
| 落点 | 无 |
| 备注 | 现有防线是**权限码 + 数据范围 + 审计**，不是身份复核。相关能力已有可复用件：`users.password_hash` 校验、`permission.guard.spec.ts` 的超管短路约定 |

---

## P2 性能优化

### 9. 数据库索引优化

| | |
| --- | --- |
| 设想 | 8 个复合索引（user dept+status、user_role 双向、operation_log user+time、module+time、login_log username+status、notice_recipient user+read、refresh_token user+valid） |
| 状态 | ✅ 已实现（路线不同，结果覆盖） |
| 落点 | 迁移里共 **47 个索引**，含 6 个复合索引：`idx_sys_notice_recipient_user_read (user_id, read_at)`、`idx_sys_notice_status_published (status, published_at)`、`idx_sys_notice_target_lookup (target_type, target_id)`、`idx_sys_dict_item_type_status_sort (type_id, status, sort)`、`idx_sys_dept_transfer_dept_created (dept_id, created_at)`、`idx_sys_scheduled_task_log_task_started (task_id, started_at)` |
| 差距 | 与设想列的具体索引不完全同名——设想是按查询 imagined 出来的，实际是跟着功能迭代逐步加的。`EXPLAIN` 验证与「查询时间减少 50%」这类量化结论从未测过 |

### 10. 热点数据缓存

| | |
| --- | --- |
| 设想 | `@Cacheable` 装饰器（`JSON.stringify(args)` 当 key），用户详情 5 分钟、部门树 30 分钟 |
| 状态 | ⛔ 已不适用（实现路线部分不同、结果已有） |
| 落点 | 两个专用缓存服务，都是**版本票据 + 主动失效 + Redis 故障回源**：<br>· `apps/api/src/modules/dictionary/dictionary-cache.service.ts`：缓存键携带字典编码版本，类型或字典项写入后递增版本<br>· `apps/api/src/modules/rbac/rbac-cache.service.ts`：缓存用户角色权限与数据范围，TTL 300 秒，变更时递增用户版本，组织树变更递增全局版本 |
| 理由 | 装饰器方案的 key 由参数拼出来，无法在数据变更时精确失效；本项目所有缓存失效都由写路径显式触发，与「权限必须立刻生效」这条安全要求一致。用户详情与部门树**没有**缓存 |
| 备注 | Redis 未配置或故障时全部回退数据库，超管在 `PermissionGuard` 与前端 `hasPermission` 两处直接短路，不吃缓存 |

### 11. N+1 查询优化

| | |
| --- | --- |
| 设想 | 消除循环内查询，列表查询不超过 3 条 SQL |
| 状态 | ❓ 未验证 |
| 落点 | 无批量预加载工具，也没有慢查询日志可用来发现（见 P0-3） |
| 备注 | 已有几处证明在意的实现，如首页统计「一次读取后派生终端、浏览器、月趋势和热力图」、公告列表用 `withMetrics` 批量聚合收件人数而非逐条查。但整体没有 `EXPLAIN` 记录，也没有为此设过验收 |

---

## P3 功能扩展

### 12. 多租户支持

| | |
| --- | --- |
| 状态 | ⬜ 未实现 |
| 落点 | 无 `tenant_id` 列、无租户表、无租户中间件 |
| 备注 | 若要做，「所有业务表加 `tenant_id`」的方案会与现有的 `deleted_at` 软删 + 数据范围（部门树）两层过滤叠加，需要重新设计隔离层级 |

### 13. 国际化（i18n）

| | |
| --- | --- |
| 状态 | ⬜ 未实现 |
| 落点 | 界面与后端错误消息均为硬编码中文。已有的 i18n 只有两处局部用途：编辑器的 `locale` prop（组件自带）、dayjs  locale（`apps/web/src/utils/dayjs-locale.ts`） |
| 备注 | 「日期时间格式本地化」这一条实际上已经做了（时间戳按墙上时间渲染，见 `计划.md`） |

### 14. 审计日志增强

| | |
| --- | --- |
| 设想 | `sys_operation_log_snapshot` 表记录 before/after，可视化 diff，支持回滚 |
| 状态 | 🟡 部分实现 |
| 落点 | `apps/api/src/modules/operation-log/operation-log.interceptor.ts` 已把请求体快照写进日志（`snapshot` 字段），并有 `redact.ts` 脱敏（深度优先遍历，已修正超过 6 层会整体跳过的问题）；日志 path 已去掉 query，避免 `access_token` 明文入库 |
| 差距 | 只有**请求侧**快照，没有读取变更前状态形成的**前后对比**，也就没有 diff 与回滚。这是有意的：before 快照要求每个写接口额外查一次并承担竞态 |
| 备注 | 超期日志按 1000 条批次压缩为 `json.gz` 归档到独立文件存储，上传成功后才删主表行 |

### 15. 工作流引擎

| | |
| --- | --- |
| 状态 | ⬜ 未实现 |
| 落点 | 无定义表、无实例表、无引擎 |
| 备注 | 与部门迁移审批、请假报销等场景相关，当前审批只存在于公告的「发布/撤回」状态机里（单条公告 4 态，已实现） |

---

## 已明确不做的（保留原判断）

这些结论至今成立，无需复核：

- ❌ **微服务拆分**——单体架构够用，过早拆分只增加复杂度
- ❌ **GraphQL**——REST 已完善，切换成本大于收益
- ❌ **WebSocket**——SSE 已满足站内消息需求，WebSocket 的部署与代理配置成本更高

---

## 剩余待办

按「离上线更近」排序，不含功能设想：

1. 健康检查补 liveness / readiness 与磁盘、内存阈值（K8s 与 APM 前置）
2. 数据库备份脚本与恢复流程文档（唯一没有任何自动化兜底的数据安全项）
3. 请求级耗时埋点或慢查询筛选（当前只能靠 debug 级全量 SQL 日志）
4. 敏感操作二次验证（补上身份复核这一层，与已有的权限码/数据范围/审计不冲突）
5. 告警通道（原料已在：登录锁定事件、任务执行日志、监控指标）