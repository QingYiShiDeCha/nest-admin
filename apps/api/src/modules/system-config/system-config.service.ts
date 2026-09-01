import { systemConfigs, type SystemConfigRow } from '@nest-admin/database';
import type {
  PaginatedResult,
  RuntimeSystemConfig,
  SystemConfigValueType,
} from '@nest-admin/shared';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SYSTEM_NAME,
  MAX_PAGE_SIZE,
  SYSTEM_CONFIG_KEYS,
} from '@nest-admin/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { CreateSystemConfigDto } from './dto/create-system-config.dto';
import type { QuerySystemConfigDto } from './dto/query-system-config.dto';
import type { UpdateSystemConfigDto } from './dto/update-system-config.dto';

export type SystemConfigResolvedValue =
  | boolean
  | number
  | string
  | null
  | SystemConfigResolvedValue[]
  | { [key: string]: SystemConfigResolvedValue };

interface RuntimeConfigRecord {
  key: string;
  value: string;
  valueType: SystemConfigValueType;
}

function aliveConfig(...conditions: (SQL | undefined)[]): SQL {
  return and(isNull(systemConfigs.deletedAt), ...conditions)!;
}

@Injectable()
export class SystemConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ctx: RequestContext,
  ) {}

  async findPage(
    query: QuerySystemConfigDto,
  ): Promise<PaginatedResult<SystemConfigRow>> {
    const where = aliveConfig(
      query.keyword
        ? or(
            like(systemConfigs.name, `%${query.keyword}%`),
            like(systemConfigs.key, `%${query.keyword}%`),
          )
        : undefined,
      query.valueType
        ? eq(systemConfigs.valueType, query.valueType)
        : undefined,
      query.status ? eq(systemConfigs.status, query.status) : undefined,
    );

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(systemConfigs)
        .where(where)
        .orderBy(desc(systemConfigs.builtIn), desc(systemConfigs.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(systemConfigs).where(where),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  findDetail(id: number): Promise<SystemConfigRow> {
    return this.findConfigOrFail(id);
  }

  async create(dto: CreateSystemConfigDto): Promise<SystemConfigRow> {
    const valueType = dto.valueType ?? 'string';
    validateSystemConfigValue(dto.value, valueType);
    validateKnownSystemConfigValue(dto.key, dto.value, valueType);
    await this.assertKeyAvailable(dto.key);

    const [result] = await this.db.insert(systemConfigs).values({
      ...dto,
      valueType,
      builtIn: false,
      ...this.ctx.auditOnCreate(),
    });

    return this.findConfigOrFail(result.insertId);
  }

  async update(
    id: number,
    dto: UpdateSystemConfigDto,
  ): Promise<SystemConfigRow> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const current = await this.findConfigOrFail(id);
    if (current.builtIn && dto.key !== undefined && dto.key !== current.key) {
      throw new ConflictException('内置参数的参数键不可修改');
    }
    if (dto.key !== undefined && dto.key !== current.key) {
      await this.assertKeyAvailable(dto.key);
    }

    const nextType = dto.valueType ?? current.valueType;
    const nextValue = dto.value ?? current.value;
    const nextKey = dto.key ?? current.key;
    validateSystemConfigValue(nextValue, nextType);
    validateKnownSystemConfigValue(nextKey, nextValue, nextType);

    await this.db
      .update(systemConfigs)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(aliveConfig(eq(systemConfigs.id, id)));

    return this.findConfigOrFail(id);
  }

  async remove(id: number): Promise<void> {
    const current = await this.findConfigOrFail(id);
    if (current.builtIn) {
      throw new ConflictException('内置参数不可删除');
    }

    await this.db
      .update(systemConfigs)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
      .where(aliveConfig(eq(systemConfigs.id, id)));
  }

  /** 供业务模块读取启用参数；不存在或停用时返回 undefined。 */
  async getEnabledValue(
    key: string,
  ): Promise<SystemConfigResolvedValue | undefined> {
    const [record] = await this.db
      .select({
        value: systemConfigs.value,
        valueType: systemConfigs.valueType,
      })
      .from(systemConfigs)
      .where(
        aliveConfig(
          eq(systemConfigs.key, key),
          eq(systemConfigs.status, 'active'),
        ),
      )
      .limit(1);

    return record
      ? resolveSystemConfigValue(record.value, record.valueType)
      : undefined;
  }

  async getRuntimeConfig(): Promise<RuntimeSystemConfig> {
    const records = await this.db
      .select({
        key: systemConfigs.key,
        value: systemConfigs.value,
        valueType: systemConfigs.valueType,
      })
      .from(systemConfigs)
      .where(
        aliveConfig(
          eq(systemConfigs.status, 'active'),
          inArray(systemConfigs.key, Object.values(SYSTEM_CONFIG_KEYS)),
        ),
      );

    return resolveRuntimeSystemConfig(records);
  }

  private async findConfigOrFail(id: number): Promise<SystemConfigRow> {
    const [record] = await this.db
      .select()
      .from(systemConfigs)
      .where(aliveConfig(eq(systemConfigs.id, id)))
      .limit(1);

    if (!record) throw new NotFoundException(`系统参数 ${id} 不存在`);
    return record;
  }

  private async assertKeyAvailable(key: string): Promise<void> {
    const [existing] = await this.db
      .select({ deletedAt: systemConfigs.deletedAt })
      .from(systemConfigs)
      .where(eq(systemConfigs.key, key))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `参数键 ${key} 被已删除参数占用，不可复用`
          : `参数键 ${key} 已存在`,
      );
    }
  }
}

