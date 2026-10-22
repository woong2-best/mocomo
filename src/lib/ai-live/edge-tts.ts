import { EdgeTTS } from "node-edge-tts";
import { textHasHangul } from "@/lib/ai-live/blocklist";

/** Microsoft neural voices. No API key and no GPU server. */
const VOICES = {
  ko: { voice: "ko-KR-SunHiNeural", lang: "ko-KR" },
  en: { voice: "en-US-JennyNeural", lang: "en-US" },
  ja: { voice: "ja-JP-NanamiNeural", lang: "ja-JP" },
} as const;

export type EdgeVoiceLang = keyof typeof VOICES;

const MAX_AUDIO_BYTES = 3_000_000;
const OUTPUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3";

function hasKana(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x3040 && code <= 0x30ff) return true;
  }
  return false;
}

/** Korean if the line has Hangul, Japanese if it has kana, otherwise English. */
export function edgeVoiceForText(text: string): EdgeVoiceLang {
  if (textHasHangul(text)) return "ko";
  if (hasKana(text)) return "ja";
  return "en";
}

export function edgeVoiceName(lang: EdgeVoiceLang): string {
  return VOICES[lang].voice;
}

function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const head = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0);
  if (head === "ID3") return true;
  return bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
}

/** Speak one host line. Returns null when Edge has no audio, never calls a paid TTS server. */
export async function synthesizeIdolVoice(text: string): Promise<ArrayBuffer | null> {
  const line = text.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!line) return null;
  const preset = VOICES[edgeVoiceForText(line)];
  try {
    const tts = new EdgeTTS({
      voice: preset.voice,
      lang: preset.lang,
      outputFormat: OUTPUT_FORMAT,
      timeout: 12_000,
    });
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of tts.streamAudio(line)) {
      if (!Buffer.isBuffer(chunk)) continue;
      total += chunk.length;
      if (total > MAX_AUDIO_BYTES) return null;
      chunks.push(chunk);
    }
    if (total < 64) return null;
    const buf = Buffer.concat(chunks);
    if (!looksLikeMp3(buf)) return null;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  } catch {
    return null;
  }
}
