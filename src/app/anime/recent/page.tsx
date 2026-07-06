import Link from "next/link";
import { ChevronLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CultureWikiHubList } from "@/components/anime/culture-wiki-hub-list";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { getCachedCultureWikiRecentAll } from "@/lib/culture-wiki-hub-data";
import { getServerTranslator } from "@/lib/i18n/server";

export const revalidate = 60;

export default async function AnimeRecentPage() {
  const { t } = await getServerTranslator();
  let items: Awaited<ReturnType<typeof getCachedCultureWikiRecentAll>> = [];
  try {
    items = await getCachedCultureWikiRecentAll();
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
          <Clock className="h-7 w-7 text-folk-cobalt" />
          {t("anime.recentTitle")}
        </h1>
      </NativePageTitle>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("anime.recentEmpty")}</p>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {items.map((item) => (
            <div key={item.key} className="px-4 py-3 hover:bg-muted/40">
              <CultureWikiHubList items={[item]} showUpdatedAt />
            </div>
          ))}
        </div>
      )}
    </AppPageChrome>
  );
}
