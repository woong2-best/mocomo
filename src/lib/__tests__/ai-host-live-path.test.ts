import test from "node:test";
import assert from "node:assert/strict";
import { isAiHostLivePath, needsImmediateRealtime } from "@/lib/hub-fast-path";
import { shouldTrackFetch } from "@/lib/top-progress";

test("fake host rooms do not wake the live socket", () => {
  assert.equal(isAiHostLivePath("/live/zelie"), true);
  assert.equal(isAiHostLivePath("/live/cleo"), true);
  assert.equal(isAiHostLivePath("/live/moco"), true);
  assert.equal(isAiHostLivePath("/live/studio"), false);
  assert.equal(needsImmediateRealtime("/live/zelie"), false);
  assert.equal(needsImmediateRealtime("/live/nangnang"), false);
  assert.equal(needsImmediateRealtime("/messages"), true);
});

test("speaking to a host does not start the top progress bar", () => {
  const prev = globalThis.window;
  (globalThis as { window?: unknown }).window = { location: { origin: "https://mocomo.net" } };
  try {
    assert.equal(shouldTrackFetch("/api/live/ai-host/speak", { method: "POST" }), false);
    assert.equal(shouldTrackFetch("/api/posts/abc/comments", { method: "POST" }), true);
  } finally {
    if (prev === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prev;
    }
  }
});
