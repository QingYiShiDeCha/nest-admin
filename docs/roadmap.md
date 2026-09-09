# nest-admin 系统完善计划

> 基于当前系统状态的功能迭代与优化规划  
> 最后更新：2026-01-09

## 📊 当前系统状态

### 已完成核心功能
- ✅ 完整的 RBAC 权限体系
- ✅ 双 token 认证与会话管理
- ✅ 实时消息推送（SSE + 历史重放）
- ✅ 数据权限控制（部门范围）
- ✅ 审计日志（操作日志、登录日志）
- ✅ 定时任务与系统监控
- ✅ 文件资源管理
- ✅ OAuth 统一管理
- ✅ 同设备单点登录
- ✅ 完整的前端基础设施

### 技术栈优势
- 现代化：NestJS 11 + Vue 3.5 + Drizzle ORM
- 类型安全：TypeScript 全覆盖
- 可维护：Monorepo + 模块化
- 可扩展：Redis 缓存 + 多实例支持

---

## 🎯 优先级分级

### P0 - 生产必备（1-2 周）
关键的安全、稳定性和运维能力，必须在上线前完成

### P1 - 用户价值（1 个月）
显著提升用户体验和系统易用性

### P2 - 性能优化（按需）
提升系统性能和响应速度

### P3 - 功能扩展（长期）
增强业务能力，支持更复杂场景

---

## 🚀 P0 - 生产必备

### 1. 健康检查增强

**当前状态**：`GET /api/health` 仅返回基础状态

**目标**：符合 Kubernetes 和 APM 标准的健康检查

**实现内容**：

```typescript
// 新增接口
GET /api/health/liveness   // K8s 存活探针
GET /api/health/readiness  // K8s 就绪探针
GET /api/health/metrics    // Prometheus 指标格式

// 返回示例
{
  status: 'ok' | 'degraded' | 'down',
  uptime: 86400,
  timestamp: '2026-01-09T12:00:00.000Z',
  checks: {
    database: { status: 'ok', latency: 5 },
    redis: { status: 'ok', latency: 2 },
    disk: { usage: 45, threshold: 80, status: 'ok' },
    memory: { usage: 1024, limit: 2048, status: 'ok' }
  }
}
```

**验收标准**：
- [ ] 三个健康检查端点可用
- [ ] 数据库断开时 readiness 返回 503
- [ ] 磁盘/内存超阈值时返回 degraded
- [ ] Prometheus 格式可被 Grafana 采集

**预计工时**：4 小时

---

### 2. 数据库备份策略

**当前状态**：无自动备份

**目标**：自动化备份 + 灾难恢复流程

**实现内容**：

```bash
# scripts/backup-database.sh
#!/bin/bash
# 每日全量备份 + 上传 S3

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="nest-admin-backup-$DATE.sql.gz"

# 备份数据库
mysqldump --single-transaction \
  --routines --triggers \
  -h $DB_HOST -u $DB_USER -p$DB_PASSWORD \
  nest_admin | gzip > $BACKUP_FILE

# 上传到 S3
aws s3 cp $BACKUP_FILE s3://$BACKUP_BUCKET/database/

# 保留最近 7 天的备份
find . -name "nest-admin-backup-*.sql.gz" -mtime +7 -delete

# 验证备份完整性
gunzip -t $BACKUP_FILE && echo "备份验证成功" || echo "备份验证失败"
```

**配置 Cron**：
```bash
# 每天凌晨 2 点执行
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

**恢复流程文档**：
```markdown
# docs/disaster-recovery.md

## 数据库恢复步骤
1. 从 S3 下载最新备份
2. 解压并验证 SQL 文件
3. 停止应用服务
4. 恢复数据库：`mysql < backup.sql`
5. 验证数据完整性
6. 重启应用服务

## RTO/RPO 目标
- RTO（恢复时间目标）：2 小时
- RPO（数据丢失目标）：24 小时
```

**验收标准**：
- [ ] 备份脚本可执行并上传到 S3
- [ ] Cron 定时任务配置完成
- [ ] 恢复流程文档编写完成
- [ ] 至少演练一次恢复流程

**预计工时**：6 小时

---

### 3. 慢查询监控

**当前状态**：无性能监控

**目标**：自动识别和记录慢请求

**实现内容**：

```typescript
// apps/api/src/common/interceptors/performance.interceptor.ts

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly SLOW_THRESHOLD_MS = 1000; // 1 秒

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > this.SLOW_THRESHOLD_MS) {
          this.logger.warn(`慢请求: ${method} ${url} - ${duration}ms`, {
            method,
            url,
            duration,
            userId: request.user?.id,
          });
        }
      }),
    );
  }
}

