<script setup lang="ts">
definePage({
  meta: {
    platform: 'app',
    icon: cdxIconChartLine,
  },
})

import { computed, markRaw, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CdxButton,
  CdxCard,
  CdxDialog,
  CdxIcon,
  CdxInfoChip,
  CdxMenuButton,
  CdxMessage,
  CdxThumbnail,
} from '@wikimedia/codex'
import type { MenuButtonItemData } from '@wikimedia/codex'
import {
  cdxIconDownload,
  cdxIconHeart,
  cdxIconTrash,
  cdxIconUpload,
  cdxIconVerticalEllipsis,
  cdxIconArrowNext,
  cdxIconArticles,
  cdxIconBookmark,
  cdxIconChartLine,
  cdxIconEdit,
  cdxIconFlag,
  cdxIconGlobe,
  cdxIconLink,
  cdxIconNext,
  cdxIconPuzzle,
  cdxIconRestore,
  cdxIconSearch,
  cdxIconStar,
  cdxIconTag,
  cdxIconUserContributions,
  cdxIconUserTalk,
} from '@wikimedia/codex-icons'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import {
  ANDROID_MAIN_BOTTOM_NAV_ITEMS,
  IOS_MAIN_BOTTOM_NAV_ITEMS,
  type AppBottomNavItem,
} from '@/components/app/appBottomNavItems'
import { useIsIos } from '@/composables/useAppPlatform'

import BarChart from './BarChart.vue'
import { fetchThumbnailUrl } from './fetchThumbnail'
import {
  generateActivityData,
  generateHistoryGroups,
  type ActivityData,
  type HistoryGroup,
} from './mockActivityData'
import Sparkline from './Sparkline.vue'

import AchievementBadge from './AchievementBadge.vue'
import ActivityOverflowMenu from './ActivityOverflowMenu.vue'
import ChallengeCard from './ChallengeCard.vue'
import DayStrip from './DayStrip.vue'
import ChallengeDiscoverCard from './ChallengeDiscoverCard.vue'
import {
  ACHIEVEMENTS_PATH,
  achievements,
  activityToast,
  BROWSE_PATH,
  clearHistory,
  demo,
  detailsLink,
  entries,
  exportAchievements,
  formatIsoDate,
  formatMonthYear,
  importAchievements,
  isLongTerm,
  joinChallenge,
  primaryEntry,
  showActivityBadge,
} from './challenges'
import LoginRequiredDialog from './LoginRequiredDialog.vue'
import PrototypeControls from './PrototypeControls.vue'

const router = useRouter()
const isIos = useIsIos()

const activity = ref<ActivityData | null>(null)
const historyGroups = ref<HistoryGroup[]>([])

/** Cards use the current route as their `url` — Codex's link styling with nowhere new to go. */
const SELF_URL = '/vibe-coding-challenges'

/** Patches in a title's real thumbnail wherever it appears once its fetch resolves. */
function applyThumbnail(title: string, url: string | null): void {
  if (!url) return

  if (activity.value) {
    activity.value = {
      ...activity.value,
      mostViewed: activity.value.mostViewed.map((entry) =>
        entry.title === title ? { ...entry, thumbnailUrl: url } : entry,
      ),
    }
  }

  historyGroups.value = historyGroups.value.map((group) => ({
    ...group,
    entries: group.entries.map((entry) =>
      entry.title === title ? { ...entry, thumbnailUrl: url } : entry,
    ),
  }))
}

async function load(): Promise<void> {
  const data = generateActivityData()
  const groups = generateHistoryGroups()
  activity.value = data
  historyGroups.value = groups

  const titles = new Set<string>([
    ...data.mostViewed.filter((entry) => entry.hasThumb).map((entry) => entry.title),
    ...groups.flatMap((group) => group.entries.map((entry) => entry.title)),
  ])

  await Promise.all(
    Array.from(titles).map(async (title) => {
      const url = await fetchThumbnailUrl(title)
      applyThumbnail(title, url)
    }),
  )
}

onMounted(() => {
  void load()
})

// --- Challenges -------------------------------------------------------------

const loginOpen = ref(false)
const pendingJoinId = ref<string | null>(null)

/** Join needs an account; once joined, land on the details screen. */
function requestJoin(id: string): void {
  if (!demo.loggedIn) {
    pendingJoinId.value = id
    loginOpen.value = true
    return
  }
  joinChallenge(id)
  router.push(detailsLink(id))
}

/** Phase 1 entry (also what onboarding / empty states point at). */
const challenge = computed(() => primaryEntry.value.config)

/**
 * Cards on Activity. Phase 1: its one challenge. Long term: joined (active)
 * first, then completed this month, then one to join — the rest live in Browse.
 */
