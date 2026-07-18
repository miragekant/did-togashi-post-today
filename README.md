# Did Togashi Post Today?

An unofficial, static-first activity tracker for Yoshihiro Togashi's public X account.

The site uses deterministic demo data until the first authenticated synchronization completes. The production workflow then publishes only post IDs and derived activity dates; official X embeds render post content in the browser.

## Current behavior

- Today-in-Japan yes/no status, with rolling 24-hour context
- Annual posting heatmap in `Asia/Tokyo`
- Clickable and keyboard-accessible calendar days
- Shareable `?date=YYYY-MM-DD` detail state
- Responsive day-detail drawer
- Demo post previews
- Official X embed component ready for live numeric post IDs
- Complete initial history import through X full-archive search
- Incremental X synchronization every four hours
- GitHub Pages deployment on push or manual dispatch

The demo is intentionally labeled throughout the interface. It must not be presented as real Togashi activity.

## Local development

Requires Node.js 22 or newer and pnpm 10.

```sh
pnpm install
pnpm dev
```

Run verification with:

```sh
pnpm test
pnpm build
```

## Data contract

The frontend reads `public/data/activity.json`. Live data will use the same contract:

```json
{
  "schemaVersion": 1,
  "mode": "live",
  "account": {
    "displayName": "Yoshihiro Togashi",
    "username": "Un4v5s8bgsVk9Xp",
    "userId": "numeric-x-user-id"
  },
  "timeZone": "Asia/Tokyo",
  "lastCheckedAt": "2026-07-17T18:15:00Z",
  "latestPostAt": "2026-07-17T15:00:00Z",
  "latestPostId": "numeric-post-id",
  "days": {
    "2026-07-18": ["numeric-post-id"]
  }
}
```

Only post IDs and derived activity data should be published. Do not commit X API responses, copied post text, downloaded media, or credentials.

## X API synchronization

The synchronization pipeline:

1. Reads `X_BEARER_TOKEN` only inside GitHub Actions.
2. Resolves and pins the account's numeric user ID.
3. Uses full-archive search for the first import, from the account creation timestamp through the present.
4. Falls back to the user timeline if full-archive search is unavailable.
5. Excludes replies and reposts while retaining original and quote posts.
6. Uses the newest stored ID as `since_id` for later incremental checks.
7. Groups post IDs into JST calendar dates, commits the data file, runs tests, and deploys Pages.
8. Runs at minute 17 every four hours and can also be started manually.

Never expose the bearer token through a `VITE_*` environment variable. Those variables are bundled into public frontend code.

## GitHub Pages

The included workflow builds and deploys the `dist` directory through GitHub's Pages artifact actions. In the repository settings, select **GitHub Actions** as the Pages source.

The `Sync X activity` workflow requires an Actions secret named `X_BEARER_TOKEN`. The first run performs the historical backfill; later runs fetch only posts newer than the stored `latestPostId`.
