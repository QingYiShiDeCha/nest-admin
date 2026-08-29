import { computed } from 'vue';

import type { PermissionCode } from '@nest-admin/shared';
import { useAuthStore } from '@/stores/auth';

/** 允许传单个码或一组码，一组时满足其一即可 */
export type PermissionInput =
  | PermissionCode
  | string
  | readonly (PermissionCode | string)[];

/**
 * 权限判定的唯一实现。
 *
 * v-permission 指令和模板里的 v-if 都走这里，不各自写一份判断——
 * 两处语义一旦漂移（比如一边是「全部满足」一边是「满足其一」），
 * 就会出现按钮显示了但点下去被后端 403 的割裂体验。
 *
 * 可以在组件外调用：pinia 装好之后 useAuthStore() 不要求 setup 上下文。
 */
export function checkPermission(value: PermissionInput): boolean {
  const codes = typeof value === 'string' ? [value] : value;

  // 没写码等于不限制。这里刻意「失败开放」而不是隐藏：真正的关卡在后端
  // PermissionGuard，前端漏判最多是多显示一个点了会 403 的按钮；
  // 反过来若默认隐藏，写错码的按钮会无声消失，排查起来非常费劲
  if (codes.length === 0) {
    return true;
  }

  return useAuthStore().hasAnyPermission([...codes]);
}

/**
 * 页面里做权限判断用这个。
 *
 * can() 在模板中调用是响应式的：渲染时读到了 auth.permissions，
 * profile 变化会触发重渲染。
 */
export function usePermission() {
  const auth = useAuthStore();

  return {
    isSuperAdmin: computed(() => auth.isSuperAdmin),
    permissions: computed(() => auth.permissions),
    can: checkPermission,
  };
}
