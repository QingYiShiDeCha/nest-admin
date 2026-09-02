import {
  getCurrentInstance,
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  provide,
  readonly,
  ref,
  type InjectionKey,
  type Ref,
} from 'vue';

export type PageRefreshHandler = () => Promise<unknown> | unknown;

interface PageRefreshContext {
  register(handler: PageRefreshHandler): () => void;
}

interface PageRefreshController {
  refreshing: Readonly<Ref<boolean>>;
  refresh(): Promise<void>;
}

const PAGE_REFRESH_KEY: InjectionKey<PageRefreshContext> = Symbol(
  'page-refresh-context',
);

export function providePageRefresh(): PageRefreshController {
  const handlers = new Set<PageRefreshHandler>();
  const refreshing = ref(false);

  provide(PAGE_REFRESH_KEY, {
    register(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  });

  async function refresh(): Promise<void> {
    if (refreshing.value) return;

    refreshing.value = true;
    try {
      await Promise.allSettled(
        [...handlers].map((handler) => Promise.resolve().then(handler)),
      );
    } finally {
      refreshing.value = false;
    }
  }

  return { refreshing: readonly(refreshing), refresh };
}

export function usePageRefresh(handler: PageRefreshHandler): void {
  if (!getCurrentInstance()) return;

  const context = inject(PAGE_REFRESH_KEY, null);
  if (!context) return;

  let unregister: (() => void) | undefined;
  const activate = () => {
    unregister ??= context.register(handler);
  };
  const deactivate = () => {
    unregister?.();
    unregister = undefined;
  };

  onMounted(activate);
  onActivated(activate);
  onDeactivated(deactivate);
  onUnmounted(deactivate);
}
