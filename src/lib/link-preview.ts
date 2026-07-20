import {
  extractYoutubeVideoId,
  normalizeYoutubeUrl,
} from "@/lib/video-donation";
import {
  isSafePreviewUrl,
  previewDomain,
  type LinkPreviewData,
} from "@/lib/link-preview-shared";

export type { LinkPreviewData } from "@/lib/link-preview-shared";
export {
  extractFirstHttpUrl,
  isSafePreviewUrl,
  isUrlOnlyContent,
  previewDomain,
} from "@/lib/link-preview-shared";

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) {
      const v = decodeHtmlEntities(m[1]).trim();
      if (v) return v;
    }
  }
  return null;
}

function htmlTitle(html: string): string | null {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (!m?.[1]) return null;
  const v = decodeHtmlEntities(m[1]).trim();
  return v || null;
}

function absolutizeUrl(base: string, maybeRelative: string | null): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).href;
  } catch {
    return null;
  }
}

const MAX_HTML_BYTES = 512_000;

export async function fetchOpenGraphPreview(url: string): Promise<LinkPreviewData | null> {
  const safe = isSafePreviewUrl(url);
  if (!safe) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(safe.href, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MoCoMoLinkPreview/1.0 (+https://mocomo.app)",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const finalUrl = isSafePreviewUrl(res.url);
    if (!finalUrl) return null;

    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text/html") && !ctype.includes("application/xhtml")) {
      return {
        url: finalUrl.href,
        domain: previewDomain(finalUrl.href),
        title: null,
        description: null,
        imageUrl: null,
        siteName: null,
        provider: "og",
      };
    }

    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);

    const title =
      metaContent(html, "og:title") ??
      metaContent(html, "twitter:title") ??
      htmlTitle(html);
    const description =
      metaContent(html, "og:description") ??
      metaContent(html, "twitter:description") ??
      metaContent(html, "description");
    const imageUrl = absolutizeUrl(
      finalUrl.href,
      metaContent(html, "og:image") ??
        metaContent(html, "og:image:url") ??
        metaContent(html, "twitter:image")
    );
    const siteName = metaContent(html, "og:site_name");

    return {
      url: finalUrl.href,
      domain: previewDomain(finalUrl.href),
      title: title ? title.slice(0, 200) : null,
      description: description ? description.slice(0, 300) : null,
      imageUrl,
      siteName: siteName ? siteName.slice(0, 80) : null,
      provider: "og",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchYoutubePreview(rawUrl: string): Promise<LinkPreviewData | null> {
  const normalized = normalizeYoutubeUrl(rawUrl);
  if (!normalized) return null;
  const videoId = extractYoutubeVideoId(normalized);
  if (!videoId) return null;

  let title: string | null = null;
  let description: string | null = null;
  let imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // oEmbed is enough for title/thumb; don't block on YouTube HTML (often slow/blocked).
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(normalized)}&format=json`,
      { next: { revalidate: 3600 } }
    );
    if (oembed.ok) {
      const data = (await oembed.json()) as {
        title?: string;
        thumbnail_url?: string;
      };
      title = data.title?.trim() ?? null;
      if (data.thumbnail_url) imageUrl = data.thumbnail_url;
    }
  } catch {
    /* optional */
  }

  return {
    url: normalized,
    domain: "youtube.com",
    title,
    description,
    imageUrl,
    siteName: "YouTube",
    provider: "youtube",
  };
}

export async function buildLinkPreview(rawUrl: string): Promise<LinkPreviewData | null> {
  const safe = isSafePreviewUrl(rawUrl);
  if (!safe) return null;

  if (extractYoutubeVideoId(safe.href)) {
    return fetchYoutubePreview(safe.href);
  }

  return fetchOpenGraphPreview(safe.href);
}
