import type { Status } from '../constants/status';

/** 部门线上契约。树接口在基础字段上补充 children 与直属用户数。 */
export interface Department {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  leaderId: number | null;
  leaderName: string | null;
  phone: string | null;
  email: string | null;
  sort: number;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
  userCount: number;
}

/** 部门迁移历史。名称均为迁移发生时的快照，后续改名不影响历史。 */
export interface DepartmentTransfer {
  id: number;
  deptId: number;
  deptName: string;
  fromParentId: number | null;
  fromParentName: string | null;
  toParentId: number | null;
  toParentName: string | null;
  reason: string;
  operatorId: number | null;
  operatorName: string | null;
  createdAt: string;
}
