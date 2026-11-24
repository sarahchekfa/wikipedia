<script setup lang="ts">
/**
 * Progress toward the goal — compact on the Activity card, full on details.
 * Days goal: count + bar (+ day strip and streak stats on details).
 * Minutes goal: count + bar + the same day strip, streak + minutes stats.
 * Reading list (long term): count + bar + the list, read ones checked.
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CdxProgressBar, CdxThumbnail } from '@wikimedia/codex'

import { DAYS_IN_MONTH, formatShortDate, markReadToday, type ChallengeEntry } from './challenges'
import DayStrip, { type DayState as StripState } from './DayStrip.vue'
import { fetchThumbnailUrl } from './fetchThumbnail'

interface Props {
  entry: ChallengeEntry
  full?: boolean
}

const props = withDefaults(defineProps<Props>(), { full: false })
const router = useRouter()

const challenge = computed(() => props.entry.config)
const progress = computed(() => props.entry.progress)
const status = computed(() => props.entry.status)

const isDays = computed(() => challenge.value.goal.kind === 'days')
const isList = computed(() => challenge.value.goal.kind === 'reading-list')
const isMinutes = computed(() => challenge.value.goal.kind === 'minutes')
/** Not joined yet: show the reading list itself, with no progress on it. */
const previewOnly = computed(() => status.value === 'available')
const unitShort = computed(() => (isDays.value ? 'days' : isList.value ? 'articles' : 'min'))
const minPerDay = computed(() => challenge.value.goal.minMinutesPerDay ?? 1)

const headline = computed(() => {
  const { value, target } = progress.value
  return `${value} of ${target} ${unitShort.value}`
})

const subline = computed(() => {
  const p = progress.value
  if (status.value === 'completed') return 'Goal reached'
  if (status.value === 'expired') {
    return `Ended ${Math.max(p.target - p.value, 0)} ${isDays.value ? 'days' : isList.value ? 'articles' : 'minutes'} short`
  }
  const remaining = Math.max(p.target - p.value, 0)
  if (isDays.value) {
    return `${remaining} more ${remaining === 1 ? 'day' : 'days'} to go`
  }
  if (isList.value) return `${remaining} more to go`
  return `${remaining} min to go`
})

/** Reading list rows; tapping one opens the article (and counts as reading). */
/** Unread first (what's left to do), read ones after; list order kept within each. */
const listRows = computed(() =>
  (challenge.value.goal.articles ?? [])
    .map((article) => ({
      ...article,
      read: !previewOnly.value && progress.value.articlesRead.includes(article.title),
    }))
    .sort((a, b) => Number(a.read) - Number(b.read)),
)

/** Article pictures for the reading list, from that language's Wikipedia. */
const thumbnails = ref<Record<string, string | null>>({})


watch(
  () => (props.full && isList.value ? listRows.value.map((row) => row.title).join('|') : ''),
  async (key) => {
    if (!key) return
    const host = `${props.entry.articleLang}.wikipedia.org`
    await Promise.all(
      listRows.value
        .filter((row) => !(row.title in thumbnails.value))
        .map(async (row) => {
          const url = await fetchThumbnailUrl(row.title, { host })
          thumbnails.value = { ...thumbnails.value, [row.title]: url }
        }),
    )
  },
  { immediate: true },
)

function openArticle(title: string): void {
  markReadToday()
  router.push({ path: '/template-app-article', query: { article: title, lang: props.entry.articleLang } })
}


type DayState = 'read' | 'missed' | 'today' | 'future'

function dayState(day: number): DayState {
  const minutes = progress.value.dailyMinutes[day - 1]
  if (minutes === null) return 'future'
  if (minutes >= minPerDay.value) return 'read'
  if (day === progress.value.day && status.value === 'joined') return 'today'
  return 'missed'
}


/** One pill per day of the month: read → active, missed → inactive, today, rest of month. */
const strip = computed<StripState[]>(() =>
  Array.from({ length: DAYS_IN_MONTH }, (_, i) => {
    const state = dayState(i + 1)
    return state === 'read' ? 'active' : state === 'missed' ? 'inactive' : state
  }),
)
const readDays = computed(() => strip.value.filter((state) => state === 'active').length)


const dailyAverage = computed(() => Math.round(progress.value.value / Math.max(progress.value.day, 1)))
const bestDay = computed(() => Math.max(0, ...progress.value.dailyMinutes.map((minutes) => minutes ?? 0)))
</script>

