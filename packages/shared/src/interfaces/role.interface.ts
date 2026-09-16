import type { DataScope } from '../constants/rbac';
import type { Status } from '../constants/status';
import type { MenuNode } from './menu.interface';

/**
 * 角色与权限目录的「线上格式」契约，见 user.interface.ts 的说明。
 */

/** sys_role 行（列表页用，不含关联数据） */
export interface Role {
  id: number;
  code: string;
  name: string;
  sort: number;
  status: Status;
  dataScope: DataScope;
  isSystem: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /roles/:id：角色本体 + 已授权的权限码与菜单 id，供授权界面回显 */
export interface RoleDetail extends Role {
  permissionIds: number[];
  menuIds: number[];
  departmentIds: number[];
}

/** 权限码目录项，角色授权界面按 module 分组展示 */
export interface PermissionCatalogItem {
  id: number;
  code: string;
  name: string;
  module: string | null;
}

/**
 * GET /roles/:id/grants：角色授权界面的聚合读接口。
 *
 * 授权界面必须同时拿到三样东西：角色已授权的 permissionIds / menuIds（回显）、
 * 可授权的权限码目录与完整菜单树（候选项）。拆成三个接口时，调用方除了
 * system:role:assign 还得分别持有 system:permission:list 与 system:menu:list，
 * 三个码缺一个授权界面就残废——而这两个码在界面上没有对应的菜单入口，
 * 分配角色权限时极易漏掉，表现成「明明给了授权权限，点授权却什么都打不开」。
 * 合成一个接口后整个授权能力只由 system:role:assign 管辖，
 * 与「授权」按钮的显示条件一一对应。
 */
export interface RoleGrants {
  /** 角色当前已授权的权限码 id */
  permissionIds: number[];
  /** 角色当前已授权的菜单 id */
  menuIds: number[];
  /** 可授权的权限码目录 */
  catalog: PermissionCatalogItem[];
  /** 可授权的完整菜单树（含停用与隐藏节点，可勾性由前端判断） */
  menuTree: MenuNode[];
}
