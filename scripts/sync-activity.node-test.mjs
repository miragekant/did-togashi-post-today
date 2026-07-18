import assert from "node:assert/strict";
import test from "node:test";
import {
  dateKeyInTimeZone,
  fetchFullArchivePosts,
  mergePostsIntoDataset,
} from "./sync-activity.mjs";

test("groups timestamps into Japan calendar dates", () => {
  assert.equal(dateKeyInTimeZone("2026-07-17T16:00:00Z", "Asia/Tokyo"), "2026-07-18");
});

test("merges post IDs without storing post content", () => {
  const dataset = {
    schemaVersion: 1,
    mode: "demo",
    account: { displayName: "Yoshihiro Togashi", username: "example" },
    timeZone: "Asia/Tokyo",
    lastCheckedAt: null,
    latestPostAt: null,
    latestPostId: null,
    days: { "2020-01-01": ["demo-post"] },
  };
  const posts = [
    { id: "200", created_at: "2026-07-18T02:00:00Z", text: "not persisted" },
    { id: "100", created_at: "2026-07-17T16:00:00Z", text: "not persisted" },
  ];

  const result = mergePostsIntoDataset(
    dataset,
    posts,
    { id: "42", name: "Yoshihiro Togashi", username: "example" },
    new Date("2026-07-18T03:00:00Z"),
  );

  assert.deepEqual(result.days, { "2026-07-18": ["200", "100"] });
  assert.equal(result.latestPostId, "200");
  assert.equal(JSON.stringify(result).includes("not persisted"), false);
});

test("paginates through the complete archive", async () => {
  const requestedUrls = [];
  const payloads = [
    {
      data: [{ id: "2", created_at: "2026-01-02T00:00:00Z" }],
      meta: { result_count: 1, next_token: "page-two" },
    },
    {
      data: [{ id: "1", created_at: "2026-01-01T00:00:00Z" }],
      meta: { result_count: 1 },
    },
  ];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    const payload = payloads.shift();
    return { ok: true, json: async () => payload };
  };

  const posts = await fetchFullArchivePosts("example", "2020-01-01T00:00:00Z", "token", {
    fetchImpl,
    wait: async () => {},
  });

  assert.deepEqual(posts.map((post) => post.id), ["2", "1"]);
  assert.equal(requestedUrls[0].searchParams.get("max_results"), "500");
  assert.equal(requestedUrls[1].searchParams.get("next_token"), "page-two");
});
