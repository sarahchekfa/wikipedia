<script setup lang="ts">
/**
 * "Add the widget to your homescreen" bottom sheet (Figma: WP25 Apps Reading
 * Challenge, node 2461-4082), built from Codex parts. Opens after someone's
 * first join and from "Add widget" on the challenge screen.
 *   Android: "Add" pins the widget straight to the home screen.
 *   iOS: apps can't place widgets, so "Add" reveals the manual steps.
 */
import { computed, ref, watch } from 'vue'
import { CdxButton } from '@wikimedia/codex'

import BottomSheet from './BottomSheet.vue'
import ChallengeWidget from './ChallengeWidget.vue'
import type { ChallengeEntry } from './challenges'
import { useIsIos } from '@/composables/useAppPlatform'

const open = defineModel<boolean>('open', { default: false })
/** `afterJoin`: opened right after joining. */
const props = defineProps<{ entry: ChallengeEntry; afterJoin?: boolean }>()

/** Joined (right now or earlier) → the sheet leads with that. */
const joined = computed(() => props.afterJoin || props.entry.status === 'joined')

const title = computed(() =>
  joined.value ? 'You’ve joined the challenge!' : 'Add the widget to your homescreen',
)
const emit = defineEmits<{ added: [] }>()

const isIos = useIsIos()
const showSteps = ref(false)

watch(open, (isOpen) => {
  if (isOpen) showSteps.value = false
})

const description = computed(() => {
  const what = props.entry.config.goal.kind === 'days' ? 'your streak' : 'your progress'
  if (joined.value) {
    return `You’re now in ${props.entry.config.title}. Add the Reading Challenge widget to your Home Screen to track ${what}.`
  }
  return `To track ${what}, you’ll need to add the Reading Challenge widget from your Home Screen.`
})

const steps = [
  'Touch and hold an empty area of your Home Screen',
  'Tap Edit, then Add Widget',
  'Search for Wikipedia and choose Reading Challenge',
]

function add(): void {
  if (isIos.value) {
    showSteps.value = true
    return
  }
  // Android: the app asks the launcher to pin the widget.
  open.value = false
  emit('added')
}
</script>

<template>
  <BottomSheet v-model:open="open" :title="title">
    <p class="widget-sheet__text">{{ description }}</p>

    <div class="widget-sheet__preview" role="img" aria-label="Reading Challenge widget preview">
      <ChallengeWidget
        :config="entry.config"
        :status="entry.status"
        :read-today="entry.progress.readToday"
      />
    </div>

    <ol v-if="showSteps" class="widget-sheet__steps">
      <li v-for="step in steps" :key="step">{{ step }}</li>
    </ol>

    <template #footer>
      <CdxButton v-if="!showSteps" action="progressive" weight="primary" size="large" @click="add">
        Add
      </CdxButton>
      <CdxButton v-else size="large" @click="open = false">Done</CdxButton>
    </template>
  </BottomSheet>
</template>

<style scoped>
/* Codex body text, subtle */
.widget-sheet__text {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-medium, 1.625rem);
  color: var(--color-subtle, #54595d);
}

/* Soft pink/peach wallpaper behind the widget — illustration colours, not tokens. */
.widget-sheet__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-300, 48px) var(--spacing-100, 16px);
  border-radius: 12px;
  background:
    radial-gradient(circle at 78% 65%, rgba(255, 128, 104, 0.9) 0%, rgba(255, 128, 104, 0) 45%),
    radial-gradient(circle at 15% 85%, rgba(255, 214, 190, 0.9) 0%, rgba(255, 214, 190, 0) 40%),
    linear-gradient(135deg, #f1ecef 0%, #f7d6e1 55%, #f3c0d3 100%);
}

.widget-sheet__steps {
  margin: 0;
  padding-inline-start: var(--spacing-150, 24px);
  color: var(--color-base, #202122);
}

.widget-sheet__steps li + li {
  margin-top: var(--spacing-50, 8px);
}
</style>
