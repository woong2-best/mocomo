import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import type { AnimeGenre } from "@prisma/client";
import { WikiArticleInfoCard } from "@/components/anime/wiki-article-info-card";
import { WikiContent } from "@/components/anime/wiki-content";
import { WikiLinkStatusProvider } from "@/components/anime/wiki-link-context";
import { WikiStickyToc } from "@/components/anime/wiki-sticky-toc";
import { wikiHeadingId, wikiLinkSlug } from "@/lib/anime-revision";
import { extractInfoboxSource, extractWikiHeadings, hasCharactersHeading } from "@/lib/wiki/document";
import { mergeStudioIntoInfobox } from "@/lib/anime-wiki-infobox";
import type { WikiLinkStatusMap } from "@/lib/wiki/resolve-links";
import { cn } from "@/lib/utils";

type AnimeWikiArticleProps = {
  title: string;
  titleEn: string | null;
  genre: AnimeGenre;
  studio: string | null;
  coverUrl: string | null;
  synopsis: string | null;
  worldInfo: string | null;
  infobox: string | null;
  characters: string[];
  tags: string[];
  updatedAt: Date;
  wikiLinks?: WikiLinkStatusMap;
  className?: string;
};

function toToc(
  prefix: string,
  source: string | null | undefined
): { id: string; label: string; level: 2 | 3 }[] {
  return extractWikiHeadings(source).map((heading) => ({
    id: `${prefix}-${wikiHeadingId(heading.label)}`,
    label: heading.label,
    level: heading.level,
  }));
}

export function AnimeWikiArticle({
  title,
  titleEn,
  genre,
  studio,
  coverUrl,
  synopsis,
  worldInfo,
  infobox,
  characters,
  tags,
  updatedAt,
  wikiLinks,
  className,
}: AnimeWikiArticleProps) {
  const extracted = extractInfoboxSource(synopsis ?? "");
  const articleBody = extracted.body || synopsis;
  const infoboxSource = mergeStudioIntoInfobox(
    infobox?.trim() ? infobox : extracted.infobox || null,
    studio
  );
  const headings = [...toToc("syn", articleBody), ...toToc("world", worldInfo)];
  const showCharacterChips = characters.length > 0 && !hasCharactersHeading(articleBody);

  return (
    <WikiLinkStatusProvider value={wikiLinks}>
    <article className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)]">
        <div className="space-y-6 min-w-0 order-2 lg:order-1">
          {headings.length > 0 && (
            <nav
              aria-label={t("anime.swvbz")}
              className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm lg:hidden"
            >
              <p className="font-semibold mb-2 text-foreground">{t("anime.swvbz")}</p>
              <ol className="space-y-1 list-none pl-0">
                {headings.map((h) => (
                  <li key={h.id} className={h.level === 3 ? "pl-3" : undefined}>
                    <a href={`#${h.id}`} className="text-primary hover:underline">
                      {h.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {articleBody?.trim() ? (
            <section className="wiki-article-body">
              <WikiContent source={articleBody} headingIdPrefix="syn" />
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
              {t("anime.s13mfdlg")} <strong>{t("lib.media-editor.s114bd")}</strong>{t("anime.s1q5w2il")}
            </section>
          )}

          {worldInfo?.trim() && (
            <section className="wiki-article-body pt-2 border-t border-border/50">
              <WikiContent source={worldInfo} headingIdPrefix="world" />
            </section>
          )}

          {showCharacterChips && (
            <section id="characters" className="pt-2 border-t border-border/50">
              <h2 className="text-lg font-bold mb-3">{t("anime.snnsrrs")}</h2>
              <ul className="flex flex-wrap gap-2">
                {characters.map((name) => {
                  const resolved = wikiLinks?.[name];
                  const exists = wikiLinks ? Boolean(resolved?.exists) : true;
                  const slug = resolved?.slug ?? wikiLinkSlug(name);
                  const href = exists ? `/anime/${slug}` : `/anime/new?title=${encodeURIComponent(name)}`;
                  return (
                    <li key={name}>
                      <Link
                        href={href}
                        className={cn(
                          "text-sm px-3 py-1.5 rounded-full border inline-block",
                          exists
                            ? "bg-muted/50 border-border/40 text-primary hover:underline"
                            : "bg-red-50 border-red-200 text-[#c0392b] hover:underline"
                        )}
                      >
                        {name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {tags.length > 0 && (
            <section className="flex flex-wrap gap-2 pt-2">
              {tags.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  #{t}
                </span>
              ))}
            </section>
          )}
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-[5rem] lg:self-start space-y-3">
          <div className="hidden lg:block">
            <WikiStickyToc headings={headings} title={t("anime.swvbz")} />
          </div>
          <WikiArticleInfoCard
            title={title}
            titleEn={titleEn}
            genre={genre}
            coverUrl={coverUrl}
            infobox={infoboxSource}
            updatedAt={updatedAt}
          />
        </aside>
      </div>
    </article>
    </WikiLinkStatusProvider>
  );
}
