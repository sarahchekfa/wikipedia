<script setup lang="ts">
/**
 * Activity → Customize: pick which modules show on Activity. Reached from
 * Activity's overflow menu. Challenges and Achievements are new rows here.
 */
definePage({
  meta: {
    platform: 'app',
  },
})

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CdxToggleSwitch } from '@wikimedia/codex'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import {
  ANDROID_MAIN_BOTTOM_NAV_ITEMS,
  IOS_MAIN_BOTTOM_NAV_ITEMS,
  type AppBottomNavItem,
} from '@/components/app/appBottomNavItems'
import { useIsIos } from '@/composables/useAppPlatform'

import { ACTIVITY_MODULES, ACTIVITY_PATH, demo } from '../challenges'
import PrototypeControls from '../PrototypeControls.vue'

const router = useRouter()
const isIos = useIsIos()

const headerLeft: AppHeaderItem[] = [
  { type: 'link', icon: 'arrow-previous', label: 'Back to Activity', href: ACTIVITY_PATH },
  { type: 'title', text: 'Customize' },
]

const bottomNavItems = computed(() =>
  isIos.value ? IOS_MAIN_BOTTOM_NAV_ITEMS : ANDROID_MAIN_BOTTOM_NAV_ITEMS,
)

function onBottomNav(item: AppBottomNavItem): void {
  if (item === 'history') router.push(ACTIVITY_PATH)
  else if (item === 'search') router.push('/template-app-search')
  else if (item === 'bookmarks') router.push('/template-app-saved')
}
</script>

<template>
  <AppChromeWrapper
    :left="headerLeft"
    :right="[]"
    :bottom-nav-items="bottomNavItems"
    active-nav-item="history"
    @navigate="onBottomNav"
  >
    <div class="customize">
      <p class="customize__note">
        Reading insights are based on your app languages in settings, and editing insights are
        limited to your primary app language. Insights leverage local data, with the exception of
        edits which are public.
      </p>

      <ul class="customize__list">
        <li v-for="module in ACTIVITY_MODULES" :key="module.key">
          <CdxToggleSwitch v-model="demo.activityModules[module.key]" :align-switch="true">
            {{ module.label }}
          </CdxToggleSwitch>
        </li>
      </ul>
    </div>

    <PrototypeControls />
  </AppChromeWrapper>
</template>

<style scoped>
:deep(.app-chrome-header__left) {
  gap: var(--spacing-75, 12px);
}

/* Full-bleed: the screen's list and note run edge to edge (past the 24px inset). */
.customize {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  margin-inline: calc(-1 * var(--spacing-150, 24px));
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

/* Codex small text, subtle, on the neutral band. */
.customize__note {
  margin: 0;
  padding: var(--spacing-100, 16px);
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.375rem);
  color: var(--color-subtle, #54595d);
}

.customize__list {
  margin: 0;
  padding: 0;
  list-style: none;
  background-color: var(--background-color-base, #fff);
}

.customize__list li {
  margin: 0;
  padding: var(--spacing-100, 16px);
}

.customize__list li + li {
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

/* Label left, switch right, full row. */
.customize__list :deep(.cdx-toggle-switch) {
  display: flex;
  width: 100%;
}

.customize__list :deep(.cdx-label) {
  flex: 1 1 auto;
  padding: 0;
  font-size: var(--font-size-medium, 1rem);
  color: var(--color-base, #202122);
}
</style>
