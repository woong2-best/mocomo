import { ANIME_GENRES } from "@/lib/anime-genres";
import type { AnimeGenre } from "@prisma/client";

export type WikiAnimeFields = {
  title: string;
  titleEn?: string;
  genre: AnimeGenre;
  synopsis?: string;
  studio?: string;
  worldInfo?: string;
  infobox?: string;
  coverUrl?: string;
  bannerUrl?: string;
  charactersText?: string;
  tags?: string;
  editSummary?: string;
};

const META_LABELS = new Set(["genre", "studio", "tags", "characters", "cover image", "banner image"]);

function genreFromLabel(raw: string): AnimeGenre {
  const compact = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const hit = ANIME_GENRES.find((g) => {
    const label = g.label.toLowerCase().replace(/[\s_-]+/g, "");
    const id = g.id.toLowerCase().replace(/_/g, "");
    return label === compact || id === compact;
  });
  return hit?.id ?? "OTHER";
}

function sectionBody(source: string, header: string): string | undefined {
  const idx = source.indexOf(header);
  if (idx < 0) return undefined;
  const after = source.slice(idx + header.length);
  const next = after.search(/\n== [^\n]+ ==/);
  const body = (next >= 0 ? after.slice(0, next) : after).replace(/^\n/, "").trimEnd();
  const trimmed = body.trim();
  return trimmed || undefined;
}

export function animeFieldsToMarkdown(fields: Partial<WikiAnimeFields>): string {
  const lines: string[] = [];
  const title = fields.title?.trim() ?? "";
  const titleEn = fields.titleEn?.trim() ?? "";
  if (title || titleEn) {
    lines.push(titleEn ? `[${title} (${titleEn})]` : `[${title}]`);
  }
  lines.push("{Anime}");
  if (fields.genre) {
    const info = ANIME_GENRES.find((g) => g.id === fields.genre);
    lines.push(`[Genre: ${info?.label ?? fields.genre}]`);
  }
  if (fields.studio?.trim()) lines.push(`[Studio: ${fields.studio.trim()}]`);
  if (fields.tags?.trim()) lines.push(`[Tags: ${fields.tags.trim()}]`);
  if (fields.coverUrl) lines.push("[Cover Image]");
  if (fields.bannerUrl) lines.push("[Banner Image]");
  if (fields.charactersText?.trim()) {
    lines.push(`[Characters:\n${fields.charactersText.trim()}\n]`);
  }
  if (fields.synopsis?.trim()) {
    lines.push("", "== Synopsis ==", fields.synopsis.trim());
  }
  if (fields.worldInfo?.trim()) {
    lines.push("", "== Setting ==", fields.worldInfo.trim());
  }
  if (fields.infobox?.trim()) {
    lines.push("", fields.infobox.trim());
  }
  return lines.join("\n").replace(/^\n+/, "");
}

export function markdownToAnimeFields(
  markdown: string,
  media: { coverUrl?: string; bannerUrl?: string } = {}
): WikiAnimeFields {
  const lines = markdown.split("\n");
  let title = "";
  let titleEn: string | undefined;
  let genre: AnimeGenre = "OTHER";
  let studio: string | undefined;
  let tags: string | undefined;
  const characters: string[] = [];
  let inCharacters = false;

  for (const line of lines) {
    if (inCharacters) {
      if (line.trim() === "]") {
        inCharacters = false;
        continue;
      }
      if (line.trim()) characters.push(line.trim());
      continue;
    }

    const charOpen = line.match(/^\s*\[Characters:\s*(.*)$/);
    if (charOpen) {
      const rest = charOpen[1].replace(/\]\s*$/, "").trim();
      if (rest) characters.push(rest);
      if (!line.includes("]")) inCharacters = true;
      continue;
    }

    const genreM = line.match(/^\s*\[Genre:\s*([^\]]*)\]/);
    if (genreM) {
      genre = genreFromLabel(genreM[1] ?? "");
      continue;
    }
    const studioM = line.match(/^\s*\[Studio:\s*([^\]]*)\]/);
    if (studioM) {
      studio = studioM[1]?.trim() || undefined;
      continue;
    }
    const tagsM = line.match(/^\s*\[Tags:\s*([^\]]*)\]/);
    if (tagsM) {
      tags = tagsM[1]?.trim() || undefined;
      continue;
    }

    const titleM = line.match(/^\s*\[([^[\]]+)\]\s*$/);
    if (titleM && !title) {
      const inner = titleM[1].trim();
      if (META_LABELS.has(inner.toLowerCase().split(":")[0] ?? "")) continue;
      const enM = inner.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
      if (enM) {
        title = enM[1].trim();
        titleEn = enM[2].trim() || undefined;
      } else {
        title = inner;
      }
    }
  }

  return {
    title: title || "Untitled",
    titleEn,
    genre,
    studio,
    tags,
    charactersText: characters.length ? characters.join("\n") : undefined,
    synopsis: sectionBody(markdown, "== Synopsis =="),
    worldInfo: sectionBody(markdown, "== Setting =="),
    coverUrl: media.coverUrl,
    bannerUrl: media.bannerUrl,
  };
}
