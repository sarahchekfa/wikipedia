/**
 * Reading challenges — data model, mock config and shared prototype state.
 *
 * The `ChallengeConfig` shape is what community members would edit remotely
 * (long term). Phase 1 reads a subset of it; the long-term version adds the
 * catalog, per-challenge state and the rest of the fields.
 *
 * State lives in one module-level `reactive` so the Activity screen and the
 * challenge details screen (a nested route) stay in sync, and it's mirrored to
 * localStorage so a reload keeps the scenario you were reviewing.
 */
import { computed, reactive, ref, watch } from 'vue'

export const ACTIVITY_PATH = '/vibe-coding-challenges'
export const CUSTOMIZE_PATH = '/vibe-coding-challenges/customize'
export const ACHIEVEMENTS_PATH = '/vibe-coding-challenges/achievements'
export const ACHIEVEMENT_PATH = '/vibe-coding-challenges/achievement'
export const DETAILS_PATH = '/vibe-coding-challenges/challenge'
export const BROWSE_PATH = '/vibe-coding-challenges/browse'

/** Details link for one challenge (phase 1 ignores the id — there's only one). */
export function detailsLink(id: string): { path: string; query: { id: string } } {
  return { path: DETAILS_PATH, query: { id } }
}

// ---------------------------------------------------------------------------
// Config (remote-configurable)
// ---------------------------------------------------------------------------

export type ChallengeGoalKind =
  /** Read on N distinct days in the window (phase 1, variant B). */
  | 'days'
  /** Read N minutes in total in the window (phase 1, variant C). */
  | 'minutes'
  /** Finish a curated reading list (full version). */
  | 'reading-list'

export interface ChallengeGoal {
  kind: ChallengeGoalKind
  target: number
  /** A day only counts once the reader has read at least this many minutes. */
  minMinutesPerDay?: number
  /** Reading-list challenges (long term): read every article on the list. */
  articles?: ReadingListArticle[]
}

export interface ReadingListArticle {
  title: string
  description: string
}

export interface ChallengeAchievement {
  id: string
  name: string
  description: string
  /** Badge colours — matched to the challenge's theme. */
  tone: 'gold' | 'blue' | 'green' | 'space' | 'sand' | 'sky' | 'party'
  /** Badge illustration — matched to the challenge's theme. */
  glyph: 'streak' | 'clock' | 'list' | 'planet' | 'pyramid' | 'globe' | 'cake'
  /** Short text drawn on the badge (e.g. the streak's day count). */
  label?: string
}

export interface ChallengeConfig {
  id: string
  /** Generic challenges run every month; themed ones carry a topic (full version). */
  kind: 'generic' | 'themed'
  theme?: string
  title: string
  summary: string
  startDate: string
  endDate: string
  goal: ChallengeGoal
  /** Plain-language completion requirements, shown as a checklist. */
  requirements: string[]
  achievement: ChallengeAchievement
  widget?: { available: boolean; name: string }
  /** Full version: language codes the challenge's articles must be in, or `'any'`. */
  languages?: string[] | 'any'
  /** Full version: who runs it (e.g. a WikiProject or affiliate). */
  host?: string
  /** Full version: username of the person who published the config. */
  publishedBy?: string
  /** Full version: on-wiki config page linked from the overflow menu. */
  configPageUrl?: string
}

// ---------------------------------------------------------------------------
// Dates — every challenge runs over the current calendar month.
// ---------------------------------------------------------------------------

/**
 * "Next month" preview (phase 1 control): pretend it's the 1st of next month,
 * so the monthly challenge rolls over to a new one — e.g. if the November
 * challenge is still live when December starts. Read straight from storage
 * because the dates below are fixed when the module loads.
 */
function storedNextMonth(): boolean {
  try {
    const raw = localStorage.getItem('vibe-coding-challenges:state')
    return Boolean(raw && (JSON.parse(raw) as { nextMonth?: boolean }).nextMonth)
  } catch {
    return false
  }
}

const REAL_NOW = new Date()
const NOW = storedNextMonth()
  ? new Date(REAL_NOW.getFullYear(), REAL_NOW.getMonth() + 1, 1)
  : REAL_NOW
