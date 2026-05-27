import Link from "next/link";
import { ChevronLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

export const revalidate = 60;

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AnimeRecentPage() {
  let animes: { slug: string; title: string; updatedAt: Date }[] = [];
  try {
    animes = await db.anime.findMany({
      take: 50,
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true, updatedAt: true },
    });
  } catch {
    animes = [];
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/anime">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          애니 위키
        </Button>
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Clock className="h-7 w-7 text-[#1e88e5]" />
        최근 변경
      </h1>
      <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {animes.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">변경된 문서가 없습니다.</li>
        ) : (
          animes.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/anime/${a.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/40"
              >
                <span className="font-medium truncate">{a.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatWhen(a.updatedAt)}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
