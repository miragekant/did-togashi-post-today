<script setup lang="ts">
import { computed } from "vue";
import { buildYearGrid } from "../lib/activity";
import type { CalendarCell } from "../types";

const props = defineProps<{
  year: number;
  days: Record<string, string[]>;
  selectedDate: string | null;
}>();

const emit = defineEmits<{
  select: [cell: CalendarCell];
}>();

const grid = computed(() => buildYearGrid(props.year, props.days));
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function level(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

function readableDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
</script>

<template>
  <div class="heatmap-shell">
    <div class="weekday-labels" aria-hidden="true">
      <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
    </div>

    <div class="heatmap-scroll" tabindex="0" aria-label="Scrollable annual activity heatmap">
      <div
        class="month-labels"
        :style="{ '--week-count': grid.weekCount }"
        aria-hidden="true"
      >
        <span
          v-for="month in grid.months"
          :key="month.label"
          :style="{ gridColumn: `${month.weekIndex + 1} / span 4` }"
        >
          {{ month.label }}
        </span>
      </div>

      <div
        class="heatmap-grid"
        :style="{ '--week-count': grid.weekCount }"
        role="grid"
        :aria-label="`${year} posting activity`"
      >
        <button
          v-for="cell in grid.cells"
          :key="cell.date"
          class="heatmap-cell"
          :class="[
            `level-${level(cell.postIds.length)}`,
            { outside: !cell.inYear, selected: selectedDate === cell.date },
          ]"
          :disabled="!cell.inYear"
          :aria-label="`${readableDate(cell.date)}: ${cell.postIds.length} ${cell.postIds.length === 1 ? 'post' : 'posts'}`"
          :title="`${readableDate(cell.date)} · ${cell.postIds.length} ${cell.postIds.length === 1 ? 'post' : 'posts'}`"
          role="gridcell"
          @click="emit('select', cell)"
        >
          <span class="sr-only">{{ cell.dayOfMonth }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
