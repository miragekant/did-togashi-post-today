<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import ActivityHeatmap from "./components/ActivityHeatmap.vue";
import DayDrawer from "./components/DayDrawer.vue";
import {
  createDemoDataset,
  dateKeyInTimeZone,
  hoursSince,
  isDateKey,
  quietStreak,
  yearStats,
} from "./lib/activity";
import type { ActivityDataset, CalendarCell } from "./types";

const dataset = ref<ActivityDataset>(createDemoDataset());
const now = ref(new Date());
const selectedDate = ref<string | null>(null);
const selectedYear = ref(Number(dateKeyInTimeZone(now.value, dataset.value.timeZone).slice(0, 4)));
let clock: number | undefined;

const latestAge = computed(() => hoursSince(dataset.value.latestPostAt, now.value));
const isRecentlyActive = computed(
  () => latestAge.value !== null && latestAge.value <= 24,
);
const todayKey = computed(() => dateKeyInTimeZone(now.value, dataset.value.timeZone));
const postedToday = computed(() => (dataset.value.days[todayKey.value]?.length ?? 0) > 0);
const dataAge = computed(() => hoursSince(dataset.value.lastCheckedAt, now.value));
const isStale = computed(() => dataAge.value === null || dataAge.value > 8);
const currentStats = computed(() => yearStats(dataset.value, selectedYear.value));
const currentQuietStreak = computed(() => quietStreak(dataset.value, now.value));
const selectedPostIds = computed(() =>
  selectedDate.value ? (dataset.value.days[selectedDate.value] ?? []) : [],
);
const latestActiveDate = computed(() =>
  Object.entries(dataset.value.days)
    .filter(([, postIds]) => postIds.length > 0)
    .map(([date]) => date)
    .sort()
    .at(-1) ?? null,
);
const heroTargetDate = computed(() =>
  postedToday.value ? todayKey.value : latestActiveDate.value,
);
const availableYears = computed(() => {
  const years = Object.keys(dataset.value.days).map((date) => Number(date.slice(0, 4)));
  const calendarYear = Number(dateKeyInTimeZone(now.value, dataset.value.timeZone).slice(0, 4));
  const min = years.length ? Math.min(...years) : calendarYear;
  const max = years.length ? Math.max(calendarYear, ...years) : calendarYear;
  return Array.from({ length: max - min + 1 }, (_, index) => max - index);
});

function relativeTime(hours: number | null): string {
  if (hours === null) return "Unknown";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function openDate(date: string) {
  selectedDate.value = date;
  selectedYear.value = Number(date.slice(0, 4));
  const url = new URL(window.location.href);
  url.searchParams.set("date", date);
  window.history.replaceState({}, "", url);
}

function selectDay(cell: CalendarCell) {
  openDate(cell.date);
}

function closeDrawer() {
  selectedDate.value = null;
  const url = new URL(window.location.href);
  url.searchParams.delete("date");
  window.history.replaceState({}, "", url);
}

async function loadDataset() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/activity.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Activity data unavailable");
    const incoming = (await response.json()) as ActivityDataset;
    dataset.value = incoming.mode === "demo" ? createDemoDataset(now.value) : incoming;
  } catch {
    dataset.value = createDemoDataset(now.value);
  }

  const year = Number(dateKeyInTimeZone(now.value, dataset.value.timeZone).slice(0, 4));
  selectedYear.value = year;
  const dateParam = new URL(window.location.href).searchParams.get("date");
  if (dateParam && isDateKey(dateParam)) {
    selectedDate.value = dateParam;
    selectedYear.value = Number(dateParam.slice(0, 4));
  }
}

onMounted(() => {
  loadDataset();
  clock = window.setInterval(() => {
    now.value = new Date();
  }, 60_000);
});

onBeforeUnmount(() => {
  if (clock) window.clearInterval(clock);
});
</script>

