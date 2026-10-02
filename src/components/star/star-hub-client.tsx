"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { Loader2, Play, Star } from "lucide-react";
import type { StarHubCreator, StarMarketListing, StarWikiEntry } from "@/lib/star-bookmarks";
import { isQnaStarPost } from "@/lib/star-bookmarks";
import type { GridPost } from "@/components/feed/feed-post-card";
import { formatUsedPrice } from "@/lib/used-market";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STAR_CHANGED_EVENT } from "@/lib/post-engage-client";
import { userDisplayName } from "@/lib/user-public-select";
import { resolveVideoPosterUrl } from "@/lib/video-poster";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

function formatDuration(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickCover(post: GridPost) {
  const media = post.media?.[0];
  if (!media) return null;
  const isVideo = media.type === "VIDEO" || post.postType === "VIDEO";
  const url = isVideo
    ? resolveVideoPosterUrl(media)
    : media.url?.trim() || null;
  return {
    url,
    type: media.type,
    duration: media.duration,
  };
}

function StarGridTile({ post }: { post: GridPost }) {
  const { t } = useLocale();
  const cover = pickCover(post);
  const isVideo = cover?.type === "VIDEO" || post.postType === "VIDEO";
  const duration = isVideo ? formatDuration(cover?.duration) : null;
  const qna = isQnaStarPost(post);
  const fallback = qna
    ? post.community?.name || post.title || post.content?.slice(0, 40) || "QnA"
    : post.title || post.content?.slice(0, 40) || t("star.badge.post");

  return (
    <Link
      href={`/post/${post.id}`}
      prefetch={false}
      className="group relative block aspect-square min-w-0 w-full overflow-hidden rounded-sm bg-neutral-900 ring-1 ring-border/40 hover:ring-primary/40 transition-shadow"
    >
      {cover?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-muted/40 p-2 text-center">
          <span className="text-[11px] font-semibold text-muted-foreground line-clamp-3">{fallback}</span>
        </div>
      )}
      <span
        className={cn(
          "absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide",
          qna ? "bg-sky-600 text-white" : "bg-black/75 text-white"
        )}
      >
        {qna ? t("star.badge.qna") : t("star.badge.post")}
      </span>
      {isVideo ? (
        <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white">
          <Play className="h-3.5 w-3.5 fill-current" />
        </span>
      ) : null}
      {duration ? (
        <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
          {duration}
        </span>
      ) : null}
    </Link>
  );
}

type StarKind = "all" | "posts" | "qna" | "market" | "wiki";

const STAR_TAB_KEYS: { id: StarKind; key: MessageKey }[] = [
  { id: "all", key: "star.tab.all" },
  { id: "posts", key: "star.tab.posts" },
  { id: "qna", key: "star.tab.qna" },
  { id: "market", key: "star.tab.market" },
  { id: "wiki", key: "star.tab.wiki" },
];

type HubResponse = {
  posts?: GridPost[];
  listings?: StarMarketListing[];
  wiki?: StarWikiEntry[];
  creators?: StarHubCreator[];
  total?: number;
};

function StarWikiTile({ entry }: { entry: StarWikiEntry }) {
  const { t } = useLocale();
  return (
    <Link
      href={`/anime/${entry.slug}`}
      prefetch={false}
      className="group relative block aspect-square min-w-0 w-full overflow-hidden rounded-sm bg-neutral-900 ring-1 ring-border/40 hover:ring-primary/40 transition-shadow"
    >
      {entry.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/40 p-2 text-center text-[11px] font-semibold text-muted-foreground">
          {entry.title}
        </div>
      )}
      <span className="absolute left-1 top-1 rounded bg-folk-terracotta/90 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
        {t("star.badge.wiki")}
      </span>
      <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {entry.title}
      </span>
    </Link>
  );
}

function StarMarketTile({ listing }: { listing: StarMarketListing }) {
  const { t } = useLocale();
  return (
    <Link
      href={`/market/${listing.id}`}
      prefetch={false}
      className="group relative block aspect-square min-w-0 w-full overflow-hidden rounded-sm bg-neutral-900 ring-1 ring-border/40 hover:ring-primary/40 transition-shadow"
    >
      {listing.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/40 p-2 text-center text-[11px] font-semibold text-muted-foreground">
          {listing.title || t("star.badge.product")}
        </div>
      )}
      <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {formatUsedPrice(listing.price, listing.currency)}
      </span>
    </Link>
  );
}