const YEAR = NOW.getFullYear()
const MONTH = NOW.getMonth()
export const DAYS_IN_MONTH = new Date(YEAR, MONTH + 1, 0).getDate()
const TODAY = NOW.getDate()

export const MONTH_NAME = NOW.toLocaleDateString('en-US', { month: 'long' })

function isoDay(day: number): string {
  return new Date(YEAR, MONTH, day).toISOString().slice(0, 10)
}

export function formatShortDate(day: number): string {
  return new Date(YEAR, MONTH, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export const CHALLENGE_RANGE_LABEL = `${formatShortDate(1)} – ${formatShortDate(DAYS_IN_MONTH)}`

// ---------------------------------------------------------------------------
// Mock challenges — one per phase 1 variant.
// ---------------------------------------------------------------------------

export const STREAK_CHALLENGE: ChallengeConfig = {
  id: `reading-days-${YEAR}-${MONTH + 1}`,
  kind: 'generic',
  title: '25 days of reading',
  summary: `Read Wikipedia on 25 days in ${MONTH_NAME} to earn this month’s achievement.`,
  startDate: isoDay(1),
  endDate: isoDay(DAYS_IN_MONTH),
  goal: { kind: 'days', target: 25, minMinutesPerDay: 1 },
  requirements: [
    `Read on 25 different days between ${formatShortDate(1)} and ${formatShortDate(DAYS_IN_MONTH)}`,
    'A day counts once you’ve read any article for at least 1 minute',
    'Days you read this month before joining count too',
    'Reading in any language counts',
    'Progress comes from your reading history on this device',
  ],
  achievement: {
    id: `achievement-reading-days-${YEAR}-${MONTH + 1}`,
    name: `${MONTH_NAME} Reader`,
    description: `Read on 25 days in ${MONTH_NAME} ${YEAR}`,
    tone: 'gold',
    glyph: 'streak',
    label: '25',
  },
  widget: { available: true, name: 'Reading streak' },
  // Long-term only
  languages: 'any',
  host: 'Wikipedia app team',
  publishedBy: 'ExampleUser',
  configPageUrl: 'https://meta.wikimedia.org/wiki/Special:MyPage/Reading_challenges/streak',
}

export const MINUTES_CHALLENGE: ChallengeConfig = {
  id: `reading-minutes-${YEAR}-${MONTH + 1}`,
  kind: 'generic',
  title: '300 minutes of reading',
  summary: `Spend 300 minutes reading Wikipedia in ${MONTH_NAME} to earn this month’s achievement.`,
  startDate: isoDay(1),
  endDate: isoDay(DAYS_IN_MONTH),
  goal: { kind: 'minutes', target: 300 },
  requirements: [
    `Read for 300 minutes in total between ${formatShortDate(1)} and ${formatShortDate(DAYS_IN_MONTH)}`,
    'Time counts while an article is open and you’re scrolling or reading',
    'Minutes you read this month before joining count too',
    'Reading in any language counts',
    'Progress comes from your reading history on this device',
  ],
  achievement: {
    id: `achievement-reading-minutes-${YEAR}-${MONTH + 1}`,
    name: `${MONTH_NAME} Deep Diver`,
    description: `Read for 300 minutes in ${MONTH_NAME} ${YEAR}`,
    tone: 'blue',
    glyph: 'clock',
  },
  widget: { available: true, name: 'Reading minutes' },
  // Long-term only
  languages: 'any',
  host: 'Wikipedia app team',
  publishedBy: 'ExampleUser',
  configPageUrl: 'https://meta.wikimedia.org/wiki/Special:MyPage/Reading_challenges/minutes',
}

// ---------------------------------------------------------------------------
// Long-term catalog: themed, language-limited, reading-list challenges.
// Hosts/usernames are placeholders.
// ---------------------------------------------------------------------------

export const SOLAR_SYSTEM_CHALLENGE: ChallengeConfig = {
  id: `solar-system-${YEAR}-${MONTH + 1}`,
  kind: 'themed',
  theme: 'Space',
  title: 'Tour the solar system',
  summary: 'Read all 8 articles on the planets of the solar system.',
  startDate: isoDay(1),
  endDate: isoDay(DAYS_IN_MONTH),
  goal: {
    kind: 'reading-list',
    target: 8,
    articles: [
      { title: 'Mercury (planet)', description: 'Smallest and closest planet to the Sun' },
      { title: 'Venus', description: 'Second planet from the Sun' },
      { title: 'Earth', description: 'Third planet from the Sun' },
      { title: 'Mars', description: 'Fourth planet from the Sun' },
      { title: 'Jupiter', description: 'Fifth planet from the Sun' },
      { title: 'Saturn', description: 'Sixth planet from the Sun' },
      { title: 'Uranus', description: 'Seventh planet from the Sun' },
      { title: 'Neptune', description: 'Eighth planet from the Sun' },
    ],
  },
  requirements: [
    'Read each article on the list for at least 1 minute',
    'Read them in any order, any time this month',
    'Articles must be read on English Wikipedia',
    'Progress comes from your reading history on this device',
  ],
  achievement: {
    id: `achievement-solar-system-${YEAR}-${MONTH + 1}`,
    name: 'Solar System Explorer',
    description: 'Read every planet article',
    tone: 'space',
    glyph: 'planet',
  },
  languages: ['en'],
  host: 'Space reading club',
  publishedBy: 'ExampleOrganizer',
  configPageUrl: 'https://meta.wikimedia.org/wiki/Special:MyPage/Reading_challenges/solar-system',
}

export const CIVILIZATIONS_CHALLENGE: ChallengeConfig = {
  id: `civilizaciones-${YEAR}-${MONTH + 1}`,
  kind: 'themed',
  theme: 'History',
  title: 'Grandes civilizaciones',
  summary: 'Read 6 Spanish Wikipedia articles about ancient civilizations.',
  startDate: isoDay(1),
  endDate: isoDay(DAYS_IN_MONTH),
  goal: {
    kind: 'reading-list',
    target: 6,
    articles: [
      { title: 'Imperio incaico', description: 'Estado andino precolombino' },
      { title: 'Cultura maya', description: 'Civilización mesoamericana' },
      { title: 'Imperio mexica', description: 'Estado mesoamericano' },
      { title: 'Antiguo Egipto', description: 'Civilización del valle del Nilo' },
      { title: 'Antigua Roma', description: 'Civilización del Mediterráneo' },
      { title: 'Mesopotamia', description: 'Región histórica de Asia occidental' },
    ],
  },
  requirements: [
    'Read each article on the list for at least 1 minute',
    'Articles must be read on Spanish Wikipedia',
    'Read them in any order, any time this month',
    'Progress comes from your reading history on this device',
  ],
  achievement: {
    id: `achievement-civilizaciones-${YEAR}-${MONTH + 1}`,
    name: 'Historian',
    description: 'Read every civilization article',
    tone: 'sand',
    glyph: 'pyramid',
  },
  languages: ['es'],
  host: 'Club de lectura de historia',
  publishedBy: 'EjemploUsuario',
  configPageUrl: 'https://meta.wikimedia.org/wiki/Special:MyPage/Reading_challenges/civilizaciones',
}

export const FRANCOPHONIE_CHALLENGE: ChallengeConfig = {
  id: `francophonie-${YEAR}-${MONTH + 1}`,
  kind: 'themed',
  theme: 'Places',
  title: 'Lire la francophonie',
  summary: 'Read 5 French Wikipedia articles about French-speaking places.',
  startDate: isoDay(1),
  endDate: isoDay(DAYS_IN_MONTH),
  goal: {
    kind: 'reading-list',
    target: 5,
    articles: [
      { title: 'Francophonie', description: 'Ensemble des locuteurs du français' },
      { title: 'Québec', description: 'Province du Canada' },
      { title: 'Sénégal', description: 'Pays d’Afrique de l’Ouest' },
      { title: 'Belgique', description: 'Pays d’Europe de l’Ouest' },
      { title: 'Suisse', description: 'Pays d’Europe centrale' },
    ],
  },
  requirements: [
    'Read each article on the list for at least 1 minute',
    'Articles must be read on French Wikipedia',
    'Progress comes from your reading history on this device',
  ],
  achievement: {
    id: `achievement-francophonie-${YEAR}-${MONTH + 1}`,
    name: 'Francophone',
    description: 'Read every francophonie article',
    tone: 'sky',
    glyph: 'globe',
  },
  languages: ['fr'],
  host: 'Groupe de lecture (exemple)',
  publishedBy: 'UtilisateurExemple',
  configPageUrl: 'https://meta.wikimedia.org/wiki/Special:MyPage/Reading_challenges/francophonie',
}

/** Every challenge the long-term prototype knows about, generic first. */
export const ALL_CHALLENGES: ChallengeConfig[] = [
  STREAK_CHALLENGE,
  MINUTES_CHALLENGE,
  SOLAR_SYSTEM_CHALLENGE,
  CIVILIZATIONS_CHALLENGE,
  FRANCOPHONIE_CHALLENGE,
]

/** App languages the reviewer can pick from (stand-in for the app's language settings). */
export const APP_LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
]

// ---------------------------------------------------------------------------
// Activity → Customize: which modules show on Activity.
// ---------------------------------------------------------------------------

export const ACTIVITY_MODULES = [
  { key: 'timeSpent', label: 'Time spent reading' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'readingInsights', label: 'Reading insights' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'editingInsights', label: 'Editing insights' },
  { key: 'allTimeImpact', label: 'All time impact' },
  { key: 'gameStats', label: 'Game stats' },
  { key: 'donation', label: 'Last in app donation' },
  { key: 'timeline', label: 'Timeline of behavior' },
] as const

export type ActivityModuleKey = (typeof ACTIVITY_MODULES)[number]['key']

// ---------------------------------------------------------------------------
// Prototype state
// ---------------------------------------------------------------------------

export type ChallengeVariant = 'streak' | 'minutes'

/** Not joined → joined (ongoing) → completed, or ended without completing. */
export type ChallengeStatus = 'available' | 'joined' | 'completed' | 'expired'

export interface EarnedAchievement extends ChallengeAchievement {
  earnedOn: string
}

/** Which scope the prototype shows: phase 1, or the long-term (full) version. */
export type PrototypeVersion = 'phase1' | 'longterm'

interface DemoState {
  version: PrototypeVersion
  variant: ChallengeVariant
  status: ChallengeStatus
  loggedIn: boolean
  /** Has the reader met today's bar (read today / on pace for minutes)? */
  readToday: boolean
  onboardingSeen: boolean
  historyCleared: boolean
  /** Achievements brought in from an export file. */
  imported: EarnedAchievement[]
  /** One-shot flag so the details screen can confirm a fresh join. */
  justJoined: boolean
  /** One-shot: that join was their first challenge and it has a widget — suggest it. */
  suggestWidget: boolean
  /** Long term: status per challenge id (phase 1 uses `status`). */
  statuses: Record<string, ChallengeStatus>
  /** Long term: the app's reading languages — filters which challenges show. */
  appLanguages: string[]
  /** Long term: the user has the on-wiki right to edit challenge config. */
  canEditConfig: boolean
  /** Activity → Customize toggles. */
  activityModules: Record<ActivityModuleKey, boolean>
  /** Phase 1 control: preview next month's challenge (date set to the 1st). */
  nextMonth: boolean
}

const STORAGE_KEY = 'vibe-coding-challenges:state'

const DEFAULT_STATE: DemoState = {
  version: 'phase1',
  variant: 'streak',
  status: 'available',
  loggedIn: true,
  readToday: false,
  onboardingSeen: false,
  historyCleared: false,
  imported: [],
  justJoined: false,
  suggestWidget: false,
  statuses: {
    [STREAK_CHALLENGE.id]: 'joined',
    [SOLAR_SYSTEM_CHALLENGE.id]: 'joined',
  },
  appLanguages: ['en', 'es'],
  canEditConfig: false,
  nextMonth: false,
  activityModules: Object.fromEntries(ACTIVITY_MODULES.map((m) => [m.key, true])) as Record<
    ActivityModuleKey,
    boolean
  >,
}

function readStored(): Partial<DemoState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<DemoState>) : {}
  } catch {
    return {}
  }
}

