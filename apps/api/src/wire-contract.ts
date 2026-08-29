import type {
  BasicUser,
  LoginResult,
  MenuNode,
  MenuRecord,
  OperationLog,
  Role,
  RoleDetail,
  UserProfile,
} from '@nest-admin/shared';
import type {
  MenuRow,
  OperationLogRow,
  RoleRow,
  SafeUser,
} from '@nest-admin/database';
import type { AuthUser } from './modules/auth/interfaces/auth-user.interface';
import type { AuthResult } from './modules/auth/interfaces/jwt-payload.interface';
import type { MenuTreeNode } from './modules/rbac/menu.service';
import type { RoleDetail as BackendRoleDetail } from './modules/rbac/role.service';

/**
 * 线上契约与数据库行类型的编译期绑定。
 *
 * @nest-admin/shared 里的接口描述的是 HTTP 报文（时间戳是 ISO 字符串），
 * database 包的 $inferSelect 行类型里时间是 Date。序列化由 JSON.stringify
 * 在运行时默默完成，类型层面没人强制——这里用 Serialized 映射补上这道桥：
 * database 的列一改（改名、删列、类型变化），下面的断言就会编译失败，
 * 提醒同步 shared 里的契约，而不是等前端在运行时拿到 undefined 才发现。
 *
 * 注意方向：只断言「行类型序列化后可赋给契约」。后端给行多加字段
 * （新增列）不会报错——契约声明的是客户端消费的子集，加字段是向后兼容的。
 */
// 逐值转换：可空时间戳（Date | null）靠条件类型对联合的分发逐一处理
// （Date -> string，null -> null）；对象与数组递归下去，嵌套的行对象
// （如 AuthResult.user）和树节点（如 MenuTreeNode.children）才能整体对齐。
type SerializedValue<V> = V extends Date
  ? string
  : V extends (infer U)[]
    ? Serialized<U>[]
    : V extends object
      ? Serialized<V>
      : V;

type Serialized<T> = {
  [K in keyof T]: SerializedValue<T[K]>;
};

type Assert<T extends true> = T;

// ---- 用户 ----
type BasicUserContract = Assert<
  Serialized<SafeUser> extends BasicUser ? true : false
>;
type UserProfileContract = Assert<
  Serialized<AuthUser> extends UserProfile ? true : false
>;
type LoginResultContract = Assert<
  Serialized<AuthResult> extends LoginResult ? true : false
>;

// ---- 角色 ----
type RoleContract = Assert<Serialized<RoleRow> extends Role ? true : false>;
type RoleDetailContract = Assert<
  Serialized<BackendRoleDetail> extends RoleDetail ? true : false
>;

// ---- 菜单 ----
type MenuRecordContract = Assert<
  Serialized<MenuRow> extends MenuRecord ? true : false
>;
type MenuNodeContract = Assert<
  Serialized<MenuTreeNode> extends MenuNode ? true : false
>;

// ---- 操作日志 ----
type OperationLogContract = Assert<
  Serialized<OperationLogRow> extends OperationLog ? true : false
>;

// 引用一遍，防止被认为未使用而被工具清理；同时让 IDE 悬停可查
export type WireContractChecks = [
  BasicUserContract,
  UserProfileContract,
  LoginResultContract,
  RoleContract,
  RoleDetailContract,
  MenuRecordContract,
  MenuNodeContract,
  OperationLogContract,
];
