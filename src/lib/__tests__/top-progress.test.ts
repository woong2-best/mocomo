import test from "node:test";
import assert from "node:assert/strict";
import {
  handleTopProgressPageShow,
  isNextNavigationFetch,
  STALL_CEILING,
  STALL_PROGRESS,
  topProgress,
} from "@/lib/top-progress";

function rscInit(headers?: Record<string, string>): RequestInit {
  return {
    method: "GET",
    headers: {
      RSC: "1",
      "Next-Router-State-Tree": "%5B%22%22%5D",
      ...headers,
    },
  };
}

async function withWindow(fn: () => void): Promise<void> {
  const prev = globalThis.window;
  (globalThis as { window?: unknown }).window = prev ?? globalThis;
  try {
    fn();
    // done() paints on the next frame / timeout — drain it so node:test
    // does not see leftover async work after the assertion.
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    topProgress.forceReset();
    if (prev === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prev;
    }
  }
}

test("RSC prefetch without a navigation hold does not start the top bar", () => {
  topProgress.forceReset();
  assert.equal(isNextNavigationFetch("/post/abc", rscInit()), false);
  assert.equal(
    isNextNavigationFetch("/post/abc", rscInit({ "Next-Router-Prefetch": "1" })),
    false
  );
});

test("RSC fetch after a real navigation hold is tracked", async () => {
  await withWindow(() => {
    topProgress.forceReset();
    topProgress.start();
    assert.equal(isNextNavigationFetch("/post/abc", rscInit()), true);
  });
});

test("orphan safety releases a click hold when no tracked fetch is open", async () => {
  await withWindow(() => {
    topProgress.start("click /settings/profile");
    assert.equal(topProgress.hasOpenHold(), true);
    topProgress.releaseOrphanIfIdle();
    assert.equal(topProgress.hasOpenHold(), false);
  });
});

test("orphan safety keeps the bar while a tracked fetch is in flight", async () => {
  await withWindow(() => {
    topProgress.start("click /settings/profile");
    topProgress.start("fetch GET /settings/profile");
    topProgress.releaseOrphanIfIdle();
    assert.equal(topProgress.hasOpenHold(), true);
    topProgress.done("fetch GET /settings/profile");
    // Last fetch dropped and the click never got a route change → orphan releases the hint.
    assert.equal(topProgress.hasOpenHold(), false);
  });
});

test("pageshow bfcache restore force-resets the bar", async () => {
  await withWindow(() => {
    topProgress.start("click /settings/profile");
    assert.equal(topProgress.hasOpenHold(), true);
    handleTopProgressPageShow({ persisted: false });
    assert.equal(topProgress.hasOpenHold(), true);
    handleTopProgressPageShow({ persisted: true });
    assert.equal(topProgress.hasOpenHold(), false);
    assert.equal(topProgress.snapshot().active, false);
    assert.equal(topProgress.snapshot().progress, 0);
  });
});

test("stall crawl creeps from 92% toward 99% and never completes on its own", async () => {
  await withWindow(() => {
    topProgress.start("click /settings/profile");
    topProgress.enterStallNow();
    assert.equal(topProgress.snapshot().progress, STALL_PROGRESS);
    assert.equal(topProgress.hasOpenHold(), true);

    topProgress.advanceStallCrawl(10_000);
    const mid = topProgress.snapshot().progress;
    assert.ok(mid > STALL_PROGRESS);
    assert.ok(mid < STALL_CEILING);

    topProgress.advanceStallCrawl(10_000);
    assert.equal(topProgress.snapshot().progress, STALL_CEILING);
    assert.equal(topProgress.hasOpenHold(), true);
    assert.equal(topProgress.snapshot().active, true);
  });
});
