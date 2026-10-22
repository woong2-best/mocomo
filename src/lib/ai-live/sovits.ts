/**
 * Private GPT-SoVITS proxy. The browser never sees this URL.
 * No request is made when GPT_SOVITS_API_URL is unset.
 */

const MAX_AUDIO_BYTES = 3_000_000;

function looksLikeAudio(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const head = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
  if (head === "RIFF" || head === "OggS" || head === "fLaC") return true;
  if (head.startsWith("ID3")) return true;
  return bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
}

function audioFromJson(buf: ArrayBuffer): ArrayBuffer | null {
  try {
    const json = JSON.parse(Buffer.from(buf).toString("utf8")) as {
      audio?: unknown;
      data?: unknown;
      wav?: unknown;
    };
    const raw = json.audio ?? json.data ?? json.wav;
    if (typeof raw !== "string" || raw.length < 64 || raw.length > 4_000_000) return null;
    const bytes = Buffer.from(raw, "base64");
    if (bytes.byteLength < 64 || bytes.byteLength > MAX_AUDIO_BYTES) return null;
    if (!looksLikeAudio(bytes)) return null;
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } catch {
    return null;
  }
}

export async function synthesizeIdolVoice(text: string, hangul: boolean): Promise<ArrayBuffer | null> {
  const url = process.env.GPT_SOVITS_API_URL?.trim();
  const line = text.trim().slice(0, 240);
  if (!url || !line) return null;

  const textLang = process.env.GPT_SOVITS_TEXT_LANG?.trim() || (hangul ? "ko" : "en");
  const promptLang = process.env.GPT_SOVITS_PROMPT_LANG?.trim() || textLang;
  const body: Record<string, unknown> = {
    text: line,
    text_lang: textLang,
    prompt_lang: promptLang,
    prompt_text: process.env.GPT_SOVITS_PROMPT_TEXT?.trim() || "",
    media_type: "wav",
    streaming_mode: false,
  };
  const ref = process.env.GPT_SOVITS_REF_AUDIO?.trim();
  if (ref) body.ref_audio_path = ref;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/wav, audio/*, application/octet-stream, application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 64 || buf.byteLength > MAX_AUDIO_BYTES) return null;
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    const bytes = new Uint8Array(buf);
    if (type.startsWith("audio/") || type.includes("octet-stream") || looksLikeAudio(bytes)) {
      return buf;
    }
    if (type.includes("json")) return audioFromJson(buf);
    return null;
  } catch {
    return null;
  }
}
