import { AnimeGenre } from "@prisma/client";

export const ANIME_GENRES: {
  id: AnimeGenre;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { id: "ACTION", label: "Action", emoji: "⚔️", description: "High-energy battles and spectacle" },
  { id: "ROMANCE", label: "Romance", emoji: "💕", description: "Stories about love and relationships" },
  { id: "COMEDY", label: "Comedy", emoji: "😂", description: "Laughs and lighthearted fun" },
  { id: "FANTASY", label: "Fantasy", emoji: "🐉", description: "Magic and otherworld adventures" },
  { id: "SCI_FI", label: "SF", emoji: "🚀", description: "Sci-fi, future, and space" },
  { id: "SLICE_OF_LIFE", label: "Slice of life", emoji: "☕", description: "Ordinary, heartwarming days" },
  { id: "HORROR", label: "Horror", emoji: "👻", description: "Fear and thrills" },
  { id: "SPORTS", label: "Sports", emoji: "⚽", description: "Athletics and growth" },
  { id: "MECHA", label: "Mecha", emoji: "🤖", description: "Robots and giant machines" },
  { id: "ISEKAI", label: "Isekai", emoji: "🌀", description: "Rebirth and travel to another world" },
  { id: "SCHOOL", label: "School", emoji: "🏫", description: "Set at school" },
  { id: "MUSIC", label: "Music", emoji: "🎵", description: "Bands, idols, and musicals" },
  { id: "MYSTERY", label: "Mystery", emoji: "🔍", description: "Investigation and deduction" },
  { id: "SUPERNATURAL", label: "Supernatural", emoji: "✨", description: "Psychic powers, yokai, and mystery" },
  { id: "DRAMA", label: "Drama", emoji: "🎭", description: "Moving human drama" },
  { id: "ADVENTURE", label: "Adventure", emoji: "🗺️", description: "Travel and exploration" },
  { id: "OTHER", label: "Other", emoji: "📺", description: "Other genres" },
];

export function getGenreInfo(genre: AnimeGenre) {
  return ANIME_GENRES.find((g) => g.id === genre) ?? ANIME_GENRES[ANIME_GENRES.length - 1];
}

export function genreFromParam(param: string): AnimeGenre | null {
  const upper = param.toUpperCase().replace(/-/g, "_");
  if (ANIME_GENRES.some((g) => g.id === upper)) return upper as AnimeGenre;
  return null;
}

export function genreToParam(genre: AnimeGenre): string {
  return genre.toLowerCase().replace(/_/g, "-");
}
