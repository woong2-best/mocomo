"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { ProfileGridMediaItem } from "@/actions/profile-page";
import { ProfileMediaGrid } from "@/components/profile/profile-media-grid";
import { ProfileTimeline, type TimelineItem } from "@/components/profile/profile-timeline";
import { useProfileTab } from "@/components/profile/profile-tab-context";
import type { ProfileMediaKind, ProfileSort, ProfileTab } from "@/lib/profile-queries";
import { Button } from "@/components/ui/button";

type WikiData = {
  created: { slug: string; title: string; updatedAt: string }[];
  edited: { id: string; createdAt: string; anime: { slug: string; title: string } }[];
};

export type ProfileTabContentMeta = {
  isSelf: boolean;
  paymentsEnabled: boolean;
  subscriptionPriceKrw: number;
  authorId: string;
  subscribed: boolean;
  profileBlocked: boolean;
  blockedEmptyMessage: string;
};

type TabPayload =
  | { kind: "timeline"; items: TimelineItem[]; nextCursor: string | null }
  | { kind: "media"; items: ProfileGridMediaItem[]; nextCursor: string | null }
  | { kind: "wiki"; data: WikiData };

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

function ProfileTabLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      불러오는 중…
    </div>
  );
}

export function ProfileTabContent({
  username,
  meta,
}: {
  username: string;
  meta: ProfileTabContentMeta;
}) {
  const { tab, sort, kind } = useProfileTab();
  const effectiveTab: ProfileTab = tab === "likes" && !meta.isSelf ? "posts" : tab;
  const cache = useRef(new Map<string, TabPayload>());
  const [payload, setPayload] = useState<TabPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const activeKey = queryKey(effectiveTab, sort, kind);

  useEffect(() => {
    const cached = cache.current.get(activeKey);
    if (cached) {
      setPayload(cached);
      setLoadError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setPayload(null);

    const params = new URLSearchParams();
    if (effectiveTab !== "posts") params.set("tab", effectiveTab);
    if (sort === "popular") params.set("sort", "popular");
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
          };
        }
        cache.current.set(activeKey, next);
        setPayload(next);
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
  }, [activeKey, effectiveTab, sort, kind, username, retryCount]);

  const emptyMessage = meta.profileBlocked ? meta.blockedEmptyMessage : emptyMessages[effectiveTab];

  if (loading && !payload) {
    return <ProfileTabLoading />;
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setRetryCount((n) => n + 1)}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!payload) return <ProfileTabLoading />;

  if (payload.kind === "wiki") {
    return <ProfileWikiList data={payload.data} emptyMessage={emptyMessage} />;
  }

  if (payload.kind === "media") {
    return (
      <ProfileMediaGrid
        username={username}
        sort={sort}
        mediaKind={kind}
        initialItems={payload.items}
        initialCursor={payload.nextCursor}
        emptyMessage={emptyMessage}
      />
    );
  }

  return (
    <ProfileTimeline
      username={username}
      tab={effectiveTab}
      sort={sort}
      mediaKind={null}
      initialItems={payload.items}
      initialCursor={payload.nextCursor}
      emptyMessage={emptyMessage}
      isSelf={meta.isSelf}
      paymentsEnabled={meta.paymentsEnabled}
      authorId={meta.authorId}
      subscriptionPriceKrw={meta.subscriptionPriceKrw}
      subscribed={meta.subscribed}
    />
  );
}
