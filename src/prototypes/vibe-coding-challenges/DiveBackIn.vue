<script setup lang="ts">
/**
 * "Dive back in" — one compact, tappable article row (plus a one-line prompt
 * for the streak). Shown while today's reading for the challenge is still to
 * do. Opening the article counts as reading in the prototype, so coming back
 * to Activity shows today ticked off.
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CdxIcon, CdxThumbnail } from '@wikimedia/codex'
import { cdxIconNext } from '@wikimedia/codex-icons'

import { markReadToday, type ChallengeEntry } from './challenges'
import { fetchThumbnailUrl } from './fetchThumbnail'

const props = defineProps<{ entry: ChallengeEntry }>()

const router = useRouter()
/** Reading list → an article not read yet (a suggestion; order does not matter); otherwise a recent one. */
const article = computed(() => props.entry.nextArticle)
const thumbnailUrl = ref<string | null>(null)

watch(
  () => [article.value.title, props.entry.articleLang],
  async ([title, lang]) => {
    thumbnailUrl.value = null
    thumbnailUrl.value = await fetchThumbnailUrl(title, { host: `${lang}.wikipedia.org` })
  },
  { immediate: true },
)

const prompt = computed(() => {
  const { config, progress } = props.entry
  if (config.goal.kind === 'days') {
    return progress.currentStreak > 0
      ? `Read today to keep your ${progress.currentStreak}-day streak.`
      : 'Read for a minute to count today.'
  }
  // Minutes goal: same streak nudge while today's still unread (no daily
  // requirement — the streak is just encouragement); nothing once they have.
  if (config.goal.kind === 'minutes' && !progress.readToday) {
    return progress.currentStreak > 0
      ? `Read today to keep your ${progress.currentStreak}-day streak.`
      : 'Read today to start a streak.'
  }
  return ''
})

function open(): void {
  markReadToday()
  router.push({
    path: '/template-app-article',
    query: { article: article.value.title, lang: props.entry.articleLang },
  })
}
</script>

<template>
  <div class="dive-back-in">
    <p v-if="prompt" class="dive-back-in__prompt">{{ prompt }}</p>
    <button
      type="button"
      class="dive-back-in__article"
      :aria-label="`Continue reading ${article.title}`"
      @click="open"
    >
      <span class="dive-back-in__text">
        <strong>{{ article.title }}</strong>
        <span class="dive-back-in__description">{{ article.description }}</span>
      </span>
      <!-- Picture on the right so text lines up whether or not an article has one -->
      <CdxThumbnail
        v-if="thumbnailUrl"
        class="dive-back-in__thumb"
        :thumbnail="{ url: thumbnailUrl }"
      />
      <CdxIcon class="dive-back-in__chevron" :icon="cdxIconNext" size="small" />
    </button>
  </div>
</template>

<style scoped>
.dive-back-in {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.dive-back-in__prompt {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.dive-back-in__article {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  width: 100%;
  padding: var(--spacing-50, 8px);
  border: 0;
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.dive-back-in__article:hover {
  background-color: var(--background-color-interactive-subtle--hover, #eaecf0);
}

.dive-back-in__thumb {
  flex-shrink: 0;
}

.dive-back-in__text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  color: var(--color-base, #202122);
}

.dive-back-in__description {
  overflow: hidden;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dive-back-in__chevron {
  flex-shrink: 0;
  color: var(--color-subtle, #54595d);
}
</style>
