import Link from "next/link";
import { ChevronLeft, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CultureWikiHubList } from "@/components/anime/culture-wiki-hub-list";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { getCachedCultureWikiPopularAll } from "@/lib/culture-wiki-hub-data";
import { getServerTranslator } from "@/lib/i18n/server";

export const revalidate = 120;

export default async function AnimePopularPage() {
  const { t } = await getServerTranslator();
  let items: Awaited<ReturnType<typeof getCachedCultureWikiPopularAll>> = [];
  try {
    items = await getCachedCultureWikiPopularAll();
  } catch {
    items = [];
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
          <Flame className="h-7 w-7 text-orange-500" />
          {t("anime.trendingTitle")}
        </h1>
      </NativePageTitle>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("anime.trendingEmpty")}</p>
      ) : (
        <CultureWikiHubList items={items} numbered className="space-y-2" />
      )}
    </AppPageChrome>
  );
}
