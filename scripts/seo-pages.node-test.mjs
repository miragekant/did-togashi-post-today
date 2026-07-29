import assert from "node:assert/strict";
import test from "node:test";
import {
  activityYears,
  renderArchivePage,
  renderHomeFallback,
  renderRobots,
  renderSitemap,
} from "./seo-pages.mjs";

const dataset = {
  lastCheckedAt: "2026-07-29T16:04:19Z",
  days: {
    "2025-12-31": ["1"],
    "2026-01-02": ["2", "3"],
    "2026-02-03": [],
  },
};
const siteUrl = "https://example.com/tracker/";

test("activityYears returns only years with recorded posts", () => {
  assert.deepEqual(activityYears(dataset), [2026, 2025]);
});

test("homepage fallback contains descriptive copy and crawlable archive links", () => {
  const html = renderHomeFallback(dataset);
  assert.match(html, /Did Yoshihiro Togashi post today\?/);
  assert.match(html, /href="\.\/activity\/2026\/"/);
  assert.match(html, /href="\.\/activity\/2025\/"/);
});

test("archive page has unique metadata, statistics, and date links", () => {
  const html = renderArchivePage(dataset, 2026, siteUrl);
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/example\.com\/tracker\/activity\/2026\/"/,
  );
  assert.match(html, /Yoshihiro Togashi posted 2 times across 1 active day in 2026/);
  assert.match(html, /href="\.\.\/\.\.\/\?date=2026-01-02"/);
});

test("sitemap and robots point to canonical URLs", () => {
  const sitemap = renderSitemap(dataset, siteUrl);
  assert.match(sitemap, /<loc>https:\/\/example\.com\/tracker\/<\/loc>/);
  assert.match(
    sitemap,
    /<loc>https:\/\/example\.com\/tracker\/activity\/2026\/<\/loc>/,
  );
  assert.doesNotMatch(sitemap, /2026-02-03/);

  const robots = renderRobots(siteUrl);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/example\.com\/tracker\/sitemap\.xml/);
});