// 在 app.module.ts 注册
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: PerformanceInterceptor,
  },
]
```

**验收标准**：
- [ ] 超过 1 秒的请求被记录
- [ ] 日志包含 method、url、duration、userId
- [ ] 可通过环境变量配置阈值

**预计工时**：2 小时

---

### 4. 告警机制

**当前状态**：无主动告警

**目标**：关键异常自动通知运维人员

**实现内容**：

```typescript
// apps/api/src/common/alert/alert.service.ts

export interface AlertChannel {
  sendAlert(message: string, level: 'info' | 'warn' | 'error'): Promise<void>;
}

@Injectable()
export class EmailAlertChannel implements AlertChannel {
  async sendAlert(message: string, level: string): Promise<void> {
    // 发送邮件告警
  }
}

@Injectable()
export class DingTalkAlertChannel implements AlertChannel {
  async sendAlert(message: string, level: string): Promise<void> {
    // 发送钉钉机器人消息
  }
}

@Injectable()
export class AlertService {
  constructor(
    @Inject('ALERT_CHANNELS') private channels: AlertChannel[],
  ) {}

  async alert(message: string, level: 'info' | 'warn' | 'error'): Promise<void> {
    await Promise.all(
      this.channels.map((channel) => channel.sendAlert(message, level)),
    );
  }
}
```

**告警规则**：
- 数据库连接失败连续 3 次
- Redis 连接失败超过 5 分钟
- 登录失败率超过 50%（可能被攻击）
- 磁盘使用率超过 80%
- CPU 持续高于 90% 超过 5 分钟

**验收标准**：
- [ ] 支持邮件和钉钉两种告警渠道
- [ ] 关键异常触发告警
- [ ] 告警频率限制（避免刷屏）

**预计工时**：8 小时

---

## ⭐ P1 - 用户价值

### 5. 数据导出功能

**目标**：支持列表数据导出为 Excel/CSV

**实现内容**：

```typescript
// 通用导出服务
@Injectable()
export class ExportService {
  exportToExcel(data: any[], columns: ExportColumn[], filename: string): Buffer {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    worksheet.columns = columns.map(col => ({
      header: col.label,
      key: col.key,
      width: col.width || 15,
    }));
    
    worksheet.addRows(data);
    return workbook.xlsx.writeBuffer();
  }
}

// 用户列表导出
@Get('users/export')
@Permissions(PERMISSIONS.USER_EXPORT)
async exportUsers(@Query() query: QueryUserDto, @Res() res: Response) {
  const users = await this.service.findAll(query);
  const buffer = this.exportService.exportToExcel(users, USER_COLUMNS, 'users.xlsx');
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
  res.send(buffer);
}
```

**支持导出的模块**：
- [ ] 用户列表
- [ ] 操作日志
- [ ] 登录日志
- [ ] 部门列表
- [ ] 角色列表

**验收标准**：
- [ ] 导出功能符合数据权限控制
- [ ] 大数据量分批导出（避免超时）
- [ ] 导出记录写入操作日志

**预计工时**：12 小时

---

### 6. 批量操作

**目标**：提升管理效率

**实现内容**：

```typescript
// 批量启用/禁用用户
@Post('users/bulk-update-status')
@Permissions(PERMISSIONS.USER_UPDATE)
async bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto) {
  // dto: { ids: [1,2,3], status: 'active' | 'inactive' }
  return this.service.bulkUpdateStatus(dto.ids, dto.status);
}

// 批量分配角色
@Post('users/bulk-assign-roles')
@Permissions(PERMISSIONS.USER_ASSIGN_ROLE)
async bulkAssignRoles(@Body() dto: BulkAssignRolesDto) {
  // dto: { userIds: [1,2,3], roleIds: [4,5] }
  return this.service.bulkAssignRoles(dto.userIds, dto.roleIds);
}

