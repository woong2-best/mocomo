"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HomeFeedClient } from "@/components/home/home-feed-client";
import type { FeedLayoutItem } from "@/components/feed/feed-dual-column-layout";
import { useAuthReady } from "@/hooks/use-auth-ready";
import {
  HOME_FEED_QUERY_KEY,
  homeFeedViewerKey,
  readHomeFeedCache,
  writeHomeFeedCache,
} from "@/lib/feed-client-cache";

type FeedPage = {
  items: FeedLayoutItem[];
  nextCursor: string | null;
  likedIds: string[];
  starredIds: string[];
  repostedIds: string[];
};

function paymentsEnabledClient() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}

async function fetchHomeFeedPage(): Promise<FeedPage> {
  const res = await fetch("/api/feed?limit=12", { credentials: "include" });
  const json = (await res.json()) as FeedPage & { error?: string };
  if (!res.ok || !Array.isArray(json.items)) {
    throw new Error(json.error ?? "피드를 불러오지 못했습니다.");
  }
  return {
    items: json.items,
    nextCursor: json.nextCursor ?? null,
    likedIds: json.likedIds ?? [],
    starredIds: json.starredIds ?? [],
    repostedIds: json.repostedIds ?? [],
  };
}

function HomeFeedSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading feed">
      <div className="h-4 w-16 rounded bg-muted/40" />
      <div className="h-32 rounded-2xl bg-muted/40" />
      <div className="h-32 rounded-2xl bg-muted/40" />
    </div>
  );
}

export function HomeFeedCached() {
  const { session, authenticated, pending } = useAuthReady();
  const viewerId = homeFeedViewerKey(session?.user?.id);
  const [bootCache] = useState(() => {
    if (typeof window === "undefined") return null;
    const fromSession = readHomeFeedCache(viewerId);
    if (fromSession) return fromSession;
    return readHomeFeedCache("guest");
  });

  const cachedForViewer = useMemo(() => {
    if (bootCache && bootCache.userId === viewerId) return bootCache;
    return readHomeFeedCache(viewerId);
  }, [bootCache, viewerId]);

  const query = useQuery({
    queryKey: [...HOME_FEED_QUERY_KEY, viewerId],
    queryFn: fetchHomeFeedPage,
    initialData: cachedForViewer
      ? {
          items: cachedForViewer.items,
          nextCursor: cachedForViewer.nextCursor,
          likedIds: cachedForViewer.likedIds,
          starredIds: cachedForViewer.starredIds,
          repostedIds: cachedForViewer.repostedIds,
        }
      : undefined,
    initialDataUpdatedAt: cachedForViewer?.savedAt,
    staleTime: 15_000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    enabled: !pending || authenticated,
  });

  useEffect(() => {
    if (!query.data || query.isError) return;
    writeHomeFeedCache({
      userId: viewerId,
      items: query.data.items,
      nextCursor: query.data.nextCursor,
      likedIds: query.data.likedIds,
      starredIds: query.data.starredIds,
      repostedIds: query.data.repostedIds,
    });
  }, [query.data, query.isError, viewerId]);

  const page = query.data;
  const hasCachedPaint = (page?.items.length ?? 0) > 0;

  if (!hasCachedPaint && (query.isLoading || pending)) {
    return <HomeFeedSkeleton />;
  }

  if (!hasCachedPaint && query.isError) {
    return (
      <p className="text-xs text-amber-700 bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-2 mb-4">
        지금은 피드를 불러올 수 없습니다. 잠시 후 새로고침해 주세요.
      </p>
    );
  }

  return (
    <HomeFeedClient
      isLoggedIn={authenticated}
      isPremium={session?.user?.premiumTier === "PREMIUM"}
      likedIds={page?.likedIds ?? []}
      starredIds={page?.starredIds ?? []}
      repostedIds={page?.repostedIds ?? []}
      paymentsEnabled={paymentsEnabledClient()}
      feedItems={page?.items ?? []}
      nextCursor={page?.nextCursor ?? null}
      hasDbPosts={(page?.items.length ?? 0) > 0}
    />
  );
}
