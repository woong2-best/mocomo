import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCachedNewestAnime } from "@/lib/cached-data";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { getServerTranslator } from "@/lib/i18n/server";

export const revalidate = 120;

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export default async function AnimeNewestPage() {
  const { t } = await getServerTranslator();
  let animes: Awaited<ReturnType<typeof getCachedNewestAnime>> = [];
  try {
    animes = await getCachedNewestAnime();
  } catch {
    animes = [];
  }

  return (
    <AppPageChrome maxWidth="3xl">
      <Link href="/anime">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          {t("nav.anime")}
        </Button>
      </Link>
      <NativePageTitle>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-neon-cyan" />
          신규 글
        </h1>
      </NativePageTitle>
      <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {animes.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">등록된 글이 없습니다.</li>
        ) : (
          animes.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/anime/${a.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">@{a.creator.username}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatWhen(a.createdAt)}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </AppPageChrome>
  );
}