// 批量删除
@Post('users/bulk-delete')
@Permissions(PERMISSIONS.USER_DELETE)
async bulkDelete(@Body() dto: BulkDeleteDto) {
  // dto: { ids: [1,2,3] }
  return this.service.bulkDelete(dto.ids);
}
```

**支持批量操作的场景**：
- [ ] 用户：启用/禁用、分配角色、删除
- [ ] 角色：启用/禁用、删除
- [ ] 通知：批量发布、批量撤回
- [ ] 文件：批量删除

**验收标准**：
- [ ] 批量操作在事务中执行
- [ ] 部分失败时返回明确的错误信息
- [ ] 批量操作记录到审计日志

**预计工时**：10 小时

---

### 7. 通知偏好设置

**目标**：让用户自定义通知接收方式

**实现内容**：

```typescript
// 数据库 schema
export const userNotificationSettings = mysqlTable('sys_user_notification_settings', {
  userId: int('user_id').primaryKey(),
  emailEnabled: boolean('email_enabled').default(true),
  emailTypes: json('email_types').$type<string[]>().default([]),
  inAppEnabled: boolean('in_app_enabled').default(true),
  inAppTypes: json('in_app_types').$type<string[]>().default([]),
  frequency: mysqlEnum('frequency', ['realtime', 'hourly', 'daily']).default('realtime'),
});

// API
@Get('users/me/notification-settings')
async getMyNotificationSettings(@CurrentUser('id') userId: number) {
  return this.service.getNotificationSettings(userId);
}

@Patch('users/me/notification-settings')
async updateMyNotificationSettings(
  @CurrentUser('id') userId: number,
  @Body() dto: UpdateNotificationSettingsDto,
) {
  return this.service.updateNotificationSettings(userId, dto);
}
```

**可配置项**：
- 通知类型：系统公告、任务分配、账号安全
- 通知渠道：站内消息、邮件
- 推送频率：实时、每小时汇总、每日汇总

**验收标准**：
- [ ] 用户可在个人中心配置偏好
- [ ] 发送通知时遵循用户偏好
- [ ] 汇总通知按频率合并发送

**预计工时**：16 小时

---

### 8. 敏感操作二次验证

**目标**：关键操作要求输入密码或验证码

**实现内容**：

```typescript
// 装饰器
export function RequirePasswordConfirmation() {
  return applyDecorators(
    UseGuards(PasswordConfirmationGuard),
    ApiBody({ schema: { properties: { password: { type: 'string' } } } }),
  );
}

// 守卫
@Injectable()
export class PasswordConfirmationGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { password } = request.body;
    const user = request.user;
    
    if (!password) {
      throw new BadRequestException('需要输入当前密码确认操作');
    }
    
    const valid = await this.userService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('密码错误');
    }
    
    return true;
  }
}

// 使用
@Delete('users/:id')
@RequirePasswordConfirmation()
async deleteUser(
  @Param('id') id: number,
  @Body('password') password: string,
) {
  return this.service.delete(id);
}
```

**需要二次验证的操作**：
- [ ] 删除用户
- [ ] 修改超级管理员角色
- [ ] 清空操作日志
- [ ] 修改系统关键配置

**验收标准**：
- [ ] 前端弹窗要求输入密码
- [ ] 密码错误时清晰提示
- [ ] 二次验证记录到审计日志

**预计工时**：6 小时

---

## 🚀 P2 - 性能优化

### 9. 数据库索引优化

**目标**：提升查询性能

**实现内容**：

```sql
-- migration: add-performance-indexes.sql

-- 用户按部门和状态查询
CREATE INDEX idx_user_dept_status 
ON sys_user(dept_id, status, deleted_at);

-- 用户按角色查询（通过关联表）
CREATE INDEX idx_user_role_user 
ON sys_user_role(user_id);

CREATE INDEX idx_user_role_role 
ON sys_user_role(role_id);

-- 操作日志按用户和时间查询
CREATE INDEX idx_operation_log_user_time 
ON sys_operation_log(user_id, created_at DESC);

-- 操作日志按模块查询
CREATE INDEX idx_operation_log_module 
ON sys_operation_log(module, created_at DESC);

-- 登录日志按用户名和结果查询
CREATE INDEX idx_login_log_username_status 
ON sys_login_log(username, status, created_at DESC);

