import Link from "next/link";
import { listStudioCreators } from "@/studio/actions/discover";

export default async function StudioDiscoverPage() {
  const creators = await listStudioCreators(48);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">크리에이터 탐색</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {creators.map((c) => (
          <Link
            key={c.id}
            href={`/studio/creator/${c.handle}`}
            className="rounded-2xl border border-pink-100 bg-white p-4 transition hover:shadow-md"
          >
            <p className="font-semibold text-pink-700">{c.displayName}</p>
            <p className="text-sm text-muted-foreground">@{c.handle}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              팔로워 {c.followerCount} · 판매 {c.totalSales}
            </p>
          </Link>
        ))}
      </div>
      {!creators.length && <p className="text-muted-foreground">등록된 크리에이터가 없습니다.</p>}
    </div>
  );
}
