<script setup lang="ts">
/**
 * Full-screen achievement (long term): big badge, name, what it was for, when
 * it was unlocked, and Share. Not earned yet → how to earn it instead.
 * Reached by tapping a tile on the Achievements screen.
 */
definePage({
  meta: {
    platform: 'app',
  },
})

import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdxButton, CdxIcon, CdxToast } from '@wikimedia/codex'
import { cdxIconShare } from '@wikimedia/codex-icons'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'

import AchievementBadge from '../AchievementBadge.vue'
import {
  ACHIEVEMENTS_PATH,
  achievements,
  ALL_CHALLENGES,
  detailsLink,
  formatIsoDate,
} from '../challenges'
import PrototypeControls from '../PrototypeControls.vue'

const route = useRoute()
const router = useRouter()

const headerLeft: AppHeaderItem[] = [
  { type: 'link', icon: 'arrow-previous', label: 'Back to achievements', href: ACHIEVEMENTS_PATH },
]

const id = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''))

/** The challenge this achievement belongs to (for "how to earn it"). */
const sourceChallenge = computed(() =>
  ALL_CHALLENGES.find((config) => config.achievement.id === id.value),
)

const earned = computed(() => achievements.value.find((item) => item.id === id.value) ?? null)

const achievement = computed(() => earned.value ?? sourceChallenge.value?.achievement ?? null)

/** Share: the OS share sheet where the browser has one; otherwise copy the text. */
const shareText = computed(() =>
  achievement.value
    ? `I earned the “${achievement.value.name}” achievement on Wikipedia: ${achievement.value.description}.`
    : '',
)
const toast = ref<string | null>(null)

async function share(): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({ title: achievement.value?.name, text: shareText.value })
      return
    }
    await navigator.clipboard.writeText(shareText.value)
    toast.value = 'Copied to share.'
  } catch {
    /* share sheet dismissed */
  }
}

function seeChallenge(): void {
  if (sourceChallenge.value) router.push(detailsLink(sourceChallenge.value.id))
}
</script>

<template>
  <AppChromeWrapper :left="headerLeft" :right="[]" :show-bottom-menu="false">
    <div v-if="achievement" class="achievement-screen">
      <div class="achievement-screen__intro">
        <h2 class="achievement-screen__name">{{ achievement.name }}</h2>
        <p class="achievement-screen__description">{{ achievement.description }}</p>
      </div>

      <AchievementBadge
        class="achievement-screen__badge"
        :achievement="achievement"
        :locked="!earned"
        size="hero"
      />

      <p class="achievement-screen__when">
        <template v-if="earned">Unlocked on {{ formatIsoDate(earned.earnedOn) }}</template>
        <template v-else-if="sourceChallenge">
          Complete {{ sourceChallenge.title }} to unlock
        </template>
        <template v-else>Not unlocked yet</template>
      </p>

      <div class="achievement-screen__footer">
        <CdxButton
          v-if="earned"
          action="progressive"
          weight="primary"
          size="large"
          @click="share"
        >
          <CdxIcon :icon="cdxIconShare" />
          Share
        </CdxButton>
        <CdxButton v-else-if="sourceChallenge" size="large" @click="seeChallenge">
          See challenge
        </CdxButton>
      </div>
    </div>

    <p v-else class="achievement-screen__missing">This achievement couldn’t be found.</p>

    <div v-if="toast" class="achievement-screen__toast">
      <CdxToast
        type="success"
        standalone
        render-in-place
        :auto-dismiss="true"
        @auto-dismissed="toast = null"
        @user-dismissed="toast = null"
      >
        {{ toast }}
      </CdxToast>
    </div>

    <PrototypeControls />
  </AppChromeWrapper>
</template>

<style scoped>
.achievement-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-200, 32px);
  min-height: 100%;
  padding-block: var(--spacing-100, 16px) var(--spacing-150, 24px);
  text-align: center;
}

.achievement-screen__intro {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

/* Codex heading, xx-large */
.achievement-screen__name {
  margin: 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-xx-large, 2.125rem);
  color: var(--color-base, #202122);
}

.achievement-screen__description,
.achievement-screen__when {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-medium, 1.625rem);
  color: var(--color-subtle, #54595d);
}

.achievement-screen__badge {
  margin-block: var(--spacing-100, 16px);
}

/* Share stays at the bottom of the screen. */
.achievement-screen__footer {
  position: sticky;
  bottom: 0;
  box-sizing: border-box;
  width: 100%;
  margin-top: auto;
  padding-block: var(--spacing-100, 16px);
  background-color: var(--background-color-base, #fff);
}

.achievement-screen__footer :deep(.cdx-button) {
  width: 100%;
  max-width: none;
}

.achievement-screen__missing {
  margin: var(--spacing-150, 24px) 0;
  color: var(--color-subtle, #54595d);
}

.achievement-screen__toast {
  position: fixed;
  bottom: var(--spacing-150, 24px);
  left: 50%;
  z-index: 10;
  box-sizing: border-box;
  width: min(412px, 100vw);
  padding-inline: var(--spacing-100, 16px);
  transform: translateX(-50%);
}

.achievement-screen__toast :deep(.cdx-toast) {
  position: static;
  transform: none;
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  margin: 0;
}
</style>
