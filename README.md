# Did Togashi Post Today?

An unofficial, static-first activity tracker for Yoshihiro Togashi's public X account.

The current version is an API-independent UI prototype. It uses deterministic demo data so the status card, annual heatmap, year navigation, shareable day links, responsive drawer, and empty states can be developed and reviewed before paid X API access is available.

## Current behavior

- Today-in-Japan yes/no status, with rolling 24-hour context
- Annual posting heatmap in `Asia/Tokyo`
- Clickable and keyboard-accessible calendar days
- Shareable `?date=YYYY-MM-DD` detail state
- Responsive day-detail drawer
- Demo post previews
- Official X embed component ready for live numeric post IDs
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

## Connecting the X API later

When API access is available:

1. Add a server-side sync script that reads `X_BEARER_TOKEN`.
2. Resolve and pin the account's numeric user ID.
3. Fetch `GET /2/users/{id}/tweets` using the newest stored ID as `since_id`.
4. Exclude replies and reposts; retain original and quote posts.
5. Group post IDs into JST calendar dates.
6. Validate the generated JSON, run tests, and deploy the Pages artifact.
7. Add a scheduled workflow, preferably every four hours at an off-peak minute.
8. Add deletion/unavailability reconciliation before public launch.

Never expose the bearer token through a `VITE_*` environment variable. Those variables are bundled into public frontend code.

## GitHub Pages

The included workflow builds and deploys the `dist` directory through GitHub's Pages artifact actions. In the repository settings, select **GitHub Actions** as the Pages source.

Scheduled data synchronization is deliberately not enabled while the project has no X API credentials.
