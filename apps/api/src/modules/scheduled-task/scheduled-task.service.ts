import {
  scheduledTaskLogs,
  scheduledTasks,
  type ScheduledTaskLogRow,
  type ScheduledTaskRow,
} from '@nest-admin/database';
import {
  DEFAULT_SCHEDULED_TASK_TIMEZONE,
  type PaginatedResult,
  type ScheduledTaskExecutionStatus,
  type ScheduledTaskTriggerType,
} from '@nest-admin/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  and,
  count,
  desc,
  eq,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { CronJob, CronTime } from 'cron';

import { RequestContext } from '../../common/context/request-context.service';
import type { Env } from '../../config/env.validation';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { RedisLockService } from '../../redis/redis-lock.service';
import type { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import type {
  QueryScheduledTaskDto,
  QueryScheduledTaskLogDto,
} from './dto/query-scheduled-task.dto';
import type { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';
import { ScheduledTaskRegistry } from './scheduled-task.registry';

const JOB_NAME_PREFIX = 'managed-task:';
const RECONCILE_INTERVAL_NAME = 'managed-task:reconcile';
const RECONCILE_INTERVAL_MS = 15_000;
const TASK_LOCK_TTL_MS = 60 * 60 * 1000;
const BUILT_IN_LOG_CLEANUP_CODE = 'system.log.cleanup.default';

export type ScheduledTaskRecord = ScheduledTaskRow & {
  nextRunAt: Date | null;
};

function aliveTask(...conditions: (SQL | undefined)[]): SQL {
  return and(isNull(scheduledTasks.deletedAt), ...conditions)!;
}

export function validateSchedule(
  cronExpression: string,
  timezone: string,
): void {
  try {
    new CronTime(cronExpression, timezone);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(`Cron 表达式或时区无效：${message}`);
  }
}

export function serializeTaskResult(result: unknown): string | null {
  if (result === undefined) return null;

  let text: string;
  try {
    text = JSON.stringify(result) ?? '[unserializable result]';
  } catch {
    text = '[unserializable result]';
  }

  return text.length > 10_000 ? `${text.slice(0, 10_000)}...` : text;
}

@Injectable()
export class ScheduledTaskService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ScheduledTaskService.name);
  private readonly scheduleSignatures = new Map<string, string>();
  private reconcilePromise: Promise<void> | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService<Env, true>,
    private readonly scheduler: SchedulerRegistry,
    private readonly lock: RedisLockService,
    private readonly registry: ScheduledTaskRegistry,
    private readonly ctx: RequestContext,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureBuiltInTask();
    await this.reconcileSchedules();

    const interval = setInterval(() => {
      void this.reconcileSchedules().catch((error: unknown) =>
        this.logger.error(
          `定时任务对账失败：${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }, RECONCILE_INTERVAL_MS);
    interval.unref();
    this.scheduler.addInterval(RECONCILE_INTERVAL_NAME, interval);
  }

  onModuleDestroy(): void {
    if (this.scheduler.doesExist('interval', RECONCILE_INTERVAL_NAME)) {
      this.scheduler.deleteInterval(RECONCILE_INTERVAL_NAME);
    }

    for (const name of this.scheduleSignatures.keys()) {
      this.unschedule(name);
    }
  }

  definitions() {
    return this.registry.list();
  }

  async findPage(
    query: QueryScheduledTaskDto,
  ): Promise<PaginatedResult<ScheduledTaskRecord>> {
    const where = aliveTask(
      query.keyword
        ? or(
            like(scheduledTasks.name, `%${query.keyword}%`),
            like(scheduledTasks.taskKey, `%${query.keyword}%`),
          )
        : undefined,
      query.status ? eq(scheduledTasks.status, query.status) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(scheduledTasks)
        .where(where)
        .orderBy(desc(scheduledTasks.builtIn), desc(scheduledTasks.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(scheduledTasks).where(where),
    ]);

    return {
      list: rows.map((task) => this.toRecord(task)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findDetail(id: number): Promise<ScheduledTaskRecord> {
    return this.toRecord(await this.findTaskOrFail(id));
  }

  async findLogs(
    id: number,
    query: QueryScheduledTaskLogDto,
  ): Promise<PaginatedResult<ScheduledTaskLogRow>> {
    await this.findTaskOrFail(id);
    const where = and(
      eq(scheduledTaskLogs.taskId, id),
      query.status ? eq(scheduledTaskLogs.status, query.status) : undefined,
      query.triggerType
        ? eq(scheduledTaskLogs.triggerType, query.triggerType)
        : undefined,
    );

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(scheduledTaskLogs)
        .where(where)
        .orderBy(desc(scheduledTaskLogs.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(scheduledTaskLogs).where(where),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async create(dto: CreateScheduledTaskDto): Promise<ScheduledTaskRecord> {
    this.assertRegistered(dto.taskKey);
    const timezone = dto.timezone ?? DEFAULT_SCHEDULED_TASK_TIMEZONE;
    validateSchedule(dto.cronExpression, timezone);

    const [result] = await this.db.insert(scheduledTasks).values({
      ...dto,
      timezone,
      builtIn: false,
      ...this.ctx.auditOnCreate(),
    });

    const task = await this.findTaskOrFail(result.insertId);
    this.syncSchedule(task);
    return this.toRecord(task);
  }

  async update(
    id: number,
    dto: UpdateScheduledTaskDto,
  ): Promise<ScheduledTaskRecord> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const current = await this.findTaskOrFail(id);
    if (
      current.builtIn &&
      dto.taskKey !== undefined &&
      dto.taskKey !== current.taskKey
    ) {
      throw new ConflictException('内置计划的任务键不可修改');
    }

    const taskKey = dto.taskKey ?? current.taskKey;
    const cronExpression = dto.cronExpression ?? current.cronExpression;
    const timezone = dto.timezone ?? current.timezone;
    this.assertRegistered(taskKey);
    validateSchedule(cronExpression, timezone);

    await this.db
      .update(scheduledTasks)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(aliveTask(eq(scheduledTasks.id, id)));

    const task = await this.findTaskOrFail(id);
    this.syncSchedule(task);
    return this.toRecord(task);
  }

  async remove(id: number): Promise<void> {
    const task = await this.findTaskOrFail(id);
    if (task.builtIn) {
      throw new ConflictException('内置计划不可删除');
    }

    await this.db
      .update(scheduledTasks)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
      .where(aliveTask(eq(scheduledTasks.id, id)));
    this.unschedule(this.jobName(id));
  }

  async runManually(id: number): Promise<ScheduledTaskLogRow> {
    const execution = await this.createExecution(id, 'manual');
    void this.performExecution(execution).catch((error: unknown) =>
      this.logger.error(
        `手动任务 ${execution.task.name} 执行失败：${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    return this.findLogOrFail(execution.logId);
  }

  private async execute(
    id: number,
    triggerType: ScheduledTaskTriggerType,
  ): Promise<ScheduledTaskLogRow> {
    const execution = await this.createExecution(id, triggerType);
    await this.performExecution(execution);
    return this.findLogOrFail(execution.logId);
  }

  private async createExecution(
    id: number,
    triggerType: ScheduledTaskTriggerType,
  ): Promise<{
    task: ScheduledTaskRow;
    logId: number;
    startedAt: Date;
  }> {
    const task = await this.findTaskOrFail(id);
    this.assertRegistered(task.taskKey);

    const startedAt = new Date();
    const operatorId = triggerType === 'manual' ? this.ctx.userId : null;
    const operatorUsername =
      triggerType === 'manual' ? this.ctx.username : null;
    const [insertResult] = await this.db.insert(scheduledTaskLogs).values({
      taskId: task.id,
      taskName: task.name,
      taskKey: task.taskKey,
      triggerType,
      status: 'running',
      operatorId,
      operatorUsername,
      startedAt,
    });

    await this.db
      .update(scheduledTasks)
      .set({ lastRunAt: startedAt, lastRunStatus: 'running' })
      .where(aliveTask(eq(scheduledTasks.id, task.id)));

    return { task, logId: insertResult.insertId, startedAt };
  }

  private async performExecution(execution: {
    task: ScheduledTaskRow;
    logId: number;
    startedAt: Date;
  }): Promise<void> {
    const { task, logId, startedAt } = execution;
    try {
      const result = await this.lock.runExclusive(
        `scheduled-task:${task.taskKey}`,
        TASK_LOCK_TTL_MS,
        () => this.registry.execute(task.taskKey),
      );

      if (result === undefined) {
        await this.finishExecution(
          task.id,
          logId,
          startedAt,
          'skipped',
          null,
          '任务正在其他实例执行，或调度锁暂时不可用',
        );
      } else {
        await this.finishExecution(
          task.id,
          logId,
          startedAt,
          'success',
          serializeTaskResult(result),
          null,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.finishExecution(
        task.id,
        logId,
        startedAt,
        'failure',
        null,
        message.slice(0, 1000),
      );
      throw error;
    }
  }

  private async finishExecution(
    taskId: number,
    logId: number,
    startedAt: Date,
    status: Exclude<ScheduledTaskExecutionStatus, 'running'>,
    result: string | null,
    errorMessage: string | null,
  ): Promise<void> {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    await Promise.all([
      this.db
        .update(scheduledTaskLogs)
        .set({ status, result, errorMessage, finishedAt, durationMs })
        .where(eq(scheduledTaskLogs.id, logId)),
      this.db
        .update(scheduledTasks)
        .set({ lastRunAt: startedAt, lastRunStatus: status })
        .where(aliveTask(eq(scheduledTasks.id, taskId))),
    ]);
  }

  private async ensureBuiltInTask(): Promise<void> {
    const [existing] = await this.db
      .select({ id: scheduledTasks.id })
      .from(scheduledTasks)
      .where(eq(scheduledTasks.code, BUILT_IN_LOG_CLEANUP_CODE))
      .limit(1);

    if (existing) return;

    const cronExpression = this.config.get('LOG_CLEANUP_CRON', {
      infer: true,
    });
    validateSchedule(cronExpression, DEFAULT_SCHEDULED_TASK_TIMEZONE);

    try {
      await this.db.insert(scheduledTasks).values({
        code: BUILT_IN_LOG_CLEANUP_CODE,
        name: '日志与过期会话清理',
        taskKey: 'system.log.cleanup',
        cronExpression,
        timezone: DEFAULT_SCHEDULED_TASK_TIMEZONE,
        status: this.config.get('LOG_CLEANUP_ENABLED', { infer: true })
          ? 'active'
          : 'disabled',
        builtIn: true,
        remark: '由原日志清理配置迁入，首次启动后以数据库计划为准',
      });
    } catch (error) {
      const [createdByAnotherInstance] = await this.db
        .select({ id: scheduledTasks.id })
        .from(scheduledTasks)
        .where(eq(scheduledTasks.code, BUILT_IN_LOG_CLEANUP_CODE))
        .limit(1);
      if (!createdByAnotherInstance) throw error;
    }
  }

  private reconcileSchedules(): Promise<void> {
    if (this.reconcilePromise) return this.reconcilePromise;

    this.reconcilePromise = this.loadSchedules().finally(() => {
      this.reconcilePromise = null;
    });
    return this.reconcilePromise;
  }

  private async loadSchedules(): Promise<void> {
    const tasks = await this.db
      .select()
      .from(scheduledTasks)
      .where(aliveTask(eq(scheduledTasks.status, 'active')));
    const desiredNames = new Set<string>();

    for (const task of tasks) {
      desiredNames.add(this.jobName(task.id));
      this.syncSchedule(task);
    }

    for (const name of [...this.scheduleSignatures.keys()]) {
      if (!desiredNames.has(name)) this.unschedule(name);
    }
  }

  private syncSchedule(task: ScheduledTaskRow): void {
    const name = this.jobName(task.id);
    if (task.status !== 'active' || task.deletedAt) {
      this.unschedule(name);
      return;
    }

    if (!this.registry.has(task.taskKey)) {
      this.logger.warn(
        `计划 ${task.name} 引用了未注册任务 ${task.taskKey}，已跳过`,
      );
      this.unschedule(name);
      return;
    }

    const signature = `${task.taskKey}|${task.cronExpression}|${task.timezone}`;
    if (this.scheduleSignatures.get(name) === signature) return;

    try {
      validateSchedule(task.cronExpression, task.timezone);
    } catch (error) {
      this.logger.warn(
        `计划 ${task.name} 配置无效，已跳过：${error instanceof Error ? error.message : String(error)}`,
      );
      this.unschedule(name);
      return;
    }
    this.unschedule(name);

    const job = CronJob.from({
      cronTime: task.cronExpression,
      timeZone: task.timezone,
      start: false,
      waitForCompletion: true,
      onTick: () => {
        void this.execute(task.id, 'scheduled').catch((error: unknown) =>
          this.logger.error(
            `计划 ${task.name} 执行失败：${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      },
      errorHandler: (error: unknown) =>
        this.logger.error(
          `计划 ${task.name} 调度异常：${error instanceof Error ? error.message : String(error)}`,
        ),
    });

    this.scheduler.addCronJob(name, job);
    this.scheduleSignatures.set(name, signature);
    job.start();
  }

  private unschedule(name: string): void {
    if (this.scheduler.doesExist('cron', name)) {
      this.scheduler.deleteCronJob(name);
    }
    this.scheduleSignatures.delete(name);
  }

  private toRecord(task: ScheduledTaskRow): ScheduledTaskRecord {
    let nextRunAt: Date | null = null;
    if (task.status === 'active' && this.registry.has(task.taskKey)) {
      try {
        nextRunAt = new CronTime(task.cronExpression, task.timezone)
          .sendAt()
          .toJSDate();
      } catch {
        nextRunAt = null;
      }
    }

    return { ...task, nextRunAt };
  }

  private assertRegistered(taskKey: string): void {
    if (!this.registry.has(taskKey)) {
      throw new BadRequestException(`任务处理器 ${taskKey} 未注册`);
    }
  }

  private async findTaskOrFail(id: number): Promise<ScheduledTaskRow> {
    const [task] = await this.db
      .select()
      .from(scheduledTasks)
      .where(aliveTask(eq(scheduledTasks.id, id)))
      .limit(1);
    if (!task) throw new NotFoundException(`定时任务 ${id} 不存在`);
    return task;
  }

  private async findLogOrFail(id: number): Promise<ScheduledTaskLogRow> {
    const [log] = await this.db
      .select()
      .from(scheduledTaskLogs)
      .where(eq(scheduledTaskLogs.id, id))
      .limit(1);
    if (!log) throw new NotFoundException(`任务执行日志 ${id} 不存在`);
    return log;
  }

  private jobName(id: number): string {
    return `${JOB_NAME_PREFIX}${id}`;
  }
}
