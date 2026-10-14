import test from "node:test";
import assert from "node:assert/strict";
import { canBatchMlKitLine, planMlKitBatch, splitBatchedTranslation } from "./mlkit-batch";

test("short single-line strings share a batch until the line or char cap", () => {
  const pending = Array.from({ length: 25 }, (_, index) => ({ text: `Line ${index}` }));
  const batch = planMlKitBatch(pending);
  assert.equal(batch.length, 20);
  assert.equal(batch[0]?.text, "Line 0");
  assert.equal(batch[19]?.text, "Line 19");
});

test("a long post is not packed with following UI lines", () => {
  const pending = [{ text: "a".repeat(200) }, { text: "Settings" }, { text: "Save" }];
  assert.deepEqual(
    planMlKitBatch(pending).map((item) => item.text),
    [pending[0]?.text]
  );
  assert.equal(canBatchMlKitLine("Settings"), true);
  assert.equal(canBatchMlKitLine("a\nb"), false);
});

test("newline count must match or the batch is rejected", () => {
  assert.deepEqual(splitBatchedTranslation(3, "안녕\n설정\n저장"), ["안녕", "설정", "저장"]);
  assert.equal(splitBatchedTranslation(3, "안녕\n설정"), null);
  assert.equal(splitBatchedTranslation(2, "안녕\n\n설정"), null);
});
