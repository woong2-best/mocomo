"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { WebtoonGenre } from "@prisma/client";
import { WEBTOON_GENRE_LABEL, WEBTOON_GENRES } from "@/lib/webtoon/constants";
import { cn } from "@/lib/utils";

export function WebtoonGenreBar({ active }: { active: WebtoonGenre | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(genre: WebtoonGenre | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (genre) params.set("genre", genre);
    else params.delete("genre");
    const qs = params.toString();
    router.push(qs ? `/webtoon?${qs}` : "/webtoon");
  }

  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      <div className="flex flex-wrap gap-2">
        <GenrePill label="전체" active={!active} onClick={() => navigate(null)} />
        {WEBTOON_GENRES.map((genre) => (
          <GenrePill
            key={genre}
            label={WEBTOON_GENRE_LABEL[genre]}
            active={active === genre}
            onClick={() => navigate(genre)}
          />
        ))}
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
