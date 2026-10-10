import type { AnimeGenre } from "@prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { ANIME_GENRES } from "@/lib/anime-genres";

type GenreText = { label: string; description: string };

const GENRE_TEXT: Partial<Record<Locale, Record<AnimeGenre, GenreText>>> = {
  en: {
    COSPLAY: { label: "Cosplay", description: "Costume play, characters, and conventions" },
    ACTION: { label: "Action", description: "High-energy battles and spectacle" },
    ROMANCE: { label: "Romance", description: "Love and relationships" },
    COMEDY: { label: "Comedy", description: "Laughs and lighthearted fun" },
    FANTASY: { label: "Fantasy", description: "Magic and otherworldly adventure" },
    SCI_FI: { label: "Sci-Fi", description: "Science, future, and space" },
    SLICE_OF_LIFE: { label: "Slice of Life", description: "Warm everyday moments" },
    HORROR: { label: "Horror", description: "Fear and suspense" },
    SPORTS: { label: "Sports", description: "Athletics and growth" },
    MECHA: { label: "Mecha", description: "Robots and giant machines" },
    ISEKAI: { label: "Isekai", description: "Rebirth and travel to other worlds" },
    SCHOOL: { label: "School", description: "Set in schools and campuses" },
    MUSIC: { label: "Music", description: "Bands, idols, and musicals" },
    MYSTERY: { label: "Mystery", description: "Investigation and deduction" },
    SUPERNATURAL: { label: "Supernatural", description: "Powers, spirits, and mystery" },
    DRAMA: { label: "Drama", description: "Emotional human stories" },
    ADVENTURE: { label: "Adventure", description: "Journeys and exploration" },
    OTHER: { label: "Other", description: "Everything else" },
  },
};

export function getLocalizedAnimeGenres(locale: Locale) {
  const text = GENRE_TEXT[locale] ?? GENRE_TEXT.en!;
  return ANIME_GENRES.map((g) => ({
    ...g,
    label: text[g.id].label,
    description: text[g.id].description,
  }));
}
