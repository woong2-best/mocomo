import { safeLogWarn } from "@/lib/safe-log";
import { AIRI_VOICEVOX_SPEAKER } from "@/lib/ai-live/voicevox-credit";

export { AIRI_VOICEVOX_SPEAKER, VOICEVOX_NO7_CREDIT, usesVoicevox } from "@/lib/ai-live/voicevox-credit";

export const DEFAULT_VOICEVOX_URL = "http://127.0.0.1:50021";

const MAX_AUDIO_BYTES = 3_000_000;
const QUERY_TIMEOUT_MS = 8_000;
const SYNTH_TIMEOUT_MS = 15_000;

/** Env URL only. Never take a host from the request. */
export function voicevoxBaseUrl(raw = process.env.VOICEVOX_URL): string {
  const fallback = DEFAULT_VOICEVOX_URL;
  const value = raw?.trim();
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.origin}${path}`;
  } catch {
    return fallback;
  }
}

export function voicevoxAudioQueryUrl(text: string, speaker = AIRI_VOICEVOX_SPEAKER): string {
  const params = new URLSearchParams({ text, speaker: String(speaker) });
  return `${voicevoxBaseUrl()}/audio_query?${params}`;
}

export function voicevoxSynthesisUrl(speaker = AIRI_VOICEVOX_SPEAKER): string {
  return `${voicevoxBaseUrl()}/synthesis?speaker=${speaker}`;
}

export function looksLikeWav(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  const wave = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
  return riff === "RIFF" && wave === "WAVE";
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const out = new ArrayBuffer(buf.byteLength);
  new Uint8Array(out).set(buf);
  return out;
}

type AudioQuery = Record<string, unknown>;

async function requestAudioQuery(
  text: string,
  speaker: number,
  fetchImpl: typeof fetch,
): Promise<AudioQuery | null> {
  const res = await fetchImpl(voicevoxAudioQueryUrl(text, speaker), {
    method: "POST",
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const query = (await res.json()) as unknown;
  if (!query || typeof query !== "object" || Array.isArray(query)) return null;
  return query as AudioQuery;
}

async function requestSynthesis(
  query: AudioQuery,
  speaker: number,
  fetchImpl: typeof fetch,
): Promise<ArrayBuffer | null> {
  const res = await fetchImpl(voicevoxSynthesisUrl(speaker), {
    method: "POST",
    headers: { Accept: "audio/wav", "Content-Type": "application/json" },
    body: JSON.stringify(query),
    redirect: "error",
    signal: AbortSignal.timeout(SYNTH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 64 || buf.length > MAX_AUDIO_BYTES || !looksLikeWav(buf)) return null;
  return toArrayBuffer(buf);
}

/**
 * VOICEVOX engine: `POST /audio_query` then `POST /synthesis`.
 * Returns a WAV buffer, or null if the engine is down / rejected the line.
 */
export async function synthesizeVoicevox(
  text: string,
  speaker = AIRI_VOICEVOX_SPEAKER,
  fetchImpl: typeof fetch = fetch,
): Promise<ArrayBuffer | null> {
  const line = text.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!line) return null;
  if (!Number.isInteger(speaker) || speaker < 0) return null;
  try {
    const query = await requestAudioQuery(line, speaker, fetchImpl);
    if (!query) {
      safeLogWarn("live-tts", { step: "voicevox-query", result: "empty" });
      return null;
    }
    return await requestSynthesis(query, speaker, fetchImpl);
  } catch {
    safeLogWarn("live-tts", { step: "voicevox", result: "fail" });
    return null;
  }
}
