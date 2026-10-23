import test from "node:test";
import assert from "node:assert/strict";
import {
  AIRI_VOICEVOX_SPEAKER,
  VOICEVOX_NO7_CREDIT,
  usesVoicevox,
} from "@/lib/ai-live/voicevox-credit";
import {
  DEFAULT_VOICEVOX_URL,
  looksLikeWav,
  synthesizeVoicevox,
  voicevoxAudioQueryUrl,
  voicevoxBaseUrl,
  voicevoxSynthesisUrl,
} from "@/lib/ai-live/voicevox";

test("AIRI is the only VOICEVOX member and uses No.7", () => {
  assert.equal(usesVoicevox("airi"), true);
  assert.equal(usesVoicevox("AIRI"), true);
  assert.equal(usesVoicevox("chloe"), false);
  assert.equal(usesVoicevox("moco"), false);
  assert.equal(AIRI_VOICEVOX_SPEAKER, 29);
  assert.equal(VOICEVOX_NO7_CREDIT, "Voice by VOICEVOX:No.7");
});

test("VOICEVOX URL stays on the env host and speaker 29", () => {
  assert.equal(voicevoxBaseUrl(""), DEFAULT_VOICEVOX_URL);
  assert.equal(voicevoxBaseUrl("ftp://evil"), DEFAULT_VOICEVOX_URL);
  assert.equal(voicevoxBaseUrl("not a url"), DEFAULT_VOICEVOX_URL);
  assert.equal(voicevoxBaseUrl("https://tts.example:50021/"), "https://tts.example:50021");
  assert.match(voicevoxAudioQueryUrl("안녕", 29), /speaker=29/);
  assert.match(voicevoxAudioQueryUrl("안녕", 29), /text=/);
  assert.equal(voicevoxSynthesisUrl(29).endsWith("/synthesis?speaker=29"), true);
});

test("WAV magic bytes and the two-step engine calls", async () => {
  const wav = Buffer.alloc(80, 0);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(72, 4);
  wav.write("WAVE", 8);
  assert.equal(looksLikeWav(wav), true);
  assert.equal(looksLikeWav(Buffer.from("ID3")), false);

  const calls: string[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/audio_query")) {
      return new Response(JSON.stringify({ accent_phrases: [], speedScale: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(wav, { status: 200, headers: { "Content-Type": "audio/wav" } });
  };

  const audio = await synthesizeVoicevox("ヘヘ、お兄ちゃん!", 29, fakeFetch);
  assert.ok(audio);
  assert.equal(looksLikeWav(new Uint8Array(audio)), true);
  assert.equal(calls.length, 2);
  assert.match(calls[0] ?? "", /POST .*\/audio_query\?/);
  assert.match(calls[0] ?? "", /speaker=29/);
  assert.match(calls[1] ?? "", /POST .*\/synthesis\?speaker=29/);
});
