"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProfileGridMediaItem, ProfileTabContentMeta, ProfileTabInitialPayload } from "@/actions/profile-page";
import { ProfileMediaGrid } from "@/components/profile/profile-media-grid";
import { ProfileTimeline, type TimelineItem } from "@/components/profile/profile-timeline";
import { useProfileTab } from "@/components/profile/profile-tab-context";
import type { ProfileMediaKind, ProfileSort, ProfileTab } from "@/lib/profile-queries";
import { Button } from "@/components/ui/button";
import { ProfileTimelineSkeleton } from "@/components/ui/content-skeletons";

export type { ProfileTabContentMeta } from "@/actions/profile-page";

type WikiData = {
  created: { slug: string; title: string; updatedAt: string }[];
  edited: { id: string; createdAt: string; anime: { slug: string; title: string } }[];
};

type TabPayload =
  | {
      kind: "timeline";
      items: TimelineItem[];
      nextCursor: string | null;
      likedIds?: string[];
      starredIds?: string[];
      repostedIds?: string[];
    }
  | { kind: "media"; items: ProfileGridMediaItem[]; nextCursor: string | null }
  | { kind: "wiki"; data: WikiData };

function initialPayloadToTabPayload(initial: ProfileTabInitialPayload): TabPayload {
  if (initial.kind === "wiki") {
    return { kind: "wiki", data: initial.data };
  }
  if (initial.kind === "media") {
    return { kind: "media", items: initial.items, nextCursor: initial.nextCursor };
  }
  return {
    kind: "timeline",
    items: initial.items as TimelineItem[],
    nextCursor: initial.nextCursor,
    likedIds: initial.likedIds,
    starredIds: initial.starredIds,
    repostedIds: initial.repostedIds,
  };
}

const emptyMessages: Record<ProfileTab, string> = {
  posts: "아직 게시물이 없습니다.",
  replies: "아직 남긴 답글이 없습니다.",
  media: "아직 올린 사진·영상이 없습니다.",
  likes: "좋아요한 게시물이 없습니다.",
  wiki: "위키 기여가 없습니다.",
};

function queryKey(tab: ProfileTab, sort: ProfileSort, kind: ProfileMediaKind) {
  return `${tab}:${sort}:${kind}`;
}

function parseQueryKey(key: string): { tab: ProfileTab; sort: ProfileSort; kind: ProfileMediaKind } {
  const [tab, sort, kind] = key.split(":") as [ProfileTab, ProfileSort, ProfileMediaKind];
  return { tab, sort, kind };
}

