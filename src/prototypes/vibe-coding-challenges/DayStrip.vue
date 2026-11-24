<script setup lang="ts">
/**
 * Day-by-day strip (Activity → Your impact → "Your recent activity"), shared
 * with the challenge screens: one pill per day — tall and blue on active days,
 * short and grey otherwise. Optional states for challenges: today still to
 * do (dashed) and days not reached yet (outlined).
 */
export type DayState = 'active' | 'inactive' | 'today' | 'future'

interface Props {
  days: DayState[]
  startLabel: string
  endLabel: string
  /** Accessible summary, e.g. "Read on 19 of 24 days". */
  label: string
  /** Start / end dates under the strip (off on compact Activity cards). */
  showRange?: boolean
}

const props = withDefaults(defineProps<Props>(), { showRange: true })
</script>

<template>
  <div class="day-strip">
    <div class="day-strip__pills" role="img" :aria-label="props.label">
      <span
        v-for="(state, index) in props.days"
        :key="index"
        class="day-strip__pill"
        :class="`day-strip__pill--${state}`"
      />
    </div>
    <div v-if="props.showRange" class="day-strip__range">
      <span>{{ props.startLabel }}</span>
      <span>{{ props.endLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.day-strip {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.day-strip__pills {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 28px;
}

.day-strip__pill {
  flex: 1 1 0;
  min-width: 2px;
  box-sizing: border-box;
  height: 10px;
  border-radius: var(--border-radius-pill, 9999px);
  background-color: var(--background-color-neutral, #eaecf0);
}

.day-strip__pill--active {
  height: 100%;
  background-color: var(--background-color-progressive, #36c);
}

.day-strip__pill--today {
  height: 100%;
  border: var(--border-width-base, 1px) dashed var(--border-color-progressive, #36c);
  background-color: transparent;
}

.day-strip__pill--future {
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  background-color: transparent;
}

/* Codex small text, subtle */
.day-strip__range {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}
</style>
