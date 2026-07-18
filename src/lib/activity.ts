import type { ActivityDataset, CalendarCell, MonthMarker } from "../types";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(dateKey: string, amount: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isDateKey(value: string): boolean {
  if (!DATE_KEY.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function buildYearGrid(
  year: number,
  days: Record<string, string[]>,
): { cells: CalendarCell[]; months: MonthMarker[]; weekCount: number } {
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  const firstWeekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const lastWeekday = new Date(`${last}T00:00:00Z`).getUTCDay();
  const gridStart = addDays(first, -firstWeekday);
  const gridEnd = addDays(last, 6 - lastWeekday);
  const cells: CalendarCell[] = [];
  const months: MonthMarker[] = [];
  const seenMonths = new Set<number>();

  for (let cursor = gridStart, index = 0; cursor <= gridEnd; cursor = addDays(cursor, 1), index += 1) {
    const date = new Date(`${cursor}T00:00:00Z`);
    const inYear = date.getUTCFullYear() === year;
    const month = date.getUTCMonth();
    const weekIndex = Math.floor(index / 7);

    if (inYear && !seenMonths.has(month)) {
      months.push({
        label: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        weekIndex,
      });
      seenMonths.add(month);
    }

    cells.push({
      date: cursor,
      dayOfMonth: date.getUTCDate(),
      inYear,
      weekIndex,
      weekday: date.getUTCDay(),
      postIds: days[cursor] ?? [],
    });
  }

  return { cells, months, weekCount: cells.length / 7 };
}

export function hoursSince(isoDate: string | null, now = new Date()): number | null {
  if (!isoDate) return null;
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (now.getTime() - timestamp) / 3_600_000);
}

export function quietStreak(dataset: ActivityDataset, now = new Date()): number {
  let cursor = dateKeyInTimeZone(now, dataset.timeZone);
  let streak = 0;

  while (streak < 5_000 && (dataset.days[cursor]?.length ?? 0) === 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function yearStats(dataset: ActivityDataset, year: number) {
  const prefix = `${year}-`;
  const entries = Object.entries(dataset.days).filter(([date]) => date.startsWith(prefix));
  return {
    activeDays: entries.filter(([, ids]) => ids.length > 0).length,
    postCount: entries.reduce((total, [, ids]) => total + ids.length, 0),
  };
}

export function createDemoDataset(now = new Date()): ActivityDataset {
  const timeZone = "Asia/Tokyo";
  const today = dateKeyInTimeZone(now, timeZone);
  const days: Record<string, string[]> = {};

  for (let offset = 0; offset < 760; offset += 1) {
    const date = addDays(today, -offset);
    const cycle = Math.floor(offset / 48) % 3;
    const signal = (offset * 17 + date.charCodeAt(9) * 7) % 43;
    let count = cycle === 0 && signal < 8 ? 1 + (signal % 3 === 0 ? 1 : 0) : 0;
    if (cycle === 1 && signal === 0) count = 1;
    if (offset === 0) count = 1;

    if (count > 0) {
      days[date] = Array.from({ length: count }, (_, index) => `demo-${date}-${index + 1}`);
    }
  }

  return {
    schemaVersion: 1,
    mode: "demo",
    account: {
      displayName: "Yoshihiro Togashi",
      username: "Un4v5s8bgsVk9Xp",
    },
    timeZone,
    lastCheckedAt: new Date(now.getTime() - 18 * 60_000).toISOString(),
    latestPostAt: new Date(now.getTime() - 3.4 * 3_600_000).toISOString(),
    latestPostId: days[today]?.[0] ?? null,
    days,
  };
}