-- 消息按用户和已读状态查询
CREATE INDEX idx_notice_recipient_user_read 
ON sys_notice_recipient(user_id, read_at, created_at DESC);

-- 会话按用户和有效性查询
CREATE INDEX idx_refresh_token_user_valid 
ON sys_refresh_token(user_id, revoked_at, expires_at);
```

**验收标准**：
- [ ] 慢查询日志显示查询时间减少 50%+
- [ ] EXPLAIN 分析显示使用索引
- [ ] 索引大小控制在合理范围

**预计工时**：4 小时

---

### 10. 热点数据缓存

**目标**：减少数据库查询压力

**实现内容**：

```typescript
// 缓存装饰器
export function Cacheable(key: string, ttl: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      const cached = await this.redis?.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      const result = await originalMethod.apply(this, args);
      
      if (this.redis && result) {
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);
      }
      
      return result;
    };
  };
}

// 使用
@Cacheable('user:detail', 300) // 5 分钟
async getUserDetail(id: number) {
  return this.db.select().from(users).where(eq(users.id, id));
}

@Cacheable('dept:tree', 1800) // 30 分钟
async getDepartmentTree() {
  return this.buildTree(await this.db.select().from(departments));
}
```

**缓存策略**：
- 用户详情：5 分钟（频繁访问）
- 部门树：30 分钟（很少变化）
- 字典数据：已实现（版本票据）
- 权限数据：已实现（版本票据）

**验收标准**：
- [ ] 缓存命中率 > 80%
- [ ] 数据更新时主动失效缓存
- [ ] Redis 故障时降级到数据库

**预计工时**：8 小时

---

### 11. N+1 查询优化

**目标**：消除循环查询问题

**实现内容**：

```typescript
// 优化前：N+1 查询
async findUsers() {
  const users = await this.db.select().from(users);
  
  for (const user of users) {
    // 每个用户触发一次查询
    user.dept = await this.db.select().from(departments)
      .where(eq(departments.id, user.deptId));
  }
  
  return users;
}

// 优化后：JOIN 查询
async findUsers() {
  return this.db
    .select({
      ...users,
      dept: departments,
    })
    .from(users)
    .leftJoin(departments, eq(users.deptId, departments.id));
}

// 优化前：批量查询用户的角色
async findUsersWithRoles(userIds: number[]) {
  const users = await this.db.select().from(users)
    .where(sql`${users.id} IN (${userIds})`);
  
  for (const user of users) {
    user.roles = await this.db.select().from(roles)
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, user.id));
  }
  
  return users;
}

// 优化后：一次性查询所有关联
async findUsersWithRoles(userIds: number[]) {
  const usersData = await this.db.select().from(users)
    .where(sql`${users.id} IN (${userIds})`);
  
  const rolesData = await this.db
    .select({
      userId: userRoles.userId,
      role: roles,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(sql`${userRoles.userId} IN (${userIds})`);
  
  // 在内存中组装
  const rolesByUser = groupBy(rolesData, 'userId');
  return usersData.map(user => ({
    ...user,
    roles: rolesByUser[user.id] || [],
  }));
}
```

**验收标准**：
- [ ] 列表查询不超过 3 个 SQL 语句
- [ ] 慢查询日志无 N+1 问题

**预计工时**：6 小时

---

## 🌟 P3 - 功能扩展

### 12. 多租户支持（可选）

**目标**：支持 SaaS 模式多组织隔离

**实现内容**：

```typescript
// 租户表
export const tenants = mysqlTable('sys_tenant', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 50 }).unique(),
  name: varchar('name', { length: 100 }),
  domain: varchar('domain', { length: 100 }),
  status: mysqlEnum('status', ['active', 'suspended']),
  plan: mysqlEnum('plan', ['free', 'basic', 'pro']),
  maxUsers: int('max_users').default(10),
  expiresAt: timestamp('expires_at'),
});

// 所有业务表增加 tenant_id
export const users = mysqlTable('sys_user', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull(), // 新增
  username: varchar('username', { length: 50 }),
  // ...
});

// 租户上下文中间件
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const subdomain = req.hostname.split('.')[0];
    req.tenantId = this.getTenantIdBySubdomain(subdomain);
    next();
  }
}

