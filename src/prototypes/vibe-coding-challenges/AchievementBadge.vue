<script setup lang="ts">
/**
 * Achievement medal: a scalloped rosette with a small illustration of the
 * challenge's theme in the middle (calendar for the streak, clock for minutes,
 * planet for the solar system, pyramid for civilizations, globe for places).
 * Codex has no medal icon, so this is a small inline SVG. Rosette and disc use
 * Codex tokens; theme art uses fixed illustration colours. Locked = greyscale.
 */
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconArticles, cdxIconLock } from '@wikimedia/codex-icons'

import type { ChallengeAchievement } from './challenges'

interface Props {
  achievement: Pick<ChallengeAchievement, 'tone' | 'glyph' | 'name' | 'label'>
  /** Not earned yet — greyed out with a lock. */
  locked?: boolean
  size?: 'small' | 'medium' | 'tile' | 'large' | 'hero'
}

const props = withDefaults(defineProps<Props>(), { locked: false, size: 'medium' })

const ART = new Set(['streak', 'clock', 'planet', 'pyramid', 'globe', 'cake'])
const hasArt = computed(() => ART.has(props.achievement.glyph))

/** 12-point scalloped rosette, 100×100 viewBox. */
const ROSETTE = (() => {
  const points: string[] = []
  const lobes = 12
  for (let i = 0; i < lobes * 2; i += 1) {
    const angle = (Math.PI * i) / lobes - Math.PI / 2
    const radius = i % 2 === 0 ? 48 : 42
    points.push(`${50 + radius * Math.cos(angle)},${50 + radius * Math.sin(angle)}`)
  }
  return points.join(' ')
})()

/** A few fixed "stars" for the space disc. */
const STARS = [
  [36, 34, 0.9],
  [64, 31, 0.7],
  [70, 58, 0.8],
  [31, 62, 0.6],
  [58, 70, 0.7],
]
</script>

<template>
  <span
    class="achievement-badge"
    :class="[
      `achievement-badge--${props.size}`,
      `achievement-badge--${props.achievement.tone}`,
      { 'achievement-badge--locked': props.locked },
    ]"
    role="img"
    :aria-label="`${props.achievement.name}${props.locked ? ' (not earned yet)' : ''}`"
  >
    <svg class="achievement-badge__frame" viewBox="0 0 100 100" aria-hidden="true">
      <polygon class="achievement-badge__rosette" :points="ROSETTE" />
      <circle class="achievement-badge__disc" cx="50" cy="50" r="33" />

      <!-- Streak: calendar page with the goal number -->
      <g v-if="props.achievement.glyph === 'streak'" class="achievement-badge__art">
        <rect x="33" y="35" width="34" height="32" rx="4" class="art-paper" />
        <rect x="33" y="35" width="34" height="9" rx="4" class="art-ink" />
        <rect x="33" y="40" width="34" height="4" class="art-ink" />
        <rect x="39" y="31" width="3" height="8" rx="1.5" class="art-ink" />
        <rect x="58" y="31" width="3" height="8" rx="1.5" class="art-ink" />
        <text x="50" y="62" text-anchor="middle" class="art-number">
          {{ props.achievement.label ?? '' }}
        </text>
      </g>

      <!-- Minutes: clock face -->
      <g v-else-if="props.achievement.glyph === 'clock'" class="achievement-badge__art">
        <circle cx="50" cy="50" r="18" class="art-paper art-outline" />
        <line x1="50" y1="50" x2="50" y2="38" class="art-hand" />
        <line x1="50" y1="50" x2="59" y2="55" class="art-hand" />
        <circle cx="50" cy="50" r="2.5" class="art-ink" />
        <circle v-for="tick in 12" :key="tick" :cx="50 + 14.5 * Math.cos((tick * Math.PI) / 6)" :cy="50 + 14.5 * Math.sin((tick * Math.PI) / 6)" r="1" class="art-ink" />
      </g>

      <!-- Solar system: ringed planet on a starry disc -->
      <g v-else-if="props.achievement.glyph === 'planet'" class="achievement-badge__art">
        <circle v-for="([x, y, r], i) in STARS" :key="i" :cx="x" :cy="y" :r="r" class="art-star" />
        <ellipse cx="50" cy="50" rx="21" ry="6" transform="rotate(-20 50 50)" class="art-ring art-ring--back" />
        <circle cx="50" cy="50" r="11" class="art-planet" />
        <!-- Front half of the ring, drawn over the planet -->
        <path d="M 29 50 A 21 6 0 0 0 71 50" transform="rotate(-20 50 50)" class="art-ring" />
      </g>

      <!-- Civilizations: stepped pyramid under a sun -->
      <g v-else-if="props.achievement.glyph === 'pyramid'" class="achievement-badge__art">
        <circle cx="64" cy="36" r="5" class="art-sun" />
        <polygon points="30,66 70,66 65,59 35,59" class="art-stone" />
        <polygon points="35,59 65,59 60,52 40,52" class="art-stone" />
        <polygon points="40,52 60,52 55,45 45,45" class="art-stone" />
        <rect x="46" y="40" width="8" height="5" class="art-stone" />
        <rect x="48" y="58" width="4" height="8" class="art-door" />
      </g>

      <!-- Wikipedia's 25th birthday: cake with candles and "25" -->
      <g v-else-if="props.achievement.glyph === 'cake'" class="achievement-badge__art">
        <rect x="47" y="30" width="2.5" height="8" rx="1" class="art-candle" />
        <rect x="51" y="30" width="2.5" height="8" rx="1" class="art-candle" />
        <ellipse cx="48.2" cy="28" rx="1.6" ry="2.6" class="art-flame" />
        <ellipse cx="52.2" cy="28" rx="1.6" ry="2.6" class="art-flame" />
        <rect x="35" y="38" width="30" height="10" rx="3" class="art-icing" />
        <rect x="32" y="47" width="36" height="20" rx="3" class="art-cake" />
        <path d="M 32 52 q 4.5 4 9 0 t 9 0 t 9 0 t 9 0" class="art-drip" />
        <text x="50" y="64" text-anchor="middle" class="art-cake-number">
          {{ props.achievement.label ?? '' }}
        </text>
      </g>

      <!-- Places: globe -->
      <g v-else-if="props.achievement.glyph === 'globe'" class="achievement-badge__art">
        <circle cx="50" cy="50" r="18" class="art-sea" />
        <path d="M 40 40 q 6 -4 10 1 q 3 5 -3 7 q -5 2 -4 7 q -6 -3 -3 -15 z" class="art-land" />
        <path d="M 55 52 q 6 -2 8 3 q -1 6 -7 7 q -3 -5 -1 -10 z" class="art-land" />
        <ellipse cx="50" cy="50" rx="8" ry="18" class="art-grid" />
        <line x1="32" y1="50" x2="68" y2="50" class="art-grid" />
        <circle cx="50" cy="50" r="18" class="art-grid" />
      </g>
    </svg>

    <!-- Fallback glyph for themes without art -->
    <CdxIcon v-if="!hasArt" class="achievement-badge__glyph" :icon="cdxIconArticles" />

    <span v-if="props.locked" class="achievement-badge__lock">
      <CdxIcon :icon="cdxIconLock" size="x-small" />
    </span>
  </span>