/** The carousel never has more than this many slides. */
const MAX_SLIDES = 3

/**
 * Long-term carousel, max 3 slides.
 *   - In any challenge → only theirs: joined (today's streak first), then
 *     completed this month. Others to join are reached through "See all".
 *   - In none → challenges to join (monthly first).
 *   - 3 or fewer → each gets its own card; there's no Browse page.
 *   - More than 3 → the first 2 get cards and the 3rd slide is the end card,
 *     "X other challenges you can join", which leads to Browse.
 * Ended challenges stay off Activity.
 */
const carousel = computed(() => {
  const joined = entries.value
    .filter((e) => e.status === 'joined')
    .sort((a, b) => Number(b.needsReadingToday) - Number(a.needsReadingToday))
  const completed = entries.value.filter((e) => e.status === 'completed')
  const available = entries.value.filter((e) => e.status === 'available')
  const mine = [...joined, ...completed]

  // In a challenge → Activity shows only their challenges, never ones to join.
  // In none → challenges to join, as below.
  const items = mine.length ? mine : available
  const othersToBrowse = mine.length ? available.length : 0

  if (items.length <= MAX_SLIDES) {
    return { cards: items, toJoin: [], moreJoined: 0, showDiscover: false, othersToBrowse }
  }

  const cards = items.slice(0, MAX_SLIDES - 1)
  const rest = items.slice(MAX_SLIDES - 1)
  return {
    cards,
    toJoin: rest.filter((e) => e.status === 'available'),
    moreJoined: rest.filter((e) => e.status !== 'available').length,
    showDiscover: true,
    othersToBrowse,
  }
})

/**
 * "See all" / Browse: when the carousel can't show everything, or (for people
 * already in a challenge) when there are other challenges they could join.
 */
const hasBrowse = computed(
  () => isLongTerm.value && (carousel.value.showDiscover || carousel.value.othersToBrowse > 0),
)

/** Phase 1: its one challenge. Long term: the carousel's full cards. */
const activityEntries = computed(() => (isLongTerm.value ? carousel.value.cards : entries.value))
const slideCount = computed(
  () => activityEntries.value.length + (isLongTerm.value && carousel.value.showDiscover ? 1 : 0),
)

/** Carousel position, for the dots under it. */
const carouselEl = ref<HTMLElement | null>(null)
const activeSlide = ref(0)

function onCarouselScroll(): void {
  const el = carouselEl.value
  const first = el?.firstElementChild as HTMLElement | null
  if (!el || !first) return
  const step = first.offsetWidth + 12
  activeSlide.value = Math.round(el.scrollLeft / step)
}


/** "View achievement" on a completed card: scroll to it in Achievements and flash it. */
const highlightedAchievement = ref<string | null>(null)

/** Most recently earned — the one the Achievements card features. */
const latestAchievement = computed(() =>
  [...achievements.value].sort((a, b) => b.earnedOn.localeCompare(a.earnedOn))[0] ?? null,
)

/** Card link to the Achievements screen (resolved so it works under any base path). */
const achievementsHref = computed(() => router.resolve(ACHIEVEMENTS_PATH).href)

/** "View achievement": open the Achievements screen with that tile highlighted. */
function viewAchievement(achievementId: string): void {
  router.push({ path: ACHIEVEMENTS_PATH, query: { highlight: achievementId } })
}

const openCount = computed(() => entries.value.filter((e) => e.status === 'available').length)

/** First open after launch: introduce challenges inside Activity. */
const onboardingOpen = computed({
  get: () => !demo.onboardingSeen,
  set: (open: boolean) => {
    if (!open) demo.onboardingSeen = true
  },
})

function onboardingSeeChallenge(): void {
  demo.onboardingSeen = true
  if (hasBrowse.value) router.push(BROWSE_PATH)
  else router.push(detailsLink(challenge.value.id))
}

// --- Achievements: export / import ----------------------------------------

const toast = activityToast
const importInput = ref<HTMLInputElement | null>(null)


function doExport(): void {
  const count = exportAchievements()
  toast.value = {
    type: 'success',
    text: `Exported ${count} ${count === 1 ? 'achievement' : 'achievements'}. Import the file on another device to bring them over.`,
  }
}


async function onImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const added = await importAchievements(file)
    toast.value = {
      type: 'success',
      text: added
        ? `Imported ${added} ${added === 1 ? 'achievement' : 'achievements'}.`
        : 'Those achievements are already here.',
    }
  } catch {
    toast.value = { type: 'error', text: 'That file isn’t an achievements export.' }
  }
}

// --- Clear history ------------------------------------------------------------

const clearOpen = ref(false)

function confirmClearHistory(): void {
  clearHistory()
  historyGroups.value = []
  clearOpen.value = false
  toast.value = { type: 'success', text: 'History cleared.' }
}

