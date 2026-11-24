<script setup lang="ts">
/**
 * Challenge details — reached from the Activity card, onboarding, or "Join".
 * States: not joined, joined (ongoing), completed, ended without completing.
 */
definePage({
  meta: {
    platform: 'app',
  },
})

import { computed, markRaw, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CdxButton, CdxIcon, CdxInfoChip, CdxMessage, CdxToast } from '@wikimedia/codex'
import { cdxIconCalendar, cdxIconCheck, cdxIconInfo, cdxIconViewCompact } from '@wikimedia/codex-icons'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'

import AchievementBadge from '../AchievementBadge.vue'
import ChallengeOverflowMenu from '../ChallengeOverflowMenu.vue'
import ChallengeProgress from '../ChallengeProgress.vue'
import {
  ACTIVITY_PATH,
  BROWSE_PATH,
  CHALLENGE_RANGE_LABEL,
  demo,
  findEntry,
  formatShortDate,
  isLongTerm,
  joinChallenge,
  languageLabel as languageLabelOf,
} from '../challenges'
import DiveBackIn from '../DiveBackIn.vue'
import LoginRequiredDialog from '../LoginRequiredDialog.vue'
import PrototypeControls from '../PrototypeControls.vue'
import WidgetSheet from '../WidgetSheet.vue'

const route = useRoute()

/** `?id=` picks the challenge (long term); phase 1 always shows its one challenge. */
const entry = computed(() => findEntry(route.query.id as string | undefined))
const challenge = computed(() => entry.value.config)
const progress = computed(() => entry.value.progress)
const entryStatus = computed(() => entry.value.status)

/** Back goes to Browse when that's where the reader came from. */
const headerLeft = computed<AppHeaderItem[]>(() => [
  route.query.from === 'browse'
    ? { type: 'link', icon: 'arrow-previous', label: 'Back to challenges', href: BROWSE_PATH }
    : { type: 'link', icon: 'arrow-previous', label: 'Back to Activity', href: ACTIVITY_PATH },
  { type: 'title', text: 'Challenge' },
])
const headerRight: AppHeaderItem[] = [{ type: 'component', component: markRaw(ChallengeOverflowMenu) }]

const loginOpen = ref(false)
const widgetOpen = ref(false)
/** Sheet opened right after joining (vs. from the "Add widget" button). */
const widgetAfterJoin = ref(false)
const showJoined = ref(false)
const snackbarText = ref('You’ve joined. Your progress shows in Activity.')
const snackbarType = ref<'success' | 'notice'>('success')
/** Bumped per message so a new one restarts the snackbar even if one is showing. */
const snackbarKey = ref(0)

function showSnackbar(text: string, type: 'success' | 'notice' = 'success'): void {
  snackbarText.value = text
  snackbarType.value = type
  snackbarKey.value += 1
  showJoined.value = true
}

/** After a join: first challenge with a widget → suggest it; otherwise the snackbar. */
function confirmJoin(): void {
  if (demo.suggestWidget) {
    demo.suggestWidget = false
    widgetAfterJoin.value = true
    widgetOpen.value = true
    return
  }
  showSnackbar('You’ve joined. Your progress shows in Activity.')
}

function onWidgetAdded(): void {
  showSnackbar('Widget added to your home screen.')
}

function openWidgetSheet(): void {
  widgetAfterJoin.value = false
  widgetOpen.value = true
}

onMounted(() => {
  // Arriving straight from "Join" (e.g. on Activity) — confirm it here, once.
  if (demo.justJoined) {
    demo.justJoined = false
    confirmJoin()
  }
})

function join(): void {
  if (!demo.loggedIn) {
    loginOpen.value = true
    return
  }
  joinChallenge(challenge.value.id)
  demo.justJoined = false
  confirmJoin()
}

const status = computed(() => {
  switch (entryStatus.value) {
    case 'joined':
      return { label: 'Joined', type: 'notice' as const }
    case 'completed':
      return { label: 'Completed', type: 'success' as const }
    case 'expired':
      return { label: 'Ended', type: 'warning' as const }
    default:
      return null
  }
})

const timing = computed(() => {
  if (entryStatus.value === 'expired') return `${CHALLENGE_RANGE_LABEL} · Ended`
  if (entryStatus.value === 'completed') {
    return `Completed ${formatShortDate(progress.value.completedOn ?? progress.value.day)}`
  }
  return `${CHALLENGE_RANGE_LABEL} · ${progress.value.daysLeft} days left`
})

const languageLabel = computed(() => languageLabelOf(challenge.value))

