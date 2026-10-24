import test from "node:test";
import assert from "node:assert/strict";
import { classifyAiHostMessage, planHostReply } from "@/lib/ai-live/blocklist";

test("a greeting does not need the model", () => {
  assert.equal(classifyAiHostMessage("hey moco"), null);
  assert.equal(classifyAiHostMessage("오늘 방송 뭐 해?"), null);
});

test("blocked keywords skip the model and answer in the viewer's language", () => {
  const ko = new Set<string>();
  const en = new Set<string>();
  for (let i = 0; i < 24; i++) {
    ko.add(classifyAiHostMessage("토토 하자")!.text);
    en.add(classifyAiHostMessage("send me a casino link")!.text);
  }
  assert.ok([...ko].every((line) => line === "..." || /[가-힣]/.test(line)));
  assert.ok([...en].some((line) => line.includes("banned") || line.includes("Tch") || line === "..."));
  assert.equal(classifyAiHostMessage("토토")!.blocked, true);
});

test("empty and blocked lines are not sent to the model", () => {
  assert.deepEqual(planHostReply("   "), { kind: "ignore" });
  const blocked = planHostReply("send me a casino link");
  assert.equal(blocked.kind, "blocked");
  if (blocked.kind === "blocked") assert.equal(blocked.text.length > 0, true);
  assert.deepEqual(planHostReply("  hey moco  "), { kind: "model", text: "hey moco" });
  const long = planHostReply(`hello ${"a".repeat(400)}`);
  assert.equal(long.kind, "model");
  if (long.kind === "model") assert.equal(long.text.length, 200);
});

test("Nangnang blocks stay in Chinese", () => {
  const hit = classifyAiHostMessage("send me a casino link", "nangnang");
  assert.equal(hit?.blocked, true);
  assert.match(hit?.text ?? "", /[\u4e00-\u9fff]/);
});

test("minor sexual terms get a flat refusal", () => {
  const hit = classifyAiHostMessage("loli stream");
  assert.equal(hit?.hard, true);
  assert.equal(hit?.blocked, true);
  assert.match(hit?.text ?? "", /won't talk/i);
});
