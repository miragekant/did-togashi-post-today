import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function plural(value, singular) {
  return value === 1 ? singular : `${singular}s`;
}

function normalizedUrl(siteUrl) {
  return `${siteUrl.replace(/\/+$/, "")}/`;
}

export function activityYears(dataset) {
  return Array.from(new Set(
    Object.entries(dataset.days)
      .filter(([, postIds]) => postIds.length > 0)
      .map(([date]) => Number(date.slice(0, 4))),
  )).sort((a, b) => b - a);
}

function summaryForYear(dataset, year) {
  const entries = Object.entries(dataset.days)
    .filter(([date, postIds]) => date.startsWith(`${year}-`) && postIds.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  const busiest = entries.reduce(
    (current, entry) => (!current || entry[1].length > current[1].length ? entry : current),
    null,
  );

  return {
    entries,
    postCount: entries.reduce((total, [, ids]) => total + ids.length, 0),
    activeDays: entries.length,
    firstDate: entries.at(0)?.[0] ?? null,
    latestDate: entries.at(-1)?.[0] ?? null,
    busiestDate: busiest?.[0] ?? null,
    busiestCount: busiest?.[1].length ?? 0,
    months: MONTHS.map((name, index) => {
      const prefix = `${year}-${String(index + 1).padStart(2, "0")}-`;
      const monthEntries = entries.filter(([date]) => date.startsWith(prefix));
      return {
        name,
        activeDays: monthEntries.length,
        postCount: monthEntries.reduce((total, [, ids]) => total + ids.length, 0),
      };
    }),
  };
}

export function renderHomeFallback(dataset) {
  const links = activityYears(dataset)
    .map((year) => `<a href="./activity/${year}/">${year} activity</a>`)
    .join("");
  return `
      <div class="initial-content">
        <main>
          <p>Today in Japan · Unofficial fan project</p>
          <h1>Did Yoshihiro Togashi post today?</h1>
          <p>Track manga author Yoshihiro Togashi&rsquo;s public X activity, see the latest posting status, and browse an annual calendar using Japan Standard Time.</p>
          <section aria-labelledby="initial-archive-title">
            <h2 id="initial-archive-title">Yoshihiro Togashi posting activity archive</h2>
            <nav aria-label="Posting activity by year">${links}</nav>
          </section>
          <p>This independent tracker is not affiliated with Yoshihiro Togashi, Shueisha, or X.</p>
        </main>
      </div>`;
}

export function renderArchivePage(dataset, year, siteUrl) {
  const rootUrl = normalizedUrl(siteUrl);
  const pageUrl = `${rootUrl}activity/${year}/`;
  const summary = summaryForYear(dataset, year);
  const description = `Yoshihiro Togashi posted ${summary.postCount} ${plural(summary.postCount, "time")} across ${summary.activeDays} active ${plural(summary.activeDays, "day")} in ${year}. Browse the public X posting activity archive in Japan Standard Time.`;
  const monthRows = summary.months.map((month) => `
            <tr><th scope="row">${month.name}</th><td>${month.postCount}</td><td>${month.activeDays}</td></tr>`).join("");
  const dates = summary.entries.map(([date, ids]) => `
          <li><a href="../../?date=${date}">${formatDate(date)}</a><span>${ids.length} ${ids.length === 1 ? "post" : "posts"}</span></li>`).join("");
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: `Yoshihiro Togashi X posting activity in ${year}`,
    description,
    isPartOf: { "@id": `${rootUrl}#website` },
    inLanguage: "en",
  }).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f4f0e7" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Did Togashi Post Today?" />
    <meta property="og:title" content="Yoshihiro Togashi X Activity in ${year}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image" content="${rootUrl}og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${structuredData}</script>
    <title>Yoshihiro Togashi X Activity in ${year} | Posting Archive</title>
    <style>
      :root { color-scheme: light; --ink: #252925; --paper: #f4f0e7; --yellow: #f6d968; --green: #24412e; }
      * { box-sizing: border-box; }
      body { margin: 0; color: var(--ink); background: var(--paper); font: 16px/1.6 system-ui, sans-serif; }
      a { color: inherit; text-decoration-thickness: 2px; text-underline-offset: 3px; }
      header, main, footer { width: min(920px, calc(100% - 36px)); margin-inline: auto; }
      header { padding: 28px 0; border-bottom: 2px solid var(--ink); }
      header a { font-weight: 800; text-decoration: none; }
      main { padding: 58px 0 72px; }
      .eyebrow { margin: 0 0 8px; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { max-width: 780px; margin: 0; font-size: clamp(42px, 7vw, 72px); }
      h2 { margin-top: 54px; font-size: 32px; }
      .lede { max-width: 720px; font-size: 19px; }
      dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 36px 0; }
      dl div { padding: 20px; border: 2px solid var(--ink); border-radius: 12px; background: #fffdf7; box-shadow: 4px 4px 0 var(--ink); }
      dt { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 32px; }
      table { width: 100%; border-collapse: collapse; background: #fffdf7; }
      th, td { padding: 11px 14px; border: 1px solid rgba(37, 41, 37, .3); text-align: right; }
      th:first-child { text-align: left; }
      thead { color: #fff; background: var(--green); }
      .dates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; padding: 0; list-style: none; }
      .dates li { display: flex; justify-content: space-between; gap: 14px; padding: 9px 0; border-bottom: 1px solid rgba(37, 41, 37, .25); }
      .dates span { white-space: nowrap; font-size: 13px; }
      .disclaimer { margin-top: 52px; padding: 22px; border-left: 6px solid var(--yellow); background: #fffdf7; }
      footer { padding: 24px 0 40px; border-top: 2px solid var(--ink); font-size: 13px; }
      @media (max-width: 640px) { dl, .dates { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <header><a href="../../">&larr; Did Togashi Post Today?</a></header>
    <main>
      <p class="eyebrow">Annual activity archive · Japan Standard Time</p>
      <h1>Yoshihiro Togashi X posting activity in ${year}</h1>
      <p class="lede">${escapeHtml(description)}</p>
      <dl>
        <div><dt>Total posts</dt><dd>${summary.postCount}</dd></div>
        <div><dt>Active days</dt><dd>${summary.activeDays}</dd></div>
        <div><dt>Busiest day</dt><dd>${summary.busiestCount}</dd></div>
      </dl>
      <p>
        Activity ran from ${summary.firstDate ? formatDate(summary.firstDate) : "no recorded date"}
        through ${summary.latestDate ? formatDate(summary.latestDate) : "no recorded date"}.
        ${summary.busiestDate ? `The busiest recorded day was ${formatDate(summary.busiestDate)} with ${summary.busiestCount} posts.` : ""}
      </p>
      <section aria-labelledby="monthly-summary">
        <h2 id="monthly-summary">Monthly summary</h2>
        <table>
          <thead><tr><th scope="col">Month</th><th scope="col">Posts</th><th scope="col">Active days</th></tr></thead>
          <tbody>${monthRows}
          </tbody>
        </table>
      </section>
      <section aria-labelledby="active-dates">
        <h2 id="active-dates">Active dates in ${year}</h2>
        <ul class="dates">${dates}
        </ul>
      </section>
      <p class="disclaimer">This independent fan archive tracks public posting activity only. It does not copy post text or media and is not affiliated with Yoshihiro Togashi, Shueisha, or X.</p>
    </main>
    <footer><a href="../../">Current posting status</a> · Dates shown in JST (UTC+9)</footer>
  </body>
</html>`;
}

export function renderSitemap(dataset, siteUrl) {
  const rootUrl = normalizedUrl(siteUrl);
  const urls = [
    { loc: rootUrl, lastmod: String(dataset.lastCheckedAt).slice(0, 10) },
    ...activityYears(dataset).map((year) => {
      const summary = summaryForYear(dataset, year);
      return { loc: `${rootUrl}activity/${year}/`, lastmod: summary.latestDate };
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ loc, lastmod }) => `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
  </url>`).join("\n")}
</urlset>
`;
}

export function renderRobots(siteUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${normalizedUrl(siteUrl)}sitemap.xml
`;
}

export function seoPages({ siteUrl }) {
  let projectRoot = process.cwd();
  const loadDataset = () => JSON.parse(
    readFileSync(resolve(projectRoot, "public/data/activity.json"), "utf8"),
  );

  return {
    name: "togashi-seo-pages",
    enforce: "pre",
    configResolved(config) { projectRoot = config.root; },
    transformIndexHtml(html) {
      return html.replace("<!-- seo-fallback -->", renderHomeFallback(loadDataset()));
    },
    generateBundle() {
      const dataset = loadDataset();
      this.emitFile({ type: "asset", fileName: "robots.txt", source: renderRobots(siteUrl) });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: renderSitemap(dataset, siteUrl) });
      for (const year of activityYears(dataset)) {
        this.emitFile({
          type: "asset",
          fileName: `activity/${year}/index.html`,
          source: renderArchivePage(dataset, year, siteUrl),
        });
      }
    },
  };
}
