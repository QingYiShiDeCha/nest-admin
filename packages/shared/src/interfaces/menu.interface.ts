import type { MenuType } from '../constants/rbac';
import type { Status } from '../constants/status';

/**
 * 菜单的「线上格式」契约，见 user.interface.ts 的说明。
 *
 * children 是 service 层 buildTree 在运行时拼的，不是数据库字段，
 * 所以后端的树节点类型是「行类型 + children」，这里同理。
 */
export interface MenuRecord {
  id: number;
  parentId: number | null;
  name: string;
  type: MenuType;
  path: string | null;
  component: string | null;
  icon: string | null;
  sort: number;
  visible: boolean;
  keepAlive: boolean;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

/** /menus/mine 与 /menus 返回的树节点 */
export interface MenuNode extends MenuRecord {
  children: MenuNode[];
}
