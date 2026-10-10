import test from "node:test";
import assert from "node:assert/strict";
import { isNextNavigationFetch, topProgress } from "@/lib/top-progress";

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

test("RSC prefetch without a navigation hold does not start the top bar", () => {
  topProgress.forceReset();
  assert.equal(isNextNavigationFetch("/post/abc", rscInit()), false);
  assert.equal(
    isNextNavigationFetch("/post/abc", rscInit({ "Next-Router-Prefetch": "1" })),
    false
  );
});

test("RSC fetch after a real navigation hold is tracked", () => {
  const prev = globalThis.window;
  // start() no-ops without window
  (globalThis as { window?: unknown }).window = globalThis;
  try {
    topProgress.forceReset();
    topProgress.start();
    assert.equal(isNextNavigationFetch("/post/abc", rscInit()), true);
  } finally {
    topProgress.forceReset();
    if (prev === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prev;
    }
  }
});
