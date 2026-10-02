"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
import {
  QNA_FEED_CATEGORY_TABS,
  QNA_MY_CATEGORY_ID,
  QNA_NSFW_CATEGORY_ID,
  type QnaFeedTabId,
} from "@/lib/community-labels";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useQnaNsfwGate } from "@/hooks/use-qna-nsfw-gate";
import { QnaNsfwBlockedDialog } from "@/components/communities/qna-nsfw-blocked-dialog";
import { backfillOwnedEmptyQnaPosts } from "@/actions/community-hub";

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
  const categoryFromUrl = (searchParams.get("category")?.trim() || "ALL") as QnaFeedTabId;
  const tab: QnaFeedTabId = QNA_FEED_CATEGORY_TABS.some((opt) => opt.id === categoryFromUrl)
    ? categoryFromUrl
    : "ALL";

  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useQnaNsfwGate();
  const sessionState = useSession();
  const sessionUserId = sessionState?.data?.user?.id;

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
  const backfillRef = useRef(false);

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
    (next: QnaFeedTabId) => {
      void (async () => {
        if (next === QNA_MY_CATEGORY_ID && !sessionUserId) {
          router.push("/auth/signin?callbackUrl=/communities?category=MY");
          return;
        }
        const ok = await guardCategoryNav(next === "ALL" ? null : next);
        if (!ok) return;
        const sp = new URLSearchParams(searchParams.toString());
        if (next === "ALL") sp.delete("category");
        else sp.set("category", next);
        const qs = sp.toString();
        router.replace(qs ? `/communities?${qs}` : "/communities", { scroll: false });
      })();
    },
    [guardCategoryNav, router, searchParams, sessionUserId]
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
          setLoadError(errorText(json.error ?? t("communities.qna_5")));
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
        setLoadError(t("profile.s18n7wbo"));
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

  useEffect(() => {
    if (backfillRef.current || tab !== "ALL" || qFromUrl || !sessionUserId) return;
    if (loading || items.length === 0) return;
    backfillRef.current = true;
    const slugs = items.flatMap((item) =>
      item.type === "post" && item.data.community?.slug ? [item.data.community.slug] : []
    );
    void (async () => {
      const { created } = await backfillOwnedEmptyQnaPosts(slugs);
      if (created > 0) void fetchPage(null, "replace");
    })();
  }, [fetchPage, items, loading, qFromUrl, sessionUserId, tab]);

  useEffect(() => {
    if (tab !== QNA_NSFW_CATEGORY_ID) return;
    void (async () => {
      const ok = await guardCategoryNav(QNA_NSFW_CATEGORY_ID);
      if (ok) return;
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("category");
      const qs = sp.toString();
      router.replace(qs ? `/communities?${qs}` : "/communities", { scroll: false });
    })();
  }, [guardCategoryNav, router, searchParams, tab]);

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
            {t("communities.qna_3")}
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={t("communities.qna_6")}
          className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {QNA_FEED_CATEGORY_TABS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={checking}
            onClick={() => setTab(opt.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1",
              tab === opt.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
              opt.id === QNA_NSFW_CATEGORY_ID &&
                tab !== opt.id &&
                "border-[#c80000]/40 text-[#c80000]",
              checking && "opacity-70"
            )}
          >
            {opt.emoji ? <span aria-hidden>{opt.emoji}</span> : null}
            <span>{opt.shortLabel}</span>
          </button>
        ))}
      </div>

      <QnaNsfwBlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />

      {loading && items.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-32 rounded-2xl bg-muted/40" />
          <div className="h-32 rounded-2xl bg-muted/40" />
        </div>
      ) : loadError && items.length === 0 ? (
        <div className="px-4 py-14 text-center space-y-3">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void fetchPage(null, "replace")}>
            {t("toast.retry")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-14 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {qFromUrl
              ? t("communities.qna_7", { v0: qFromUrl })
              : tab === QNA_MY_CATEGORY_ID
                ? t("communities.qna_8")
                : tab === "ALL"
                  ? t("communities.qna_9")
                  : t("communities.qna_10")}
          </p>
          <Link
            href="/communities/new"
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("communities.qna_3")}
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
                  {t("toast.retry")}
                </Button>
              </>
            )}
            {done && items.length > 0 && !loadError && (
              <p className="text-sm text-muted-foreground">{t("communities.qna_4")}</p>
            )}
          </div>
        </FeedVideoViewerProvider>
      )}
    </div>
  );
}
