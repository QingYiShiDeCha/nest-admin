import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import {
  providePageRefresh,
  usePageRefresh,
} from '@/composables/use-page-refresh';

describe('page refresh', () => {
  it('并行执行当前页面注册的数据刷新函数', async () => {
    const first = vi.fn(async () => true);
    const second = vi.fn(async () => true);
    let refresh!: () => Promise<void>;

    const Child = defineComponent({
      setup() {
        usePageRefresh(first);
        usePageRefresh(second);
        return () => h('div', '页面');
      },
    });
    const Parent = defineComponent({
      setup() {
        const controller = providePageRefresh();
        refresh = controller.refresh;
        return () => h(Child);
      },
    });

    const wrapper = mount(Parent);
    await refresh();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();

    wrapper.unmount();
    await refresh();
    await flushPromises();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('刷新执行期间忽略重复触发', async () => {
    let resolve!: () => void;
    const handler = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    let refresh!: () => Promise<void>;

    const Child = defineComponent({
      setup() {
        usePageRefresh(handler);
        return () => h('div');
      },
    });
    const Parent = defineComponent({
      setup() {
        refresh = providePageRefresh().refresh;
        return () => h(Child);
      },
    });

    mount(Parent);
    const first = refresh();
    await refresh();

    expect(handler).toHaveBeenCalledOnce();
    resolve();
    await first;
  });

  it('KeepAlive 切换后只刷新当前活动页面', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const showFirst = ref(true);
    let refresh!: () => Promise<void>;

    const FirstPage = defineComponent({
      name: 'FirstPage',
      setup() {
        usePageRefresh(first);
        return () => h('div', '第一页');
      },
    });
    const SecondPage = defineComponent({
      name: 'SecondPage',
      setup() {
        usePageRefresh(second);
        return () => h('div', '第二页');
      },
    });
    const Parent = defineComponent({
      setup() {
        refresh = providePageRefresh().refresh;
        return () =>
          h(KeepAlive, null, () => h(showFirst.value ? FirstPage : SecondPage));
      },
    });

    mount(Parent);
    await refresh();
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();

    showFirst.value = false;
    await nextTick();
    await refresh();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});