<template>
  <div class="site-shell">
    <header class="topbar">
      <a class="brand" href="./" aria-label="Did Togashi Post Today home">
        <span class="brand-mark">DTP?</span>
        <span>
          <strong>Did Togashi Post Today?</strong>
          <small>A tiny fan-made activity log</small>
        </span>
      </a>

      <div class="topbar-actions">
        <span v-if="dataset.mode === 'demo'" class="demo-badge">Demo data</span>
        <a
          class="account-link"
          :href="`https://x.com/${dataset.account.username}`"
          target="_blank"
          rel="noreferrer"
        >
          @{{ dataset.account.username }} ↗
        </a>
      </div>
    </header>

    <main>
      <section class="hero-panel" :class="{ active: postedToday && !isStale }">
        <span class="hero-sticker" aria-hidden="true">{{ postedToday && !isStale ? "YES!" : "NOT YET" }}</span>
        <div class="hero-copy">
          <div class="hero-doodles" aria-hidden="true">
            <span class="doodle-page">原稿</span>
            <span class="doodle-pencil">✎</span>
            <span class="doodle-spark">✦</span>
          </div>
          <p class="eyebrow">Today in Japan</p>
          <div class="status-heading">
            <span class="status-orb" aria-hidden="true"><i /></span>
            <h1>{{ isStale ? "Update delayed!" : postedToday ? "Yes — he posted today!" : "Not today (yet)." }}</h1>
          </div>
          <p class="hero-description">
            <template v-if="isStale">
              The latest check is too old to confirm current activity. The last known post was <strong>{{ relativeTime(latestAge) }}</strong>.
            </template>
            <template v-else-if="postedToday">
              Latest post was <strong>{{ relativeTime(latestAge) }}</strong>.
              Open today's posts to see the official X embeds.
            </template>
            <template v-else>
              No original posts recorded so far today. The latest was
              <strong>{{ relativeTime(latestAge) }}</strong>{{ isRecentlyActive ? " — still within the last 24 hours." : "." }}
            </template>
          </p>
          <button
            v-if="heroTargetDate"
            class="hero-day-button"
            type="button"
            @click="openDate(heroTargetDate)"
          >
            <span>{{ postedToday ? "Open today's posts" : "Open latest active day" }}</span>
            <small v-if="!postedToday">{{ shortDate(heroTargetDate) }}</small>
            <i aria-hidden="true">&rarr;</i>
          </button>
        </div>

        <div class="freshness-card">
          <span>Data freshness</span>
          <strong>{{ relativeTime(dataAge) }}</strong>
          <small v-if="isStale">The latest check is delayed.</small>
          <small v-else>Tracking is up to date.</small>
        </div>
      </section>

      <div v-if="dataset.mode === 'demo'" class="demo-notice" role="status">
        <span>Test run!</span>
        <p>
          This interface uses illustrative data until the first live synchronization completes.
        </p>
      </div>

      <section class="activity-section" aria-labelledby="activity-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Activity log</p>
            <h2 id="activity-title">Togashi’s posting calendar</h2>
            <p>One square = one day in Japan Standard Time. Tap any day to open it.</p>
          </div>

          <div class="year-switcher" aria-label="Select activity year">
            <button
              v-for="year in availableYears"
              :key="year"
              type="button"
              :class="{ selected: selectedYear === year }"
              @click="selectedYear = year"
            >
              {{ year }}
            </button>
          </div>
        </div>

        <ActivityHeatmap
          :year="selectedYear"
          :days="dataset.days"
          :selected-date="selectedDate"
          @select="selectDay"
        />

        <div class="heatmap-footer">
          <span>Japan Standard Time (UTC+9)</span>
          <div class="legend" aria-label="Activity intensity legend">
            <span>Quiet</span>
            <i class="level-0" />
            <i class="level-1" />
            <i class="level-2" />
            <i class="level-3" />
            <span>3+ posts</span>
          </div>
        </div>
      </section>

      <section class="stats-grid" aria-label="Activity summary">
        <article>
          <span>Posts in {{ selectedYear }}!</span>
          <strong>{{ currentStats.postCount }}</strong>
          <p>Original and quote posts</p>
        </article>
        <article>
          <span>Active days!</span>
          <strong>{{ currentStats.activeDays }}</strong>
          <p>Days with at least one post</p>
        </article>
        <article>
          <span>Quiet streak</span>
          <strong>{{ currentQuietStreak }}<small> days</small></strong>
          <p>Consecutive calendar days</p>
        </article>
      </section>

      <section class="about-panel">
        <p class="eyebrow">About this project</p>
        <h2>Following Togashi, one post at a time.</h2>
        <p>
          Did Togashi Post Today? follows public posting activity without interpreting the author’s health, schedule, or intent. It is an independent fan project and is not affiliated with Yoshihiro Togashi, Shueisha, or X.
        </p>
      </section>
    </main>

    <footer>
      <span>Did Togashi Post Today? · Unofficial fan project</span>
      <span>Calendar dates shown in JST</span>
    </footer>

    <DayDrawer
      v-if="selectedDate"
      :date="selectedDate"
      :post-ids="selectedPostIds"
      :mode="dataset.mode"
      :username="dataset.account.username"
      @close="closeDrawer"
    />
  </div>
</template>
