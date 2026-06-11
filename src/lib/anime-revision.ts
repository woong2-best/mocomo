import { animeSlugFromTitle } from "@/lib/utils";

export type AnimeRevisionSnapshot = {
  title: string;
  titleEn: string | null;
  genre: string;
  synopsis: string | null;
  studio: string | null;
  worldInfo: string | null;
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
