import type { PermissionCode } from '@nest-admin/shared';

/**
 * vue-router 的 RouteMeta 全局增强，集中在此而不是散落在使用处。
 *
 * 放独立文件的直接原因：模块增强只对「声明文件被包含进编译」的程序可见。
 * 此前声明写在 router/routes.ts，而 vitest 项目（tsconfig.vitest）只为
 * spec 编译应用代码，程序里没有 routes.ts，导致同一个文件在 --build 与
 * 单项目两种编译模式下类型行为不一致（tabs.ts 踩过）。
 * 声明挪到这里后，tsconfig.vitest 显式 include 本文件，所有上下文一致。
 *
 * 字段语义：
 * - public：无需登录（登录页、错误页），也不产生页签
 * - permission：进入页面所需权限码，守卫统一消费；用 PermissionCode
 *   字面量类型约束，前端固定路由写错码会在编译期报错
 * - affix：页签钉住（首页），不可关闭、不受「关闭全部」影响
 * - keepAlive + cacheName：该页参与 KeepAlive 缓存，cacheName 是组件
 *   defineOptions 的名字（KeepAlive 按组件名匹配）
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题：浏览器标签与页签共用，所有路由必填 */
    title: string;
    public?: boolean;
    permission?: PermissionCode;
    /** 侧边栏图标，Remix Icon 名称（menu-icons 注册表的键） */
    icon?: string;
    affix?: boolean;
    keepAlive?: boolean;
    cacheName?: string;
  }
}
