import {
  DashboardOutlined,
  FileTextOutlined,
  IdcardOutlined,
  MenuOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@antdv-next/icons';
import type { Component } from 'vue';

/**
 * 侧边栏图标注册表：sys_menu.icon 存的是这里的键名。
 *
 * 刻意不用 import * as icons from '@antdv-next/icons' 再按名字索引——
 * 那样等于把整套图标（几百个组件）全打进产物，tree-shaking 失效。
 * 用显式注册表换来的代价是加图标要在这里补一行，收益是产物里只有真正用到的。
 *
 * 库里没登记的名字会被当成「没有图标」渲染，不会让整个菜单崩掉：
 * 图标是装饰，不该因为数据库里写错一个名字就打不开后台。
 */
export const MENU_ICONS: Readonly<Record<string, Component>> = {
  DashboardOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
  FileTextOutlined,
  IdcardOutlined,
};

export function resolveMenuIcon(name: string | null): Component | undefined {
  if (!name) {
    return undefined;
  }

  const icon = MENU_ICONS[name];

  if (!icon && import.meta.env.DEV) {
    console.warn(`[menu] 未登记的图标名 "${name}"，请在 menu-icons.ts 补充`);
  }

  return icon;
}
