import type { DashboardStatistics } from '@nest-admin/shared';

import { httpGet } from '@/api/http';

export function apiDashboardStatistics(): Promise<DashboardStatistics> {
  return httpGet<DashboardStatistics>('/statistics/dashboard');
}
