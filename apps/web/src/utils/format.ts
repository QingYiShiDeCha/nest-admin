import dayjs from 'dayjs';

/** 列表里的时间戳统一显示格式，空值显示占位符 */
export function formatDateTime(value: string | null | undefined): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';
}
