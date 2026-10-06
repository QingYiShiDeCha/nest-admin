import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useRecentVisitsStore } from '../recent-visits';

describe('useRecentVisitsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('最近的一次排在最前', () => {
    const visits = useRecentVisitsStore();

    visits.record('/system/user', '用户管理');
    visits.record('/system/role', '角色管理');

    expect(visits.visits.map((item) => item.path)).toEqual([
      '/system/role',
      '/system/user',
    ]);
  });

  it('重复访问只置顶并刷新标题，不占两个坑', () => {
    const visits = useRecentVisitsStore();

    visits.record('/a', '甲');
    visits.record('/b', '乙');
    visits.record('/a', '甲页改名');

    expect(visits.visits).toEqual([
      { path: '/a', title: '甲页改名' },
      { path: '/b', title: '乙' },
    ]);
  });

  it('超出上限时挤掉最旧的，长度不超过 8', () => {
    const visits = useRecentVisitsStore();

    for (let index = 0; index < 12; index += 1) {
      visits.record(`/page-${index}`, `页面 ${index}`);
    }

    expect(visits.visits).toHaveLength(8);
    expect(visits.visits[0]?.path).toBe('/page-11');
    expect(visits.visits.some((item) => item.path === '/page-3')).toBe(false);
  });

  it('reset 清空，用于退出登录与登录态失效', () => {
    const visits = useRecentVisitsStore();
    visits.record('/a', '甲');

    visits.reset();

    expect(visits.visits).toEqual([]);
  });
});
