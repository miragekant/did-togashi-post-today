import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const API_ORIGIN = "https://api.x.com";
const DATA_FILE = new URL("../public/data/activity.json", import.meta.url);

export class XApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "XApiError";
    this.status = status;
  }
}

export function dateKeyInTimeZone(isoDate, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoDate));
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function requestX(path, params, bearerToken, fetchImpl = fetch) {
  const url = new URL(path, API_ORIGIN);
  for (const [key, value] of params) url.searchParams.set(key, value);

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "did-togashi-post-today/1.0",
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 600);
    throw new XApiError(response.status, `X API request failed (${response.status}): ${detail}`);
  }

  return response.json();
}

export async function lookupAccount(username, bearerToken, fetchImpl = fetch) {
  const payload = await requestX(
    `/2/users/by/username/${encodeURIComponent(username)}`,
    new URLSearchParams({ "user.fields": "created_at" }),
    bearerToken,
    fetchImpl,
  );

  if (!payload.data?.id || !payload.data?.created_at) {
    throw new Error("X user lookup did not return an ID and creation date.");
  }

  return payload.data;
}

export async function fetchFullArchivePosts(
  username,
  createdAt,
  bearerToken,
  { fetchImpl = fetch, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {},
) {
  const posts = [];
  let nextToken;
  let page = 0;

  do {
    const params = new URLSearchParams({
      query: `from:${username} -is:retweet -is:reply`,
      start_time: createdAt,
      max_results: "500",
      sort_order: "recency",
      "tweet.fields": "created_at",
    });
    if (nextToken) params.set("next_token", nextToken);

    const payload = await requestX(
      "/2/tweets/search/all",
      params,
      bearerToken,
      fetchImpl,
    );
    posts.push(...(payload.data ?? []));
    nextToken = payload.meta?.next_token;
    page += 1;
    console.log(`Full-archive page ${page}: ${payload.meta?.result_count ?? 0} posts`);

    if (nextToken) await wait(1_100);
  } while (nextToken);

  return posts;
}

export async function fetchTimelinePosts(
  userId,
  bearerToken,
  { sinceId, fetchImpl = fetch } = {},
) {
  const posts = [];
  let paginationToken;

  do {
    const params = new URLSearchParams({
      max_results: "100",
      exclude: "replies,retweets",
      "tweet.fields": "created_at",
    });
    if (sinceId) params.set("since_id", sinceId);
    if (paginationToken) params.set("pagination_token", paginationToken);

    const payload = await requestX(
      `/2/users/${encodeURIComponent(userId)}/tweets`,
      params,
      bearerToken,
      fetchImpl,
    );
    posts.push(...(payload.data ?? []));
    paginationToken = payload.meta?.next_token;
  } while (paginationToken);

  return posts;
}

export function mergePostsIntoDataset(dataset, posts, account, checkedAt = new Date()) {
  const days = dataset.mode === "live" ? structuredClone(dataset.days) : {};
  const existingIds = new Set(Object.values(days).flat());
  const validPosts = posts
    .filter((post) => /^\d+$/.test(post.id) && Number.isFinite(new Date(post.created_at).getTime()))
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

  for (const post of validPosts) {
    if (existingIds.has(post.id)) continue;
    const date = dateKeyInTimeZone(post.created_at, dataset.timeZone);
    days[date] ??= [];
    days[date].push(post.id);
    existingIds.add(post.id);
  }

  const orderedDays = Object.fromEntries(
    Object.keys(days)
      .sort()
      .map((date) => [date, [...new Set(days[date])]]),
  );
  const newestFetched = validPosts[0];
  const fetchedIsNewer =
    newestFetched &&
    (!dataset.latestPostAt || new Date(newestFetched.created_at) > new Date(dataset.latestPostAt));

  return {
    schemaVersion: 1,
    mode: "live",
    account: {
      displayName: account.name || dataset.account.displayName,
      username: account.username || dataset.account.username,
      userId: account.id,
    },
    timeZone: dataset.timeZone,
    lastCheckedAt: checkedAt.toISOString(),
    latestPostAt: fetchedIsNewer ? newestFetched.created_at : dataset.latestPostAt,
    latestPostId: fetchedIsNewer ? newestFetched.id : dataset.latestPostId,
    days: orderedDays,
  };
}

export async function syncActivity({ bearerToken = process.env.X_BEARER_TOKEN } = {}) {
  if (!bearerToken) throw new Error("X_BEARER_TOKEN is required.");

  const dataset = JSON.parse(await readFile(DATA_FILE, "utf8"));
  const isInitialBackfill = dataset.mode !== "live" || !dataset.latestPostId;
  let account;
  let posts;

  if (isInitialBackfill) {
    account = await lookupAccount(dataset.account.username, bearerToken);
    try {
      posts = await fetchFullArchivePosts(
        account.username,
        account.created_at,
        bearerToken,
      );
    } catch (error) {
      if (!(error instanceof XApiError) || ![400, 403, 404].includes(error.status)) throw error;
      console.warn(`Full-archive search unavailable; falling back to the user timeline (${error.status}).`);
      posts = await fetchTimelinePosts(account.id, bearerToken);
    }
  } else {
    account = {
      id: dataset.account.userId,
      name: dataset.account.displayName,
      username: dataset.account.username,
    };
    if (!account.id) throw new Error("Live data is missing the pinned X user ID.");
    posts = await fetchTimelinePosts(account.id, bearerToken, {
      sinceId: dataset.latestPostId,
    });
  }

  const updated = mergePostsIntoDataset(dataset, posts, account);
  await writeFile(DATA_FILE, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(
    `${isInitialBackfill ? "Backfill" : "Incremental sync"} complete: ${posts.length} posts fetched, ${Object.keys(updated.days).length} active days stored.`,
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  syncActivity().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
