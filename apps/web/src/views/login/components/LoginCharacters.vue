<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';

defineOptions({ name: 'LoginCharacters' });

type LoginField = 'username' | 'password' | null;
type LoginStatus = 'idle' | 'loading' | 'error';

interface CharacterModule {
  id: string;
  left: string;
  width: string;
  height: string;
  background: string;
  borderRadius: string;
  faceTop: string;
  rotation: number;
  delay: number;
  zIndex: number;
}

const props = withDefaults(
  defineProps<{
    activeField?: LoginField;
    passwordVisible?: boolean;
    hasContent?: boolean;
    status?: LoginStatus;
  }>(),
  {
    activeField: null,
    passwordVisible: false,
    hasContent: false,
    status: 'idle',
  },
);

const characters: readonly CharacterModule[] = [
  {
    id: 'primary',
    left: '7%',
    width: '26%',
    height: '72%',
    background: 'var(--ant-color-primary)',
    borderRadius: '8px 8px 4px 4px',
    faceTop: '17%',
    rotation: -2,
    delay: 0,
    zIndex: 1,
  },
  {
    id: 'success',
    left: '29%',
    width: '25%',
    height: '64%',
    background: 'var(--ant-color-success)',
    borderRadius: '28px 8px 6px 6px',
    faceTop: '17%',
    rotation: -10,
    delay: 90,
    zIndex: 2,
  },
  {
    id: 'info',
    left: '55%',
    width: '27%',
    height: '76%',
    background: 'var(--ant-color-info)',
    borderRadius: '8px 36px 6px 6px',
    faceTop: '16%',
    rotation: 2,
    delay: 180,
    zIndex: 1,
  },
  {
    id: 'warning',
    left: '29%',
    width: '38%',
    height: '34%',
    background: 'var(--ant-color-warning)',
    borderRadius: '44px 44px 8px 8px',
    faceTop: '26%',
    rotation: 0,
    delay: 270,
    zIndex: 4,
  },
];

const entered = ref(false);
const blinkingIndex = ref<number | null>(null);
const reducedMotion = ref(false);
const pointer = reactive({ x: 0, y: 0 });

let entranceTimer: number | undefined;
let blinkTimer: number | undefined;
let reopenTimer: number | undefined;
let pointerFrame: number | undefined;
let pendingPointerX = 0;
let pendingPointerY = 0;
let desktopQuery: MediaQueryList | undefined;
let motionActive = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function handlePointerMove(event: MouseEvent): void {
  pendingPointerX = clamp(event.clientX / window.innerWidth - 0.5, -0.5, 0.5);
  pendingPointerY = clamp(event.clientY / window.innerHeight - 0.5, -0.5, 0.5);

  if (pointerFrame !== undefined) {
    return;
  }

  pointerFrame = window.requestAnimationFrame(() => {
    pointer.x = pendingPointerX;
    pointer.y = pendingPointerY;
    pointerFrame = undefined;
  });
}

function scheduleBlink(): void {
  blinkTimer = window.setTimeout(
    () => {
      blinkingIndex.value = Math.floor(Math.random() * characters.length);
      reopenTimer = window.setTimeout(() => {
        blinkingIndex.value = null;
        scheduleBlink();
      }, 140);
    },
    2400 + Math.random() * 2600,
  );
}

function clearMotionResources(): void {
  if (entranceTimer !== undefined) window.clearTimeout(entranceTimer);
  if (blinkTimer !== undefined) window.clearTimeout(blinkTimer);
  if (reopenTimer !== undefined) window.clearTimeout(reopenTimer);
  if (pointerFrame !== undefined) window.cancelAnimationFrame(pointerFrame);

  entranceTimer = undefined;
  blinkTimer = undefined;
  reopenTimer = undefined;
  pointerFrame = undefined;
  blinkingIndex.value = null;
}

function startMotion(): void {
  if (motionActive || reducedMotion.value) {
    return;
  }

  motionActive = true;
  entered.value = false;
  window.addEventListener('mousemove', handlePointerMove, { passive: true });
  entranceTimer = window.setTimeout(() => {
    entered.value = true;
  }, 80);
  scheduleBlink();
}

function stopMotion(): void {
  if (motionActive) {
    window.removeEventListener('mousemove', handlePointerMove);
  }

  motionActive = false;
  entered.value = true;
  clearMotionResources();
}

function handleDesktopChange(event: MediaQueryListEvent): void {
  if (event.matches) {
    startMotion();
  } else {
    stopMotion();
  }
}

