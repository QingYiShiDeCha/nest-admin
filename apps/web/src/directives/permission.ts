import type { Directive } from 'vue';

import { checkPermission, type PermissionInput } from '@/composables/use-permission';

/**
 * v-permission="'system:user:create'" 或 v-permission="[码A, 码B]"（满足其一）
 *
 * 无权限时把元素从 DOM 里摘掉，而不是 display:none——留在 DOM 里的按钮
 * 仍然能被键盘聚焦、被读屏软件读到，用户碰得到却点不动，比看不见更糟。
 *
 * 两点必须清楚：
 *
 * 1. 这只是界面层的取舍，不是安全边界。真正拦请求的是后端 PermissionGuard。
 *    摘掉按钮只是别让用户点了才吃 403，绕过前端这层没有任何意义。
 * 2. 只在 mounted 判定一次，之后权限变了不会自动恢复——节点位置已经丢了，
 *    没法再插回去。实际影响很小：切路由和重新登录都会重建组件。需要随状态
 *    开合的场景请用 v-if="can(...)"，那条路径是响应式的。
 */
export const vPermission: Directive<HTMLElement, PermissionInput> = {
  mounted(el, binding) {
    if (import.meta.env.DEV && !binding.value?.length) {
      // 失败开放（见 checkPermission），所以空值不会隐藏元素，
      // 但它几乎总是笔误，开发期喊一声省得对着「怎么没生效」发呆
      console.warn('[v-permission] 权限码为空，该元素不会受控', el);
    }

    if (checkPermission(binding.value)) {
      return;
    }

    el.remove();
  },
};

/**
 * 让模板里的 v-permission 也参与类型检查：传错类型（比如给个对象）
 * vue-tsc 会直接报错，而不是运行到浏览器里静默失效。
 */
declare module 'vue' {
  interface GlobalDirectives {
    vPermission: typeof vPermission;
  }
}