function exportBeforeClearing(): void {
  doExport()
}

function onBottomNav(item: AppBottomNavItem): void {
  if (item === 'search') router.push('/template-app-search')
  else if (item === 'bookmarks') router.push('/template-app-saved')
}

const bottomNavItems = computed(() =>
  isIos.value ? IOS_MAIN_BOTTOM_NAV_ITEMS : ANDROID_MAIN_BOTTOM_NAV_ITEMS,
)

const headerLeft: AppHeaderItem[] = [{ type: 'title', text: 'Activity' }]

/** Android keeps tabs/bell/menu; iOS swaps to ellipsis/tabs/account — same split as other templates. */
const headerRight = computed(
  (): AppHeaderItem[] =>
    isIos.value
      ? [
          { type: 'component', component: markRaw(ActivityOverflowMenu) },
          { type: 'button', icon: 'tabs', label: 'Tabs' },
          { type: 'button', icon: 'user-avatar-outline', label: 'Account' },
        ]
      : [
          { type: 'button', icon: 'tabs', label: 'Tabs' },
          { type: 'button', icon: 'bell-outline', label: 'Notifications' },
          { type: 'component', component: markRaw(ActivityOverflowMenu) },
        ],
)

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

const chartRangeStart = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() - 29)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
})

const chartRangeEnd = computed(() =>
  new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
)
</script>

