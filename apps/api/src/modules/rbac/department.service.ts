import {
  departments,
  departmentTransfers,
  users,
  type DepartmentRow,
  type DepartmentTransferRow,
} from '@nest-admin/database';
import type { PaginatedResult } from '@nest-admin/shared';
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
  inArray,
  isNotNull,
  isNull,
  sql,
} from 'drizzle-orm';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { QueryDepartmentDto } from './dto/query-department.dto';
import type { QueryDepartmentTransferDto } from './dto/query-department-transfer.dto';
import type { UpdateDepartmentDto } from './dto/update-department.dto';

export interface DepartmentRecord extends DepartmentRow {
  leaderName: string | null;
}

export interface DepartmentTreeNode extends DepartmentRecord {
  children: DepartmentTreeNode[];
  userCount: number;
}

@Injectable()
export class DepartmentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ctx: RequestContext,
  ) {}

  async findTree(
    query: QueryDepartmentDto = {},
  ): Promise<DepartmentTreeNode[]> {
    const [all, userCounts] = await Promise.all([
      this.findAllAlive(),
      this.db
        .select({ deptId: users.deptId, userCount: count() })
        .from(users)
        .where(and(isNull(users.deletedAt), isNotNull(users.deptId)))
        .groupBy(users.deptId),
    ]);

    const countByDepartment = new Map(
      userCounts.flatMap((row) =>
        row.deptId === null ? [] : [[row.deptId, row.userCount] as const],
      ),
    );

    if (!query.keyword && !query.status) {
      return buildDepartmentTree(all, countByDepartment);
    }

    const keyword = query.keyword?.trim().toLocaleLowerCase();
    const byId = new Map(all.map((department) => [department.id, department]));
    const visibleIds = new Set<number>();

    for (const department of all) {
      const matchesKeyword =
        !keyword ||
        department.name.toLocaleLowerCase().includes(keyword) ||
        department.code.toLocaleLowerCase().includes(keyword);
      const matchesStatus = !query.status || department.status === query.status;

      if (!matchesKeyword || !matchesStatus) {
        continue;
      }

      let cursor: DepartmentRecord | undefined = department;
      while (cursor && !visibleIds.has(cursor.id)) {
        visibleIds.add(cursor.id);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }
    }

    return buildDepartmentTree(
      all.filter((department) => visibleIds.has(department.id)),
      countByDepartment,
    );
  }

  findDetail(id: number): Promise<DepartmentRecord> {
    return this.findDepartmentOrFail(id);
  }

  async create(dto: CreateDepartmentDto): Promise<DepartmentRecord> {
    await Promise.all([
      this.assertCodeAvailable(dto.code),
      this.assertParentUsable(dto.parentId),
      this.assertLeaderUsable(dto.leaderId),
    ]);

    const [result] = await this.db.insert(departments).values({
      ...dto,
      parentId: dto.parentId ?? null,
      ...this.ctx.auditOnCreate(),
    });

    return this.findDepartmentOrFail(result.insertId);
  }

  async update(
    id: number,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentRecord> {
    const { moveReason, ...changes } = dto;
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const current = await this.findDepartmentOrFail(id);
    const parentChanged =
      changes.parentId !== undefined && changes.parentId !== current.parentId;

    if (changes.code !== undefined && changes.code !== current.code) {
      await this.assertCodeAvailable(changes.code);
    }

    if (parentChanged) {
      if (!moveReason?.trim()) {
        throw new BadRequestException('变更上级部门时必须填写迁移原因');
      }
      await this.assertParentUsable(changes.parentId);
      await this.assertNotOwnDescendant(id, changes.parentId);
    }

    if (
      changes.leaderId !== undefined &&
      changes.leaderId !== current.leaderId
    ) {
      await this.assertLeaderUsable(changes.leaderId);
    }

    if (!parentChanged) {
      await this.db
        .update(departments)
        .set({ ...changes, ...this.ctx.auditOnUpdate() })
        .where(and(eq(departments.id, id), isNull(departments.deletedAt)));

      return this.findDepartmentOrFail(id);
    }

    const transferReason = moveReason?.trim();
    if (!transferReason) {
      throw new BadRequestException('变更上级部门时必须填写迁移原因');
    }

    const [fromParentName, toParentName, operatorName] = await Promise.all([
      this.findDepartmentName(current.parentId),
      this.findDepartmentName(changes.parentId),
      this.findOperatorName(),
    ]);

    await this.db.transaction(async (tx) => {
      const currentParentMatches =
        current.parentId === null
          ? isNull(departments.parentId)
          : eq(departments.parentId, current.parentId);
      const [result] = await tx
        .update(departments)
        .set({ ...changes, ...this.ctx.auditOnUpdate() })
        .where(
          and(
            eq(departments.id, id),
            currentParentMatches,
            isNull(departments.deletedAt),
          ),
        );

      if (result.affectedRows !== 1) {
        throw new ConflictException('部门上级已被其他操作修改，请刷新后重试');
      }

      await tx.insert(departmentTransfers).values({
        deptId: id,
        deptName: changes.name ?? current.name,
        fromParentId: current.parentId,
        fromParentName,
        toParentId: changes.parentId ?? null,
        toParentName,
        reason: transferReason,
        operatorId: this.ctx.userId,
        operatorName,
      });
    });

    return this.findDepartmentOrFail(id);
  }

  async findTransfers(
    id: number,
    query: QueryDepartmentTransferDto,
  ): Promise<PaginatedResult<DepartmentTransferRow>> {
    await this.findDepartmentOrFail(id);

    const [[summary], list] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(departmentTransfers)
        .where(eq(departmentTransfers.deptId, id)),
      this.db
        .select()
        .from(departmentTransfers)
        .where(eq(departmentTransfers.deptId, id))
        .orderBy(
          desc(departmentTransfers.createdAt),
          desc(departmentTransfers.id),
        )
        .limit(query.pageSize)
        .offset(query.offset),
    ]);

    return {
      list,
      total: summary.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async remove(id: number): Promise<void> {
    await this.findDepartmentOrFail(id);

    const [[childCount], [userCount]] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(departments)
        .where(
          and(eq(departments.parentId, id), isNull(departments.deletedAt)),
        ),
      this.db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.deptId, id), isNull(users.deletedAt))),
    ]);

    if (childCount.total > 0) {
      throw new ConflictException('该部门下还有子部门，请先移动或删除子部门');
    }
    if (userCount.total > 0) {
      throw new ConflictException('该部门下还有用户，请先调整用户所属部门');
    }

    await this.db
      .update(departments)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
      .where(and(eq(departments.id, id), isNull(departments.deletedAt)));
  }

  async findDescendantIds(id: number): Promise<number[]> {
    const all = await this.findAllAlive();

    if (!all.some((department) => department.id === id)) {
      throw new NotFoundException(`部门 ${id} 不存在`);
    }

    const childrenByParent = new Map<number, number[]>();
    for (const department of all) {
      if (department.parentId === null) continue;
      const children = childrenByParent.get(department.parentId) ?? [];
      children.push(department.id);
      childrenByParent.set(department.parentId, children);
    }

    const ids: number[] = [];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      ids.push(current);
      queue.push(...(childrenByParent.get(current) ?? []));
    }

    return ids;
  }

  async assertDepartmentsUsable(ids: number[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return;

    const found = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          inArray(departments.id, uniqueIds),
          eq(departments.status, 'active'),
          isNull(departments.deletedAt),
        ),
      );

    if (found.length !== uniqueIds.length) {
      const foundIds = new Set(found.map((row) => row.id));
      const invalid = uniqueIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `以下部门 id 不存在、已停用或已删除：${invalid.join(', ')}`,
      );
    }
  }

  private async findAllAlive(): Promise<DepartmentRecord[]> {
    const rows = await this.db
      .select({
        department: departments,
        leaderName: sql<
          string | null
        >`COALESCE(${users.nickname}, ${users.username})`,
      })
      .from(departments)
      .leftJoin(
        users,
        and(eq(departments.leaderId, users.id), isNull(users.deletedAt)),
      )
      .where(isNull(departments.deletedAt))
      .orderBy(asc(departments.sort), asc(departments.id));

    return rows.map(({ department, leaderName }) => ({
      ...department,
      leaderName,
    }));
  }

  private async findDepartmentOrFail(id: number): Promise<DepartmentRecord> {
    const [row] = await this.db
      .select({
        department: departments,
        leaderName: sql<
          string | null
        >`COALESCE(${users.nickname}, ${users.username})`,
      })
      .from(departments)
      .leftJoin(
        users,
        and(eq(departments.leaderId, users.id), isNull(users.deletedAt)),
      )
      .where(and(eq(departments.id, id), isNull(departments.deletedAt)))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`部门 ${id} 不存在`);
    }

    return { ...row.department, leaderName: row.leaderName };
  }

  private async assertLeaderUsable(leaderId?: number | null): Promise<void> {
    if (leaderId === undefined || leaderId === null) return;

    const [leader] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, leaderId),
          eq(users.status, 'active'),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!leader) {
      throw new BadRequestException('负责人用户不存在、已停用或已删除');
    }
  }

  private async assertParentUsable(parentId?: number | null): Promise<void> {
    if (parentId === undefined || parentId === null) return;

    const [parent] = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.id, parentId),
          eq(departments.status, 'active'),
          isNull(departments.deletedAt),
        ),
      )
      .limit(1);

    if (!parent) {
      throw new BadRequestException('父部门不存在、已停用或已删除');
    }
  }

  private async assertNotOwnDescendant(
    id: number,
    parentId?: number | null,
  ): Promise<void> {
    if (parentId === undefined || parentId === null) return;
    if (
      parentId === id ||
      (await this.findDescendantIds(id)).includes(parentId)
    ) {
      throw new ConflictException('不能将部门移动到自身或自己的下级部门');
    }
  }

  private async assertCodeAvailable(code: string): Promise<void> {
    const [existing] = await this.db
      .select({ deletedAt: departments.deletedAt })
      .from(departments)
      .where(eq(departments.code, code))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `部门编码 ${code} 被已删除部门占用，不可复用`
          : `部门编码 ${code} 已存在`,
      );
    }
  }

  private async findDepartmentName(id?: number | null): Promise<string | null> {
    if (id === undefined || id === null) return null;

    const [department] = await this.db
      .select({ name: departments.name })
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    return department?.name ?? null;
  }

  private async findOperatorName(): Promise<string | null> {
    if (this.ctx.userId === null) return null;

    const [operator] = await this.db
      .select({
        name: sql<string>`COALESCE(${users.nickname}, ${users.username})`,
      })
      .from(users)
      .where(eq(users.id, this.ctx.userId))
      .limit(1);

    return operator?.name ?? null;
  }
}

export function buildDepartmentTree(
  rows: DepartmentRecord[],
  userCounts = new Map<number, number>(),
): DepartmentTreeNode[] {
  const nodes = new Map<number, DepartmentTreeNode>();
  for (const row of rows) {
    nodes.set(row.id, {
      ...row,
      children: [],
      userCount: userCounts.get(row.id) ?? 0,
    });
  }

  const roots: DepartmentTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent =
      node.parentId === null ? undefined : nodes.get(node.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}
