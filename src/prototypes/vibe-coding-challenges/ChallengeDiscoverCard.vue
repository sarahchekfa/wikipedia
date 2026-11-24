<script setup lang="ts">
/**
 * Last slide of the Activity carousel (long term): every challenge the reader
 * could join, folded into one compact card that points to Browse. Also notes
 * joined challenges that didn't fit in the carousel.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton } from '@wikimedia/codex'

import AchievementBadge from './AchievementBadge.vue'
import { BROWSE_PATH, type ChallengeEntry } from './challenges'

const props = withDefaults(
  defineProps<{
    /** Challenges open to join that aren't already a card in the carousel. */
    toJoin: ChallengeEntry[]
    /** Joined challenges beyond the carousel cap. */
    moreJoined?: number
  }>(),
  { moreJoined: 0 },
)

const router = useRouter()

const heading = computed(() => {
  const count = props.toJoin.length
  if (!count) return `You’re in ${props.moreJoined} more`
  return `${count} other ${count === 1 ? 'challenge' : 'challenges'} you can join`
})

const badges = computed(() => props.toJoin.slice(0, 3))
</script>

<template>
  <section class="discover-card" aria-label="More challenges">
    <div v-if="badges.length" class="discover-card__badges" aria-hidden="true">
      <AchievementBadge
        v-for="entry in badges"
        :key="entry.config.id"
        :achievement="entry.config.achievement"
        locked
        size="small"
      />
    </div>
    <div class="discover-card__text">
      <strong>{{ heading }}</strong>
      <span v-if="toJoin.length">
        {{ toJoin.slice(0, 2).map((entry) => entry.config.title).join(', ')
        }}{{ toJoin.length > 2 ? ', and more' : '' }}
      </span>
      <span v-if="moreJoined && toJoin.length">
        Plus {{ moreJoined }} more you’re in
      </span>
    </div>
    <CdxButton action="progressive" @click="router.push(BROWSE_PATH)">
      {{ toJoin.length ? 'Browse challenges' : 'See all your challenges' }}
    </CdxButton>
  </section>
</template>

<style scoped>
.discover-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

/* Overlapping badges, like a stack of avatars. */
.discover-card__badges {
  display: flex;
}

.discover-card__badges > * + * {
  margin-inline-start: -10px;
}

.discover-card__text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
  color: var(--color-base, #202122);
}

.discover-card__text strong {
  font-size: var(--font-size-large, 1.125rem);
  line-height: var(--line-height-large, 1.625rem);
}

.discover-card__text span {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.discover-card :deep(.cdx-button) {
  align-self: flex-start;
}
</style>
