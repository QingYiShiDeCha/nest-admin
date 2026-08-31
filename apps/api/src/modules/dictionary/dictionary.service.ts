import {
  dictionaryItems,
  dictionaryTypes,
  type DictionaryItemRow,
  type DictionaryTypeRow,
} from '@nest-admin/database';
import type { DictionaryOption, PaginatedResult } from '@nest-admin/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { DictionaryCacheService } from './dictionary-cache.service';
import type { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import type { CreateDictionaryTypeDto } from './dto/create-dictionary-type.dto';
import type { QueryDictionaryItemDto } from './dto/query-dictionary-item.dto';
import type { QueryDictionaryTypeDto } from './dto/query-dictionary-type.dto';
import type { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import type { UpdateDictionaryTypeDto } from './dto/update-dictionary-type.dto';

function aliveType(...conditions: (SQL | undefined)[]): SQL {
  return and(isNull(dictionaryTypes.deletedAt), ...conditions)!;
}

function aliveItem(...conditions: (SQL | undefined)[]): SQL {
  return and(isNull(dictionaryItems.deletedAt), ...conditions)!;
}

@Injectable()
export class DictionaryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ctx: RequestContext,
    private readonly cache: DictionaryCacheService,
  ) {}

  async findTypePage(
    query: QueryDictionaryTypeDto,
  ): Promise<PaginatedResult<DictionaryTypeRow>> {
    const where = aliveType(
      query.keyword
        ? or(
            like(dictionaryTypes.name, `%${query.keyword}%`),
            like(dictionaryTypes.code, `%${query.keyword}%`),
          )
        : undefined,
      query.status ? eq(dictionaryTypes.status, query.status) : undefined,
    );

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(dictionaryTypes)
        .where(where)
        .orderBy(desc(dictionaryTypes.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(dictionaryTypes).where(where),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  findTypeDetail(id: number): Promise<DictionaryTypeRow> {
    return this.findTypeOrFail(id);
  }

  async createType(dto: CreateDictionaryTypeDto): Promise<DictionaryTypeRow> {
    await this.assertCodeAvailable(dto.code);

    const [result] = await this.db.insert(dictionaryTypes).values({
      ...dto,
      ...this.ctx.auditOnCreate(),
    });
    await this.cache.invalidate(dto.code);
    return this.findTypeOrFail(result.insertId);
  }

  async updateType(
    id: number,
    dto: UpdateDictionaryTypeDto,
  ): Promise<DictionaryTypeRow> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const current = await this.findTypeOrFail(id);
    if (dto.code !== undefined && dto.code !== current.code) {
      await this.assertCodeAvailable(dto.code);
    }

    await this.db
      .update(dictionaryTypes)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(aliveType(eq(dictionaryTypes.id, id)));

    await this.cache.invalidate(current.code, dto.code ?? current.code);
    return this.findTypeOrFail(id);
  }

  async removeType(id: number): Promise<void> {
    const current = await this.findTypeOrFail(id);
    const deletedAt = new Date();
    const audit = this.ctx.auditOnUpdate();

    await this.db.transaction(async (tx) => {
      await tx
        .update(dictionaryItems)
        .set({ deletedAt, ...audit })
        .where(aliveItem(eq(dictionaryItems.typeId, id)));
      await tx
        .update(dictionaryTypes)
        .set({ deletedAt, ...audit })
        .where(aliveType(eq(dictionaryTypes.id, id)));
    });

    await this.cache.invalidate(current.code);
  }

  async findItems(
    typeId: number,
    query: QueryDictionaryItemDto,
  ): Promise<DictionaryItemRow[]> {
    await this.findTypeOrFail(typeId);

    return this.db
      .select()
      .from(dictionaryItems)
      .where(
        aliveItem(
          eq(dictionaryItems.typeId, typeId),
          query.keyword
            ? or(
                like(dictionaryItems.label, `%${query.keyword}%`),
                like(dictionaryItems.value, `%${query.keyword}%`),
              )
            : undefined,
          query.status ? eq(dictionaryItems.status, query.status) : undefined,
        ),
      )
      .orderBy(asc(dictionaryItems.sort), asc(dictionaryItems.id));
  }

  async createItem(
    typeId: number,
    dto: CreateDictionaryItemDto,
  ): Promise<DictionaryItemRow> {
    const type = await this.findTypeOrFail(typeId);
    await this.assertValueAvailable(typeId, dto.value);

    const [result] = await this.db.insert(dictionaryItems).values({
      typeId,
      ...dto,
      ...this.ctx.auditOnCreate(),
    });

    await this.cache.invalidate(type.code);
    return this.findItemOrFail(result.insertId);
  }

  async updateItem(
    id: number,
    dto: UpdateDictionaryItemDto,
  ): Promise<DictionaryItemRow> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const { item, typeCode } = await this.findItemContextOrFail(id);
    if (dto.value !== undefined && dto.value !== item.value) {
      await this.assertValueAvailable(item.typeId, dto.value);
    }

    await this.db
      .update(dictionaryItems)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(aliveItem(eq(dictionaryItems.id, id)));

    await this.cache.invalidate(typeCode);
    return this.findItemOrFail(id);
  }

  async removeItem(id: number): Promise<void> {
    const { typeCode } = await this.findItemContextOrFail(id);

    await this.db
      .update(dictionaryItems)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
      .where(aliveItem(eq(dictionaryItems.id, id)));

    await this.cache.invalidate(typeCode);
  }

  async getEnabledOptions(code: string): Promise<DictionaryOption[]> {
    const lookup = await this.cache.lookup(code);
    if (lookup.value) return lookup.value;

    const options = await this.db
      .select({
        label: dictionaryItems.label,
        value: dictionaryItems.value,
        tone: dictionaryItems.tone,
      })
      .from(dictionaryItems)
      .innerJoin(
        dictionaryTypes,
        and(
          eq(dictionaryItems.typeId, dictionaryTypes.id),
          isNull(dictionaryTypes.deletedAt),
          eq(dictionaryTypes.status, 'active'),
        ),
      )
      .where(
        aliveItem(
          eq(dictionaryTypes.code, code),
          eq(dictionaryItems.status, 'active'),
        ),
      )
      .orderBy(asc(dictionaryItems.sort), asc(dictionaryItems.id));

    await this.cache.store(lookup, options);
    return options;
  }

  private async findTypeOrFail(id: number): Promise<DictionaryTypeRow> {
    const [record] = await this.db
      .select()
      .from(dictionaryTypes)
      .where(aliveType(eq(dictionaryTypes.id, id)))
      .limit(1);

    if (!record) throw new NotFoundException(`字典类型 ${id} 不存在`);
    return record;
  }

  private async findItemOrFail(id: number): Promise<DictionaryItemRow> {
    return (await this.findItemContextOrFail(id)).item;
  }

  private async findItemContextOrFail(
    id: number,
  ): Promise<{ item: DictionaryItemRow; typeCode: string }> {
    const [record] = await this.db
      .select({ item: dictionaryItems, typeCode: dictionaryTypes.code })
      .from(dictionaryItems)
      .innerJoin(
        dictionaryTypes,
        and(
          eq(dictionaryItems.typeId, dictionaryTypes.id),
          isNull(dictionaryTypes.deletedAt),
        ),
      )
      .where(aliveItem(eq(dictionaryItems.id, id)))
      .limit(1);

    if (!record) throw new NotFoundException(`字典项 ${id} 不存在`);
    return record;
  }

  private async assertCodeAvailable(code: string): Promise<void> {
    const [existing] = await this.db
      .select({ deletedAt: dictionaryTypes.deletedAt })
      .from(dictionaryTypes)
      .where(eq(dictionaryTypes.code, code))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `字典编码 ${code} 被已删除字典占用，不可复用`
          : `字典编码 ${code} 已存在`,
      );
    }
  }

  private async assertValueAvailable(
    typeId: number,
    value: string,
  ): Promise<void> {
    const [existing] = await this.db
      .select({ deletedAt: dictionaryItems.deletedAt })
      .from(dictionaryItems)
      .where(
        and(
          eq(dictionaryItems.typeId, typeId),
          eq(dictionaryItems.value, value),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `字典值 ${value} 被已删除字典项占用，不可复用`
          : `字典值 ${value} 已存在`,
      );
    }
  }
}
