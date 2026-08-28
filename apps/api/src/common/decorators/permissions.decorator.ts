import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@nest-admin/shared';

export const PERMISSIONS_KEY = 'rbac:permissions';

/**
 * 声明访问该接口所需的权限码。
 *
 * 传多个码表示「任意满足其一即可」，用于同一入口支持多种操作的场景。
 * 需要「同时满足」的语义时，请拆成更细的权限码，而不是在这里叠加——
 * 前者在权限分配界面上是可见可解释的，后者是隐式规则。
 *
 * 未标注该装饰器的接口只要登录即可访问；无需登录的用 @Public()。
 */
export const Permissions = (...codes: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
