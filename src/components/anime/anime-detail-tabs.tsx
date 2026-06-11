"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import type { AnimeGenre } from "@prisma/client";
import { AnimeWikiArticle } from "@/components/anime/anime-wiki-article";
import { AnimeGoodsPanel } from "@/components/anime/anime-goods-panel";
import { AnimeCommunityPanel } from "@/components/anime/anime-community-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const TAB_IDS = ["info", "cosplayers", "goods", "community"] as const;
type TabId = (typeof TAB_IDS)[number];

const tabs: { id: TabId; label: string }[] = [
  { id: "info", label: "정보" },
  { id: "cosplayers", label: "관련 코스어" },
  { id: "goods", label: "굿즈" },
  { id: "community", label: "커뮤니티" },
];

function normalizeTab(value: string | undefined): TabId {
  if (value && TAB_IDS.includes(value as TabId)) return value as TabId;
  return "info";
}

type CosplayerLink = {
  id: string;
  character: string | null;
  profile: {
    stageName: string | null;
    user: { username: string; image: string | null };
    photos: { url: string }[];
  };
};

type CommunityPost = {
  id: string;
  content: string;
  author: { username: string; image: string | null };
};

type GoodsRow = {
  id: string;
  title: string;
  type: string;
  price: number | null;
  imageUrl: string | null;
  linkUrl: string | null;
};

export type AnimeDetailTabsProps = {
  slug: string;
  initialTab: string;
  showEditLink?: boolean;
  isLoggedIn: boolean;
  characterNames: string[];
  cosplayers: CosplayerLink[];
  goods: GoodsRow[];
  posts: CommunityPost[];
  anime: {
    id: string;
    title: string;
    titleEn: string | null;
    genre: AnimeGenre;
    studio: string | null;
    coverUrl: string | null;
    synopsis: string | null;
    worldInfo: string | null;
    infobox: string | null;
    tags: string[];
    updatedAt: string;
  };
};

export function AnimeDetailTabs({
  slug,
  initialTab,
  showEditLink,
  isLoggedIn,
  characterNames,
  cosplayers,
  goods,
  posts,
  anime,
}: AnimeDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(() => normalizeTab(initialTab));

  const selectTab = useCallback((id: TabId) => {
    setActiveTab(id);
    const url = new URL(window.location.href);
    if (id === "info") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next);
  }, []);

  return (
    <>
      <nav className="flex border-b border-border/50 px-4 gap-1 overflow-x-auto items-center">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
        <Link
          href={`/anime/${slug}/history`}
          prefetch
          className={cn(
            "px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex items-center gap-1",
            "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="h-3.5 w-3.5" />
          기록
        </Link>
        {showEditLink && (
          <Link
            href={`/anime/${slug}/edit`}
            prefetch
            className="ml-auto px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary whitespace-nowrap"
          >
            편집
          </Link>
        )}
      </nav>

      <div className="p-4 lg:p-6">
        {activeTab === "info" && (
          <div className="space-y-8">
            <AnimeWikiArticle
              title={anime.title}
              titleEn={anime.titleEn}
              genre={anime.genre}
              studio={anime.studio}
              coverUrl={anime.coverUrl}
              synopsis={anime.synopsis}
              worldInfo={anime.worldInfo}
              infobox={anime.infobox}
              characters={characterNames}
              tags={anime.tags}
              updatedAt={new Date(anime.updatedAt)}
            />
            {cosplayers.length > 0 && (
              <section className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">관련 코스어</h2>
                  <button
                    type="button"
                    onClick={() => selectTab("cosplayers")}
                    className="text-sm text-primary hover:underline"
                  >
                    전체 보기 ({cosplayers.length})
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cosplayers.slice(0, 6).map((link) => (
                    <Link
                      key={link.id}
                      href={`/cosplay/${link.profile.user.username}`}
                      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border/60 hover:bg-muted/40 text-sm"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={link.profile.user.image ?? undefined} />
                        <AvatarFallback>{link.character?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{link.profile.stageName || link.profile.user.username}</span>
                      {link.character && (
                        <span className="text-muted-foreground text-xs">· {link.character}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "cosplayers" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cosplayers.length === 0 ? (
              <p className="text-muted-foreground col-span-full">연결된 코스어가 없습니다.</p>
            ) : (
              cosplayers.map((link) => (
                <Link key={link.id} href={`/cosplay/${link.profile.user.username}`}>
                  <Card className="overflow-hidden hover:border-primary/40">
                    {link.profile.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={link.profile.photos[0].url} alt="" className="w-full aspect-square object-cover" />
                    )}
                    <CardContent className="p-3 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={link.profile.user.image ?? undefined} />
                        <AvatarFallback>{link.character?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{link.profile.stageName || link.profile.user.username}</p>
                        {link.character && <p className="text-xs text-muted-foreground">{link.character}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === "goods" && (
          <AnimeGoodsPanel animeId={anime.id} slug={slug} goods={goods} canEdit={isLoggedIn} />
        )}

        {activeTab === "community" && (
          <AnimeCommunityPanel animeId={anime.id} slug={slug} posts={posts} isLoggedIn={isLoggedIn} />
        )}
      </div>
    </>
  );
}
