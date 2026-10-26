"use client";

import Link from "next/link";
import type { AnimeGenre } from "@prisma/client";
import { WikiInline } from "@/components/anime/wiki-inline";
import { parseWikiInfobox } from "@/lib/anime-wiki-infobox";
import { getGenreInfo, genreToParam } from "@/lib/anime-genres";
import { wikiCoverDisplayUrl } from "@/lib/wiki-cover-url";
import { cn } from "@/lib/utils";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

type WikiArticleInfoCardProps = {
  title: string;
  titleEn?: string | null;
  genre: AnimeGenre;
  coverUrl?: string | null;
  infobox?: string | null;
  updatedAt?: Date | string | null;
  className?: string;
};

export function WikiArticleInfoCard({
  title,
  titleEn,
  genre,
  coverUrl,
  infobox,
  updatedAt,
  className,
}: WikiArticleInfoCardProps) {
  const genreInfo = getGenreInfo(genre);
  const sections = parseWikiInfobox(infobox);
  const cover = coverUrl ? wikiCoverDisplayUrl(coverUrl) ?? coverUrl : null;
  const edited =
    updatedAt == null
      ? t("wiki.infobox.unpublished")
      : new Intl.DateTimeFormat("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt);

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card/80 overflow-hidden shadow-sm", className)}>
      <div className="px-3 py-2 border-b border-border/60 bg-muted/30 text-center">
        <p className="text-xs font-semibold text-muted-foreground">{t("anime.s1a3gksb")}</p>
      </div>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={title || "cover"} className="w-full aspect-[3/4] object-cover" />
      ) : (
        <div className="w-full aspect-[3/4] bg-muted/40 flex items-center justify-center text-5xl">
          {genreInfo.emoji}
        </div>
      )}
      <dl className="px-3 py-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t("cosplay.sz28d")}</dt>
          <dd className="font-semibold leading-snug">{title.trim() || "—"}</dd>
          {titleEn?.trim() ? (
            <dd className="text-xs text-muted-foreground mt-0.5">{titleEn.trim()}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("anime.sx93o")}</dt>
          <dd>
            <Link
              href={`/anime/list/${genreToParam(genre)}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {genreInfo.emoji} {genreInfo.label}
            </Link>
          </dd>
        </div>
        {sections.map((section, si) => {
          const rows = section.rows.filter((row) => row.value.trim());
          if (rows.length === 0) return null;
          const showTitle =
            sections.length > 1 || section.title.trim().toLowerCase() !== "work info";
          return (
            <div key={`${section.title}-${si}`} className="space-y-2">
              {showTitle ? (
                <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
              ) : null}
              {rows.map((row, ri) => (
                <div key={`${section.title}-${row.label}-${ri}`}>
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="leading-relaxed">
                    {row.value.split("\n").map((line, li) => (
                      <div key={li} className={li > 0 ? "mt-1 pt-1 border-t border-border/30" : undefined}>
                        <WikiInline text={line} keyPrefix={`info-${si}-${ri}-${li}`} />
                      </div>
                    ))}
                  </dd>
                </div>
              ))}
            </div>
          );
        })}
        <div>
          <dt className="text-xs text-muted-foreground">{t("anime.s17kxw59")}</dt>
          <dd className="text-xs">{edited}</dd>
        </div>
      </dl>
    </div>
  );
}
