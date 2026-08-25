import test from "node:test";
import assert from "node:assert/strict";
import {
  isLikelyWatermarkSessionId,
  normalizeWatermarkSessionIdInput,
} from "@/lib/watermark/detector/session-id-input";

test("normalizeWatermarkSessionIdInput rejects DevTools placeholder paste", () => {
  assert.equal(
    normalizeWatermarkSessionIdInput("DevTools canvases()[0].sessionId"),
    null
  );
});

test("normalizeWatermarkSessionIdInput accepts cuid-like session ids", () => {
  const id = "clxyz1234567890abcdefghij";
  assert.equal(normalizeWatermarkSessionIdInput(id), id);
  assert.equal(isLikelyWatermarkSessionId(id), true);
});
