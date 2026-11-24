<script setup lang="ts">
/** Joining needs an account (progress itself is tracked on the device). */
import { CdxDialog } from '@wikimedia/codex'

import { demo } from './challenges'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ 'logged-in': [] }>()

function logIn(): void {
  // Prototype: skip the real login flow and come straight back logged in.
  demo.loggedIn = true
  open.value = false
  emit('logged-in')
}
</script>

<template>
  <CdxDialog
    v-model:open="open"
    title="Log in to join"
    :use-close-button="true"
    :primary-action="{ label: 'Log in', actionType: 'progressive' }"
    :default-action="{ label: 'Create account' }"
    @primary="logIn"
    @default="logIn"
  >
    <p>
      You need a Wikipedia account to join challenges. Your progress is tracked from your reading
      on this device.
    </p>
  </CdxDialog>
</template>
