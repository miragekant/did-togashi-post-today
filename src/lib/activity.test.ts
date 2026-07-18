import { describe, expect, it } from "vitest";
import {
  addDays,
  buildYearGrid,
  createDemoDataset,
  dateKeyInTimeZone,
  hoursSince,
  isDateKey,
  quietStreak,
  yearStats,
} from "./activity";

describe("activity helpers", () => {
  it("crosses month and leap-year boundaries", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("assigns activity to Japan time", () => {
    expect(dateKeyInTimeZone(new Date("2026-07-17T16:00:00Z"), "Asia/Tokyo")).toBe(
      "2026-07-18",
    );
  });

  it("builds complete Sunday-to-Saturday year grids", () => {
    const grid = buildYearGrid(2026, { "2026-01-01": ["1"] });
    expect(grid.cells.length % 7).toBe(0);
    expect(grid.cells.find((cell) => cell.date === "2026-01-01")?.postIds).toEqual(["1"]);
    expect(grid.months).toHaveLength(12);
  });

  it("calculates rolling status and yearly totals", () => {
    const now = new Date("2026-07-17T12:00:00Z");
    const dataset = createDemoDataset(now);
    expect(hoursSince(dataset.latestPostAt, now)).toBeCloseTo(3.4);
    expect(yearStats(dataset, 2026).postCount).toBeGreaterThan(0);
    expect(quietStreak(dataset, now)).toBe(0);
  });

  it("validates shareable date parameters", () => {
    expect(isDateKey("2026-07-17")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("17-07-2026")).toBe(false);
  });
});
