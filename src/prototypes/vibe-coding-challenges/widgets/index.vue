<script setup lang="ts">
/**
 * The streak widget on a mock home screen, in both sizes: large (streak +
 * progress toward the goal) and small (streak). It follows the prototype's
 * state (change it with the ⚙ panel). Reached from "See all widget designs" / the ⚙ panel.
 */
definePage({
  meta: {
    platform: 'app',
  },
})

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import { useIsIos } from '@/composables/useAppPlatform'

import ChallengeWidget from '../ChallengeWidget.vue'
import { DETAILS_PATH, primaryEntry } from '../challenges'
import PrototypeControls from '../PrototypeControls.vue'

const isIos = useIsIos()

const headerLeft: AppHeaderItem[] = [
  { type: 'link', icon: 'arrow-previous', label: 'Back to challenge', href: DETAILS_PATH },
  { type: 'title', text: 'Widget' },
]

const FAKE_APPS = ['Mail', 'Maps', 'Photos', 'Music']
</script>

<template>
  <AppChromeWrapper :left="headerLeft" :right="[]" :show-bottom-menu="false">
    <div class="widget-mockups">
      <!-- Mock home screen -->
      <div class="widget-mockups__home" :aria-label="`${isIos ? 'iOS' : 'Android'} home screen`">
        <!-- Large (4×2): streak + progress toward the goal -->
        <ChallengeWidget
          :config="primaryEntry.config"
          :status="primaryEntry.status"
          :read-today="primaryEntry.progress.readToday"
          size="large"
        />

        <div class="widget-mockups__row">
          <ChallengeWidget
            :config="primaryEntry.config"
            :status="primaryEntry.status"
            :read-today="primaryEntry.progress.readToday"
          />
          <div class="widget-mockups__apps" aria-hidden="true">
            <span v-for="app in FAKE_APPS" :key="app" class="widget-mockups__app">
              <span class="widget-mockups__app-icon" />
              <span class="widget-mockups__app-name">{{ app }}</span>
            </span>
          </div>
        </div>
      </div>

    </div>

    <PrototypeControls />
  </AppChromeWrapper>
</template>

<style scoped>
:deep(.app-chrome-header__left) {
  gap: var(--spacing-75, 12px);
}

.widget-mockups {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding-block: var(--spacing-100, 16px) var(--spacing-150, 24px);
}


.widget-mockups__home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-150, 24px) var(--spacing-50, 8px);
  border-radius: 24px;
  /* Wallpaper — a stand-in, not a Codex surface. */
  background: linear-gradient(160deg, #6b8fd6 0%, #9a7fd1 50%, #e3a0b5 100%);
}

.widget-mockups__row {
  display: flex;
  gap: var(--spacing-100, 16px);
}

.widget-mockups__apps {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-75, 12px);
  width: 148px;
}

.widget-mockups__app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.widget-mockups__app-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.55);
}

.widget-mockups__app-name {
  font-size: 0.6875rem;
  color: #fff;
}

</style>
