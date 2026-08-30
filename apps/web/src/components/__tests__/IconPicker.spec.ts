import { describe, expect, it } from 'vitest';
import { icons as remixIcons } from '@iconify-json/ri';

import { filterIconOptions } from '@/components/core/selectors/icon-picker/utils';
import { MENU_ICONS, MENU_ICON_OPTIONS } from '@/layouts/menu-icons';

describe('IconPicker', () => {
  it('只提供精选的常用 Remix 图标', () => {
    expect(MENU_ICON_OPTIONS.length).toBeGreaterThanOrEqual(40);
    expect(MENU_ICON_OPTIONS.length).toBeLessThan(100);
    expect(Object.keys(MENU_ICONS)).toHaveLength(MENU_ICON_OPTIONS.length);
    expect(new Set(Object.values(MENU_ICONS)).size).toBe(
      MENU_ICON_OPTIONS.length,
    );

    for (const option of MENU_ICON_OPTIONS) {
      const iconName = option.icon.replace(/^i-ri:/, '');

      expect(remixIcons.icons, `${option.value} 对应的图标不存在`).toHaveProperty(
        iconName,
      );
    }
  });

  it('支持按中文名称、组件名和 Remix class 搜索', () => {
    expect(filterIconOptions(MENU_ICON_OPTIONS, '设置')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'RiSettings3Line' }),
      ]),
    );
    expect(filterIconOptions(MENU_ICON_OPTIONS, 'user')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'RiUser3Line' }),
      ]),
    );
    expect(filterIconOptions(MENU_ICON_OPTIONS, 'shopping-cart')).toEqual([
      expect.objectContaining({ value: 'RiShoppingCart2Line' }),
    ]);
  });

  it('空搜索返回完整清单', () => {
    expect(filterIconOptions(MENU_ICON_OPTIONS, '  ')).toBe(MENU_ICON_OPTIONS);
  });
});