const stored = readStored()

export const demo = reactive<DemoState>({
  ...DEFAULT_STATE,
  statuses: { ...DEFAULT_STATE.statuses },
  appLanguages: [...DEFAULT_STATE.appLanguages],
  ...stored,
  activityModules: { ...DEFAULT_STATE.activityModules, ...(stored.activityModules ?? {}) },
})

watch(
  demo,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* storage unavailable — state just won't survive a reload */
    }
  },
  { deep: true },
)

/** Long-term (full version) features are on. */
export const isLongTerm = computed(() => demo.version === 'longterm')

export function resetDemo(): void {
  Object.assign(demo, {
    ...DEFAULT_STATE,
    imported: [],
    statuses: { ...DEFAULT_STATE.statuses },
    appLanguages: [...DEFAULT_STATE.appLanguages],
    activityModules: { ...DEFAULT_STATE.activityModules },
    version: demo.version,
  })
}

/** Phase 1's one challenge (picked by variant). */
export const challenge = computed(() =>
  demo.variant === 'streak' ? STREAK_CHALLENGE : MINUTES_CHALLENGE,
)

// ---------------------------------------------------------------------------
// Progress — derived from the scenario rather than stored.
// ---------------------------------------------------------------------------

export interface ChallengeProgress {
  /** Simulated "today" (day of month) for this scenario. */
  day: number
  daysLeft: number
  /** Minutes read on each day of the month; `null` for days still to come. */
  dailyMinutes: (number | null)[]
  /** Toward the goal, in the goal's unit (days or minutes). */
  value: number
  target: number
  unit: string
  currentStreak: number
  bestStreak: number
  readToday: boolean
  /** Day of month the goal was reached. */
  completedOn: number | null
  /** Reading-list goal: titles already read, in list order. */
  articlesRead: string[]
}

