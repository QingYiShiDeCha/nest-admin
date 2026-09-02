export const SYSTEM_SERVICE_STATUS = ['up', 'down', 'unconfigured'] as const;

export type SystemServiceStatus = (typeof SYSTEM_SERVICE_STATUS)[number];

/** 一次依赖探测的结果。未启用的可选依赖不等同于故障。 */
export interface SystemServiceProbe {
  status: SystemServiceStatus;
  latencyMs: number | null;
}

/** 部署主机的非敏感基础信息。 */
export interface SystemMonitorHost {
  hostname: string;
  platform: string;
  arch: string;
  cpuCount: number;
  uptimeSeconds: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
}

/** 当前 Node.js 进程信息。 */
export interface SystemMonitorProcess {
  pid: number;
  nodeVersion: string;
  uptimeSeconds: number;
  rssBytes: number;
  heapTotalBytes: number;
  heapUsedBytes: number;
  externalBytes: number;
  cpuUsagePercent: number;
}

/** 运行时采样仅保留在当前实例内存中，供页面绘制短期趋势。 */
export interface SystemMonitorMetric {
  timestamp: string;
  cpuUsagePercent: number;
  heapUsagePercent: number;
  hostMemoryUsagePercent: number;
}

export interface SystemMonitorWorkload {
  onlineSessions: number | null;
  scheduledTasks: number | null;
  activeScheduledTasks: number | null;
  runningTaskExecutions: number | null;
}

/** 系统监控页面使用的一次完整快照。 */
export interface SystemMonitorOverview {
  generatedAt: string;
  host: SystemMonitorHost;
  process: SystemMonitorProcess;
  services: {
    database: SystemServiceProbe;
    redis: SystemServiceProbe;
  };
  workload: SystemMonitorWorkload;
  history: SystemMonitorMetric[];
}
