export const SYSTEM_CONFIG_VALUE_TYPE = [
  'string',
  'number',
  'boolean',
  'json',
] as const;

export type SystemConfigValueType = (typeof SYSTEM_CONFIG_VALUE_TYPE)[number];

export const DEFAULT_SYSTEM_NAME = 'Nest Admin';

export const SYSTEM_CONFIG_KEYS = {
  SYSTEM_NAME: 'system.name',
  DEFAULT_PAGE_SIZE: 'system.pagination.default_page_size',
} as const;

export type SystemConfigKey =
  (typeof SYSTEM_CONFIG_KEYS)[keyof typeof SYSTEM_CONFIG_KEYS];