function ProfileWikiList({ data, emptyMessage }: { data: WikiData; emptyMessage: string }) {
  if (data.created.length === 0 && data.edited.length === 0) {
    return <p className="p-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-border/60">
      {data.created.length > 0 && (
        <section className="space-y-2 p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">작성한 문서</h2>
          <ul className="space-y-2">
            {data.created.map((a) => (
              <li key={a.slug}>
                <Link href={`/anime/${a.slug}`} className="text-sm font-medium hover:underline">
                  {a.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  최근 수정 {new Date(a.updatedAt).toLocaleDateString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.edited.length > 0 && (
        <section className="space-y-2 p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">편집 참여</h2>
          <ul className="space-y-2">
            {data.edited.map((r) => (
              <li key={r.id}>
                <Link href={`/anime/${r.anime.slug}`} className="text-sm font-medium hover:underline">
                  {r.anime.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function ProfileTabContent({
  username,
  meta,
  initialPayload,
}: {
  username: string;
  meta: ProfileTabContentMeta;
  initialPayload?: ProfileTabInitialPayload | null;
}) {
  const { tab, sort, kind } = useProfileTab();
  const effectiveTab: ProfileTab = tab === "likes" && !meta.isSelf ? "posts" : tab;
  const activeKey = queryKey(effectiveTab, sort, kind);
  const cache = useRef(new Map<string, TabPayload>());
  const hasInitialPayload = initialPayload?.key === activeKey;
  const [display, setDisplay] = useState<{ key: string; payload: TabPayload } | null>(() => {
    if (hasInitialPayload && initialPayload) {
      const payload = initialPayloadToTabPayload(initialPayload);
      cache.current.set(initialPayload.key, payload);
      return { key: initialPayload.key, payload };
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !hasInitialPayload);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (initialPayload?.key === activeKey) {
      const payload = initialPayloadToTabPayload(initialPayload);
      cache.current.set(activeKey, payload);
      setDisplay({ key: activeKey, payload });
      setLoadError("");
      setLoading(false);
      return;
    }

    const cached = cache.current.get(activeKey);
    if (cached) {
      setDisplay({ key: activeKey, payload: cached });
      setLoadError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    const params = new URLSearchParams();
    if (effectiveTab !== "posts") params.set("tab", effectiveTab);
    if (sort !== "new") params.set("sort", sort);
    if (effectiveTab === "media" && kind !== "all") params.set("kind", kind);

    const url =
      effectiveTab === "wiki"
        ? `/api/profile/${username}/wiki`
        : effectiveTab === "media"
          ? `/api/profile/${username}/media?${params.toString()}`
          : `/api/profile/${username}/timeline?${params.toString()}`;

    fetch(url)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "불러오기에 실패했습니다.");
        if (cancelled) return;

        let next: TabPayload;
        if (effectiveTab === "wiki") {
          next = { kind: "wiki", data: json as WikiData };
        } else if (effectiveTab === "media") {
          next = {
            kind: "media",
            items: json.items as ProfileGridMediaItem[],
            nextCursor: json.nextCursor ?? null,
          };
        } else {
          next = {
            kind: "timeline",
            items: json.items as TimelineItem[],
            nextCursor: json.nextCursor ?? null,
            likedIds: json.likedIds as string[] | undefined,
            starredIds: json.starredIds as string[] | undefined,
            repostedIds: json.repostedIds as string[] | undefined,
          };
        }
        cache.current.set(activeKey, next);
        setDisplay({ key: activeKey, payload: next });
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || "불러오기에 실패했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeKey, effectiveTab, sort, kind, username, retryCount, initialPayload]);

  const isStale = Boolean(display && display.key !== activeKey);

  if (loading && !display) {
    return <ProfileTimelineSkeleton />;
  }

  if (loadError && !display) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setRetryCount((n) => n + 1)}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!display) return <ProfileTimelineSkeleton />;

  const { payload } = display;
  const shown = parseQueryKey(display.key);
  const emptyMessage = meta.profileBlocked
    ? meta.blockedEmptyMessage
    : emptyMessages[shown.tab];

  return (
    <div className="relative">
      {loadError && isStale ? (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2 text-xs text-destructive">
          <span>{loadError}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setRetryCount((n) => n + 1)}>
            다시 시도
          </Button>
        </div>
      ) : null}
      <div className={loading && isStale ? "opacity-60 transition-opacity" : undefined}>
        {payload.kind === "wiki" ? (
          <ProfileWikiList data={payload.data} emptyMessage={emptyMessage} />
        ) : payload.kind === "media" ? (
          <ProfileMediaGrid
            key={display.key}
            username={username}
            sort={shown.sort}
            mediaKind={shown.kind}
            initialItems={payload.items}
            initialCursor={payload.nextCursor}
            emptyMessage={emptyMessage}
            paymentsEnabled={meta.paymentsEnabled}
          />
        ) : (
          <ProfileTimeline
            key={display.key}
            username={username}
            tab={shown.tab}
            sort={shown.sort}
            mediaKind={null}
            initialItems={payload.items}
            initialCursor={payload.nextCursor}
            emptyMessage={emptyMessage}
            isSelf={meta.isSelf}
            paymentsEnabled={meta.paymentsEnabled}
            authorId={meta.authorId}
            subscriptionPriceKrw={meta.subscriptionPriceKrw}
            subscribed={meta.subscribed}
            initialLikedIds={payload.likedIds}
            initialStarredIds={payload.starredIds}
            initialRepostedIds={payload.repostedIds}
          />
        )}
      </div>
    </div>
  );
}
