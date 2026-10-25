import { randomBytes } from "node:crypto";
import WebSocket from "ws";
import { safeLogWarn } from "@/lib/safe-log";
import {
  EDGE_CHROMIUM_FULL_VERSION,
  EDGE_SEC_MS_GEC_VERSION,
  EDGE_TRUSTED_CLIENT_TOKEN,
  generateSecMsGecV2,
} from "@/lib/ai-live/edge-gec";
import {
  EDGE_VOICES,
  dedicatedEdgeVoice,
  isNangnangCharacter,
  isZelieCharacter,
  speechLangForText,
  toKatakana,
  usesMayuVoice,
  voiceStyleForCharacter,
  zelieSpeechLang,
  type SpeechLang,
  type VoiceStyle,
} from "@/lib/ai-live/speech-lang";

export { voiceStyleForCharacter };

export type EdgeVoiceLang = SpeechLang;

const MAX_AUDIO_BYTES = 3_000_000;
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const EDGE_DEADLINE_MS = 4_000;
const HTTP_TIMEOUT_MS = 5_000;

/** v2 handshake closes itself, so Vercel can use Edge neural voices again. */
export function edgeWebsocketAllowed(_vercel = process.env.VERCEL): boolean {
  return true;
}

export function ttsProviderOrder(_vercel = process.env.VERCEL): Array<"edge" | "streamelements" | "google"> {
  return ["edge", "streamelements", "google"];
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

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (ch) => {
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === "&") return "&amp;";
    if (ch === '"') return "&quot;";
    return "&apos;";
  });
}

function edgeWsUrl(): string {
  const connectId = randomBytes(16).toString("hex");
  return (
    `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
    `?TrustedClientToken=${EDGE_TRUSTED_CLIENT_TOKEN}` +
    `&ConnectionId=${connectId}` +
    `&Sec-MS-GEC=${generateSecMsGecV2()}` +
    `&Sec-MS-GEC-Version=${EDGE_SEC_MS_GEC_VERSION}`
  );
}

async function fromEdgeWs(
  text: string,
  lang: SpeechLang,
  style: VoiceStyle,
  characterId: string | null,
): Promise<ArrayBuffer | null> {
  const mayu = usesMayuVoice(characterId);
  const preset = dedicatedEdgeVoice(characterId, lang) ?? EDGE_VOICES[lang];
  const spoken = mayu ? toKatakana(text) : text;
  const major = EDGE_CHROMIUM_FULL_VERSION.split(".")[0];
  const rate = style.rate === "default" ? "+0%" : style.rate;
  const pitch = style.pitch === "default" ? "+0Hz" : style.pitch;

  return await new Promise((resolve) => {
    let settled = false;
    const chunks: Buffer[] = [];
    let total = 0;
    const ws = new WebSocket(edgeWsUrl(), {
      origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 Edg/${major}.0.0.0`,
        Cookie: `muid=${randomBytes(16).toString("hex").toUpperCase()};`,
      },
    });
    const finish = (value: ArrayBuffer | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.terminate();
      } catch {
        /* already closed */
      }
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), EDGE_DEADLINE_MS);

    ws.on("open", () => {
      ws.send(
        `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"${OUTPUT_FORMAT}"}}}}`,
      );
      const req = randomBytes(16).toString("hex");
      ws.send(
        `X-RequestId:${req}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` +
          `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${preset.lang}">` +
          `<voice name="${preset.voice}"><prosody rate="${rate}" pitch="${pitch}">${escapeXml(spoken)}</prosody></voice></speak>`,
      );
    });
    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        const sep = "Path:audio\r\n";
        const index = buf.indexOf(sep);
        const audio = index >= 0 ? buf.subarray(index + sep.length) : buf;
        if (!audio.length) return;
        total += audio.length;
        if (total > MAX_AUDIO_BYTES) {
          finish(null);
          return;
        }
        chunks.push(audio);
        return;
      }
      if (!data.toString().includes("Path:turn.end")) return;
      const out = Buffer.concat(chunks);
      finish(out.length >= 64 && looksLikeMp3(out) ? toArrayBuffer(out) : null);
    });
    ws.on("error", () => finish(null));
    ws.on("unexpected-response", () => finish(null));
  });
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
  const mayu = usesMayuVoice(characterId);
  const lang = mayu
    ? "ja"
    : isNangnangCharacter(characterId)
      ? "zh"
      : isZelieCharacter(characterId)
        ? zelieSpeechLang(line)
        : speechLangForText(line);
  const spoken = mayu ? toKatakana(line) : line;
  const style = voiceStyleForCharacter(characterId);
  const dedicated = dedicatedEdgeVoice(characterId, lang);
  const runners: Record<"edge" | "streamelements" | "google", () => Promise<ArrayBuffer | null>> = {
    edge: () => fromEdgeWs(spoken, lang, style, characterId),
    streamelements: () => fromStreamElements(spoken, lang, dedicated?.voice),
    google: () => fromGoogleTranslate(spoken, lang),
  };
  // Neural names 401 on StreamElements and used to fall through to a male default.
  const steps = dedicated ? (["edge", "google"] as const) : ttsProviderOrder();
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
