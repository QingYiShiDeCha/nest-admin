import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  finishGlobalProgress,
  resetGlobalProgress,
  startGlobalProgress,
  useGlobalProgress,
} from '@/composables/use-global-progress';

describe('useGlobalProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetGlobalProgress();
  });

  afterEach(() => {
    resetGlobalProgress();
    vi.useRealTimers();
  });

  it('短任务在延迟时间内完成时不显示进度条', () => {
    const progress = useGlobalProgress();
    const task = startGlobalProgress();

    expect(progress.activeCount.value).toBe(1);
    vi.advanceTimersByTime(100);
    finishGlobalProgress(task);
    vi.runAllTimers();

    expect(progress.visible.value).toBe(false);
    expect(progress.percent.value).toBe(0);
    expect(progress.activeCount.value).toBe(0);
  });

  it('并发长任务全部结束后才完成并隐藏', () => {
    const progress = useGlobalProgress();
    const first = startGlobalProgress('first');
    const second = startGlobalProgress('second');

    vi.advanceTimersByTime(120);
    expect(progress.visible.value).toBe(true);
    expect(progress.percent.value).toBeGreaterThanOrEqual(8);

    vi.advanceTimersByTime(480);
    expect(progress.percent.value).toBeGreaterThan(8);

    finishGlobalProgress(first);
    expect(progress.activeCount.value).toBe(1);
    expect(progress.percent.value).toBeLessThan(100);

    finishGlobalProgress(second);
    expect(progress.percent.value).toBe(100);

    vi.advanceTimersByTime(180);
    expect(progress.visible.value).toBe(false);
    expect(progress.percent.value).toBe(0);
  });
});
