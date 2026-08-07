import Link from "next/link";
import { unstable_cache } from "next/cache";
import { enrichSearchUsersWithFollowStatus, runFastSearch } from "@/lib/search-fast";
import { getAuthUserId } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { displayAnimeTitle } from "@/lib/anime-display-title";
import { getRequestLocale } from "@/lib/i18n/server";
import { userDisplayName } from "@/lib/user-public-select";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { recordSearchEvent } from "@/lib/search/record";
import { getRelatedSearchQueries } from "@/lib/search/suggest";

export async function SearchResultsAsync({ query }: { query: string }) {
  if (!query) return null;
  const q = query.trim();
  if (q.length < 1) {
    return (
      <p className="text-sm text-muted-foreground">검색어를 입력해 주세요.</p>
    );
  }

  const searchKey = q.toLowerCase().slice(0, 80);
  const [viewerId, locale] = await Promise.all([getAuthUserId(), getRequestLocale()]);
  const cached = await unstable_cache(
    () => runFastSearch(q),
    ["fast-search-page-v2", searchKey],
    { revalidate: 30 }
  )();
  const users = await enrichSearchUsersWithFollowStatus(viewerId, cached.users);
  const { animes, posts, liveStreams } = cached;
  const resultCount =
    users.length + animes.length + posts.length + liveStreams.length;
  void recordSearchEvent({
    rawQuery: q,
    resultCount,
    userId: viewerId,
  }).catch(() => undefined);
  const related = await getRelatedSearchQueries(q, 8).catch(() => []);

  return (
    <>
      {isLiveFeatureEnabled() && liveStreams.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">라이브 방송</h2>
          {liveStreams.map((ch) => (
            <Link key={ch.id} href={`/voice/${ch.id}`} className="block text-sm py-1 hover:text-primary">
              🔴 {ch.name} <span className="text-muted-foreground text-xs">({ch.category})</span>
            </Link>
          ))}
        </section>
      )}
      {animes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">애니</h2>
          <div className="space-y-2">
            {animes.map((a) => (
              <Link
                key={a.slug}
                href={`/anime/${a.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-2 hover:border-primary/40 hover:bg-muted/40 transition-colors"
              >
                <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {a.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.coverUrl} alt={a.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {displayAnimeTitle(
                      { title: a.title, titleEn: a.titleEn ?? null, slug: a.slug },
                      locale
                    )}
                  </p>
                  <p className="text-[11px] text-primary/70 mt-0.5">컬쳐위키</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {users.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">사람</h2>
          <div className="space-y-1">
            {users.map((u) => {
              const displayName = userDisplayName(u);
              return (
                <Link
                  key={u.username}
                  href={`/u/${u.username}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.image ?? undefined} />
                    <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>
                    <DisplayNameWithSupportTier
                      name={displayName}
                      tier={u.supportTierSent}
                      nameClassName="font-medium"
                      compact
                    />
                    <span className="block text-xs text-muted-foreground">@{u.username}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">게시물</h2>
        {posts.length === 0 && <p className="text-xs text-muted-foreground">없음</p>}
        {posts.map((p) => (
          <Link key={p.id} href={`/post/${p.id}`}>
            <Card className="mb-2 hover:border-primary/30">
              <CardContent className="p-3 text-sm line-clamp-2">{p.title || p.content}</CardContent>
            </Card>
          </Link>
        ))}
      </section>
      {animes.length === 0 && users.length === 0 && posts.length === 0 && (
        <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
      )}
      {related.length > 0 && (
        <section className="pt-2">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">연관 검색어</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.normalized}
                href={`/search?q=${encodeURIComponent(r.query)}`}
                className="rounded-full border px-3 py-1 text-xs hover:border-primary/40 hover:bg-muted/50"
              >
                {r.query}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
