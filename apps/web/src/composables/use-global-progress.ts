import { computed, readonly, ref } from 'vue';

export type GlobalProgressTask = string | symbol;

const SHOW_DELAY = 120;
const COMPLETE_DELAY = 180;
const MAX_RUNNING_PERCENT = 92;

const activeTasks = new Set<GlobalProgressTask>();
const visible = ref(false);
const percent = ref(0);
const activeCount = ref(0);
let showTimer: ReturnType<typeof setTimeout> | undefined;
let completeTimer: ReturnType<typeof setTimeout> | undefined;
let trickleTimer: ReturnType<typeof setInterval> | undefined;

function clearShowTimer(): void {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = undefined;
  }
}

function clearCompleteTimer(): void {
  if (completeTimer) {
    clearTimeout(completeTimer);
    completeTimer = undefined;
  }
}

function clearTrickleTimer(): void {
  if (trickleTimer) {
    clearInterval(trickleTimer);
    trickleTimer = undefined;
  }
}

function reveal(): void {
  showTimer = undefined;
  visible.value = true;
  percent.value = Math.max(percent.value, 8);
  clearTrickleTimer();
  trickleTimer = setInterval(() => {
    const remaining = MAX_RUNNING_PERCENT - percent.value;
    percent.value = Math.min(
      MAX_RUNNING_PERCENT,
      percent.value + Math.max(0.8, remaining * 0.08),
    );
  }, 240);
}

export function startGlobalProgress(
  task: GlobalProgressTask = Symbol('global-progress'),
): GlobalProgressTask {
  if (activeTasks.has(task)) {
    return task;
  }

  activeTasks.add(task);
  activeCount.value = activeTasks.size;
  clearCompleteTimer();

  if (visible.value) {
    percent.value = Math.min(percent.value, MAX_RUNNING_PERCENT);
  } else if (!showTimer) {
    showTimer = setTimeout(reveal, SHOW_DELAY);
  }

  return task;
}

export function finishGlobalProgress(task: GlobalProgressTask): void {
  if (!activeTasks.delete(task)) {
    return;
  }

  activeCount.value = activeTasks.size;
  if (activeTasks.size > 0) {
    return;
  }

  clearShowTimer();
  clearTrickleTimer();

  if (!visible.value) {
    percent.value = 0;
    return;
  }

  percent.value = 100;
  completeTimer = setTimeout(() => {
    completeTimer = undefined;
    visible.value = false;
    percent.value = 0;
  }, COMPLETE_DELAY);
}

export function resetGlobalProgress(): void {
  activeTasks.clear();
  activeCount.value = 0;
  visible.value = false;
  percent.value = 0;
  clearShowTimer();
  clearCompleteTimer();
  clearTrickleTimer();
}

export function useGlobalProgress() {
  return {
    visible: readonly(visible),
    percent: readonly(percent),
    activeCount: readonly(activeCount),
    running: computed(() => activeCount.value > 0),
  };
}
