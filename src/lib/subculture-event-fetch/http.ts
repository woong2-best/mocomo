function decodeResponseBody(buffer: ArrayBuffer, charset: string | null): string {
  const normalized = (charset ?? "utf-8").toLowerCase().replace(/_/g, "-");
  const candidates = [
    normalized,
    normalized.includes("2022") ? "iso-2022-jp" : null,
    "utf-8",
    "shift-jis",
    "euc-jp",
    "iso-2022-jp",
  ].filter(Boolean) as string[];

  for (const enc of [...new Set(candidates)]) {
    try {
      return new TextDecoder(enc).decode(buffer);
    } catch {
      /* try next */
    }
  }
  return new TextDecoder().decode(buffer);
}

function charsetFromMeta(html: string): string | null {
  const m = html.match(/charset=["']?([\w-]+)/i);
  return m?.[1] ?? null;
}

const DEFAULT_TIMEOUT_MS = 18_000;

export async function fetchText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MoCoMo-EventSync/1.0 (+https://mocomo.net/events/map)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,ja;q=0.8,en;q=0.7",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.arrayBuffer();
    const headerCharset = res.headers.get("content-type")?.match(/charset=([^;\s]+)/i)?.[1] ?? null;
    let html = decodeResponseBody(buffer, headerCharset);
    const metaCharset = charsetFromMeta(html.slice(0, 4096));
    if (metaCharset && metaCharset.toLowerCase() !== headerCharset?.toLowerCase()) {
      html = decodeResponseBody(buffer, metaCharset);
    }
    return html;
  } finally {
    clearTimeout(timer);
  }
}