const achievementLine = computed(() => {
  if (entryStatus.value === 'completed') {
    return `Earned ${formatShortDate(progress.value.completedOn ?? progress.value.day)}. It’s saved in your Activity.`
  }
  if (entryStatus.value === 'expired') return 'This one wasn’t earned. There’s a new challenge every month.'
  return 'Complete the challenge to earn this achievement. It’ll appear in your Activity.'
})
</script>

<template>
  <AppChromeWrapper :left="headerLeft" :right="headerRight" :show-bottom-menu="false">
    <div class="challenge-details">
      <!-- Hero -->
      <header class="challenge-details__hero">
        <AchievementBadge
          :achievement="challenge.achievement"
          :locked="entryStatus !== 'completed'"
          size="large"
        />
        <CdxInfoChip v-if="status" :status="status.type">{{ status.label }}</CdxInfoChip>
        <h2 class="challenge-details__title">{{ challenge.title }}</h2>
        <p class="challenge-details__summary">{{ challenge.summary }}</p>
        <p class="challenge-details__timing">
          <CdxIcon :icon="cdxIconCalendar" size="small" />
          {{ timing }}
        </p>
      </header>

      <!-- Today's status: below the challenge header, above progress -->
      <section v-if="entry.suggestArticle" class="challenge-details__section challenge-details__today">
        <DiveBackIn :entry="entry" />
      </section>

      <CdxMessage v-if="entryStatus === 'expired'" type="warning">
        This challenge ended before you reached the goal. You read
        {{ progress.unit === 'days' ? 'on ' : '' }}{{ progress.value }} of {{ progress.target }}
        {{ progress.unit }}.
      </CdxMessage>

      <!-- Progress -->
      <!-- Reading lists show the list before joining too, so readers see what's on it -->
      <section
        v-if="entryStatus !== 'available' || challenge.goal.kind === 'reading-list'"
        class="challenge-details__section"
      >
        <div class="challenge-details__heading-row">
          <h3 class="challenge-details__heading">
            {{ entryStatus === 'available' ? 'Reading list' : 'Your progress' }}
          </h3>
          <!-- Progress is local, not synced: said quietly, on request. -->
          <CdxButton
            v-if="entryStatus !== 'available'"
            weight="quiet"
            class="challenge-details__info"
            aria-label="About your progress"
            @click="showSnackbar('Your progress is tracked on this device.', 'notice')"
          >
            <CdxIcon :icon="cdxIconInfo" />
          </CdxButton>
        </div>
        <ChallengeProgress :entry="entry" full />
      </section>


      <!-- Long term: who runs it, who published it, which languages count -->
      <section v-if="isLongTerm" class="challenge-details__section">
        <h3 class="challenge-details__heading">About this challenge</h3>
        <dl class="challenge-details__about">
          <div v-if="challenge.host">
            <dt>Hosted by</dt>
            <dd>{{ challenge.host }}</dd>
          </div>
          <div v-if="challenge.publishedBy">
            <dt>Published by</dt>
            <dd>
              <a :href="`https://meta.wikimedia.org/wiki/User:${challenge.publishedBy}`">
                {{ challenge.publishedBy }}
              </a>
            </dd>
          </div>
          <div>
            <dt>Article language</dt>
            <dd>{{ languageLabel }}</dd>
          </div>
        </dl>
      </section>

      <!-- Requirements -->
      <section class="challenge-details__section">
        <h3 class="challenge-details__heading">How to complete</h3>
        <ul class="challenge-details__requirements">
          <li v-for="requirement in challenge.requirements" :key="requirement">
            <CdxIcon :icon="cdxIconCheck" size="small" />
            <span>{{ requirement }}</span>
          </li>
        </ul>
      </section>

      <!-- Achievement preview -->
      <section class="challenge-details__section challenge-details__achievement">
        <AchievementBadge
          :achievement="challenge.achievement"
          :locked="entryStatus !== 'completed'"
        />
        <div>
          <span class="challenge-details__eyebrow">Achievement</span>
          <strong class="challenge-details__achievement-name">{{ challenge.achievement.name }}</strong>
          <p class="challenge-details__muted">{{ achievementLine }}</p>
        </div>
      </section>

      <!-- Widget CTA -->
      <section
        v-if="challenge.widget?.available && entryStatus !== 'expired'"
        class="challenge-details__section challenge-details__widget"
      >
        <CdxIcon :icon="cdxIconViewCompact" class="challenge-details__widget-icon" />
        <div class="challenge-details__widget-text">
          <strong>Track it from your home screen</strong>
          <p class="challenge-details__muted">
            The {{ challenge.widget.name.toLowerCase() }} widget shows your progress at a glance.
          </p>
          <CdxButton @click="openWidgetSheet">Add widget</CdxButton>
        </div>
      </section>

      <!-- Primary action -->
      <div v-if="entryStatus === 'available'" class="challenge-details__footer">
        <CdxButton action="progressive" weight="primary" size="large" @click="join">
          Join challenge
        </CdxButton>
        <p v-if="!demo.loggedIn" class="challenge-details__muted">
          You’ll need to log in to join.
        </p>
      </div>
    </div>

    <!-- Snackbar (join confirmation, widget added, progress info): bottom of the screen, over the content -->
    <div v-if="showJoined" class="challenge-details__snackbar">
      <CdxToast
        :key="snackbarKey"
        :type="snackbarType"
        standalone
        render-in-place
        :auto-dismiss="true"
        @auto-dismissed="showJoined = false"
        @user-dismissed="showJoined = false"
      >
        {{ snackbarText }}
      </CdxToast>
    </div>

    <LoginRequiredDialog v-model:open="loginOpen" @logged-in="join" />
    <WidgetSheet
      v-model:open="widgetOpen"
      :entry="entry"
      :after-join="widgetAfterJoin"
      @added="onWidgetAdded"
    />
    <PrototypeControls />
  </AppChromeWrapper>