export function validateSystemConfigValue(
  value: string,
  valueType: SystemConfigValueType,
): void {
  resolveSystemConfigValue(value, valueType);
}

export function validateKnownSystemConfigValue(
  key: string,
  value: string,
  valueType: SystemConfigValueType,
): void {
  if (key === SYSTEM_CONFIG_KEYS.SYSTEM_NAME) {
    if (valueType !== 'string') {
      throw new BadRequestException('系统名称参数的值类型必须是 string');
    }
    if (value.trim() === '') {
      throw new BadRequestException('系统名称不能为空');
    }
    return;
  }

  if (key === SYSTEM_CONFIG_KEYS.DEFAULT_PAGE_SIZE) {
    if (valueType !== 'number') {
      throw new BadRequestException('默认分页条数的值类型必须是 number');
    }

    const pageSize = Number(value);
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_PAGE_SIZE
    ) {
      throw new BadRequestException(
        `默认分页条数必须是 1 到 ${MAX_PAGE_SIZE} 之间的整数`,
      );
    }
  }
}

export function resolveRuntimeSystemConfig(
  records: readonly RuntimeConfigRecord[],
): RuntimeSystemConfig {
  let systemName = DEFAULT_SYSTEM_NAME;
  let defaultPageSize = DEFAULT_PAGE_SIZE;

  for (const record of records) {
    try {
      validateKnownSystemConfigValue(
        record.key,
        record.value,
        record.valueType,
      );
    } catch {
      continue;
    }

    if (record.key === SYSTEM_CONFIG_KEYS.SYSTEM_NAME) {
      systemName = record.value.trim();
    } else if (record.key === SYSTEM_CONFIG_KEYS.DEFAULT_PAGE_SIZE) {
      defaultPageSize = Number(record.value);
    }
  }

  return { systemName, defaultPageSize };
}

export function resolveSystemConfigValue(
  value: string,
  valueType: SystemConfigValueType,
): SystemConfigResolvedValue {
  if (valueType === 'string') return value;

  if (valueType === 'number') {
    if (value.trim() === '')
      throw new BadRequestException('数字参数值不能为空');
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('参数值不是有效数字');
    }
    return parsed;
  }

  if (valueType === 'boolean') {
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('布尔参数值只能是 true 或 false');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BadRequestException('参数值不是有效 JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BadRequestException('JSON 参数值必须是对象或数组');
  }

  return parsed as SystemConfigResolvedValue;
}
