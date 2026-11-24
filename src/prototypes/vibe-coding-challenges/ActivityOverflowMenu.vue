<script setup lang="ts">
/**
 * Overflow (⋮) menu shared by Activity and the Achievements screen:
 * Activity shows Customize; Achievements shows Export / Import.
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { MenuButtonItemData } from '@wikimedia/codex'
import {
  cdxIconDownload,
  cdxIconSettings,
  cdxIconUpload,
  cdxIconVerticalEllipsis,
} from '@wikimedia/codex-icons'

import {
  achievements,
  activityToast,
  CUSTOMIZE_PATH,
  exportAchievements,
  importAchievements,
} from './challenges'

const router = useRouter()
const route = useRoute()
const selection = ref<string | null>(null)
const importInput = ref<HTMLInputElement | null>(null)

/** Activity → Customize; Achievements screen → Export / Import. */
const onAchievements = computed(() => route.path.endsWith('/achievements'))

const items = computed<MenuButtonItemData[]>(() =>
  onAchievements.value
    ? [
        {
          label: 'Export achievements',
          value: 'export',
          icon: cdxIconDownload,
          disabled: achievements.value.length === 0,
        },
        { label: 'Import achievements', value: 'import', icon: cdxIconUpload },
      ]
    : [{ label: 'Customize', value: 'customize', icon: cdxIconSettings }],
)

function onSelect(value: string | null): void {
  if (value === 'customize') router.push(CUSTOMIZE_PATH)
  if (value === 'export') {
    const count = exportAchievements()
    activityToast.value = {
      type: 'success',
      text: `Exported ${count} ${count === 1 ? 'achievement' : 'achievements'}. Import the file on another device to bring them over.`,
    }
  }
  if (value === 'import') importInput.value?.click()
  selection.value = null
}

async function onImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const added = await importAchievements(file)
    activityToast.value = {
      type: 'success',
      text: added
        ? `Imported ${added} ${added === 1 ? 'achievement' : 'achievements'}.`
        : 'Those achievements are already here.',
    }
  } catch {
    activityToast.value = { type: 'error', text: 'That file isn’t an achievements export.' }
  }
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
  <input
    ref="importInput"
    type="file"
    accept="application/json,.json"
    hidden
    @change="onImportFile"
  />
</template>
