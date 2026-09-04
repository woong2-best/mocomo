"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import {
  COMMUNITY_CATEGORY_OPTIONS,
  communityCategoryMeta,
  resolveCommunityCategoryDisplay,
} from "@/lib/community-labels";
import type { CommunityCategory } from "@prisma/client";
import { cn } from "@/lib/utils";

export type CommunityHubItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  iconUrl: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  category: CommunityCategory;
  customCategoryLabel: string | null;
  isNsfw: boolean;
};

type TabId = "ALL" | CommunityCategory;

function CommunityThumb({
  community,
  className,
}: {
  community: CommunityHubItem;
  className?: string;
}) {
  const meta = resolveCommunityCategoryDisplay(community.category, community.customCategoryLabel);
  const initial = community.name.slice(0, 1);

  if (community.iconUrl || community.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={community.iconUrl || community.coverUrl || ""}
        alt=""
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-[#3d4450] text-white font-bold",
        className
      )}
    >
      <span className="text-[11px] leading-none opacity-90">{meta?.emoji ?? initial}</span>
    </div>
  );
}

function FeaturedCommunityCards({ communities }: { communities: CommunityHubItem[] }) {
  if (communities.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/60">
      {communities.map((c) => {
        const meta = resolveCommunityCategoryDisplay(c.category, c.customCategoryLabel);
        return (
          <Link
            key={c.id}
            href={`/c/${c.slug}`}
            className="group relative aspect-[4/3] overflow-hidden bg-[#2b3038]"
          >
            {c.coverUrl || c.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.coverUrl || c.iconUrl || ""}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#3a4558] to-[#2a3140] px-2">
                <span className="text-2xl">{meta?.emoji ?? "🏠"}</span>
                <span className="text-[11px] text-white/80 line-clamp-2 text-center font-medium">
                  {c.name}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2 pb-1.5 pt-8">
              <p className="text-[11px] sm:text-xs font-medium text-white line-clamp-2 leading-snug">
                {c.name}
              </p>
              <p className="text-[10px] text-white/70 mt-0.5">
                {`${meta.emoji} ${meta.shortLabel}`}
                {" · "}
                {c.memberCount}명
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CommunityRow({ community }: { community: CommunityHubItem }) {
  const meta = resolveCommunityCategoryDisplay(community.category, community.customCategoryLabel);

  return (
    <Link
      href={`/c/${community.slug}`}
      className="group flex items-center gap-2.5 border-b border-[#e6e6e6] px-2.5 py-2 hover:bg-[#f7f7f7] transition-colors last:border-b-0 dark:border-border/50 dark:hover:bg-muted/40"
    >
      <div className="relative h-12 w-12 sm:h-[52px] sm:w-[52px] shrink-0 overflow-hidden bg-[#eee] dark:bg-muted">
        <CommunityThumb community={community} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm text-foreground font-medium truncate group-hover:underline underline-offset-2 decoration-foreground/25">
            {community.name}
          </span>
          {community.isNsfw && (
            <span className="shrink-0 text-[10px] font-bold text-[#c80000]">NSFW</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {community.description?.trim() || "소개가 아직 없습니다."}
        </p>
      </div>

      <span className="hidden sm:inline shrink-0 w-[4.5rem] text-right text-xs text-muted-foreground truncate">
        {meta.shortLabel}
      </span>

      <span className="shrink-0 w-14 flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums">
        <Users className="h-3 w-3" />
        {community.memberCount}
      </span>
    </Link>
  );
}

export function CommunitiesHubClient({
  communities,
  loadError = null,
}: {
  communities: CommunityHubItem[];
  loadError?: string | null;
}) {
  const [tab, setTab] = useState<TabId>("ALL");

  const filtered = useMemo(() => {
    if (tab === "ALL") return communities;
    return communities.filter((c) => c.category === tab);
  }, [communities, tab]);

  const featured = useMemo(() => filtered.slice(0, 4), [filtered]);
  const list = filtered;

  const counts = useMemo(() => {
    const map = new Map<TabId, number>();
    map.set("ALL", communities.length);
    for (const opt of COMMUNITY_CATEGORY_OPTIONS) {
      map.set(opt.id, communities.filter((c) => c.category === opt.id).length);
    }
    return map;
  }, [communities]);

  return (
    <section className="overflow-hidden rounded-sm border border-[#d5d5d5] bg-white shadow-sm dark:border-border dark:bg-card">
      {/* 카테고리 탭 */}
      <div className="border-b border-[#d5d5d5] bg-[#f3f3f3] dark:border-border dark:bg-muted/40">
        <div className="flex items-center gap-0.5 overflow-x-auto px-1.5 py-1.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => setTab("ALL")}
            className={cn(
              "shrink-0 px-2.5 py-1 text-xs font-semibold border transition-colors",
              tab === "ALL"
                ? "bg-white border-[#c80000] text-[#c80000] dark:bg-background"
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-background/50"
            )}
          >
            전체
            <span className="ml-1 tabular-nums opacity-70">{counts.get("ALL") ?? 0}</span>
          </button>
          {COMMUNITY_CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTab(opt.id)}
              className={cn(
                "shrink-0 px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap",
                tab === opt.id
                  ? "bg-white border-[#c80000] text-[#c80000] dark:bg-background"
                  : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-background/50"
              )}
            >
              <span className="mr-1">{opt.emoji}</span>
              {opt.shortLabel}
              <span className="ml-1 tabular-nums opacity-60">{counts.get(opt.id) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 border-b border-[#d5d5d5] bg-white px-3 py-2 dark:border-border dark:bg-card">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <span className="inline-block h-3.5 w-3.5 rounded-[2px] bg-[#c80000]" aria-hidden />
            {tab === "ALL" ? "커뮤니티" : communityCategoryTabTitle(tab)}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            관심 주제를 골라 커뮤니티에 들어가세요
          </p>
        </div>
        <Link
          href="/communities/new"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#c80000] hover:underline underline-offset-2"
        >
          <Plus className="h-3.5 w-3.5" />
          만들기
        </Link>
      </div>

      {loadError ? (
        <div className="px-4 py-14 text-center space-y-2">
          <p className="text-sm text-destructive">{loadError}</p>
          <p className="text-xs text-muted-foreground">페이지를 새로고침하면 다시 불러옵니다.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-14 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {tab === "ALL"
              ? "아직 커뮤니티가 없습니다. 첫 커뮤니티를 만들어보세요!"
              : "이 카테고리에 커뮤니티가 없습니다."}
          </p>
          <Link
            href="/communities/new"
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            커뮤니티 만들기
          </Link>
        </div>
      ) : (
        <div>
          <FeaturedCommunityCards communities={featured} />
          <div className="border-t border-[#d5d5d5] dark:border-border">
            {list.map((c) => (
              <CommunityRow key={c.id} community={c} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function communityCategoryTabTitle(id: CommunityCategory): string {
  const meta = communityCategoryMeta(id);
  return meta ? `${meta.emoji} ${meta.label}` : id;
}
