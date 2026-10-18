export const MAX_STUDIO_BLOCKS = 24;

export type StudioPortfolioBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; url: string }
  | { id: string; type: "embed"; url: string; provider: "youtube" | "vimeo"; videoId: string };

export type StudioPortfolioDoc = {
  version: 2;
  coverUrl: string;
  blocks: StudioPortfolioBlock[];
};

export type StudioFeedMedia = { url: string; kind: "image" | "gif" | "video" };

export type StudioVideoEmbed = {
  url: string;
  provider: "youtube" | "vimeo";
  videoId: string;
  embedSrc: string;
};

function asRows(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanId(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value : "";
  const id = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  return id || fallback;
}

export function isHttpsMediaUrl(url: string) {
  return url.startsWith("https://") && url.length <= 2000;
}

export function parseVideoEmbed(raw: string): StudioVideoEmbed | null {
  const text = raw.trim();
  if (!text) return null;
  const yt = text.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i
  );
  if (yt?.[1]) {
    return {
      url: `https://www.youtube.com/watch?v=${yt[1]}`,
      provider: "youtube",
      videoId: yt[1],
      embedSrc: `https://www.youtube-nocookie.com/embed/${yt[1]}`,
    };
  }
  const vimeo = text.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})/i);
  if (vimeo?.[1]) {
    return {
      url: `https://vimeo.com/${vimeo[1]}`,
      provider: "vimeo",
      videoId: vimeo[1],
      embedSrc: `https://player.vimeo.com/video/${vimeo[1]}`,
    };
  }
  return null;
}

export function blockHasContent(block: StudioPortfolioBlock) {
  if (block.type === "text") return block.text.trim().length >= 1;
  if (block.type === "image") return isHttpsMediaUrl(block.url);
  return Boolean(block.videoId && (block.provider === "youtube" || block.provider === "vimeo"));
}

export function parseStudioBlock(raw: unknown, index: number): StudioPortfolioBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = cleanId(row.id, `block${index + 1}`);
  if (row.type === "text") {
    const text = typeof row.text === "string" ? row.text.trim().slice(0, 4000) : "";
    if (!text) return null;
    return { id, type: "text", text };
  }
  if (row.type === "image") {
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!isHttpsMediaUrl(url)) return null;
    return { id, type: "image", url };
  }
  if (row.type === "embed") {
    const parsed = parseVideoEmbed(typeof row.url === "string" ? row.url : "");
    if (!parsed) {
      const provider = row.provider === "vimeo" ? "vimeo" : row.provider === "youtube" ? "youtube" : null;
      const videoId = typeof row.videoId === "string" ? row.videoId.trim() : "";
      if (!provider || !videoId) return null;
      const rebuilt = parseVideoEmbed(
        provider === "vimeo" ? `https://vimeo.com/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`
      );
      if (!rebuilt) return null;
      return { id, type: "embed", url: rebuilt.url, provider: rebuilt.provider, videoId: rebuilt.videoId };
    }
    return { id, type: "embed", url: parsed.url, provider: parsed.provider, videoId: parsed.videoId };
  }
  return null;
}

function fromLegacyMedia(raw: unknown): StudioPortfolioDoc {
  const coverUrl =
    asRows(raw)
      .map((row) => {
        if (!row || typeof row !== "object") return "";
        const item = row as { url?: unknown; kind?: unknown };
        const url = typeof item.url === "string" ? item.url.trim() : "";
        if (!isHttpsMediaUrl(url)) return "";
        if (item.kind === "video") return "";
        return url;
      })
      .find(Boolean) ?? "";
  const blocks: StudioPortfolioBlock[] = [];
  let skippedCover = !coverUrl;
  asRows(raw).forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const item = row as { url?: unknown; kind?: unknown };
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!isHttpsMediaUrl(url) || item.kind === "video") return;
    if (!skippedCover && url === coverUrl) {
      skippedCover = true;
      return;
    }
    blocks.push({ id: `img${index + 1}`, type: "image", url });
  });
  return { version: 2, coverUrl, blocks: blocks.slice(0, MAX_STUDIO_BLOCKS) };
}

export function parseStudioPortfolio(raw: unknown): StudioPortfolioDoc {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const row = raw as { coverUrl?: unknown; blocks?: unknown; portfolio?: unknown };
    const fromBlocks = asRows(row.blocks)
      .map((item, index) => parseStudioBlock(item, index))
      .filter((item): item is StudioPortfolioBlock => !!item)
      .slice(0, MAX_STUDIO_BLOCKS);
    const coverUrl = typeof row.coverUrl === "string" && isHttpsMediaUrl(row.coverUrl.trim()) ? row.coverUrl.trim() : "";
    if (coverUrl || fromBlocks.length > 0) {
      return { version: 2, coverUrl, blocks: fromBlocks };
    }
    if (row.portfolio) return fromLegacyMedia(row.portfolio);
  }
  return fromLegacyMedia(raw);
}

export function feedMediaFromDoc(doc: StudioPortfolioDoc): StudioFeedMedia[] {
  const out: StudioFeedMedia[] = [];
  if (isHttpsMediaUrl(doc.coverUrl)) out.push({ url: doc.coverUrl, kind: "image" });
  for (const block of doc.blocks) {
    if (block.type === "image") out.push({ url: block.url, kind: "image" });
  }
  return out;
}

export function storeStudioPortfolio(doc: StudioPortfolioDoc): StudioPortfolioDoc {
  return {
    version: 2,
    coverUrl: doc.coverUrl,
    blocks: doc.blocks.filter(blockHasContent).slice(0, MAX_STUDIO_BLOCKS),
  };
}
