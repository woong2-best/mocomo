import test from "node:test";
import assert from "node:assert/strict";
import { createSpeechQueue, enqueueSpeech } from "@/lib/ai-live/speech-queue";
import { synthesizeIdolVoice } from "@/lib/ai-live/sovits";

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

test("an unset voice server is never called", async () => {
  const previous = process.env.GPT_SOVITS_API_URL;
  delete process.env.GPT_SOVITS_API_URL;
  let called = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    called = true;
    return new Response(null, { status: 500 });
  }) as typeof fetch;
  try {
    const audio = await synthesizeIdolVoice("hello", false);
    assert.equal(audio, null);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.GPT_SOVITS_API_URL;
    else process.env.GPT_SOVITS_API_URL = previous;
  }
});