/** Days with no reading in the "ongoing" scenario — keeps the goal reachable. */
const MISSED_DAYS = new Set([3, 9, 14, 15])
const MINUTES_PATTERN = [12, 8, 0, 15, 6, 22, 9, 0, 11, 14, 7, 18, 5, 0, 0, 13, 10, 9, 16, 8, 12, 6]

function scenarioDay(status: ChallengeStatus): number {
  if (status === 'completed') return Math.min(Math.max(TODAY, 27), DAYS_IN_MONTH)
  if (status === 'expired') return DAYS_IN_MONTH
  return TODAY
}

function buildDailyMinutes(status: ChallengeStatus, day: number, readToday: boolean): number[] {
  return Array.from({ length: day }, (_, index) => {
    const date = index + 1
    const isToday = date === day && status !== 'expired'
    if (isToday && !readToday && status !== 'completed') return 0
    if (status === 'expired') {
      // Fell off in the last stretch — ends short of the goal.
      if (date > 18 && date % 3 !== 0) return 0
      return MINUTES_PATTERN[index % MINUTES_PATTERN.length] || 4
    }
    if (status === 'completed') return MINUTES_PATTERN[index % MINUTES_PATTERN.length] + 6 || 9
    if (MISSED_DAYS.has(date)) return 0
    return MINUTES_PATTERN[index % MINUTES_PATTERN.length] || 7
  })
}

