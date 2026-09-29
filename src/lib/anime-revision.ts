import { animeSlugFromTitle } from "@/lib/utils";

export type AnimeRevisionSnapshot = {
  title: string;
  titleEn: string | null;
  genre: string;
  synopsis: string | null;
  studio: string | null;
  worldInfo: string | null;
  infobox: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  characters: unknown;
  tags: string[];
};

export function animeToSnapshot(anime: {
  title: string;
  titleEn: string | null;
  genre: string;
  synopsis: string | null;
  studio: string | null;
  worldInfo: string | null;
  infobox: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  characters: unknown;
  tags: string[];
}): AnimeRevisionSnapshot {
  return {
    title: anime.title,
    titleEn: anime.titleEn,
    genre: anime.genre,
    synopsis: anime.synopsis,
    studio: anime.studio,
    worldInfo: anime.worldInfo,
    infobox: anime.infobox,
    coverUrl: anime.coverUrl,
    bannerUrl: anime.bannerUrl,
    characters: anime.characters,
    tags: anime.tags,
  };
}

export function wikiLinkSlug(title: string): string {
  return animeSlugFromTitle(title);
}

export function wikiHeadingId(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
      .replace(/[^\w가-힣\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "section"
  );
}

export function extractYoutubeId(line: string): string | null {
  const trimmed = line.trim();
  const tag = trimmed.match(/^\[youtube:([a-zA-Z0-9_-]{6,})\]\s*$/);
  if (tag) return tag[1];
  const url = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/
  );
  return url?.[1] ?? null;
}

export function snapshotToUpdateData(snapshot: AnimeRevisionSnapshot) {
  return {
    title: snapshot.title,
    titleEn: snapshot.titleEn,
    genre: snapshot.genre,
    synopsis: snapshot.synopsis,
    studio: snapshot.studio,
    worldInfo: snapshot.worldInfo,
    infobox: snapshot.infobox,
    coverUrl: snapshot.coverUrl,
    bannerUrl: snapshot.bannerUrl,
    characters: snapshot.characters ?? undefined,
    tags: snapshot.tags,
  };
}
