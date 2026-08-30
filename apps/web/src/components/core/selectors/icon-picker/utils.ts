import type { IconPickerOption } from './types';

export function filterIconOptions(
  options: readonly IconPickerOption[],
  keyword: string,
): readonly IconPickerOption[] {
  const query = keyword.trim().toLowerCase();
  if (!query) return options;

  return options.filter((option) =>
    [option.value, option.icon, option.label, option.keywords]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query),
  );
}
