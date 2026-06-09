import Link from "next/link";
import { getUserWikiContributions } from "@/actions/anime";

export async function ProfileWikiContributions({ userId }: { userId: string }) {
  const { created, edited } = await getUserWikiContributions(userId);

  if (created.length === 0 && edited.length === 0) {
    return <p className="p-8 text-center text-muted-foreground text-sm">위키 기여가 없습니다.</p>;
  }

  return (
    <div className="divide-y divide-border/60">
      {created.length > 0 && (
        <section className="p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">작성한 문서</h2>
          <ul className="space-y-2">
            {created.map((a) => (
              <li key={a.slug}>
                <Link href={`/anime/${a.slug}`} className="text-sm font-medium hover:underline">
                  {a.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  최근 수정 {new Date(a.updatedAt).toLocaleDateString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {edited.length > 0 && (
        <section className="p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">편집 참여</h2>
          <ul className="space-y-2">
            {edited.map((r) => (
              <li key={r.id}>
                <Link href={`/anime/${r.anime.slug}`} className="text-sm font-medium hover:underline">
                  {r.anime.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
