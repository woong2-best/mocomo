"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AnimeGenre } from "@prisma/client";
import { genreToParam } from "@/lib/anime-genres";
import { getLocalizedAnimeGenres } from "@/lib/anime-genres-i18n";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  active: AnimeGenre | null;
  /** Special pill that navigates off-hub (cosplay). */
  showCosplay?: boolean;
  cosplayActive?: boolean;
};

export function AnimeGenreBar({ active, showCosplay = true, cosplayActive = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const genres = getLocalizedAnimeGenres(locale);

  function navigate(genre: AnimeGenre | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (genre) params.set("genre", genreToParam(genre));
    else params.delete("genre");
    const qs = params.toString();
    router.push(qs ? `/anime?${qs}` : "/anime");
  }

  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      <div className="flex flex-wrap gap-2">
        <GenrePill
          label={t("anime.genreAll")}
          active={!active && !cosplayActive}
          onClick={() => navigate(null)}
        />
        {genres.map((g) => (
          <GenrePill
            key={g.id}
            label={g.label}
            active={!cosplayActive && active === g.id}
            onClick={() => navigate(g.id)}
          />
        ))}
        {showCosplay ? (
          <Link
            href="/cosplay/profiles"
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              cosplayActive
                ? "border-red-600 bg-red-600 text-white"
                : "border-border/70 bg-muted/40 text-foreground hover:bg-muted/70"
            )}
          >
            {t("anime.cosplayerHubTitle")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function GenrePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-red-600 bg-red-600 text-white"
          : "border-border/70 bg-muted/40 text-foreground hover:bg-muted/70"
      )}
    >
      {label}
    </button>
  );
}
