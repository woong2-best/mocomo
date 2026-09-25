"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativePageTitle } from "@/components/layout/app-page-chrome";
import {
  FeedDualColumnLayout,
  type FeedLayoutItem,
} from "@/components/feed/feed-dual-column-layout";
import { FeedVideoViewerProvider } from "@/components/feed/feed-video-viewer-provider";
import { COMMUNITY_CATEGORY_OPTIONS } from "@/lib/community-labels";
import type { CommunityCategory } from "@prisma/client";
import { cn } from "@/lib/utils";

type TabId = "ALL" | CommunityCategory;

type FeedPage = {
  items?: FeedLayoutItem[];
  nextCursor?: string | null;
  likedIds?: string[];
  starredIds?: string[];
  repostedIds?: string[];
  error?: string;
};

function paymentsEnabledClient() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}

function mergeIds(prev: Set<string>, ids?: string[]) {
  if (!ids?.length) return prev;
  const next = new Set(prev);
  for (const id of ids) next.add(id);
  return next;
}

export function QnaHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q")?.trim() ?? "";
  const categoryFromUrl = (searchParams.get("category")?.trim() || "ALL") as TabId;
  const tab: TabId =
    categoryFromUrl === "ALL" ||
    COMMUNITY_CATEGORY_OPTIONS.some((opt) => opt.id === categoryFromUrl)
      ? categoryFromUrl
      : "ALL";

  const [qInput, setQInput] = useState(qFromUrl);
  const [items, setItems] = useState<FeedLayoutItem[]>([]);
  const [likedIds, setLikedIds] = useState(() => new Set<string>());
  const [starredIds, setStarredIds] = useState(() => new Set<string>());
  const [repostedIds, setRepostedIds] = useState(() => new Set<string>());
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [loadError, setLoadError] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setQInput(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = qInput.trim();
      if (next === qFromUrl) return;
      const sp = new URLSearchParams(searchParams.toString());
      if (next) sp.set("q", next);
      else sp.delete("q");
      const qs = sp.toString();
      router.replace(qs ? `/communities?${qs}` : "/communities", { scroll: false });
    }, 320);
    return () => window.clearTimeout(handle);
  }, [qInput, qFromUrl, router, searchParams]);

  const setTab = useCallback(
    (next: TabId) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next === "ALL") sp.delete("category");
      else sp.set("category", next);
      const qs = sp.toString();
      router.replace(qs ? `/communities?${qs}` : "/communities", { scroll: false });
    },
    [router, searchParams]
  );

  const fetchPage = useCallback(
    async (pageCursor: string | null, mode: "replace" | "append") => {
      const id = ++requestIdRef.current;
      if (mode === "append") {
        if (!pageCursor || loadingRef.current || done) return;
        loadingRef.current = true;
        setLoadingMore(true);
      } else {
        loadingRef.current = true;
        setLoading(true);
        setDone(false);
        setLoadError("");
      }
      try {
        const params = new URLSearchParams();
        params.set("limit", "12");
        if (pageCursor) params.set("cursor", pageCursor);
        if (qFromUrl) params.set("q", qFromUrl);
        if (tab !== "ALL") params.set("category", tab);
        const res = await fetch(`/api/communities/feed?${params.toString()}`, {
          credentials: "include",
        });
        const json = (await res.json()) as FeedPage;
        if (id !== requestIdRef.current) return;
        if (!res.ok || !Array.isArray(json.items)) {
          setLoadError(json.error ?? "QnA를 불러오지 못했습니다.");
          if (mode === "replace") setItems([]);
          return;
        }
        const added = json.items;
        setLikedIds((prev) => (mode === "replace" ? new Set(json.likedIds ?? []) : mergeIds(prev, json.likedIds)));
        setStarredIds((prev) =>
          mode === "replace" ? new Set(json.starredIds ?? []) : mergeIds(prev, json.starredIds)
        );
        setRepostedIds((prev) =>
          mode === "replace" ? new Set(json.repostedIds ?? []) : mergeIds(prev, json.repostedIds)
        );
        setItems((prev) => {
          if (mode === "replace") return added;
          const seen = new Set(prev.filter((i) => i.type === "post").map((i) => i.data.id));
          return [...prev, ...added.filter((i) => i.type !== "post" || !seen.has(i.data.id))];
        });
        setCursor(json.nextCursor ?? null);
        setDone(!json.nextCursor);
      } catch {
        if (id !== requestIdRef.current) return;
        setLoadError("네트워크 오류가 발생했습니다.");
        if (mode === "replace") setItems([]);
      } finally {
        if (id === requestIdRef.current) {
          loadingRef.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [done, qFromUrl, tab]
  );

  useEffect(() => {
    void fetchPage(null, "replace");
  }, [qFromUrl, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    void fetchPage(cursor, "append");
  }, [cursor, fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done || loading) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "280px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, loadMore, loading]);

  const paymentsEnabled = paymentsEnabledClient();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <NativePageTitle>
          <h1 className="text-2xl font-bold tracking-tight">QnA</h1>
        </NativePageTitle>
        <Link href="/communities/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            QnA 만들기
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="QnA 검색"
          className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => setTab("ALL")}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            tab === "ALL"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          전체
        </button>
        {COMMUNITY_CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTab(opt.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              tab === opt.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="mr-1">{opt.emoji}</span>
            {opt.shortLabel}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-32 rounded-2xl bg-muted/40" />
          <div className="h-32 rounded-2xl bg-muted/40" />
        </div>
      ) : loadError && items.length === 0 ? (
        <div className="px-4 py-14 text-center space-y-3">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void fetchPage(null, "replace")}>
            다시 시도
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-14 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {qFromUrl
              ? `"${qFromUrl}"에 맞는 QnA가 없습니다.`
              : tab === "ALL"
                ? "아직 QnA가 없습니다. 첫 글을 남겨보세요!"
                : "이 카테고리에 QnA가 없습니다."}
          </p>
          <Link
            href="/communities/new"
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            QnA 만들기
          </Link>
        </div>
      ) : (
        <FeedVideoViewerProvider
          items={items}
          likedIds={likedIds}
          starredIds={starredIds}
          onNearEnd={loadMore}
          loadingMore={loadingMore}
        >
          <FeedDualColumnLayout
            items={items}
            likedIds={likedIds}
            starredIds={starredIds}
            repostedIds={repostedIds}
            paymentsEnabled={paymentsEnabled}
          />
          <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-8">
            {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {loadError && (
              <>
                <p className="text-sm text-destructive">{loadError}</p>
                <Button type="button" variant="secondary" size="sm" onClick={loadMore}>
                  다시 시도
                </Button>
              </>
            )}
            {done && items.length > 0 && !loadError && (
              <p className="text-sm text-muted-foreground">QnA 끝</p>
            )}
          </div>
        </FeedVideoViewerProvider>
      )}
    </div>
  );
}
