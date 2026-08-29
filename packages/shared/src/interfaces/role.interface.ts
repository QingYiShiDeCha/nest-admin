import type { DataScope } from '../constants/rbac';
import type { Status } from '../constants/status';

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
}

/** 权限码目录项，角色授权界面按 module 分组展示 */
export interface PermissionCatalogItem {
  id: number;
  code: string;
  name: string;
  module: string | null;
}
