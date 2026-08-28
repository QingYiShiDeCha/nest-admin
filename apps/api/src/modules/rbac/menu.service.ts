import {
  menus,
  roleMenus,
  roles,
  userRoles,
  type MenuRow,
} from '@nest-admin/database';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { CreateMenuDto } from './dto/create-menu.dto';
import type { UpdateMenuDto } from './dto/update-menu.dto';

export interface MenuTreeNode extends MenuRow {
  children: MenuTreeNode[];
}

@Injectable()
export class MenuService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ctx: RequestContext,
  ) {}

  /** 管理端用的完整菜单树，含已停用与隐藏节点 */
  async findTree(): Promise<MenuTreeNode[]> {
    return buildTree(await this.findAllAlive());
  }

  async findDetail(id: number): Promise<MenuRow> {
    return this.findMenuOrFail(id);
  }

  async create(dto: CreateMenuDto): Promise<MenuRow> {
    const type = dto.type ?? 'menu';
    this.assertShapeMatchesType(type, dto);
    await this.assertParentUsable(dto.parentId);

    const [result] = await this.db.insert(menus).values({
      ...dto,
      type,
      ...this.ctx.auditOnCreate(),
    });

    return this.findMenuOrFail(result.insertId);
  }

  async update(id: number, dto: UpdateMenuDto): Promise<MenuRow> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const current = await this.findMenuOrFail(id);
    const merged = { ...current, ...dto };

    this.assertShapeMatchesType(merged.type, merged);

    if (dto.parentId !== undefined && dto.parentId !== current.parentId) {
      await this.assertParentUsable(dto.parentId);
      await this.assertNotOwnDescendant(id, dto.parentId);
    }

    // 目录改成菜单/外链之前必须先清空子节点，否则子树会挂在一个不能有子节点的父上
    if (
      current.type === 'directory' &&
      merged.type !== 'directory' &&
      (await this.countChildren(id)) > 0
    ) {
      throw new ConflictException(
        '该目录下还有子菜单，改变类型前请先移走或删除它们',
      );
    }

    await this.db
      .update(menus)
      .set({ ...dto, ...this.ctx.auditOnUpdate() })
      .where(and(eq(menus.id, id), isNull(menus.deletedAt)));

    return this.findMenuOrFail(id);
  }

  /**
   * 软删除。有子节点时拒绝而不是级联删除——
   * 级联删一棵子树是不可逆的重操作，让调用方显式地逐个确认更安全。
   */
  async remove(id: number): Promise<void> {
    await this.findMenuOrFail(id);

    if ((await this.countChildren(id)) > 0) {
      throw new ConflictException('该菜单下还有子菜单，请先删除子菜单');
    }

    await this.db
      .update(menus)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
      .where(and(eq(menus.id, id), isNull(menus.deletedAt)));
  }

  /**
   * 当前用户可见的菜单树。超管拿到全部启用菜单，其余按角色授权取。
   *
   * 关键处理：把授权菜单的祖先节点一并补齐。只授予子菜单而没授父目录时，
   * 子节点会因为找不到父亲而在建树时被丢掉，前端就少了一整块入口。
   */
  async findUserMenuTree(
    userId: number,
    isSuperAdmin: boolean,
  ): Promise<MenuTreeNode[]> {
    const all = await this.findAllAlive();
    const enabled = all.filter((menu) => menu.status === 'active');

    if (isSuperAdmin) {
      return buildTree(enabled);
    }

    const granted = await this.db
      .selectDistinct({ id: roleMenus.menuId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(roleMenus, eq(roleMenus.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(roles.status, 'active'),
          isNull(roles.deletedAt),
        ),
      );

    const byId = new Map(enabled.map((menu) => [menu.id, menu]));
    const visible = new Set<number>();

    for (const { id } of granted) {
      // 从授权节点向上补齐祖先，遇到已停用的祖先就停——
      // 停用一个目录理应连带隐藏它下面的所有入口
      let cursor = byId.get(id);

      while (cursor && !visible.has(cursor.id)) {
        visible.add(cursor.id);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }
    }

    return buildTree(enabled.filter((menu) => visible.has(menu.id)));
  }

  private findAllAlive(): Promise<MenuRow[]> {
    return this.db
      .select()
      .from(menus)
      .where(isNull(menus.deletedAt))
      .orderBy(asc(menus.sort), asc(menus.id));
  }

  private async findMenuOrFail(id: number): Promise<MenuRow> {
    const [menu] = await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.id, id), isNull(menus.deletedAt)))
      .limit(1);

    if (!menu) {
      throw new NotFoundException(`菜单 ${id} 不存在`);
    }

    return menu;
  }

  private async countChildren(id: number): Promise<number> {
    const rows = await this.db
      .select({ id: menus.id })
      .from(menus)
      .where(and(eq(menus.parentId, id), isNull(menus.deletedAt)));

    return rows.length;
  }

  /** 字段要求随类型而变，放在 service 里校验才能给出人话错误 */
  private assertShapeMatchesType(
    type: MenuRow['type'],
    shape: { path?: string | null; component?: string | null },
  ): void {
    if (type === 'directory') {
      if (shape.component) {
        throw new BadRequestException('目录不对应页面，不能设置 component');
      }
      return;
    }

    if (!shape.path) {
      throw new BadRequestException(
        type === 'external'
          ? '外链必须填写 path（完整 URL）'
          : '菜单必须填写 path',
      );
    }

    if (type === 'menu' && !shape.component) {
      throw new BadRequestException('菜单必须填写 component');
    }

    if (type === 'external' && !/^https?:\/\//.test(shape.path)) {
      throw new BadRequestException(
        '外链的 path 必须以 http:// 或 https:// 开头',
      );
    }
  }

  private async assertParentUsable(parentId?: number | null): Promise<void> {
    if (parentId === undefined || parentId === null) {
      return;
    }

    const parent = await this.findMenuOrFail(parentId).catch(() => undefined);

    if (!parent) {
      throw new BadRequestException(`父节点 ${parentId} 不存在或已删除`);
    }

    if (parent.type !== 'directory') {
      throw new BadRequestException('只有 directory 类型的节点可以作为父节点');
    }
  }

  /** 防止把节点挂到自己的子树下形成环 */
  private async assertNotOwnDescendant(
    id: number,
    parentId?: number | null,
  ): Promise<void> {
    if (parentId === undefined || parentId === null) {
      return;
    }

    if (parentId === id) {
      throw new BadRequestException('不能把菜单挂到自己下面');
    }

    const all = await this.findAllAlive();
    const byId = new Map(all.map((menu) => [menu.id, menu]));

    let cursor = byId.get(parentId);

    while (cursor) {
      if (cursor.id === id) {
        throw new BadRequestException('不能把菜单挂到自己的子节点下面');
      }
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
  }
}

/**
 * 扁平列表建树。入参已按 sort、id 排好序，所以子节点天然有序。
 * 父节点不在集合里的节点会被丢弃——对「我的菜单」而言祖先已提前补齐，
 * 不会误伤；对管理端而言集合是全量的，也不存在孤儿。
 */
function buildTree(rows: MenuRow[]): MenuTreeNode[] {
  const nodes = new Map<number, MenuTreeNode>(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );
  const roots: MenuTreeNode[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else if (!row.parentId) {
      roots.push(node);
    }
  }

  return roots;
}