function streaks(daily: number[], min: number): { current: number; best: number } {
  let best = 0
  let run = 0
  daily.forEach((minutes) => {
    run = minutes >= min ? run + 1 : 0
    best = Math.max(best, run)
  })
  // Today not read yet doesn't break the streak until the day is over.
  let current = 0
  for (let i = daily.length - 1; i >= 0; i -= 1) {
    if (daily[i] >= min) current += 1
    else if (i === daily.length - 1) continue
    else break
  }
  return { current, best }
}

export interface ProgressScenario {
  status: ChallengeStatus
  readToday: boolean
  historyCleared: boolean
}

/**
 * Pure version of `progress` — lets the widget mockups render any variant and
 * state side by side without touching the shared demo state.
 */
export function computeProgress(
  config: ChallengeConfig,
  { status, readToday, historyCleared }: ProgressScenario,
): ChallengeProgress {
  const day = scenarioDay(status)
  const min = config.goal.minMinutesPerDay ?? 1

  // Progress comes from reading history, so reading done before joining counts.
  // Cleared history starts over from zero; reading today after that still counts.
  let daily =
    historyCleared
      ? Array.from({ length: day }, (_, index) =>
          historyCleared && index === day - 1 && readToday ? 12 : 0,
        )
      : buildDailyMinutes(status, day, readToday)

  // The completed scenario always clears the bar exactly where it says it did.
  if (status === 'completed' && !historyCleared && config.goal.kind === 'days') {
    daily = daily.map((minutes, index) => (index < 2 ? 0 : Math.max(minutes, 5)))
  }

  const readDays = daily.filter((minutes) => minutes >= min).length
  const totalMinutes = daily.reduce((sum, minutes) => sum + minutes, 0)
  const value = config.goal.kind === 'days' ? readDays : totalMinutes
  const target = config.goal.target
  const { current, best } = streaks(daily, min)

  let completedOn: number | null = null
  if (status === 'completed' && !historyCleared) {
    let running = 0
    for (let i = 0; i < daily.length; i += 1) {
      running += config.goal.kind === 'days' ? (daily[i] >= min ? 1 : 0) : daily[i]
      if (running >= target) {
        completedOn = i + 1
        break
      }
    }
    completedOn ??= day
  }

  const daysLeft = status === 'expired' ? 0 : DAYS_IN_MONTH - day + 1

  if (config.goal.kind === 'reading-list') {
    const list = config.goal.articles ?? []
    // Reading before joining counts here too (history-based).
    let read = 0
    if (historyCleared) read = readToday ? 1 : 0
    else if (status === 'available') read = 1
    else if (status === 'joined') read = 3 + (readToday ? 1 : 0)
    else if (status === 'completed') read = list.length
    else read = Math.max(list.length - 2, 0)
    read = Math.min(read, list.length)
    return {
      day,
      daysLeft,
      dailyMinutes: [...daily, ...Array.from({ length: DAYS_IN_MONTH - day }, () => null)],
      value: read,
      target: list.length,
      unit: 'articles',
      currentStreak: current,
      bestStreak: best,
      readToday,
      completedOn: status === 'completed' && !historyCleared ? day : null,
      // Lists can be read in any order, so the mock reads a scattered set, not the first N.
      articlesRead: list
        .map((article, index) => ({ article, key: (index * 3 + 1) % list.length }))
        .sort((a, b) => a.key - b.key)
        .slice(0, read)
        .map(({ article }) => article.title),
    }
  }

  return {
    day,
    daysLeft,
    dailyMinutes: [...daily, ...Array.from({ length: DAYS_IN_MONTH - day }, () => null)],
    value: status === 'completed' && !historyCleared ? Math.max(value, target) : value,
    target,
    unit: config.goal.kind === 'days' ? 'days' : 'minutes',
    currentStreak: current,
    bestStreak: best,
    readToday: (daily[day - 1] ?? 0) >= min,
    completedOn,
    articlesRead: [],
  }
}

