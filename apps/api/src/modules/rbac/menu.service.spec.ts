import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE } from '../../database/database.constants';
import { MenuService } from './menu.service';

/**
 * 只测纯逻辑分支：类型与字段的匹配规则、建树与祖先补齐。
 * 这些不依赖 SQL，用 mock 喂一份扁平数据就能覆盖真实场景。
 * 查询行为（软删除过滤、环检测读全量）由连真库的验证覆盖。
 */
describe('MenuService', () => {
  let service: MenuService;
  let rows: Record<string, unknown>[];

  const menu = (
    id: number,
    name: string,
    parentId: number | null,
    extra: Record<string, unknown> = {},
  ) => ({
    id,
    name,
    parentId,
    type: 'menu',
    status: 'active',
    sort: 0,
    ...extra,
  });

  beforeEach(async () => {
    rows = [];

    // findAllAlive 走的是 select().from().where().orderBy()
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(rows),
            limit: () => Promise.resolve(rows.slice(0, 1)),
          }),
        }),
      }),
      selectDistinct: () => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({ where: () => Promise.resolve([]) }),
          }),
        }),
      }),
      update: () => ({
        set: () => ({ where: () => Promise.resolve(undefined) }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: DRIZZLE, useValue: db },
        {
          provide: RequestContext,
          useValue: {
            userId: 1,
            auditOnCreate: () => ({ createdBy: 1, updatedBy: 1 }),
            auditOnUpdate: () => ({ updatedBy: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get(MenuService);
  });

  describe('类型与字段的匹配规则', () => {
    const create = (dto: Record<string, unknown>) =>
      service.create(dto as never);

    it('目录不能设置 component', async () => {
      await expect(
        create({ name: 'x', type: 'directory', component: 'a/b' }),
      ).rejects.toThrow(
        new BadRequestException('目录不对应页面，不能设置 component'),
      );
    });

    it('菜单必须有 path', async () => {
      await expect(
        create({ name: 'x', type: 'menu', component: 'a/b' }),
      ).rejects.toThrow(new BadRequestException('菜单必须填写 path'));
    });

    it('静态路由模式下菜单可以不填写 component', async () => {
      rows = [
        menu(17, '组织架构', 1, {
          path: '/system/department',
          component: null,
        }),
      ];

      await expect(
        service.update(17, { name: '组织架构' }),
      ).resolves.toMatchObject({
        id: 17,
        component: null,
      });
    });

    it('外链的 path 必须是完整 URL', async () => {
      await expect(
        create({ name: 'x', type: 'external', path: '/relative' }),
      ).rejects.toThrow(
        new BadRequestException('外链的 path 必须以 http:// 或 https:// 开头'),
      );
    });
  });

  describe('建树', () => {
    it('按父子关系嵌套，根节点在顶层', async () => {
      rows = [
        menu(1, '系统管理', null, { type: 'directory' }),
        menu(2, '用户管理', 1),
        menu(3, '角色管理', 1),
        menu(4, '外部文档', null, { type: 'external' }),
      ];

      const tree = await service.findTree();

      expect(tree.map((n) => n.name)).toEqual(['系统管理', '外部文档']);
      expect(tree[0].children.map((n) => n.name)).toEqual([
        '用户管理',
        '角色管理',
      ]);
      expect(tree[1].children).toEqual([]);
    });
  });

  describe('我的菜单', () => {
    it('超管拿到全部启用菜单，停用的被排除', async () => {
      rows = [
        menu(1, '系统管理', null, { type: 'directory' }),
        menu(2, '用户管理', 1),
        menu(3, '已停用', 1, { status: 'disabled' }),
      ];

      const tree = await service.findUserMenuTree(1, true);

      expect(tree[0].children.map((n) => n.name)).toEqual(['用户管理']);
    });

    it('未授予任何菜单的普通用户拿到空树', async () => {
      rows = [menu(1, '系统管理', null, { type: 'directory' })];

      await expect(service.findUserMenuTree(2, false)).resolves.toEqual([]);
    });
  });
});
