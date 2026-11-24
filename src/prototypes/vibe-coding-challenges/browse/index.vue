<script setup lang="ts">
/**
 * Browse challenges (long term). Lists the challenges open in the reader's app
 * languages — joined ones first, then monthly (generic) and themed ones — with
 * each challenge's host. The language filter is automatic; nothing on screen
 * mentions it. Reached from "See all" on Activity and onboarding.
 */
definePage({
  meta: {
    platform: 'app',
  },
})

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'

import ChallengeListItem from '../ChallengeListItem.vue'
import { ACTIVITY_PATH, demo, entries, joinChallenge } from '../challenges'
import LoginRequiredDialog from '../LoginRequiredDialog.vue'
import PrototypeControls from '../PrototypeControls.vue'

const router = useRouter()
const loginOpen = ref(false)
const pendingJoinId = ref<string | null>(null)

/** Join from the list (needs an account), then show that challenge's screen. */
function requestJoin(id: string): void {
  if (!demo.loggedIn) {
    pendingJoinId.value = id
    loginOpen.value = true
    return
  }
  joinChallenge(id)
  router.push({ path: '/vibe-coding-challenges/challenge', query: { id, from: 'browse' } })
}

const headerLeft: AppHeaderItem[] = [
  { type: 'link', icon: 'arrow-previous', label: 'Back to Activity', href: ACTIVITY_PATH },
  { type: 'title', text: 'Challenges' },
]

const sections = computed(() => [
  {
    title: 'Your challenges',
    items: entries.value.filter((e) => e.status === 'joined' || e.status === 'completed'),
  },
  {
    title: 'Monthly challenges',
    items: entries.value.filter((e) => e.status === 'available' && e.config.kind === 'generic'),
  },
  {
    title: 'Themed challenges',
    items: entries.value.filter((e) => e.status === 'available' && e.config.kind === 'themed'),
  },
  { title: 'Ended', items: entries.value.filter((e) => e.status === 'expired') },
])
</script>

<template>
  <AppChromeWrapper :left="headerLeft" :right="[]" :show-bottom-menu="false">
    <div class="browse-challenges">
      <template v-for="section in sections" :key="section.title">
        <section v-if="section.items.length" class="browse-challenges__section">
          <h3 class="browse-challenges__heading">{{ section.title }}</h3>
          <ChallengeListItem
            v-for="entry in section.items"
            :key="entry.config.id"
            :entry="entry"
            @join="requestJoin"
          />
        </section>
      </template>
    </div>

    <LoginRequiredDialog
      v-model:open="loginOpen"
      @logged-in="pendingJoinId && requestJoin(pendingJoinId)"
    />
    <PrototypeControls />
  </AppChromeWrapper>
</template>

<style scoped>
:deep(.app-chrome-header__left) {
  gap: var(--spacing-75, 12px);
}

.browse-challenges {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
  padding-block: var(--spacing-100, 16px) var(--spacing-150, 24px);
}

.browse-challenges__section {
  display: flex;
  flex-direction: column;
}

.browse-challenges__heading {
  margin: 0 0 var(--spacing-25, 4px);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-large, 1.625rem);
  color: var(--color-base, #202122);
}
</style>