// ---------------------------------------------------------------------------
// Entries — a challenge plus its status and progress. Phase 1 is a list of one.
// ---------------------------------------------------------------------------

export interface ChallengeEntry {
  config: ChallengeConfig
  status: ChallengeStatus
  progress: ChallengeProgress
  /** Days goal only: the streak needs a read today. */
  needsReadingToday: boolean
  /** Show "Dive back in": days → until today is read; minutes → until the goal is met; never for reading lists. */
  suggestArticle: boolean
  /** The article "Dive back in" offers, and which wiki it's on. */
  nextArticle: ReadingListArticle
  articleLang: string
}

export function statusOf(config: ChallengeConfig): ChallengeStatus {
  if (!isLongTerm.value) return config.id === challenge.value.id ? demo.status : 'available'
  return demo.statuses[config.id] ?? 'available'
}

export function setStatus(id: string, status: ChallengeStatus): void {
  if (isLongTerm.value) demo.statuses[id] = status
  else demo.status = status
}

/** Shown to this reader: open to any language, or one of their app languages. */
export function inAppLanguages(config: ChallengeConfig): boolean {
  const langs = config.languages
  return !langs || langs === 'any' || langs.some((code) => demo.appLanguages.includes(code))
}

export function languageLabel(config: ChallengeConfig): string {
  const langs = config.languages
  if (!langs || langs === 'any') return 'Any language'
  const names = new Intl.DisplayNames(['en'], { type: 'language' })
  return langs.map((code) => names.of(code) ?? code).join(', ')
}

