<script setup lang="ts">
/**
 * Achievements screen (design: WP25 Apps Reading Challenge — Achievements).
 * One row of tiles per group; for now the only group is reading challenges:
 * earned tiles are filled with the date, ones still to earn are faded.
 * Reached from the Achievements card on Activity and "View achievement".
 */
definePage({
  meta: {
    platform: 'app',
  },
})

import { computed, markRaw, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdxMessage } from '@wikimedia/codex'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'

import AchievementBadge from '../AchievementBadge.vue'
import ActivityOverflowMenu from '../ActivityOverflowMenu.vue'
import {
  ACHIEVEMENT_PATH,
  ACTIVITY_PATH,
  activityToast,
  achievements,
  detailsLink,
  entries,
  formatIsoDate,
  isLongTerm,
  type ChallengeAchievement,
} from '../challenges'
import PrototypeControls from '../PrototypeControls.vue'

const route = useRoute()
const router = useRouter()
/** Snackbar shared with the ⋮ menu's export / import. */
const toast = activityToast

const headerLeft: AppHeaderItem[] = [
  { type: 'link', icon: 'arrow-previous', label: 'Back to Activity', href: ACTIVITY_PATH },
  { type: 'title', text: 'Achievements' },
]
const headerRight: AppHeaderItem[] = [
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'component', component: markRaw(ActivityOverflowMenu) },
]

interface Tile {
  achievement: ChallengeAchievement
  earnedOn: string | null
  /** Challenge it comes from — tapping a tile opens it. */
  challengeId: string | null
}

/**
 * Challenge achievements: one per challenge the reader can see (phase 1: its
 * one challenge), plus earned ones from past challenges (last month, the 25th
 * birthday, imports). Ordered newest first.
 */
const challengeTiles = computed<Tile[]>(() => {
  const earned = new Map(achievements.value.map((a) => [a.id, a.earnedOn]))
  const tiles: Tile[] = entries.value.map((entry) => ({
    achievement: entry.config.achievement,
    earnedOn: earned.get(entry.config.achievement.id) ?? null,
    challengeId: entry.config.id,
  }))
  achievements.value
    .filter((a) => !tiles.some((t) => t.achievement.id === a.id))
    .forEach((a) => tiles.push({ achievement: a, earnedOn: a.earnedOn, challengeId: null }))
  // Newest first: this month's challenges (earned or still to earn) lead, then
  // past achievements by date, so the oldest ends up last in the row.
  const thisMonth = '9999-99'
  const when = (tile: Tile) => (tile.challengeId ? thisMonth : (tile.earnedOn ?? ''))
  return tiles.sort((a, b) => {
    const byDate = when(b).localeCompare(when(a))
    if (byDate !== 0) return byDate
    return Number(Boolean(b.earnedOn)) - Number(Boolean(a.earnedOn))
  })
})

/** Long term: the full-screen achievement (with Share). Phase 1: its challenge. */
function openTile(tile: Tile): void {
  if (isLongTerm.value) {
    router.push({ path: ACHIEVEMENT_PATH, query: { id: tile.achievement.id } })
    return
  }
  if (tile.challengeId) router.push(detailsLink(tile.challengeId))
}

/** "View achievement" lands here with ?highlight= — scroll to and flash that tile. */
const highlighted = ref<string | null>(null)

onMounted(async () => {
  const id = route.query.highlight
  if (typeof id !== 'string') return
  highlighted.value = id
  await nextTick()
  document
    .querySelector(`[data-achievement-tile="${id}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  window.setTimeout(() => {
    highlighted.value = null
  }, 2000)
})
</script>

<template>
  <AppChromeWrapper :left="headerLeft" :right="headerRight" :show-bottom-menu="false">
    <div class="achievements-screen">
      <section class="achievements-screen__group" aria-labelledby="challenge-achievements">
        <h3 id="challenge-achievements" class="achievements-screen__heading">
          Reading challenges
        </h3>
        <ul class="achievements-screen__row">
          <li v-for="tile in challengeTiles" :key="tile.achievement.id">
            <button
              type="button"
              class="achievements-screen__tile"
              :class="{
                'achievements-screen__tile--earned': tile.earnedOn,
                'achievements-screen__tile--highlight': highlighted === tile.achievement.id,
              }"
              :data-achievement-tile="tile.achievement.id"
              @click="openTile(tile)"
            >
              <AchievementBadge :achievement="tile.achievement" :locked="!tile.earnedOn" size="tile" />
              <strong class="achievements-screen__name">{{ tile.achievement.name }}</strong>
              <span v-if="tile.earnedOn" class="achievements-screen__date">
                {{ formatIsoDate(tile.earnedOn) }}
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <div v-if="toast" class="achievements-screen__toast">
      <CdxMessage
        :type="toast.type"
        :allow-user-dismiss="true"
        :auto-dismiss="true"
        @user-dismissed="toast = null"
        @auto-dismissed="toast = null"
      >
        {{ toast.text }}
      </CdxMessage>
    </div>

    <PrototypeControls />
  </AppChromeWrapper>
</template>

<style scoped>
:deep(.app-chrome-header__left) {
  gap: var(--spacing-75, 12px);
}

.achievements-screen {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-200, 32px);
  padding-block: var(--spacing-150, 24px);
}

.achievements-screen__heading {
  margin: 0 0 var(--spacing-75, 12px);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium, 1.625rem);
  color: var(--color-base, #202122);
}

/* Horizontal row that bleeds to the screen edge so more tiles peek in. */
.achievements-screen__row {
  display: flex;
  gap: var(--spacing-75, 12px);
  margin: 0 calc(-1 * var(--spacing-150, 24px));
  padding: 0 var(--spacing-150, 24px) var(--spacing-25, 4px);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding-inline: var(--spacing-150, 24px);
  list-style: none;
  scrollbar-width: none;
}

.achievements-screen__row li {
  /* Tiles stretch to the tallest so the row lines up. */
  display: flex;
  flex: 0 0 auto;
  margin: 0;
  scroll-snap-align: start;
}

/* Not earned yet: light, faded (badge is greyscale + lock). */
.achievements-screen__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  width: 130px;
  height: 100%;
  min-height: 160px;
  padding: var(--spacing-100, 16px) var(--spacing-50, 8px);
  border: var(--border-width-base, 1px) solid var(--border-color-muted, #dadde3);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  color: var(--color-subtle, #54595d);
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: box-shadow 300ms ease;
}

/* Earned: filled tile, full-colour badge, date underneath. */
.achievements-screen__tile--earned {
  border-color: var(--border-color-subtle, #c8ccd1);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
  color: var(--color-base, #202122);
}

.achievements-screen__tile--highlight {
  box-shadow: 0 0 0 2px var(--border-color-progressive, #36c);
}

.achievements-screen__name {
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.375rem);
}

.achievements-screen__date {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.achievements-screen__toast {
  position: sticky;
  bottom: 0;
  padding: var(--spacing-50, 8px) 0;
}
</style>