function getGaze(index: number): { x: number; y: number } {
  if (props.status === 'error') {
    return { x: index % 2 === 0 ? -1.5 : 1.5, y: 4 };
  }

  if (props.status === 'loading') {
    return { x: 4.5, y: -2.5 };
  }

  if (props.passwordVisible) {
    return index === characters.length - 1
      ? { x: 4.5, y: 3 }
      : { x: -4, y: -2.5 };
  }

  if (props.activeField === 'password') {
    return { x: 4.5, y: 1.5 };
  }

  if (props.activeField === 'username') {
    return { x: index % 2 === 0 ? 4 : -4, y: 0 };
  }

  if (props.hasContent) {
    return { x: 3.5, y: 0 };
  }

  return {
    x: pointer.x * (8 + index * 0.7),
    y: pointer.y * (5 + index * 0.35),
  };
}

function getPupilStyle(index: number, eye: number): Record<string, string> {
  const gaze = getGaze(index);
  const eyeOffset = eye === 0 ? -0.25 : 0.25;

  return {
    transform: `translate3d(${gaze.x + eyeOffset}px, ${gaze.y}px, 0)`,
  };
}

function getEyeStyle(index: number): Record<string, string> {
  return {
    transform: blinkingIndex.value === index ? 'scaleY(0.08)' : 'scaleY(1)',
  };
}

function getCharacterTransform(
  character: CharacterModule,
  index: number,
): string {
  if (!entered.value) {
    return `translate3d(0, 44px, 0) rotate(${character.rotation}deg) scale(0.88)`;
  }

  let translateX = 0;
  let translateY = 0;
  let rotation = character.rotation;

  if (props.status === 'error') {
    translateX = index % 2 === 0 ? -4 : 4;
    translateY = index % 2 === 0 ? 2 : -2;
    rotation += index % 2 === 0 ? -3 : 3;
  } else if (props.status === 'loading') {
    translateY = index % 2 === 0 ? -5 : -2;
  } else if (props.passwordVisible) {
    translateX = index === characters.length - 1 ? 5 : -3;
    rotation += index === characters.length - 1 ? 2 : -2;
  } else if (props.activeField === 'password') {
    translateX = 3;
    translateY = index % 2 === 0 ? -4 : -1;
    rotation += 1.5;
  } else if (props.activeField === 'username') {
    translateY = index % 2 === 0 ? -3 : 0;
    rotation += index % 2 === 0 ? 1.5 : -1.5;
  }

  return `translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotation}deg) scale(1)`;
}

function getCharacterStyle(
  character: CharacterModule,
  index: number,
): Record<string, string | number> {
  return {
    left: character.left,
    width: character.width,
    height: character.height,
    backgroundColor: character.background,
    borderRadius: character.borderRadius,
    zIndex: character.zIndex,
    opacity: entered.value ? 1 : 0,
    transform: getCharacterTransform(character, index),
    transformOrigin: 'bottom center',
    transitionDelay: reducedMotion.value ? '0ms' : `${character.delay}ms`,
  };
}

onMounted(() => {
  reducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  if (reducedMotion.value) {
    entered.value = true;
    return;
  }

  desktopQuery = window.matchMedia('(min-width: 1024px)');
  desktopQuery.addEventListener('change', handleDesktopChange);

  if (desktopQuery.matches) {
    startMotion();
  } else {
    entered.value = true;
  }
});

onBeforeUnmount(() => {
  desktopQuery?.removeEventListener('change', handleDesktopChange);
  stopMotion();
});
</script>

<template>
  <div
    class="relative aspect-[11/8] w-full max-w-[560px] select-none"
    aria-hidden="true"
  >
    <div
      v-for="(character, index) in characters"
      :key="character.id"
      class="absolute bottom-0 overflow-hidden shadow-sm transition duration-500 ease-out"
      :style="getCharacterStyle(character, index)"
    >
      <div
        class="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        :style="{ top: character.faceTop }"
      >
        <div class="flex gap-2.5">
          <span
            v-for="eye in 2"
            :key="eye"
            class="h-5 w-5 grid place-items-center overflow-hidden rounded-full bg-white transition-transform duration-150"
            :style="getEyeStyle(index)"
          >
            <span
              class="h-2 w-2 rounded-full bg-black/75 transition-transform duration-150"
              :style="getPupilStyle(index, eye - 1)"
            />
          </span>
        </div>

        <span
          v-if="status === 'error'"
          class="h-3 w-7 border-t-2 border-solid rounded-t-full border-black/75"
        />
        <span
          v-else-if="status === 'loading'"
          class="h-2 w-2 rounded-full bg-black/75"
        />
        <span
          v-else-if="passwordVisible && index !== characters.length - 1"
          class="h-1 w-6 rounded-full bg-black/75"
        />
        <span v-else class="h-2.5 w-7 rounded-b-full bg-black/75" />
      </div>
    </div>
  </div>
</template>
