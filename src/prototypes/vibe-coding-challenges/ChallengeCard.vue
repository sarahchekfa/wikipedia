<script setup lang="ts">
/**
 * Challenges entry point on Activity. One card per challenge entry; phase 1
 * shows one, long term shows joined ones first plus one to join.
 * Not joined → preview + Join. Joined → progress (+ "Dive back in").
 * Completed / ended → result.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxIcon, CdxInfoChip } from '@wikimedia/codex'
import { cdxIconCalendar, cdxIconCheck, cdxIconNext } from '@wikimedia/codex-icons'

import AchievementBadge from './AchievementBadge.vue'
import ChallengeProgress from './ChallengeProgress.vue'
import {
  CHALLENGE_RANGE_LABEL,
  detailsLink,
  formatShortDate,
  MONTH_NAME,
  type ChallengeEntry,
} from './challenges'
import DiveBackIn from './DiveBackIn.vue'

/**
 * `compact`: in the long-term Activity carousel — no today's status (that's on
 * the challenge screen), to keep cards short and quiet.
 */
const props = defineProps<{ entry: ChallengeEntry; compact?: boolean }>()
const emit = defineEmits<{ join: [id: string]; 'view-achievement': [achievementId: string] }>()
const router = useRouter()

const challenge = computed(() => props.entry.config)
const progress = computed(() => props.entry.progress)
const status = computed(() => props.entry.status)
const titleId = computed(() => `challenge-card-title-${challenge.value.id}`)

const eyebrow = computed(() => {
  if (status.value === 'available') {
    return challenge.value.theme ? `${challenge.value.theme} challenge` : `${MONTH_NAME} challenge`
  }
  if (status.value === 'joined') return 'Your challenge'
  if (status.value === 'completed') return 'Challenge complete'
  return 'Challenge ended'
})


function openDetails(): void {
  router.push(detailsLink(challenge.value.id))
}
</script>

<template>
  <section class="challenge-card" :class="`challenge-card--${status}`" :aria-labelledby="titleId">
    <button type="button" class="challenge-card__header" @click="openDetails">
      <AchievementBadge
        :achievement="challenge.achievement"
        :locked="status !== 'completed'"
        size="small"
      />
      <span class="challenge-card__heading">
        <span class="challenge-card__eyebrow">
          {{ eyebrow }}
          <CdxInfoChip v-if="status === 'available'" status="notice">New</CdxInfoChip>
        </span>
        <strong :id="titleId" class="challenge-card__title">{{ challenge.title }}</strong>
      </span>
      <CdxIcon class="challenge-card__chevron" :icon="cdxIconNext" />
    </button>

    <!-- Not joined: preview -->
    <template v-if="status === 'available'">
      <p class="challenge-card__summary">{{ challenge.summary }}</p>
      <p class="challenge-card__meta">
        <CdxIcon :icon="cdxIconCalendar" size="small" />
        {{ CHALLENGE_RANGE_LABEL }} · {{ progress.daysLeft }} days left
      </p>
      <div class="challenge-card__actions">
        <CdxButton action="progressive" weight="primary" @click="emit('join', challenge.id)">
          Join challenge
        </CdxButton>
        <CdxButton weight="quiet" action="progressive" @click="openDetails">See details</CdxButton>
      </div>
    </template>

    <!-- Joined: progress toward the goal -->
    <template v-else-if="status === 'joined'">
      <!-- Carousel: the description fills the card instead of today's status. -->
      <p v-if="compact" class="challenge-card__summary">{{ challenge.summary }}</p>
      <!-- Pinned to the bottom so progress bars line up across carousel cards. -->
      <ChallengeProgress :entry="entry" class="challenge-card__bottom" />
      <!-- Today's status (dive back in / read today) lives on the challenge
           screen in the carousel; phase 1's single card keeps it here. -->
      <template v-if="!compact">
        <hr class="challenge-card__divider" />
        <DiveBackIn v-if="entry.suggestArticle" :entry="entry" />
        <p v-else class="challenge-card__done-today">
          <CdxIcon :icon="cdxIconCheck" size="small" />
          You’ve read today. See you tomorrow.
        </p>
      </template>
    </template>

    <!-- Completed -->
    <template v-else-if="status === 'completed'">
      <p class="challenge-card__summary">
        You earned the <strong>{{ challenge.achievement.name }}</strong> achievement on
        {{ formatShortDate(progress.completedOn ?? progress.day) }}.
      </p>
      <div class="challenge-card__actions">
        <CdxButton
          action="progressive"
          weight="primary"
          @click="emit('view-achievement', challenge.achievement.id)"
        >
          View achievement
        </CdxButton>
      </div>
    </template>

    <!-- Ended without completing -->
    <template v-else>
      <ChallengeProgress :entry="entry" />
      <p class="challenge-card__summary">
        This challenge ended on {{ formatShortDate(progress.day) }}. A new challenge starts next
        month.
      </p>
    </template>
  </section>
</template>

<style scoped>
.challenge-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
}

.challenge-card--available {
  border-color: var(--border-color-progressive, #36c);
  background-color: var(--background-color-progressive-subtle, #f1f4fd);
}

.challenge-card__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.challenge-card__heading {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.challenge-card__eyebrow {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.challenge-card__title {
  font-size: var(--font-size-large, 1.125rem);
  line-height: var(--line-height-large, 1.625rem);
  color: var(--color-base, #202122);
}

.challenge-card__chevron {
  flex-shrink: 0;
  color: var(--color-subtle, #54595d);
}

.challenge-card__summary {
  margin: 0;
  color: var(--color-base, #202122);
}

.challenge-card__bottom {
  margin-top: auto;
}


.challenge-card__meta,
.challenge-card__done-today {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.challenge-card__done-today {
  color: var(--color-success, #177860);
}

.challenge-card__done-today :deep(.cdx-icon) {
  color: inherit;
}

/* Anchored to the bottom: carousel cards stretch to the tallest one. */
.challenge-card__actions {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
}

.challenge-card__divider {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}
</style>
