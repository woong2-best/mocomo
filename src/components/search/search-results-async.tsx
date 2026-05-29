import Link from "next/link";
import { runFastSearch } from "@/lib/search-fast";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";

export async function SearchResultsAsync({ query }: { query: string }) {
  if (!query) return null;
  const q = query.trim();
  if (q.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">검색어는 2자 이상 입력해 주세요.</p>
    );
  }

  const { users, animes, posts, liveStreams } = await runFastSearch(q);

  return (
    <>
      {liveStreams.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">라이브 방송</h2>
          {liveStreams.map((ch) => (
            <Link key={ch.id} href={`/voice/${ch.id}`} className="block text-sm py-1 hover:text-primary">
              🔴 {ch.name} <span className="text-muted-foreground text-xs">({ch.category})</span>
            </Link>
          ))}
        </section>
      )}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">유저 · 코스어</h2>
        {users.length === 0 && <p className="text-xs text-muted-foreground">없음</p>}
        {users.map((u) => (
          <Link key={u.username} href={`/u/${u.username}`} className="block text-sm py-1 hover:text-primary">
            <DisplayNameWithSupportTier
              name={
                <>
                  @{u.username}
                  {u.name && ` (${u.name})`}
                </>
              }
              tier={u.supportTierSent}
              compact
            />
          </Link>
        ))}
      </section>
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">애니</h2>
        {animes.length === 0 && <p className="text-xs text-muted-foreground">없음</p>}
        {animes.map((a) => (
          <Link key={a.slug} href={`/anime/${a.slug}`} className="block text-sm py-1 hover:text-primary">
            {a.title}
          </Link>
        ))}
      </section>
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">게시글</h2>
        {posts.length === 0 && <p className="text-xs text-muted-foreground">없음</p>}
        {posts.map((p) => (
          <Link key={p.id} href={`/post/${p.id}`}>
            <Card className="mb-2 hover:border-primary/30">
              <CardContent className="p-3 text-sm line-clamp-2">{p.title || p.content}</CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </>
  );
}
