<script setup lang="ts">
/**
 * Home-screen streak widget (design: WP25 Reading Challenge widget).
 *   small (2×2): Wikipedia "W", illustration, flame + "N days".
 *   large (4×2): adds the challenge name and progress toward the goal —
 *                a track from day 1 → 25 (or 0 → 300 minutes) with a marker.
 * The design's illustration is the Baby Globe mascot; until that asset is in
 * the repo, the challenge's achievement badge stands in.
 */
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconCalendar, cdxIconClock, cdxIconLogoWikipedia } from '@wikimedia/codex-icons'

import AchievementBadge from './AchievementBadge.vue'
import { computeProgress, type ChallengeConfig, type ChallengeStatus } from './challenges'

interface Props {
  config: ChallengeConfig
  status: ChallengeStatus
  readToday?: boolean
  size?: 'small' | 'large'
}

const props = withDefaults(defineProps<Props>(), { readToday: false, size: 'small' })

const progress = computed(() =>
  computeProgress(props.config, {
    status: props.status,
    readToday: props.readToday,
    historyCleared: false,
  }),
)

const streak = computed(() => progress.value.currentStreak)
const streakLabel = computed(() => `${streak.value} ${streak.value === 1 ? 'day' : 'days'}`)

const isMinutes = computed(() => props.config.goal.kind === 'minutes')
/** Track ends: days run 1 → target; minutes run 0 → target. */
const trackStart = computed(() => (isMinutes.value ? '0' : '1'))
const trackEnd = computed(() => String(props.config.goal.target))
const trackIcon = computed(() => (isMinutes.value ? cdxIconClock : cdxIconCalendar))
const percent = computed(() =>
  Math.min(Math.max(progress.value.value / progress.value.target, 0), 1),
)
const progressLabel = computed(
  () => `${progress.value.value} of ${progress.value.target} ${isMinutes.value ? 'minutes' : 'days'}`,
)
</script>

<template>
  <div
    class="challenge-widget"
    :class="`challenge-widget--${props.size}`"
    role="img"
    :aria-label="
      props.size === 'large'
        ? `${config.title}: ${streakLabel} streak, ${progressLabel}`
        : `Reading streak: ${streakLabel}`
    "
  >
    <CdxIcon class="challenge-widget__logo" :icon="cdxIconLogoWikipedia" />

    <!-- Large: challenge name with a trophy -->
    <div v-if="props.size === 'large'" class="challenge-widget__title">
      <svg class="challenge-widget__trophy" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3Zm0 4H6v1a2 2 0 0 0 1 1.7V7Zm10 0v2.7A2 2 0 0 0 18 8V7h-1Z"
        />
      </svg>
      <span>{{ config.title }}</span>
    </div>

    <div class="challenge-widget__body">
      <div class="challenge-widget__streak">
        <!-- Codex has no flame icon; small inline flame. -->
        <svg class="challenge-widget__flame" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2c.6 3.2-1.4 4.9-3 6.7C7.4 10.5 6 12.4 6 15a6 6 0 0 0 12 0c0-2.1-.9-3.9-2-5.3-.2 1.3-.8 2.3-1.8 2.9.3-3.6-.8-7.6-2.2-10.6Zm-.2 11.2c1.6 1.4 2.6 2.6 2.6 4.1a2.4 2.4 0 0 1-4.8 0c0-1.5 1-2.7 2.2-4.1Z"
          />
        </svg>
        <span>{{ streakLabel }}</span>
      </div>
      <div class="challenge-widget__art">
        <AchievementBadge
          :achievement="config.achievement"
          :size="props.size === 'large' ? 'medium' : 'tile'"
        />
      </div>
    </div>

    <!-- Large: progress toward the goal, start → end -->
    <div v-if="props.size === 'large'" class="challenge-widget__track-box">
      <span class="challenge-widget__end">
        <CdxIcon :icon="trackIcon" size="small" />
        {{ trackStart }}
      </span>
      <span class="challenge-widget__track">
        <span class="challenge-widget__fill" :style="{ width: `${percent * 100}%` }" />
        <span class="challenge-widget__knob" :style="{ left: `${percent * 100}%` }" />
      </span>
      <span class="challenge-widget__end">
        <CdxIcon :icon="trackIcon" size="small" />
        {{ trackEnd }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Widget surface colours follow the design (illustration palette, not tokens). */
.challenge-widget {
  --widget-radius: 28px;
  --widget-ink: #9a4f8a;
  --widget-track: #f8eef5;

  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 148px;
  overflow: hidden;
  border-radius: var(--widget-radius);
  background-color: #f2e6ef;
  box-shadow: var(--box-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.2));
  color: var(--widget-ink);
}

[data-app-platform='ios'] .challenge-widget {
  --widget-radius: 22px;
}

.challenge-widget--small {
  align-items: center;
  justify-content: space-between;
  width: 148px;
  padding: var(--spacing-100, 16px) var(--spacing-75, 12px) var(--spacing-75, 12px);
}

.challenge-widget--large {
  gap: var(--spacing-50, 8px);
  width: 312px;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
}

.challenge-widget__logo {
  position: absolute;
  top: var(--spacing-75, 12px);
  right: var(--spacing-75, 12px);
  color: #ffffff;
}

.challenge-widget__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  padding-inline-end: var(--spacing-200, 32px);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
}

.challenge-widget__trophy,
.challenge-widget__flame {
  flex-shrink: 0;
  fill: currentColor;
}

.challenge-widget__trophy {
  width: 16px;
  height: 16px;
}

/* Small: art on top, streak under it. Large: streak left, art right. */
.challenge-widget__body {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-height: 0;
}

.challenge-widget--small .challenge-widget__body {
  flex-direction: column-reverse;
  justify-content: space-between;
}

.challenge-widget--large .challenge-widget__body {
  justify-content: space-between;
}

.challenge-widget__art {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
}

.challenge-widget--large .challenge-widget__art {
  flex: 0 0 auto;
}

.challenge-widget__streak {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  font-size: var(--font-size-x-large, 1.25rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1;
}

.challenge-widget--large .challenge-widget__streak {
  font-size: var(--font-size-xx-large, 1.5rem);
}

.challenge-widget__flame {
  width: 22px;
  height: 22px;
}

/* Goal track: outlined box, start label | track with fill + marker | end label */
.challenge-widget__track-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-25, 4px) var(--spacing-50, 8px);
  border: var(--border-width-base, 1px) solid var(--widget-ink);
  border-radius: 10px;
}

.challenge-widget__end {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-x-small, 0.75rem);
  font-weight: var(--font-weight-bold, 700);
}

.challenge-widget__end :deep(.cdx-icon) {
  color: inherit;
}

.challenge-widget__track {
  position: relative;
  flex: 1 1 auto;
  height: 6px;
  border-radius: var(--border-radius-pill, 9999px);
  background-color: var(--widget-track);
}

.challenge-widget__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: inherit;
  background-color: var(--widget-ink);
  opacity: 0.6;
}

.challenge-widget__knob {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: var(--border-radius-circle, 50%);
  background-color: var(--widget-ink);
  transform: translate(-50%, -50%);
}
</style>
