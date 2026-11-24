<script setup lang="ts">
/**
 * Overflow on the challenge details screen. Full version adds
 * "Challenge configuration" (on-wiki config page, editable by permitted users)
 * in the long-term version, when `challenge.configPageUrl` is set. The page
 * lives on-wiki, so who can edit it is enforced there, not in the app.
 */
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { MenuButtonItemData } from '@wikimedia/codex'
import {
  cdxIconLogOut,
  cdxIconSettings,
  cdxIconShare,
  cdxIconVerticalEllipsis,
} from '@wikimedia/codex-icons'

import { demo, findEntry, isLongTerm, leaveChallenge } from './challenges'

const route = useRoute()
const selection = ref<string | null>(null)

/** Rendered in the header with no props, so it reads the challenge from the route. */
const entry = computed(() => findEntry(route.query.id as string | undefined))
const challenge = computed(() => entry.value.config)

const items = computed<MenuButtonItemData[]>(() => {
  const list: MenuButtonItemData[] = [
    { label: 'Share challenge', value: 'share', icon: cdxIconShare },
  ]
  if (isLongTerm.value && challenge.value.configPageUrl) {
    // Everyone can open the config page; only users with the on-wiki right can edit it.
    list.push({
      label: demo.canEditConfig ? 'Edit challenge configuration' : 'View challenge configuration',
      value: 'config',
      icon: cdxIconSettings,
    })
  }
  if (entry.value.status === 'joined') {
    list.push({
      label: 'Leave challenge',
      value: 'leave',
      icon: cdxIconLogOut,
      action: 'destructive',
    })
  }
  return list
})

function onSelect(value: string | null): void {
  if (value === 'leave') leaveChallenge(challenge.value.id)
  if (value === 'config' && challenge.value.configPageUrl) {
    window.open(challenge.value.configPageUrl, '_blank', 'noopener')
  }
  selection.value = null
}
</script>

<template>
  <CdxMenuButton
    v-model:selected="selection"
    :menu-items="items"
    aria-label="More options"
    @update:selected="onSelect"
  >
    <CdxIcon :icon="cdxIconVerticalEllipsis" />
  </CdxMenuButton>
</template>
