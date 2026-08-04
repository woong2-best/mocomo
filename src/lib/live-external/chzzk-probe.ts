/**
 * Probe whether Chzzk embed URL is usable.
 * Result cached in-process; override with NEXT_PUBLIC_CHZZK_EMBED_ENABLED=true|false.
 */

export type ChzzkEmbedProbe = {
  embedUrl: string;
  reachable: boolean;
  /** When false, UI must use “새 창에서 시청” only */
  recommendEmbed: boolean;
  status?: number;
  note: string;
};

let cached: { at: number; result: ChzzkEmbedProbe } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

export function buildChzzkProbeUrl(channelId: string): string {
  return `https://chzzk.naver.com/embed/live/${encodeURIComponent(channelId)}`;
}

export async function probeChzzkEmbed(channelId: string): Promise<ChzzkEmbedProbe> {
  const forced = process.env.NEXT_PUBLIC_CHZZK_EMBED_ENABLED?.trim();
  const embedUrl = buildChzzkProbeUrl(channelId);

  if (forced === "true") {
    return {
      embedUrl,
      reachable: true,
      recommendEmbed: true,
      note: "NEXT_PUBLIC_CHZZK_EMBED_ENABLED=true",
    };
  }
  if (forced === "false") {
    return {
      embedUrl,
      reachable: false,
      recommendEmbed: false,
      note: "NEXT_PUBLIC_CHZZK_EMBED_ENABLED=false — 새 창 폴백",
    };
  }

  if (cached && Date.now() - cached.at < TTL_MS) {
    return { ...cached.result, embedUrl };
  }

  try {
    const res = await fetch(embedUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MoCoMoEmbedProbe/1.0; +https://mocomo.net)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const status = res.status;
    // Many embeds return 200 with X-Frame-Options DENY — still “reachable”
    // but not iframe-safe. We cannot read frame headers from server for all CDNs.
    const xfo = res.headers.get("x-frame-options")?.toUpperCase() ?? "";
    const csp = res.headers.get("content-security-policy") ?? "";
    const frameBlocked =
      xfo === "DENY" ||
      xfo === "SAMEORIGIN" ||
      /frame-ancestors\s+('none'|none)/i.test(csp);

    const reachable = status >= 200 && status < 400;
    const recommendEmbed = reachable && !frameBlocked;
    const result: ChzzkEmbedProbe = {
      embedUrl,
      reachable,
      recommendEmbed,
      status,
      note: frameBlocked
        ? `HTTP ${status}; X-Frame/CSP blocks iframe — use open-external fallback`
        : reachable
          ? `HTTP ${status}; embed may work (verify in browser)`
          : `HTTP ${status}; unreachable`,
    };
    cached = { at: Date.now(), result };
    return result;
  } catch (e) {
    const result: ChzzkEmbedProbe = {
      embedUrl,
      reachable: false,
      recommendEmbed: false,
      note: e instanceof Error ? e.message : "probe failed",
    };
    cached = { at: Date.now(), result };
    return result;
  }
}
