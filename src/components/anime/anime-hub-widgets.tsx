"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Clock, Shuffle, Sparkles, Megaphone } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LocalizedAnimeTitleList } from "@/components/anime/localized-anime-title-list";
import { useLocale } from "@/components/providers/locale-provider";

type AnimeRow = {
  slug: string;
  title: string;
  titleEn: string | null;
};

export function AnimeHubWidgets({
  popular,
  recent,
}: {
  popular: AnimeRow[];
  recent: AnimeRow[];
}) {
  const { t } = useLocale();
  const { data: session } = useSession();

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            {t("anime.trendingTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {popular.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("anime.trendingEmpty")}</p>
          ) : (
            <LocalizedAnimeTitleList items={popular} numbered className="space-y-1.5" />
          )}
          <Link href="/anime/popular" className="text-xs text-primary hover:underline inline-block pt-1">
            {t("anime.seeMore")}
          </Link>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-folk-cobalt" />
            {t("anime.recentTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("anime.recentEmpty")}</p>
          ) : (
            <LocalizedAnimeTitleList items={recent} className="space-y-1.5" />
          )}
          <Link href="/anime/recent" className="text-xs text-primary hover:underline inline-block pt-1">
            {t("anime.seeMore")}
          </Link>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <Link
            href="/anime/random"
            className="flex items-center gap-2 text-sm font-medium hover:text-folk-cobalt"
          >
            <Shuffle className="h-4 w-4" />
            {t("anime.randomArticle")}
          </Link>
          <Link
            href="/anime/newest"
            className="flex items-center gap-2 text-sm font-medium hover:text-folk-cobalt"
          >
            <Sparkles className="h-4 w-4" />
            {t("anime.newArticles")}
          </Link>
          <Link
            href="/anime/delete-requests"
            className="flex items-center gap-2 text-sm font-medium hover:text-folk-cobalt"
          >
            <Megaphone className="h-4 w-4" />
            {t("anime.deleteRequests")}
          </Link>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-amber-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Megaphone className="h-4 w-4" />
            {t("anime.noticeAccount")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground">
          <p>{t("anime.collabNotice")}</p>
          {session?.user ? (
            <p className="text-foreground text-sm">
              {t("anime.loggedInAs", { username: session.user.username ?? "user" })}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link href="/auth/signin?callbackUrl=/anime">
                <Button size="sm" variant="default" className="rounded-xl h-8 text-xs">
                  {t("nav.signin")}
                </Button>
              </Link>
              <Link href="/auth/signup?callbackUrl=/anime">
                <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs">
                  {t("nav.signup")}
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
