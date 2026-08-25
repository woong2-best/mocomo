import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCreatorUsernameInput } from "@/lib/watermark/detector/creator-scope";

test("normalizeCreatorUsernameInput strips @ prefix", () => {
  assert.equal(normalizeCreatorUsernameInput("@creator"), "creator");
  assert.equal(normalizeCreatorUsernameInput("creator"), "creator");
});

test("normalizeCreatorUsernameInput rejects invalid handles", () => {
  assert.equal(normalizeCreatorUsernameInput("DevTools canvases()"), null);
  assert.equal(normalizeCreatorUsernameInput(""), null);
});