<template>
  <AppChromeWrapper
    :class="{ 'has-activity-badge': showActivityBadge }"
    :left="headerLeft"
    :right="headerRight"
    :bottom-nav-items="bottomNavItems"
    active-nav-item="history"
    @navigate="onBottomNav"
  >
    <div v-if="activity" class="vibe-coding-challenges">
      <template v-if="demo.activityModules.timeSpent">
      <div class="vibe-coding-challenges__hero">
        <h2 class="vibe-coding-challenges__hero-title">{{ activity.username }}’s reading</h2>
        <span class="vibe-coding-challenges__platform-pill">
          ON WIKIPEDIA {{ isIos ? 'IOS' : 'ANDROID' }}
        </span>
        <p class="vibe-coding-challenges__hero-time">
          {{ formatMinutes(activity.readingMinutesThisWeek) }}
        </p>
        <p class="vibe-coding-challenges__hero-subtitle">time spent reading this week</p>
      </div>
      </template>

      <template v-if="demo.activityModules.challenges">
      <!-- Long term: a Challenges section with several cards and a way to browse -->
      <div v-if="isLongTerm" class="vibe-coding-challenges__section-header-row">
        <h3 class="vibe-coding-challenges__section-heading">Challenges</h3>
        <RouterLink v-if="hasBrowse" :to="BROWSE_PATH" class="vibe-coding-challenges__see-all">
          See all
        </RouterLink>
      </div>
      <!-- Long term: swipeable carousel so several challenges take one card's height -->
      <div
        v-if="isLongTerm && slideCount > 1"
        class="vibe-coding-challenges__carousel-wrap"
      >
        <div
          ref="carouselEl"
          class="vibe-coding-challenges__carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Your challenges"
          @scroll.passive="onCarouselScroll"
        >
          <ChallengeCard
            v-for="entry in activityEntries"
            :key="entry.config.id"
            :entry="entry"
            compact
            class="vibe-coding-challenges__slide"
            @join="requestJoin"
            @view-achievement="viewAchievement"
          />
          <ChallengeDiscoverCard
            v-if="carousel.showDiscover"
            :to-join="carousel.toJoin"
            :more-joined="carousel.moreJoined"
            class="vibe-coding-challenges__slide"
          />
        </div>
        <div class="vibe-coding-challenges__dots" aria-hidden="true">
          <span
            v-for="index in slideCount"
            :key="index"
            class="vibe-coding-challenges__dot"
            :class="{ 'vibe-coding-challenges__dot--active': index - 1 === activeSlide }"
          />
        </div>
      </div>
      <ChallengeCard
        v-for="entry in activityEntries"
        v-else
        :key="entry.config.id"
        :entry="entry"
        :compact="isLongTerm"
        @join="requestJoin"
            @view-achievement="viewAchievement"
      />
      </template>

      <template v-if="demo.activityModules.readingInsights">
      <CdxCard :url="SELF_URL" :icon="cdxIconArticles" class="vibe-coding-challenges__card">
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Articles read this month
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <span class="vibe-coding-challenges__big-number">
            {{ activity.articlesReadThisMonth }}
          </span>
        </template>
      </CdxCard>

      <CdxCard :url="SELF_URL" :icon="cdxIconBookmark" class="vibe-coding-challenges__card">
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Articles saved this month
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <span class="vibe-coding-challenges__big-number">
            {{ activity.articlesSavedThisMonth }}
          </span>
        </template>
      </CdxCard>

      <CdxCard :url="SELF_URL" :icon="cdxIconTag" class="vibe-coding-challenges__card">
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Top categories read this month
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <ul class="vibe-coding-challenges__plain-list">
            <li v-for="category in activity.topCategories" :key="category">{{ category }}</li>
          </ul>
        </template>
      </CdxCard>
      </template>

      <template v-if="demo.activityModules.achievements">
      <!-- Same Codex card pattern as the other Activity modules: title + chevron,
           a count, then the latest achievement (design: WP25 Activity). -->
      <CdxCard
        :url="achievementsHref"
        class="vibe-coding-challenges__card vibe-coding-challenges__achievements-card"
        :class="{ 'vibe-coding-challenges__achievement--highlight': highlightedAchievement }"
        data-achievements-card
      >
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Achievements
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #description>
          {{ achievements.length }} unlocked
        </template>
        <template #supporting-text>
          <div v-if="latestAchievement" class="vibe-coding-challenges__latest-achievement">
            <AchievementBadge :achievement="latestAchievement" />
            <div class="vibe-coding-challenges__achievement-text">
              <span class="vibe-coding-challenges__achievement-date">
                {{ formatMonthYear(latestAchievement.earnedOn) }}
              </span>
              <strong>{{ latestAchievement.name }}</strong>
              <span>{{ latestAchievement.description }}</span>
            </div>
          </div>
          <!-- None yet: the badge you could earn next, locked. -->
          <div v-else class="vibe-coding-challenges__latest-achievement">
            <AchievementBadge :achievement="challenge.achievement" locked />
            <div class="vibe-coding-challenges__achievement-text">
              <strong>No achievements yet</strong>
              <span>
                {{
                  isLongTerm
                    ? 'Complete a challenge to earn your first one.'
                    : 'Finish this month’s challenge to earn your first one.'
                }}
              </span>
            </div>
          </div>
        </template>
      </CdxCard>
      </template>

      <template v-if="demo.activityModules.editingInsights">
      <div class="vibe-coding-challenges__section-header-row">
        <h3 class="vibe-coding-challenges__section-heading">Your impact</h3>
        <CdxInfoChip status="subtle">EN</CdxInfoChip>
      </div>

      <CdxCard :url="SELF_URL" :icon="cdxIconChartLine" class="vibe-coding-challenges__card">
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Most viewed since your edit
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <ol class="vibe-coding-challenges__ranked-list">
            <li v-for="(entry, index) in activity.mostViewed" :key="entry.title">
              <span class="vibe-coding-challenges__rank-badge">{{ index + 1 }}</span>
              <strong class="vibe-coding-challenges__rank-title">{{ entry.title }}</strong>
              <span class="vibe-coding-challenges__rank-description">{{ entry.description }}</span>
              <div class="vibe-coding-challenges__rank-meta">
                <Sparkline :values="entry.sparkline" :width="60" :height="20" />
                <span>{{ formatNumber(entry.viewCount) }}</span>
              </div>
              <CdxThumbnail
                v-if="entry.hasThumb"
                class="vibe-coding-challenges__rank-thumb"
                :thumbnail="entry.thumbnailUrl ? { url: entry.thumbnailUrl } : null"
              />
            </li>
          </ol>
        </template>
      </CdxCard>

      <CdxCard :url="SELF_URL" :icon="cdxIconUserContributions" class="vibe-coding-challenges__card">
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Contributions this month
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <p class="vibe-coding-challenges__stat-row">
            <strong>{{ activity.contributionsThisMonth }}</strong>
            edits this month
          </p>
          <p class="vibe-coding-challenges__stat-row">
            <strong>{{ activity.contributionsLastMonth }}</strong>
            edits last month
          </p>

          <hr class="vibe-coding-challenges__divider" />

          <p class="vibe-coding-challenges__empty-heading">
            {{ activity.contributionsThisMonth }} edits to articles recently
          </p>
          <p class="vibe-coding-challenges__empty-text">
            <template v-if="activity.contributionsThisMonth === 0">
              Looks like you haven’t made an edit this month. Extend free knowledge by editing
              topics that interest you.
            </template>
            <template v-else>
              Nice work — keep up the momentum by editing topics that interest you.
            </template>
          </p>
          <CdxButton action="progressive" weight="primary">
            <CdxIcon :icon="cdxIconEdit" />
            Make an edit
          </CdxButton>
        </template>
      </CdxCard>
      </template>

      <template v-if="demo.activityModules.allTimeImpact">
      <h3 class="vibe-coding-challenges__section-heading">All time impact</h3>

      <div class="vibe-coding-challenges__plain-card">
        <div class="vibe-coding-challenges__stat-grid">
          <div class="vibe-coding-challenges__stat">
            <CdxIcon class="vibe-coding-challenges__stat-icon" :icon="cdxIconEdit" />
            <strong class="vibe-coding-challenges__stat-number">
              {{ activity.allTimeTotalEdits }}
            </strong>
            <span class="vibe-coding-challenges__stat-label">total edits</span>
          </div>
          <div class="vibe-coding-challenges__stat">
            <CdxIcon class="vibe-coding-challenges__stat-icon" :icon="cdxIconStar" />
            <strong class="vibe-coding-challenges__stat-number">
              {{ activity.allTimeBestStreakDays }} days
            </strong>
            <span class="vibe-coding-challenges__stat-label">best streak</span>
          </div>
          <div class="vibe-coding-challenges__stat">
            <CdxIcon class="vibe-coding-challenges__stat-icon" :icon="cdxIconUserTalk" />
            <strong class="vibe-coding-challenges__stat-number">{{ activity.allTimeThanks }}</strong>
            <span class="vibe-coding-challenges__stat-label">thanks</span>
          </div>
          <div class="vibe-coding-challenges__stat">
            <CdxIcon class="vibe-coding-challenges__stat-icon" :icon="cdxIconRestore" />
            <strong class="vibe-coding-challenges__stat-number">
              {{ activity.lastEditedLabel }}
            </strong>
            <span class="vibe-coding-challenges__stat-label">last edited</span>
          </div>
        </div>

        <!-- Recent activity + views live in the same card (design order). -->
        <h4 class="vibe-coding-challenges__card-subheading">Your recent activity (last 30 days)</h4>
        <div class="vibe-coding-challenges__chart-inset">
        <span class="vibe-coding-challenges__chart-heading">
          {{ activity.recentActivityEdits }} {{ activity.recentActivityEdits === 1 ? 'edit' : 'edits' }}
        </span>
        <DayStrip
          :days="activity.recentActivityChart.map((edits) => (edits > 0 ? 'active' : 'inactive'))"
          :start-label="chartRangeStart"
          :end-label="chartRangeEnd"
          :label="`${activity.recentActivityEdits} edits in the last 30 days`"
        />
        </div>

        <div class="vibe-coding-challenges__chart-inset">
        <p class="vibe-coding-challenges__views-line">
          <strong>{{ formatNumber(activity.viewsOnEditedArticles) }}</strong>
          views on articles you’ve edited
        </p>
        <Sparkline :values="activity.viewsChart" :width="300" :height="60" />
        </div>
      </div>
      </template>

      <template v-if="demo.activityModules.allTimeImpact">
      <CdxCard :url="SELF_URL" :icon="cdxIconGlobe" class="vibe-coding-challenges__card">
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Total edits across projects
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <span class="vibe-coding-challenges__big-number">
            {{ activity.totalEditsAcrossProjects }}
          </span>
        </template>
      </CdxCard>
      </template>

      <template v-if="demo.activityModules.gameStats">
      <h3 class="vibe-coding-challenges__section-heading">Highlights</h3>

      <CdxCard :url="SELF_URL" class="vibe-coding-challenges__card">
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Game stats
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <div class="vibe-coding-challenges__stat-grid">
            <div class="vibe-coding-challenges__stat">
              <CdxIcon class="vibe-coding-challenges__stat-icon" :icon="cdxIconPuzzle" />
              <strong class="vibe-coding-challenges__stat-number">{{ activity.gamesPlayed }}</strong>
              <span class="vibe-coding-challenges__stat-label">games played</span>
            </div>
            <div class="vibe-coding-challenges__stat">
              <CdxIcon class="vibe-coding-challenges__stat-icon" :icon="cdxIconArrowNext" />
              <strong class="vibe-coding-challenges__stat-number">
                {{ activity.currentStreak ?? '-' }}
              </strong>
              <span class="vibe-coding-challenges__stat-label">current streak</span>
            </div>
            <div class="vibe-coding-challenges__stat">
              <CdxIcon class="vibe-coding-challenges__stat-icon" :icon="cdxIconStar" />
              <strong class="vibe-coding-challenges__stat-number">
                {{ activity.bestStreakGames ?? '-' }}
              </strong>
              <span class="vibe-coding-challenges__stat-label">best streak</span>
            </div>
            <div class="vibe-coding-challenges__stat">
              <CdxIcon class="vibe-coding-challenges__stat-icon" :icon="cdxIconFlag" />
              <strong class="vibe-coding-challenges__stat-number">
                {{ activity.averageScore ?? '-' }}
              </strong>
              <span class="vibe-coding-challenges__stat-label">average score</span>
            </div>
          </div>

          <CdxButton
            class="vibe-coding-challenges__wikigames-button"
            action="progressive"
            weight="primary"
          >
            Play WikiGames
          </CdxButton>
        </template>
      </CdxCard>
      </template>

      <template v-if="demo.activityModules.donation">
      <CdxCard :url="SELF_URL" :icon="cdxIconHeart" class="vibe-coding-challenges__card">
        <template #title>
          <span class="vibe-coding-challenges__card-title">
            Last donation in app
            <CdxIcon class="vibe-coding-challenges__chevron" :icon="cdxIconNext" />
          </span>
        </template>
        <template #supporting-text>
          <span class="vibe-coding-challenges__donation">{{ activity.lastDonationLabel }}</span>
        </template>
      </CdxCard>
      </template>

      <template v-if="demo.activityModules.timeline">
      <div class="vibe-coding-challenges__section-header-row">
        <h3 class="vibe-coding-challenges__section-heading">History</h3>
        <CdxButton
          weight="quiet"
          :disabled="historyGroups.length === 0"
          @click="clearOpen = true"
        >
          <CdxIcon :icon="cdxIconTrash" />
          Clear
        </CdxButton>
      </div>

      <p v-if="historyGroups.length === 0" class="vibe-coding-challenges__empty-text">
        No reading history yet.
      </p>

      <div class="vibe-coding-challenges__history">
        <div v-for="group in historyGroups" :key="group.dateLabel">
          <h3 class="vibe-coding-challenges__history-date">{{ group.dateLabel }}</h3>
          <div v-for="(entry, index) in group.entries" :key="index">
            <div class="vibe-coding-challenges__history-entry">
              <CdxIcon :icon="entry.viaLink ? cdxIconLink : cdxIconSearch" />
              <div class="vibe-coding-challenges__history-text">
                <strong>{{ entry.title }}</strong>
                <span>{{ entry.description }}</span>
              </div>
              <CdxThumbnail
                class="vibe-coding-challenges__history-thumb"
                :thumbnail="entry.thumbnailUrl ? { url: entry.thumbnailUrl } : null"
              />
            </div>
          </div>
        </div>
      </div>
      </template>
    </div>

    <div v-if="toast" class="vibe-coding-challenges__toast">
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

    <input
      ref="importInput"
      type="file"
      accept="application/json,.json"
      hidden
      @change="onImportFile"
    />

    <CdxDialog
      v-model:open="onboardingOpen"
      title="New: reading challenges"
      :use-close-button="true"
      :primary-action="{
        label: hasBrowse ? 'Browse challenges' : isLongTerm ? 'See challenges' : 'See this month’s challenge',
        actionType: 'progressive',
      }"
      :default-action="{ label: 'Not now' }"
      :stacked-actions="true"
      @primary="onboardingSeeChallenge"
      @default="onboardingOpen = false"
    >
      <div class="vibe-coding-challenges__onboarding">
        <AchievementBadge :achievement="challenge.achievement" size="large" />
        <p v-if="isLongTerm">
          Join reading challenges set up by Wikipedia communities. Track your progress here in
          Activity and earn achievements along the way.
        </p>
        <p v-else>
          Each month there’s a new challenge to read a little every day. Track your progress
          here in Activity and earn achievements along the way.
        </p>
        <p v-if="isLongTerm" class="vibe-coding-challenges__onboarding-current">
          <strong>{{ openCount }} challenges</strong> open in your languages
        </p>
        <p v-else class="vibe-coding-challenges__onboarding-current">
          This month: <strong>{{ challenge.title }}</strong>
        </p>
      </div>
    </CdxDialog>

    <CdxDialog
      v-model:open="clearOpen"
      title="Clear history?"
      :use-close-button="true"
      :primary-action="{ label: 'Clear history', actionType: 'destructive' }"
      :default-action="{ label: 'Cancel' }"
      @primary="confirmClearHistory"
      @default="clearOpen = false"
    >
      <p>
        This will also clear any associated challenge progress or achievements that depend on
        your reading history. Export your achievements first to save them.
      </p>
      <CdxButton
        weight="quiet"
        action="progressive"
        :disabled="achievements.length === 0"
        @click="exportBeforeClearing"
      >
        <CdxIcon :icon="cdxIconDownload" />
        Export achievements
      </CdxButton>
    </CdxDialog>

    <LoginRequiredDialog
      v-model:open="loginOpen"
      @logged-in="pendingJoinId && requestJoin(pendingJoinId)"
    />
    <PrototypeControls />
  </AppChromeWrapper>
