import dayjs from 'dayjs';

/**
 * API 返回的时间戳是数据库墙钟时间的 ISO 字符串（时区标记不可靠）。
 * 去掉时区标记后按原样解析显示，不做时区换算——
 * 否则 dayjs 会把它当 UTC 再叠加本地时区偏移，造成 +8 小时的双重偏移。
 */
function parseApiTime(value: string): dayjs.Dayjs {
  return dayjs(value.replace(/(Z|[+-]\d{2}:?\d{2})$/i, ''));
}

/** 列表里的时间戳统一显示格式，空值显示占位符 */
export function formatDateTime(value: string | null | undefined): string {
  return value ? parseApiTime(value).format('YYYY-MM-DD HH:mm:ss') : '—';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  const digits = unitIndex === 0 || value >= 10 ? 0 : 1;

  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}