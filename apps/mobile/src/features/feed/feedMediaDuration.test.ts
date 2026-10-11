import test from "node:test";
import assert from "node:assert/strict";
import {
  formatFeedVideoDuration,
  formatNormalizedDuration,
  normalizeMediaDurationSec,
} from "./feedMediaDuration";

test("normalizeMediaDurationSec keeps ordinary second values", () => {
  assert.equal(normalizeMediaDurationSec(25), 25);
  assert.equal(normalizeMediaDurationSec(90), 90);
  assert.equal(normalizeMediaDurationSec(3600), 3600);
});

test("normalizeMediaDurationSec converts millisecond picker values", () => {
  assert.equal(normalizeMediaDurationSec(24647), 25);
  assert.equal(normalizeMediaDurationSec(180_000), 180);
});

test("normalizeMediaDurationSec rejects empty or garbage values", () => {
  assert.equal(normalizeMediaDurationSec(null), null);
  assert.equal(normalizeMediaDurationSec(0), null);
  assert.equal(normalizeMediaDurationSec(-4), null);
  assert.equal(normalizeMediaDurationSec(Number.POSITIVE_INFINITY), null);
  assert.equal(normalizeMediaDurationSec(86_400_000), null);
});

test("formatFeedVideoDuration uses m:ss and h:mm:ss", () => {
  assert.equal(formatFeedVideoDuration(25), "0:25");
  assert.equal(formatFeedVideoDuration(90), "1:30");
  assert.equal(formatFeedVideoDuration(3600), "1:00:00");
  assert.equal(formatNormalizedDuration(3661), "1:01:01");
});

test("formatFeedVideoDuration turns the 410:47 bug into a real length", () => {
  assert.equal(formatFeedVideoDuration(24647), "0:25");
});

test("formatFeedVideoDuration hides missing duration and shows 0:00 for junk", () => {
  assert.equal(formatFeedVideoDuration(null), null);
  assert.equal(formatFeedVideoDuration(undefined), null);
  assert.equal(formatFeedVideoDuration(-1), "0:00");
  assert.equal(formatFeedVideoDuration(Number.NaN), "0:00");
});