<template>
  <div class="challenge-progress" :class="{ 'challenge-progress--full': props.full }">
    <div v-if="!previewOnly" class="challenge-progress__numbers">
      <strong class="challenge-progress__headline">{{ headline }}</strong>
      <span class="challenge-progress__subline">{{ subline }}</span>
    </div>

    <!-- Same 28px row as the day strip's pills so counts line up across cards. -->
    <!-- Bar: reading lists and the minutes goal (a monthly total, so a fill reads
         best); the minutes challenge screen adds the day strip below it. -->
    <div v-if="!previewOnly && (isList || isMinutes)" class="challenge-progress__bar-area">
      <div class="challenge-progress__bar-row">
        <CdxProgressBar
          class="challenge-progress__bar"
          :value="Math.min(progress.value, progress.target)"
          :max="progress.target"
          :aria-label="headline"
        />
      </div>
    </div>

    <!-- Days and minutes goals: day strip (minutes too, to encourage reading
         day over day even though the goal is a monthly total). -->
    <template v-if="!isList">

      <!-- Same day-by-day strip as Activity's "Your recent activity" — on the
           Activity card as well as the challenge screen. -->
      <DayStrip
        v-if="!previewOnly && (!isMinutes || props.full)"
        :days="strip"
        :start-label="formatShortDate(1)"
        :end-label="formatShortDate(DAYS_IN_MONTH)"
        :label="`Read on ${readDays} of ${progress.day} days so far`"
        :show-range="props.full"
      />
    </template>

    <!-- Reading list (long term) -->
    <ul v-else-if="isList && props.full" class="challenge-progress__list">
      <li v-for="row in listRows" :key="row.title">
        <!-- Read articles fade back (like read mail); unread ones stay bold -->
        <button
          type="button"
          class="challenge-progress__list-row"
          :class="{ 'challenge-progress__list-row--read': row.read }"
          @click="openArticle(row.title)"
        >
          <span class="challenge-progress__list-text">
            <strong>
              {{ row.title }}
              <span v-if="row.read" class="challenge-progress__sr-only">(read)</span>
            </strong>
            <span>{{ row.description }}</span>
          </span>
          <!-- Picture on the right so text lines up whether or not an article has one -->
          <CdxThumbnail
            v-if="thumbnails[row.title]"
            class="challenge-progress__list-thumb"
            :thumbnail="{ url: thumbnails[row.title] as string }"
          />
        </button>
      </li>
    </ul>


    <dl v-if="props.full && !isList" class="challenge-progress__stats">
      <template v-if="isDays">
        <div>
          <dt>Current streak</dt>
          <dd>{{ progress.currentStreak }} days</dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>{{ progress.bestStreak }} days</dd>
        </div>
      </template>
      <template v-else>
        <div>
          <dt>Current streak</dt>
          <dd>{{ progress.currentStreak }} days</dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>{{ progress.bestStreak }} days</dd>
        </div>
        <div>
          <dt>Daily average</dt>
          <dd>{{ dailyAverage }} min</dd>
        </div>
        <div>
          <dt>Best day</dt>
          <dd>{{ bestDay }} min</dd>
        </div>
      </template>
    </dl>
  </div>
</template>

<style scoped>
.challenge-progress {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.challenge-progress__numbers {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--spacing-25, 4px) var(--spacing-75, 12px);
}

.challenge-progress__headline {
  font-size: var(--font-size-x-large, 1.25rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-x-large, 1.875rem);
  color: var(--color-base, #202122);
}

.challenge-progress__subline {
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.375rem);
  color: var(--color-subtle, #54595d);
}



/* Reading-list bar in a row the height of DayStrip's pills. */
.challenge-progress__bar-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.challenge-progress__bar-row {
  display: flex;
  align-items: center;
  height: 28px;
}

.challenge-progress__bar-row > :deep(.cdx-progress-bar) {
  flex: 1 1 auto;
  width: 100%;
}

/* Outline the track so a small fill reads as part of a whole. */
.challenge-progress__bar-row :deep(.cdx-progress-bar) {
  box-sizing: border-box;
  border: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-pill, 9999px);
}





/* Reading list */
/* With a reading list last, the whole block reaches the container's bottom
   edge so the last (grey) row has no white strip under it. */
.challenge-progress:has(> .challenge-progress__list:last-child) {
  margin-bottom: calc(-1 * var(--spacing-100, 16px));
}

.challenge-progress__list {
  display: flex;
  flex-direction: column;
  /* Bleed through the section's 16px padding so dividers (and read rows' grey)
     run the full width of the container; rows pad their text back in. */
  margin: 0 calc(-1 * var(--spacing-100, 16px));
  padding: 0;
  list-style: none;
}

/* Reset the global list-item spacing so rows (and their grey) sit flush. */
.challenge-progress__list li {
  margin: 0;
}

.challenge-progress__list li + li {
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.challenge-progress__list-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  width: 100%;
  box-sizing: border-box;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

/* Read rows fade back; text and picture both. */
/* Read rows sit back on grey, like read mail. */
.challenge-progress__list-row--read {
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.challenge-progress__list-row--read .challenge-progress__list-text strong {
  font-weight: var(--font-weight-normal, 400);
  color: var(--color-subtle, #54595d);
}

.challenge-progress__list-row--read .challenge-progress__list-thumb {
  opacity: 0.6;
}

.challenge-progress__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.challenge-progress__list-text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  color: var(--color-base, #202122);
}

.challenge-progress__list-text span {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.challenge-progress__list-thumb {
  flex-shrink: 0;
}










.challenge-progress__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-100, 16px);
  margin: 0;
}

.challenge-progress__stats div {
  display: flex;
  flex-direction: column;
}

.challenge-progress__stats dt {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.challenge-progress__stats dd {
  margin: 0;
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}
</style>
