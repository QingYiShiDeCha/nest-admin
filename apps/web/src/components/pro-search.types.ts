export interface SearchableTable<F> {
  filters: F;
  search(): Promise<boolean>;
  reset(): Promise<boolean>;
}

interface BaseFilterField {
  label: string;
  placeholder?: string;
}

type FilterKey<F extends object> = Extract<keyof F, string>;

export type FilterField<F extends object = Record<string, unknown>> =
  | (BaseFilterField & { key: FilterKey<F>; type?: 'input' })
  | (BaseFilterField & {
      key: FilterKey<F>;
      type: 'select';
      options: { label: string; value: string | number }[];
    })
  | (BaseFilterField & {
      key: string;
      type: 'custom';
    });