function makeEntry(config: ChallengeConfig): ChallengeEntry {
  const status = statusOf(config)
  const p = computeProgress(config, {
    status,
    readToday: demo.readToday,
    historyCleared: demo.historyCleared,
  })
  const kind = config.goal.kind
  const list = config.goal.articles ?? []
  const nextArticle =
    (kind === 'reading-list' && list.find((article) => !p.articlesRead.includes(article.title))) ||
    SUGGESTED_ARTICLES[0]
  return {
    config,
    status,
    progress: p,
    needsReadingToday: status === 'joined' && kind === 'days' && !p.readToday,
    // Reading lists already show the whole list on the challenge screen, so no
    // separate "You haven't read this one yet" suggestion.
    suggestArticle:
      status === 'joined' &&
      kind !== 'reading-list' &&
      (kind === 'days' ? !p.readToday : p.value < p.target),
    nextArticle,
    articleLang:
      kind === 'reading-list' && Array.isArray(config.languages) ? config.languages[0] : 'en',
  }
}

const STATUS_ORDER: Record<ChallengeStatus, number> = {
  joined: 0,
  available: 1,
  completed: 2,
  expired: 3,
}

/** Visible challenges, active (joined) first. */
export const entries = computed<ChallengeEntry[]>(() => {
  const configs = isLongTerm.value ? ALL_CHALLENGES.filter(inAppLanguages) : [challenge.value]
  return configs
    .map(makeEntry)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
})

/** The challenge a screen is about; phase 1 always gets its one challenge. */
export function findEntry(id?: string | null): ChallengeEntry {
  if (isLongTerm.value && id) {
    const config = ALL_CHALLENGES.find((item) => item.id === id)
    if (config) return makeEntry(config)
  }
  return entries.value[0] ?? makeEntry(challenge.value)
}

/** First entry — what onboarding and empty states point at. */
export const primaryEntry = computed(() => entries.value[0] ?? makeEntry(challenge.value))

/**
 * Activity nav dot. Always: a joined streak that needs today's reading.
 * Phase 1 also: a challenge to join when nothing's joined. Long term never
 * badges just because there's something new to join.
 */
export const showActivityBadge = computed(() => {
  if (entries.value.some((entry) => entry.needsReadingToday)) return true
  if (isLongTerm.value) return false
  const anyJoined = entries.value.some((entry) => entry.status === 'joined')
  return !anyJoined && entries.value.some((entry) => entry.status === 'available')
})

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

/**
 * Wikipedia's 25th birthday challenge (May 2026) — a one-off past
 * challenge the reader took part in, so its achievement is already earned.
 */
export const BIRTHDAY_ACHIEVEMENT: EarnedAchievement = {
  id: 'achievement-wikipedia-25',
  name: 'Wikipedia turns 25',
  description: 'Took part in the 25th birthday reading challenge',
  tone: 'party',
  glyph: 'cake',
  label: '25',
  earnedOn: '2026-05-15',
}

/**
 * Next-month preview: last month's challenge achievement, already earned (they
 * finished it before the month rolled over). Matches the phase 1 variant.
 */
