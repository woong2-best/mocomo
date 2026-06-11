import Link from "next/link";
import type { AnimeGenre } from "@prisma/client";
import { WikiContent } from "@/components/anime/wiki-content";
import { getGenreInfo, genreToParam } from "@/lib/anime-genres";
import { wikiHeadingId } from "@/lib/anime-revision";
import { cn } from "@/lib/utils";

type AnimeWikiArticleProps = {
  title: string;
  titleEn: string | null;
  genre: AnimeGenre;
  studio: string | null;
  coverUrl: string | null;
  synopsis: string | null;
  worldInfo: string | null;
  characters: string[];
  tags: string[];
  updatedAt: Date;
  className?: string;
};

function extractHeadings(
  prefix: string,
  source: string | null | undefined
): { id: string; label: string; level: 2 | 3 }[] {
  const headings: { id: string; label: string; level: 2 | 3 }[] = [];
  if (!source) return headings;
  for (const line of source.split("\n")) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const label = h2[1].trim();
      headings.push({ id: `${prefix}-${wikiHeadingId(label)}`, label, level: 2 });
      continue;
    }
    const h3 = line.match(/^#\s+(.+)$/);
    if (h3) {
      const label = h3[1].trim();
      headings.push({ id: `${prefix}-${wikiHeadingId(label)}`, label, level: 3 });
    }
  }
  return headings;
}

export function AnimeWikiArticle({
  title,
  titleEn,
  genre,
  studio,
  coverUrl,
  synopsis,
  worldInfo,
  characters,
  tags,
  updatedAt,
  className,
}: AnimeWikiArticleProps) {
  const genreInfo = getGenreInfo(genre);
  const headings = [...extractHeadings("syn", synopsis), ...extractHeadings("world", worldInfo)];
  const formattedDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(updatedAt);

  return (
    <article className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-6 min-w-0 order-2 lg:order-1">
          {headings.length > 0 && (
            <nav
              aria-label="목차"
              className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm"
            >
              <p className="font-semibold mb-2 text-foreground">목차</p>
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

          {synopsis?.trim() ? (
            <section className="wiki-article-body">
              <WikiContent source={synopsis} headingIdPrefix="syn" />
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
              아직 본문이 없습니다. 로그인 후 <strong>편집</strong>으로 나무위키처럼 내용을 채워 주세요.
            </section>
          )}

          {worldInfo?.trim() && (
            <section className="wiki-article-body pt-2 border-t border-border/50">
              <WikiContent source={worldInfo} headingIdPrefix="world" />
            </section>
          )}

          {characters.length > 0 && (
            <section id="characters" className="pt-2 border-t border-border/50">
              <h2 className="text-lg font-bold mb-3">등장인물</h2>
              <ul className="flex flex-wrap gap-2">
                {characters.map((name) => (
                  <li key={name} className="text-sm px-3 py-1.5 rounded-full bg-muted/50 border border-border/40">
                    {name}
                  </li>
                ))}
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

        <aside className="order-1 lg:order-2 lg:sticky lg:top-[5rem] lg:self-start">
          <div className="rounded-2xl border border-border/70 bg-card/80 overflow-hidden shadow-sm">
            <div className="px-3 py-2 border-b border-border/60 bg-muted/30 text-center">
              <p className="text-xs font-semibold text-muted-foreground">문서 정보</p>
            </div>
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={title} className="w-full aspect-[3/4] object-cover" />
            ) : (
              <div className="w-full aspect-[3/4] bg-muted/40 flex items-center justify-center text-5xl">
                {genreInfo.emoji}
              </div>
            )}
            <dl className="px-3 py-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">제목</dt>
                <dd className="font-semibold leading-snug">{title}</dd>
                {titleEn && <dd className="text-xs text-muted-foreground mt-0.5">{titleEn}</dd>}
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">장르</dt>
                <dd>
                  <Link
                    href={`/anime/list/${genreToParam(genre)}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {genreInfo.emoji} {genreInfo.label}
                  </Link>
                </dd>
              </div>
              {studio && (
                <div>
                  <dt className="text-xs text-muted-foreground">제작사</dt>
                  <dd>{studio}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">최근 수정</dt>
                <dd className="text-xs">{formattedDate}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </article>
  );
}