export function StarHubClient({
  initialPosts,
  initialListings = [],
  initialWiki = [],
  initialCreators,
  initialTotal,
}: {
  initialPosts: GridPost[];
  initialListings?: StarMarketListing[];
  initialWiki?: StarWikiEntry[];
  initialCreators: StarHubCreator[];
  initialTotal: number;
}) {
  const { t } = useLocale();
  const [kind, setKind] = useState<StarKind>("all");
  const [posts, setPosts] = useState(initialPosts);
  const [listings, setListings] = useState<StarMarketListing[]>(initialListings);
  const [wiki, setWiki] = useState<StarWikiEntry[]>(initialWiki);
  const [creators, setCreators] = useState(initialCreators);
  const [total, setTotal] = useState(initialTotal);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const tabLabel = t(STAR_TAB_KEYS.find((item) => item.id === kind)?.key ?? "star.tab.all");

  const refresh = useCallback(async (nextKind: StarKind, nextCreatorId: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("kind", nextKind);
      if (nextCreatorId && nextKind !== "market" && nextKind !== "wiki") {
        params.set("creatorId", nextCreatorId);
      }
      const res = await fetch(`/api/star?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as HubResponse;
      if (nextKind === "market") {
        setListings(data.listings ?? []);
        setPosts([]);
        setWiki([]);
      } else if (nextKind === "wiki") {
        setWiki(data.wiki ?? []);
        setPosts([]);
        setListings([]);
      } else if (nextKind === "all") {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setListings(data.listings ?? []);
        setWiki(data.wiki ?? []);
      } else {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setListings([]);
        setWiki([]);
      }
      if (Array.isArray(data.creators)) setCreators(data.creators);
      if (typeof data.total === "number") setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const skipInitialRefresh = useRef(true);

  useEffect(() => {
    if (skipInitialRefresh.current && kind === "all" && creatorId === null) {
      skipInitialRefresh.current = false;
      return;
    }
    skipInitialRefresh.current = false;
    void refresh(kind, creatorId);
  }, [creatorId, kind, refresh]);

  useEffect(() => {
    const onStarChanged = () => {
      void refresh(kind, creatorId);
    };
    window.addEventListener(STAR_CHANGED_EVENT, onStarChanged);
    return () => window.removeEventListener(STAR_CHANGED_EVENT, onStarChanged);
  }, [creatorId, kind, refresh]);

  const onClearAll = useCallback(async () => {
    if (total <= 0) return;
    if (
      !window.confirm(t("star.clearConfirm", { tab: tabLabel }))
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch(`/api/star?kind=${kind}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) return;
      if (kind === "market") setListings([]);
      else if (kind === "wiki") setWiki([]);
      else if (kind === "all") {
        setPosts([]);
        setListings([]);
        setWiki([]);
      } else setPosts([]);
      setCreators([]);
      setTotal(0);
      setCreatorId(null);
      window.dispatchEvent(new Event(STAR_CHANGED_EVENT));
    } finally {
      setClearing(false);
    }
  }, [kind, tabLabel, total, t]);

  const visiblePosts = useMemo(
    () => (kind === "posts" ? posts.filter((post) => !isQnaStarPost(post)) : posts),
    [kind, posts]
  );
  const visibleCount =
    kind === "market"
      ? listings.length
      : kind === "wiki"
        ? wiki.length
        : kind === "all"
          ? visiblePosts.length + listings.length + wiki.length
          : visiblePosts.length;
  const showEmpty = visibleCount === 0 && !loading;

  const headerAction = useMemo(
    () => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 font-bold"
        disabled={clearing || total <= 0}
        onClick={() => void onClearAll()}
      >
        {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : t("star.deleteAll")}
      </Button>
    ),
    [clearing, onClearAll, total, t]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {STAR_TAB_KEYS.map((item) => {
            const active = kind === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setKind(item.id);
                  setCreatorId(null);
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-foreground hover:bg-muted"
                )}
                aria-pressed={active}
              >
                {t(item.key)}
              </button>
            );
          })}
        </div>
        {headerAction}
      </div>

      {kind !== "market" && kind !== "wiki" && creators.length > 0 ? (
        <div className="relative -mx-1">
          <div className="flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide snap-x snap-mandatory">
            <button
              type="button"
              onClick={() => setCreatorId(null)}
              className={cn(
                "snap-start shrink-0 flex flex-col items-center gap-1.5 w-[68px]",
                creatorId === null ? "opacity-100" : "opacity-70 hover:opacity-100"
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full border-2 bg-muted/50",
                  creatorId === null ? "border-primary ring-2 ring-primary/25" : "border-border"
                )}
              >
                <Star className={cn("h-6 w-6", creatorId === null ? "text-primary fill-primary/30" : "text-muted-foreground")} />
              </span>
              <span className="text-[11px] font-bold text-foreground">{t("star.tab.all")}</span>
            </button>
            {creators.map((c) => {
              const active = creatorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCreatorId(c.id)}
                  className={cn(
                    "snap-start shrink-0 flex flex-col items-center gap-1.5 w-[68px]",
                    active ? "opacity-100" : "opacity-80 hover:opacity-100"
                  )}
                >
                  <Avatar
                    className={cn(
                      "h-14 w-14 border-2",
                      active ? "border-primary ring-2 ring-primary/25" : "border-border"
                    )}
                  >
                    <AvatarImage src={c.image ?? undefined} />
                    <AvatarFallback className="text-sm font-bold">
                      {c.username[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-bold text-foreground truncate max-w-full px-0.5">
                    {userDisplayName(c)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {loading && visibleCount === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : showEmpty ? (
        <p className="text-center text-muted-foreground py-16 text-sm leading-relaxed">
          {kind === "market"
            ? t("star.empty.market")
            : kind === "wiki"
              ? t("star.empty.wiki")
              : creatorId
                ? t("star.empty.creator")
                : kind === "qna"
                  ? t("star.empty.qna")
                  : kind === "all"
                    ? t("star.empty.all")
                    : t("star.empty.posts")}
        </p>
      ) : kind === "all" ? (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:grid-cols-4 lg:grid-cols-5">
          {listings.map((listing) => (
            <StarMarketTile key={`m-${listing.id}`} listing={listing} />
          ))}
          {wiki.map((entry) => (
            <StarWikiTile key={`w-${entry.id}`} entry={entry} />
          ))}
          {visiblePosts.map((p) => (
            <StarGridTile key={p.id} post={p} />
          ))}
        </div>
      ) : kind === "market" ? (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:grid-cols-4 lg:grid-cols-5">
          {listings.map((listing) => (
            <StarMarketTile key={listing.id} listing={listing} />
          ))}
        </div>
      ) : kind === "wiki" ? (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:grid-cols-4 lg:grid-cols-5">
          {wiki.map((entry) => (
            <StarWikiTile key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:grid-cols-4 lg:grid-cols-5">
          {visiblePosts.map((p) => (
            <StarGridTile key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