const lastMonthAchievement = computed<EarnedAchievement | null>(() => {
  if (!demo.nextMonth) return null
  const last = new Date(YEAR, MONTH - 1, 1)
  const y = last.getFullYear()
  const m = last.getMonth() + 1
  const name = last.toLocaleDateString('en-US', { month: 'long' })
  const earnedOn = new Date(y, m - 1, 27).toISOString().slice(0, 10)
  return demo.variant === 'minutes'
    ? {
        id: `achievement-reading-minutes-${y}-${m}`,
        name: `${name} Deep Diver`,
        description: `Read for 300 minutes in ${name} ${y}`,
        tone: 'blue',
        glyph: 'clock',
        earnedOn,
      }
    : {
        id: `achievement-reading-days-${y}-${m}`,
        name: `${name} Reader`,
        description: `Read on 25 days in ${name} ${y}`,
        tone: 'gold',
        glyph: 'streak',
        label: '25',
        earnedOn,
      }
})

export const achievements = computed<EarnedAchievement[]>(() => {
  const list: EarnedAchievement[] = [...demo.imported]
  const previous = lastMonthAchievement.value
  if (previous && !demo.historyCleared && !list.some((item) => item.id === previous.id)) {
    list.push(previous)
  }
  // Earned from reading history, so clearing history clears it too.
  if (!demo.historyCleared && !list.some((item) => item.id === BIRTHDAY_ACHIEVEMENT.id)) {
    list.push(BIRTHDAY_ACHIEVEMENT)
  }
  if (!demo.historyCleared) {
    entries.value
      .filter((entry) => entry.status === 'completed' && entry.progress.completedOn)
      .forEach((entry) => {
        const earned = {
          ...entry.config.achievement,
          earnedOn: isoDay(entry.progress.completedOn as number),
        }
        if (!list.some((item) => item.id === earned.id)) list.unshift(earned)
      })
  }
  return list
})

export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Activity's snackbar — shared so the header ⋮ menu (export/import) can report too. */
export const activityToast = ref<{ type: 'success' | 'error'; text: string } | null>(null)

/** "December 2026" — the achievement card's date line. */
export function formatMonthYear(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const EXPORT_FORMAT = 'wikipedia-app-achievements'

/** Downloads a JSON file — stands in for the apps' share-sheet export. */
export function exportAchievements(): number {
  const payload = {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    achievements: achievements.value,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `wikipedia-achievements-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  return achievements.value.length
}

/** Merges achievements from an exported file; returns how many were new. */
export async function importAchievements(file: File): Promise<number> {
  const data = JSON.parse(await file.text()) as {
    format?: string
    achievements?: EarnedAchievement[]
  }
  if (data.format !== EXPORT_FORMAT || !Array.isArray(data.achievements)) {
    throw new Error('Not an achievements export')
  }
  const known = new Set(achievements.value.map((item) => item.id))
  const fresh = data.achievements.filter((item) => item?.id && !known.has(item.id))
  demo.imported.push(...fresh)
  return fresh.length
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function joinChallenge(id: string): void {
  // First challenge they're in (nothing joined or completed yet) → suggest its widget.
  const isFirst = !entries.value.some((e) => e.status === 'joined' || e.status === 'completed')
  const config = ALL_CHALLENGES.find((item) => item.id === id)
  demo.suggestWidget = isFirst && Boolean(config?.widget?.available)
  setStatus(id, 'joined')
  demo.historyCleared = false
  demo.justJoined = true
}

export function leaveChallenge(id: string): void {
  setStatus(id, 'available')
}

/** Clearing history wipes reading-based progress and the achievements it earned. */
export function clearHistory(): void {
  demo.historyCleared = true
  demo.readToday = false
  if (demo.status === 'completed') demo.status = 'joined'
  Object.keys(demo.statuses).forEach((id) => {
    if (demo.statuses[id] === 'completed') demo.statuses[id] = 'joined'
  })
}

/** "Dive back in" stands in for reading: today's bar is met when they come back. */
export function markReadToday(): void {
  demo.readToday = true
}

export const SUGGESTED_ARTICLES = [
  { title: 'Bioluminescence', description: 'Production and emission of light by a living organism' },
  { title: 'Terracotta Army', description: 'Sculptures depicting the armies of Qin Shi Huang' },
  { title: 'Kintsugi', description: 'Japanese art of repairing broken pottery with gold' },
]