// 自动过滤租户数据
function withTenant(tenantId: number) {
  return (query: Query) => query.where(eq(users.tenantId, tenantId));
}
```

**数据隔离方式**：
- 方案 1：共享数据库，所有表增加 tenant_id
- 方案 2：每个租户独立数据库（更强隔离）

**验收标准**：
- [ ] 租户数据完全隔离
- [ ] 支持自定义域名
- [ ] 租户管理后台

**预计工时**：40 小时

---

### 13. 国际化（i18n）

**目标**：支持多语言

**实现内容**：

```typescript
// 后端 - 错误消息国际化
// apps/api/src/i18n/zh-CN.json
{
  "auth.login.failed": "用户名或密码错误",
  "user.not.found": "用户不存在"
}

// apps/api/src/i18n/en-US.json
{
  "auth.login.failed": "Invalid username or password",
  "user.not.found": "User not found"
}

// 前端 - 界面国际化
// apps/web/src/locales/zh-CN.ts
export default {
  auth: {
    login: '登录',
    logout: '退出',
  },
  user: {
    name: '用户名',
    email: '邮箱',
  },
};

// apps/web/src/locales/en-US.ts
export default {
  auth: {
    login: 'Login',
    logout: 'Logout',
  },
  user: {
    name: 'Username',
    email: 'Email',
  },
};
```

**支持语言**：
- 中文简体（默认）
- 英文
- 其他语言按需添加

**验收标准**：
- [ ] 前端界面支持切换语言
- [ ] 后端错误消息国际化
- [ ] 日期时间格式本地化

**预计工时**：24 小时

---

### 14. 审计日志增强

**目标**：记录操作前后对比

**实现内容**：

```typescript
// 审计日志快照
export const operationLogSnapshots = mysqlTable('sys_operation_log_snapshot', {
  id: int('id').primaryKey().autoincrement(),
  logId: int('log_id').references(() => operationLogs.id),
  type: mysqlEnum('type', ['before', 'after']),
  snapshot: json('snapshot'),
});

// 装饰器
export function AuditSnapshot(entity: string) {
  return applyDecorators(
    UseInterceptors(SnapshotInterceptor),
    SetMetadata('audit:entity', entity),
  );
}

// 使用
@Patch('roles/:id')
@AuditSnapshot('role')
async updateRole(@Param('id') id: number, @Body() dto: UpdateRoleDto) {
  // 拦截器会自动记录 before/after 快照
  return this.service.update(id, dto);
}

// 查看审计日志时对比差异
{
  action: '修改角色权限',
  before: {
    name: '普通用户',
    permissions: ['user:read']
  },
  after: {
    name: '普通用户',
    permissions: ['user:read', 'user:delete'] // 新增了删除权限
  },
  diff: {
    permissions: { added: ['user:delete'], removed: [] }
  }
}
```

**验收标准**：
- [ ] 关键操作记录前后快照
- [ ] 提供可视化对比界面
- [ ] 支持撤销操作（回滚到 before）

**预计工时**：20 小时

---

### 15. 工作流引擎（进阶）

**目标**：支持审批流程

**实现内容**：

```typescript
// 工作流定义
export interface WorkflowDefinition {
  id: number;
  name: string; // 请假审批、报销审批
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: number;
  name: string; // 发起、直属领导审批、部门经理审批
  type: 'start' | 'approval' | 'end';
  assigneeType: 'user' | 'role' | 'dept_manager';
  assigneeId?: number;
  nextSteps: number[]; // 下一步骤（支持并行和条件分支）
}

// 工作流实例
export interface WorkflowInstance {
  id: number;
  definitionId: number;
  initiatorId: number;
  currentStepId: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  data: Record<string, any>; // 业务数据
}

// API
@Post('workflows/:definitionId/start')
async startWorkflow(
  @Param('definitionId') definitionId: number,
  @CurrentUser('id') userId: number,
  @Body() data: Record<string, any>,
) {
  return this.workflowService.start(definitionId, userId, data);
}