</template>

<style scoped>
/* Active badge on the Activity (history) tab: something to join, or today's
   reading still to do. */
.has-activity-badge :deep(.app-bottom-menu__item[aria-label='History']) {
  position: relative;
}

.has-activity-badge :deep(.app-bottom-menu__item[aria-label='History'])::after {
  content: '';
  position: absolute;
  top: 8px;
  right: calc(50% - 14px);
  width: 8px;
  height: 8px;
  border: var(--border-width-thick, 2px) solid var(--background-color-base, #fff);
  border-radius: var(--border-radius-circle, 50%);
  background-color: var(--background-color-destructive, #d33);
}

/* Earned achievements: one horizontal row each (badge | name, description, date),
   divided like the plain lists elsewhere on Activity. */
.vibe-coding-challenges__achievements {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.vibe-coding-challenges__achievements li {
  display: flex;
  align-items: center;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-75, 12px) 0;
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.vibe-coding-challenges__achievements li:first-child {
  padding-top: 0;
}

.vibe-coding-challenges__achievements li:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.vibe-coding-challenges__achievements li {
  transition: background-color 400ms ease;
}

.vibe-coding-challenges__achievement--highlight {
  background-color: var(--background-color-progressive-subtle, #f1f4fd);
}

.vibe-coding-challenges__achievement-text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__achievement-text span {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.vibe-coding-challenges__achievement-text .vibe-coding-challenges__achievement-date {
  font-size: var(--font-size-x-small, 0.75rem);
}

.vibe-coding-challenges__achievements-empty {
  display: flex;
  align-items: center;
  gap: var(--spacing-100, 16px);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__carousel-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

/* Bleeds to the screen edges so the next card's edge peeks in; snaps card by
   card. Fixed height (all cards stretch to the tallest), with each card's
   progress / buttons pinned to its bottom so they line up as you swipe. */
.vibe-coding-challenges__carousel {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-inline: calc(-1 * var(--spacing-150, 24px));
  padding-inline: var(--spacing-150, 24px);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--spacing-150, 24px);
  scrollbar-width: none;
}

.vibe-coding-challenges__carousel::-webkit-scrollbar {
  display: none;
}

/* Full content width: the next card peeks in by just the 12px gap's worth —
   its border and edge, never its text (card padding is 16px). */
.vibe-coding-challenges__slide {
  flex: 0 0 100%;
  /* Let long one-line text (article descriptions) truncate instead of widening the card. */
  min-width: 0;
  box-sizing: border-box;
  scroll-snap-align: start;
}

.vibe-coding-challenges__dots {
  display: flex;
  justify-content: center;
  gap: var(--spacing-50, 8px);
}

.vibe-coding-challenges__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--border-radius-circle, 50%);
  background-color: var(--border-color-subtle, #c8ccd1);
}

.vibe-coding-challenges__dot--active {
  background-color: var(--background-color-progressive, #36c);
}

/* Inside the All time impact card: smaller heading + charts without their own border. */
.vibe-coding-challenges__card-subheading {
  margin: var(--spacing-150, 24px) 0 var(--spacing-75, 12px);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium, 1.625rem);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__chart-inset {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.vibe-coding-challenges__chart-inset + .vibe-coding-challenges__chart-inset {
  margin-top: var(--spacing-150, 24px);
}

.vibe-coding-challenges__donation {
  font-size: var(--font-size-x-large, 1.25rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
}

/* Achievements card: latest badge beside its date / name / description. */
.vibe-coding-challenges__latest-achievement {
  display: flex;
  align-items: center;
  gap: var(--spacing-100, 16px);
  margin-top: var(--spacing-75, 12px);
}

.vibe-coding-challenges__achievements-card {
  transition: background-color 400ms ease;
}

/* "4 unlocked": small subtle line under the title, as in the design. */
.vibe-coding-challenges__achievements-card :deep(.cdx-card__text__description) {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.vibe-coding-challenges__see-all {
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.vibe-coding-challenges__achievements-link {
  display: inline-block;
  margin-top: var(--spacing-50, 8px);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.vibe-coding-challenges__achievements-empty p {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.vibe-coding-challenges__toast {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: var(--spacing-50, 8px) 0;
}

.vibe-coding-challenges__onboarding {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-75, 12px);
  text-align: center;
}

.vibe-coding-challenges__onboarding p {
  margin: 0;
}

.vibe-coding-challenges__onboarding-current {
  color: var(--color-subtle, #54595d);
}

.vibe-coding-challenges {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding-block: var(--spacing-150, 24px);
}

.vibe-coding-challenges__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-50, 8px);
  text-align: center;
}

.vibe-coding-challenges__hero-title {
  margin: 0;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__platform-pill {
  padding: var(--spacing-25, 4px) var(--spacing-75, 12px);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-neutral, #eaecf0);
  color: var(--color-subtle, #54595d);
  font-family: var(--font-family-monospace, monospace);
  font-size: var(--font-size-small, 0.875rem);
}

.vibe-coding-challenges__hero-time {
  margin: 0;
  font-size: var(--font-size-xxx-large, 1.75rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__hero-subtitle {
  margin: 0;
  color: var(--color-subtle, #54595d);
}

/* Codex's own `.cdx-card__text` doesn't stretch by default — force it so the
   chevron in `#title` lands at the card's edge instead of hugging the text. */
.vibe-coding-challenges__card :deep(.cdx-card__text) {
  flex: 1 1 auto;
  min-width: 0;
}

/* Card's supporting-text styles force any nested icon to `--color-subtle`
   (same specificity as CdxButton's own `.cdx-icon { color: inherit }`, and it
   wins on source order) — restore inherited color for icons inside our own
   nested buttons so they match the button's text color. */
.vibe-coding-challenges__card :deep(.cdx-button .cdx-icon) {
  color: inherit;
}

.vibe-coding-challenges__card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.vibe-coding-challenges__chevron {
  flex-shrink: 0;
  color: var(--color-subtle, #54595d);
}

.vibe-coding-challenges__big-number {
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__plain-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.vibe-coding-challenges__plain-list li {
  padding: var(--spacing-50, 8px) 0;
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__plain-list li:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.vibe-coding-challenges__chart-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
}

.vibe-coding-challenges__chart-heading {
  font-size: var(--font-size-x-large, 1.25rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__chart-range {
  display: flex;
  justify-content: space-between;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.vibe-coding-challenges__views-line {
  margin: 0;
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__views-line strong {
  font-size: var(--font-size-x-large, 1.25rem);
}

.vibe-coding-challenges__section-heading {
  margin: 0;
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

/* `>` so this only touches top-level section headings, not the one nested
   inside `.section-header-row` below (that gets its own rule instead). */
.vibe-coding-challenges > .vibe-coding-challenges__section-heading {
  margin-top: var(--spacing-100, 16px);
  margin-bottom: calc(-1 * var(--spacing-50, 8px));
}

.vibe-coding-challenges__section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-100, 16px);
  margin-bottom: calc(-1 * var(--spacing-50, 8px));
}

.vibe-coding-challenges__stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-150, 24px);
}

.vibe-coding-challenges__stat {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: var(--spacing-75, 12px);
}

.vibe-coding-challenges__stat-icon {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
  color: var(--color-progressive, #36c);
}

.vibe-coding-challenges__stat-number {
  grid-column: 2;
  grid-row: 1;
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__stat-label {
  grid-column: 2;
  grid-row: 2;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.vibe-coding-challenges__wikigames-button {
  width: 100%;
  margin-top: var(--spacing-150, 24px);
}

.vibe-coding-challenges__plain-card {
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
}

.vibe-coding-challenges__stat-row {
  margin: 0 0 var(--spacing-50, 8px);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__stat-row strong {
  margin-inline-end: var(--spacing-25, 4px);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
}

.vibe-coding-challenges__divider {
  margin: var(--spacing-100, 16px) 0;
  border: 0;
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.vibe-coding-challenges__empty-heading {
  margin: 0 0 var(--spacing-50, 8px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__empty-text {
  margin: 0 0 var(--spacing-100, 16px);
  color: var(--color-subtle, #54595d);
}

.vibe-coding-challenges__ranked-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.vibe-coding-challenges__ranked-list li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  column-gap: var(--spacing-75, 12px);
  row-gap: var(--spacing-12, 2px);
}

.vibe-coding-challenges__rank-badge {
  display: flex;
  grid-column: 1;
  grid-row: 1;
  align-self: center;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  font-weight: var(--font-weight-bold, 700);
  font-size: var(--font-size-small, 0.875rem);
}

.vibe-coding-challenges__rank-title {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__rank-description {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.vibe-coding-challenges__rank-meta {
  display: flex;
  grid-column: 2;
  grid-row: 3;
  align-items: center;
  gap: var(--spacing-50, 8px);
  color: var(--color-progressive, #36c);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
}

.vibe-coding-challenges__rank-thumb {
  grid-column: 3;
  grid-row: 1 / span 3;
  align-self: center;
}

.vibe-coding-challenges__history-date {
  margin: var(--spacing-100, 16px) 0 var(--spacing-50, 8px);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__history > div:first-child .vibe-coding-challenges__history-date {
  margin-top: 0;
}

.vibe-coding-challenges__history-entry {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-75, 12px) 0;
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  color: var(--color-subtle, #54595d);
}

.vibe-coding-challenges__history-text {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: var(--spacing-12, 2px);
  color: var(--color-base, #202122);
}

.vibe-coding-challenges__history-text span {
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.vibe-coding-challenges__history-thumb {
  flex-shrink: 0;
}
</style>