</template>

<style scoped>
/* Space between the back arrow and the screen title. */
:deep(.app-chrome-header__left) {
  gap: var(--spacing-75, 12px);
}

/* Pinned to the bottom of the phone column, floating over the content. */
.challenge-details__snackbar {
  position: fixed;
  bottom: var(--spacing-150, 24px);
  left: 50%;
  z-index: 10;
  box-sizing: border-box;
  width: min(412px, 100vw);
  padding-inline: var(--spacing-100, 16px);
  transform: translateX(-50%);
}

/* Codex positions standalone toasts itself; let the wrapper place it instead,
   so it sits 16px in from each side of the screen. */
.challenge-details__snackbar :deep(.cdx-toast) {
  position: static;
  transform: none;
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  margin: 0;
}

.challenge-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
  padding-block: var(--spacing-150, 24px);
}

.challenge-details__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-50, 8px);
  text-align: center;
}

.challenge-details__title {
  margin: var(--spacing-50, 8px) 0 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-xx-large, 2.125rem);
  color: var(--color-base, #202122);
}

.challenge-details__summary {
  margin: 0;
  color: var(--color-base, #202122);
}

.challenge-details__timing {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.challenge-details__timing :deep(.cdx-icon) {
  color: inherit;
}

.challenge-details__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
}

.challenge-details__heading {
  margin: 0;
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-large, 1.625rem);
  color: var(--color-base, #202122);
}

.challenge-details__requirements {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.challenge-details__requirements li {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75, 12px);
  color: var(--color-base, #202122);
}

.challenge-details__requirements :deep(.cdx-icon) {
  margin-top: 2px;
  color: var(--color-success, #177860);
}

.challenge-details__today {
  border-color: var(--border-color-progressive, #36c);
  background-color: var(--background-color-progressive-subtle, #f1f4fd);
}

.challenge-details__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50, 8px);
}

/* Pull the quiet icon button to the section's padding edge. */
.challenge-details__info {
  margin: calc(-1 * var(--spacing-50, 8px)) calc(-1 * var(--spacing-35, 6px)) calc(-1 * var(--spacing-50, 8px)) 0;
}

.challenge-details__info :deep(.cdx-icon) {
  color: var(--color-subtle, #54595d);
}

.challenge-details__about {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  margin: 0;
}

.challenge-details__about div {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
}

.challenge-details__about dt {
  color: var(--color-subtle, #54595d);
}

.challenge-details__about dd {
  margin: 0;
  text-align: end;
  color: var(--color-base, #202122);
}

.challenge-details__achievement {
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-100, 16px);
}

.challenge-details__achievement > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.challenge-details__eyebrow {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.challenge-details__achievement-name {
  font-size: var(--font-size-large, 1.125rem);
  color: var(--color-base, #202122);
}

.challenge-details__muted {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.challenge-details__widget {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--spacing-100, 16px);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.challenge-details__widget-icon {
  flex-shrink: 0;
  color: var(--color-progressive, #36c);
}

.challenge-details__widget-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
  color: var(--color-base, #202122);
}

.challenge-details__footer {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  margin-inline: calc(-1 * var(--spacing-150, 24px));
  padding: var(--spacing-100, 16px) var(--spacing-150, 24px);
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  background-color: var(--background-color-base, #fff);
  text-align: center;
}

.challenge-details__footer :deep(.cdx-button) {
  width: 100%;
  max-width: none;
}
</style>
