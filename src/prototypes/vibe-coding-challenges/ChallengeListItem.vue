<script setup lang="ts">
/** One row on Browse challenges: badge, title, host, language, status — and Join if not joined. */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconCheck } from '@wikimedia/codex-icons'

import AchievementBadge from './AchievementBadge.vue'
import { DETAILS_PATH, languageLabel, type ChallengeEntry } from './challenges'

const props = defineProps<{ entry: ChallengeEntry }>()
const emit = defineEmits<{ join: [id: string] }>()
const router = useRouter()

/**
 * One trailing button for every state, same size and spot:
 * not joined → blue "Join" (joins); otherwise a neutral status button
 * ("Joined" / "Completed" / "Ended") that opens the challenge.
 */
const statusButton = computed(() => {
  switch (props.entry.status) {
    case 'joined':
      return { label: 'Joined', icon: cdxIconCheck }
    case 'completed':
      return { label: 'Completed', icon: cdxIconCheck }
    case 'expired':
      return { label: 'Ended', icon: null }
    default:
      return null
  }
})

function open(): void {
  router.push({ path: DETAILS_PATH, query: { id: props.entry.config.id, from: 'browse' } })
}
</script>

<template>
  <!-- Row opens the challenge; challenges not joined yet also get a Join button. -->
  <div class="challenge-list-item">
    <button type="button" class="challenge-list-item__main" @click="open">
      <AchievementBadge
        :achievement="entry.config.achievement"
        :locked="entry.status !== 'completed'"
        size="small"
      />
      <span class="challenge-list-item__text">
        <strong>{{ entry.config.title }}</strong>
        <span class="challenge-list-item__host">Hosted by {{ entry.config.host }}</span>
        <span class="challenge-list-item__meta">
          <span>{{ languageLabel(entry.config) }}</span>
          <template v-if="entry.status === 'joined'">
            · {{ entry.progress.value }}/{{ entry.progress.target }}
            {{ entry.config.goal.kind === 'minutes' ? 'min' : entry.progress.unit }}
          </template>
        </span>
      </span>
    </button>
    <CdxButton
      v-if="!statusButton"
      class="challenge-list-item__action"
      action="progressive"
      :aria-label="`Join ${entry.config.title}`"
      @click="emit('join', entry.config.id)"
    >
      Join
    </CdxButton>
    <CdxButton
      v-else
      class="challenge-list-item__action"
      :aria-label="`${statusButton.label}: open ${entry.config.title}`"
      @click="open"
    >
      <CdxIcon v-if="statusButton.icon" :icon="statusButton.icon" />
      {{ statusButton.label }}
    </CdxButton>
  </div>
</template>

<style scoped>
.challenge-list-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.challenge-list-item__main {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: var(--spacing-75, 12px);
  min-width: 0;
  padding: var(--spacing-75, 12px) 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.challenge-list-item__text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  color: var(--color-base, #202122);
}

.challenge-list-item__host,
.challenge-list-item__meta {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.challenge-list-item__action {
  flex-shrink: 0;
}
</style>
