import dayjs from 'dayjs';

/** 列表里的时间戳统一显示格式，空值显示占位符 */
export function formatDateTime(value: string | null | undefined): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';
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
