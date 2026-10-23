import { EdgeTTS } from "node-edge-tts";
import { safeLogWarn } from "@/lib/safe-log";
import {
  AIRI_MAYU_LANG,
  AIRI_MAYU_VOICE,
  EDGE_VOICES,
  isAiriCharacter,
  speechLangForText,
  toKatakana,
  voiceStyleForCharacter,
  type SpeechLang,
  type VoiceStyle,
} from "@/lib/ai-live/speech-lang";

export { voiceStyleForCharacter };

export type EdgeVoiceLang = SpeechLang;

const MAX_AUDIO_BYTES = 3_000_000;
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const EDGE_DEADLINE_MS = 4_000;
const HTTP_TIMEOUT_MS = 5_000;

/** Edge's WS never finishes connecting on Vercel, so the speak route 504s. */
export function edgeWebsocketAllowed(vercel = process.env.VERCEL): boolean {
  return !vercel;
}

export function ttsProviderOrder(vercel = process.env.VERCEL): Array<"edge" | "streamelements" | "google"> {
  return edgeWebsocketAllowed(vercel) ? ["edge", "streamelements", "google"] : ["streamelements", "google"];
}

async function withDeadline<T>(work: Promise<T | null>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function edgeVoiceForText(text: string): EdgeVoiceLang {
  return speechLangForText(text);
}

export function edgeVoiceName(lang: EdgeVoiceLang): string {
  return EDGE_VOICES[lang].voice;
}

function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const head = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0);
  if (head === "ID3") return true;
  return bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const out = new ArrayBuffer(buf.byteLength);
  new Uint8Array(out).set(buf);
  return out;
}

async function fromEdgeWs(
  text: string,
  lang: SpeechLang,
  style: VoiceStyle,
  characterId: string | null,
): Promise<ArrayBuffer | null> {
  const airi = isAiriCharacter(characterId);
  const preset = EDGE_VOICES[lang];
  const tts = new EdgeTTS({
    voice: airi ? AIRI_MAYU_VOICE : preset.voice,
    lang: airi ? AIRI_MAYU_LANG : preset.lang,
    outputFormat: OUTPUT_FORMAT,
    pitch: style.pitch,
    rate: style.rate,
    timeout: EDGE_DEADLINE_MS,
  });
  const spoken = airi ? toKatakana(text) : text;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of tts.streamAudio(spoken)) {
    if (!Buffer.isBuffer(chunk)) continue;
    total += chunk.length;
    if (total > MAX_AUDIO_BYTES) return null;
    chunks.push(chunk);
  }
  if (total < 64) return null;
  const buf = Buffer.concat(chunks);
  return looksLikeMp3(buf) ? toArrayBuffer(buf) : null;
}

async function fromGoogleTranslate(text: string, lang: SpeechLang): Promise<ArrayBuffer | null> {
  const line = text.slice(0, 180);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(line)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://translate.google.com/",
    },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 64 || buf.length > MAX_AUDIO_BYTES || !looksLikeMp3(buf)) return null;
  return toArrayBuffer(buf);
}

async function fromStreamElements(
  text: string,
  lang: SpeechLang,
  voiceName?: string,
): Promise<ArrayBuffer | null> {
  const line = text.slice(0, 180);
  const voice = voiceName ?? EDGE_VOICES[lang].voice;
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(line)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 64 || buf.length > MAX_AUDIO_BYTES || !looksLikeMp3(buf)) return null;
  return toArrayBuffer(buf);
}

/** Speak one host line. Free neural first, then HTTP fallbacks. Never calls a paid GPU server. */
export async function synthesizeIdolVoice(
  text: string,
  characterId: string | null = null
): Promise<ArrayBuffer | null> {
  const line = text.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!line) return null;
  const airi = isAiriCharacter(characterId);
  const lang = airi ? "ja" : speechLangForText(line);
  const spoken = airi ? toKatakana(line) : line;
  const style = voiceStyleForCharacter(characterId);
  const mayu = airi ? AIRI_MAYU_VOICE : undefined;
  const runners: Record<"edge" | "streamelements" | "google", () => Promise<ArrayBuffer | null>> = {
    edge: () => withDeadline(fromEdgeWs(spoken, lang, style, characterId), EDGE_DEADLINE_MS),
    streamelements: () => fromStreamElements(spoken, lang, mayu),
    google: () => fromGoogleTranslate(spoken, lang),
  };
  const steps = ttsProviderOrder();
  for (const name of steps) {
    const run = runners[name];
    try {
      const audio = await run();
      if (audio) return audio;
      safeLogWarn("live-tts", { step: name, result: "empty" });
    } catch {
      safeLogWarn("live-tts", { step: name, result: "fail" });
    }
  }
  return null;
}