@Post('workflows/:instanceId/approve')
async approveStep(
  @Param('instanceId') instanceId: number,
  @CurrentUser('id') userId: number,
  @Body() dto: { comment: string },
) {
  return this.workflowService.approve(instanceId, userId, dto.comment);
}
```

**应用场景**：
- 请假审批
- 报销审批
- 采购审批
- 合同审批

**验收标准**：
- [ ] 支持串行和并行审批
- [ ] 支持条件分支（金额 > 1000 需要总监审批）
- [ ] 审批超时提醒
- [ ] 审批历史追踪

**预计工时**：60 小时

---

## 📅 迭代计划

### Sprint 1（第 1-2 周）- P0 生产必备

**目标**：完成核心运维能力

- [ ] Week 1：健康检查增强 + 慢查询监控
- [ ] Week 2：数据库备份策略 + 告警机制

**交付物**：
- 三个健康检查端点
- 慢查询日志拦截器
- 自动备份脚本 + Cron 配置
- 邮件/钉钉告警集成

---

### Sprint 2（第 3-4 周）- P1 用户价值

**目标**：提升用户体验

- [ ] Week 3：数据导出功能
- [ ] Week 4：批量操作 + 敏感操作二次验证

**交付物**：
- 5 个模块的导出功能
- 4 类批量操作接口
- 二次验证装饰器

---

### Sprint 3（第 5-6 周）- P1 用户价值

**目标**：完善通知系统

- [ ] Week 5-6：通知偏好设置

**交付物**：
- 用户偏好配置界面
- 汇总通知发送机制

---

### Sprint 4（第 7-8 周）- P2 性能优化

**目标**：提升系统性能

- [ ] Week 7：数据库索引优化
- [ ] Week 8：热点数据缓存 + N+1 查询优化

**交付物**：
- 8 个核心索引
- 通用缓存装饰器
- 主要查询优化

---

### Sprint 5+（长期）- P3 功能扩展

**按业务需求排期**：
- 多租户支持（如有 SaaS 需求）
- 国际化（如有国际市场需求）
- 审计日志增强（如有合规需求）
- 工作流引擎（如有审批需求）

---

## 📊 投入评估

### 时间成本

| 优先级 | 总工时 | 开发周期 |
|--------|--------|----------|
| P0 | 20 小时 | 1-2 周 |
| P1 | 44 小时 | 3-6 周 |
| P2 | 18 小时 | 7-8 周 |
| P3 | 144 小时 | 按需 |
| **合计** | **226 小时** | **2 个月** |

### 人力需求

- 全栈开发 1 人（P0 + P1 + P2）
- 前端开发 1 人（P1 界面优化）
- 运维工程师 0.5 人（P0 备份和告警）

---

## 🎯 成功指标

### P0 完成后
- [ ] 系统可监控（健康检查、慢查询、告警）
- [ ] 数据可恢复（备份 + 恢复文档）
- [ ] 符合生产标准

### P1 完成后
- [ ] 用户操作效率提升 30%（导出、批量操作）
- [ ] 系统安全性提升（二次验证）
- [ ] 用户满意度提升（通知偏好）

### P2 完成后
- [ ] 平均响应时间 < 200ms
- [ ] 数据库查询时间减少 50%
- [ ] 缓存命中率 > 80%

---

## 📝 注意事项

### 不建议盲目添加

❌ **微服务拆分**
- 当前单体架构够用
- 过早拆分增加复杂度
- 建议等到单实例性能瓶颈再考虑

❌ **GraphQL**
- REST API 已很完善
- GraphQL 学习成本高
- 当前场景无明显优势

❌ **WebSocket**
- SSE 已满足需求
- WebSocket 维护成本高
- 部署和代理配置复杂

### 保持原则

✅ **简洁优先**：功能够用即可，不过度设计  
✅ **渐进增强**：按优先级逐步完善  
✅ **稳定第一**：不引入不成熟的技术  
✅ **文档同步**：代码和文档同步更新

---

## 📚 参考资源

- [NestJS 最佳实践](https://docs.nestjs.com/techniques/performance)
- [Vue 3 性能优化](https://vuejs.org/guide/best-practices/performance.html)
- [Drizzle ORM 性能指南](https://orm.drizzle.team/docs/performance)
- [MySQL 索引优化](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- [Redis 缓存策略](https://redis.io/docs/manual/patterns/)

---

**最后更新时间**：2026-01-09  
**维护人**：开发团队  
**版本**：v1.0
