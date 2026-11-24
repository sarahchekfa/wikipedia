<script setup lang="ts">
/**
 * Reviewer-only panel (not part of the app UI): jump between variants and
 * challenge states without playing through a month. Floats outside the phone
 * column on wide screens.
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  CdxButton,
  CdxCheckbox,
  CdxField,
  CdxIcon,
  CdxRadio,
  CdxSelect,
  CdxToggleSwitch,
} from '@wikimedia/codex'
import { cdxIconClose, cdxIconSettings } from '@wikimedia/codex-icons'

import {
  ALL_CHALLENGES,
  APP_LANGUAGE_OPTIONS,
  demo,
  isLongTerm,
  languageLabel,
  resetDemo,
  statusOf,
  type ChallengeStatus,
  type ChallengeVariant,
  type PrototypeVersion,
} from './challenges'

const expanded = ref(false)

const VERSIONS: { value: PrototypeVersion; label: string }[] = [
  { value: 'phase1', label: 'Phase 1' },
  { value: 'longterm', label: 'Long term (full version)' },
]

const VARIANTS: { value: ChallengeVariant; label: string }[] = [
  { value: 'streak', label: 'B: Daily streak (25 days)' },
  { value: 'minutes', label: 'C: Minutes read (300 min)' },
]

const STATUSES: { value: ChallengeStatus; label: string }[] = [
  { value: 'available', label: 'Not joined' },
  { value: 'joined', label: 'Joined, ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Ended, not completed' },
]

const route = useRoute()

/** Long term: which challenge the state radios edit — follows the details screen. */
const selectedId = ref<string>(ALL_CHALLENGES[0].id)
watch(
  () => route.query.id,
  (id) => {
    if (typeof id === 'string' && ALL_CHALLENGES.some((c) => c.id === id)) selectedId.value = id
  },
  { immediate: true },
)

const challengeItems = computed(() =>
  ALL_CHALLENGES.map((config) => ({
    value: config.id,
    label: `${config.title} (${languageLabel(config)})`,
  })),
)

const selectedStatus = computed(() => {
  if (!isLongTerm.value) return demo.status
  const config = ALL_CHALLENGES.find((c) => c.id === selectedId.value)
  return config ? statusOf(config) : 'available'
})

/** The real next month's name, e.g. "December". */
const NEXT_MONTH_NAME = (() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', {
    month: 'long',
  })
})()

/**
 * Switch to / from next month. A new month means a new challenge the reader
 * hasn't joined, so its state starts fresh. Dates are fixed at load → reload.
 */
function setNextMonth(value: boolean): void {
  Object.assign(demo, { nextMonth: value, status: 'available', readToday: false, historyCleared: false })
  try {
    localStorage.setItem('vibe-coding-challenges:state', JSON.stringify(demo))
  } catch {
    /* storage unavailable */
  }
  window.location.reload()
}

function setStatus(value: ChallengeStatus): void {
  if (isLongTerm.value) demo.statuses[selectedId.value] = value
  else demo.status = value
  demo.historyCleared = false
}
</script>

<template>
  <Teleport to="body">
    <aside class="proto-controls" :class="{ 'proto-controls--open': expanded }">
      <CdxButton
        v-if="!expanded"
        class="proto-controls__toggle"
        aria-label="Show prototype controls"
        @click="expanded = true"
      >
        <CdxIcon :icon="cdxIconSettings" />
        <span class="proto-controls__toggle-label">Prototype</span>
      </CdxButton>

      <div v-else class="proto-controls__panel">
        <div class="proto-controls__header">
          <strong>Prototype controls</strong>
          <CdxButton weight="quiet" aria-label="Hide prototype controls" @click="expanded = false">
            <CdxIcon :icon="cdxIconClose" />
          </CdxButton>
        </div>

        <CdxField :is-fieldset="true">
          <template #label>Version</template>
          <CdxRadio
            v-for="option in VERSIONS"
            :key="option.value"
            v-model="demo.version"
            name="proto-version"
            :input-value="option.value"
          >
            {{ option.label }}
          </CdxRadio>
        </CdxField>

        <CdxField v-if="!isLongTerm" :is-fieldset="true">
          <template #label>Variant</template>
          <CdxRadio
            v-for="option in VARIANTS"
            :key="option.value"
            v-model="demo.variant"
            name="proto-variant"
            :input-value="option.value"
          >
            {{ option.label }}
          </CdxRadio>
        </CdxField>

        <CdxField v-if="isLongTerm">
          <template #label>Challenge</template>
          <CdxSelect v-model:selected="selectedId" :menu-items="challengeItems" />
        </CdxField>

        <CdxField :is-fieldset="true">
          <template #label>Challenge state</template>
          <CdxRadio
            v-for="option in STATUSES"
            :key="option.value"
            :model-value="selectedStatus"
            name="proto-status"
            :input-value="option.value"
            @update:model-value="setStatus"
          >
            {{ option.label }}
          </CdxRadio>
        </CdxField>

        <CdxToggleSwitch v-model="demo.loggedIn">Logged in</CdxToggleSwitch>
        <CdxToggleSwitch v-model="demo.readToday">Read today</CdxToggleSwitch>

        <!-- Phase 1: what readers see if the challenge is still live next month -->
        <CdxToggleSwitch
          v-if="!isLongTerm"
          :model-value="demo.nextMonth"
          @update:model-value="setNextMonth"
        >
          Show in {{ NEXT_MONTH_NAME }} (new challenge)
        </CdxToggleSwitch>

        <template v-if="isLongTerm">
          <CdxField :is-fieldset="true">
            <template #label>App languages</template>
            <CdxCheckbox
              v-for="option in APP_LANGUAGE_OPTIONS"
              :key="option.code"
              v-model="demo.appLanguages"
              :input-value="option.code"
            >
              {{ option.label }}
            </CdxCheckbox>
          </CdxField>
          <CdxToggleSwitch v-model="demo.canEditConfig">Can edit challenge config</CdxToggleSwitch>
        </template>

        <RouterLink to="/vibe-coding-challenges/widgets">Widget mockup</RouterLink>

        <div class="proto-controls__buttons">
          <CdxButton @click="demo.onboardingSeen = false">Replay intro</CdxButton>
          <CdxButton action="destructive" @click="resetDemo">Reset all</CdxButton>
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<style scoped>
.proto-controls {
  position: fixed;
  bottom: var(--spacing-100, 16px);
  left: var(--spacing-100, 16px);
  z-index: 1000;
}

/* Phone-width viewport: sit above the bottom nav instead of on top of it. */
@media (max-width: 479px) {
  .proto-controls {
    bottom: 88px;
    left: auto;
    right: var(--spacing-50, 8px);
  }

  .proto-controls__toggle-label {
    display: none;
  }
}

.proto-controls__toggle {
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.2));
}

.proto-controls__panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  box-sizing: border-box;
  width: 260px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.2));
  color: var(--color-base, #202122);
  font-size: var(--font-size-small, 0.875rem);
}

.proto-controls__panel :deep(.cdx-field) {
  margin-top: 0;
}

.proto-controls__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.proto-controls__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
}
</style>
