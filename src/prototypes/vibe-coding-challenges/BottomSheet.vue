<script setup lang="ts">
/**
 * Modal bottom sheet for the app chrome. Codex has no sheet component, so
 * this is the thin shell: scrim + sheet pinned to the bottom of the phone
 * column, slide-up transition, Codex close button, Esc / scrim to dismiss.
 * Content goes in the default slot, actions in `#footer`.
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ title: string }>()

const closeButton = ref<InstanceType<typeof CdxButton> | null>(null)
const titleId = `bottom-sheet-title-${Math.random().toString(36).slice(2, 8)}`

function close(): void {
  open.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      ;(closeButton.value?.$el as HTMLElement | undefined)?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="bottom-sheet">
    <div v-if="open" class="bottom-sheet">
      <div class="bottom-sheet__scrim" aria-hidden="true" @click="close" />
      <section
        class="bottom-sheet__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <header class="bottom-sheet__header">
          <h2 :id="titleId" class="bottom-sheet__title">{{ props.title }}</h2>
          <CdxButton
            ref="closeButton"
            weight="quiet"
            aria-label="Close"
            class="bottom-sheet__close"
            @click="close"
          >
            <CdxIcon :icon="cdxIconClose" />
          </CdxButton>
        </header>

        <div class="bottom-sheet__body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="bottom-sheet__footer">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
/* Same box as the phone column, so the sheet never spills into the gutters. */
.bottom-sheet {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  z-index: 400;
  width: min(412px, 100vw);
  transform: translateX(-50%);
}

.bottom-sheet__scrim {
  position: absolute;
  inset: 0;
  background-color: var(--background-color-backdrop-dark, rgba(0, 0, 0, 0.65));
  opacity: 0.6;
}

.bottom-sheet__panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
  max-height: 90%;
  box-sizing: border-box;
  padding: var(--spacing-150, 24px) var(--spacing-100, 16px) var(--spacing-200, 32px);
  overflow-y: auto;
  /* Large top radius = app sheet convention (not a Codex token). */
  border-radius: 28px 28px 0 0;
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-large, 0 -4px 16px rgba(0, 0, 0, 0.2));
  color: var(--color-base, #202122);
}

.bottom-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
}

/* Codex heading (xx-large) — closest token to the design's sheet title. */
.bottom-sheet__title {
  margin: 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-xx-large, 2.125rem);
}

.bottom-sheet__close {
  flex-shrink: 0;
  /* Centre the button on the title's first line (line box 34px), and pull it
     right so the icon lines up with the content edge. */
  margin-top: calc((var(--line-height-xx-large, 2.125rem) - var(--min-size-interactive-pointer, 32px)) / 2);
  margin-right: calc(-1 * var(--spacing-35, 6px));
}

.bottom-sheet__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
}

.bottom-sheet__footer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.bottom-sheet__footer :deep(.cdx-button) {
  width: 100%;
  max-width: none;
}

/* Slide up; scrim fades. */
.bottom-sheet-enter-active,
.bottom-sheet-leave-active {
  transition: opacity 200ms ease;
}

.bottom-sheet-enter-active .bottom-sheet__panel,
.bottom-sheet-leave-active .bottom-sheet__panel {
  transition: transform 250ms ease;
}

.bottom-sheet-enter-from,
.bottom-sheet-leave-to {
  opacity: 0;
}

.bottom-sheet-enter-from .bottom-sheet__panel,
.bottom-sheet-leave-to .bottom-sheet__panel {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .bottom-sheet-enter-active,
  .bottom-sheet-leave-active,
  .bottom-sheet-enter-active .bottom-sheet__panel,
  .bottom-sheet-leave-active .bottom-sheet__panel {
    transition: none;
  }
}
</style>
