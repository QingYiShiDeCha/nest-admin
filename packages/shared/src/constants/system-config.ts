export const SYSTEM_CONFIG_VALUE_TYPE = [
  'string',
  'number',
  'boolean',
  'json',
] as const;

export type SystemConfigValueType = (typeof SYSTEM_CONFIG_VALUE_TYPE)[number];