</template>

<style scoped>
.achievement-badge {
  --badge-size: 56px;
  --badge-fill: var(--color-warning, #886425);
  --badge-tint: var(--background-color-warning-subtle, #fdf2d5);
  --badge-ink: var(--badge-fill);

  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--badge-size);
  height: var(--badge-size);
}

.achievement-badge--small {
  --badge-size: 40px;
}

.achievement-badge--tile {
  --badge-size: 80px;
}

.achievement-badge--large {
  --badge-size: 112px;
}

.achievement-badge--hero {
  --badge-size: 220px;
}

/* Themes */
.achievement-badge--blue {
  --badge-fill: var(--color-progressive, #36c);
  --badge-tint: var(--background-color-progressive-subtle, #f1f4fd);
}

.achievement-badge--green {
  --badge-fill: var(--color-success, #177860);
  --badge-tint: var(--background-color-success-subtle, #dff2eb);
}

/* Illustration palettes (not Codex surfaces — badge art only). */
.achievement-badge--space {
  --badge-fill: #2a3a6b;
  --badge-tint: #121b38;
}

.achievement-badge--sand {
  --badge-fill: #a8722a;
  --badge-tint: #fbefd6;
}

.achievement-badge--party {
  --badge-fill: #b0388a;
  --badge-tint: #fde8f3;
}

.achievement-badge--sky {
  --badge-fill: #2f6fb3;
  --badge-tint: #e3eefb;
}

/* Not earned: the same badge, desaturated. */
.achievement-badge--locked .achievement-badge__frame,
.achievement-badge--locked .achievement-badge__glyph {
  filter: grayscale(1);
  opacity: 0.55;
}

.achievement-badge__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.achievement-badge__rosette {
  fill: var(--badge-fill);
}

.achievement-badge__disc {
  fill: var(--badge-tint);
}

/* Art pieces */
.art-paper {
  fill: #fff;
}

.art-outline {
  stroke: var(--badge-ink);
  stroke-width: 3;
}

.art-ink {
  fill: var(--badge-ink);
}

.art-number {
  fill: var(--badge-ink);
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: 15px;
  font-weight: 700;
}

.art-hand {
  stroke: var(--badge-ink);
  stroke-width: 3;
  stroke-linecap: round;
}

.art-star {
  fill: #fff;
}

.art-planet {
  fill: #e8a33d;
}

.art-ring {
  fill: none;
  stroke: #f6dca6;
  stroke-width: 2.5;
}

.art-ring--back {
  opacity: 0.6;
}

.art-sun {
  fill: #f2b544;
}

.art-stone {
  fill: #c8964a;
  stroke: #8a6326;
  stroke-width: 1;
}

.art-door {
  fill: #6b4a1c;
}

.art-candle {
  fill: #6b8fd6;
}

.art-flame {
  fill: #f2b544;
}

.art-icing {
  fill: #ffffff;
  stroke: #e7a3cc;
  stroke-width: 1;
}

.art-cake {
  fill: #e85aa8;
}

.art-drip {
  fill: none;
  stroke: #ffffff;
  stroke-width: 2;
  stroke-linecap: round;
}

.art-cake-number {
  fill: #ffffff;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: 11px;
  font-weight: 700;
}

.art-sea {
  fill: #3d7cc9;
}

.art-land {
  fill: #7cc28a;
}

.art-grid {
  fill: none;
  stroke: rgba(255, 255, 255, 0.55);
  stroke-width: 1;
}

.achievement-badge__glyph {
  position: relative;
  color: var(--badge-fill);
}

.achievement-badge--large .achievement-badge__glyph {
  transform: scale(2);
}

.achievement-badge--hero .achievement-badge__glyph {
  transform: scale(4);
}

.achievement-badge__lock {
  position: absolute;
  right: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40%;
  height: 40%;
  border: var(--border-width-thick, 2px) solid var(--background-color-base, #fff);
  border-radius: var(--border-radius-circle, 50%);
  background-color: var(--background-color-neutral, #eaecf0);
  color: var(--color-subtle, #54595d);
}
</style>
