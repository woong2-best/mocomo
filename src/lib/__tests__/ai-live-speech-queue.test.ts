import test from "node:test";
import assert from "node:assert/strict";
import { createSpeechQueue, enqueueSpeech } from "@/lib/ai-live/speech-queue";

test("chat waits and a donation cuts in front", () => {
  const queue = createSpeechQueue();
  const chat = new ArrayBuffer(8);
  const donation = new ArrayBuffer(4);
  assert.equal(enqueueSpeech(queue, { audio: chat, priority: "chat" }), false);
  assert.equal(enqueueSpeech(queue, { audio: donation, priority: "donation" }), true);
  assert.equal(queue.epoch, 1);
  assert.equal(queue.items[0]?.audio, donation);
  assert.equal(queue.items[1]?.audio, chat);
  assert.equal(enqueueSpeech(queue, { audio: chat, priority: "chat" }), false);
  assert.equal(queue.items.length, 3);
  assert.equal(queue.epoch, 1);
});
