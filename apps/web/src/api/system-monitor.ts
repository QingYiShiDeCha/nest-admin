import type { SystemMonitorOverview } from '@nest-admin/shared';

import { httpGet } from '@/api/http';

export function apiSystemMonitorOverview(): Promise<SystemMonitorOverview> {
  return httpGet<SystemMonitorOverview>('/system-monitor/overview');
}
