"use client";

import { Heart, Home, Sparkles, Star, Trophy, Users } from "lucide-react";
import type { AptCommunityFeed } from "@/lib/apt/presence-types";
import type { HomeIdentitySummary } from "@/lib/apt/home-identity";
import { toggleAptFavoriteHome, toggleAptHomeLike } from "@/actions/apt-daily";
import { requestAptCohabitation } from "@/actions/apt-cohabitation";
import { cn } from "@/lib/utils";
import { useState } from "react";

function HomeIdentityBrief({ identity }: { identity?: HomeIdentitySummary }) {
  if (!identity) return null;
  return (
    <div className="space-y-0.5 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
      <p className="text-[10px] font-bold text-amber-200/95">{identity.archetypeLabel}</p>
      {identity.tags.length > 0 && (
        <p className="text-[10px] text-white/55">{identity.tags.slice(0, 3).join(" ")}</p>
      )}
      {(identity.showcaseRoomLabel || identity.tagline) && (
        <p className="text-[10px] text-white/45 line-clamp-2">
          {identity.showcaseRoomLabel ? `대표 · ${identity.showcaseRoomLabel}` : identity.tagline}
          {identity.showcaseItemLabel ? ` · ${identity.showcaseItemLabel}` : ""}
        </p>
      )}
    </div>
  );
}

export function AptDailyLoopPanel({
  feed,
  loading = false,
  isLoggedIn,
  onVisitUser,
  onRefresh,
  onRequireLogin,
  className,
}: {
  feed: AptCommunityFeed | null;
  loading?: boolean;
  isLoggedIn: boolean;
  onVisitUser: (userId: string) => void;
  onRefresh?: () => void;
  onRequireLogin?: (action: string) => void;
  className?: string;
}) {
  const [pending, setPending] = useState<string | null>(null);

  if (loading || !feed) {
    return (
      <div
        className={cn(
          "pointer-events-auto flex w-[min(100%,17rem)] flex-col gap-2 rounded-2xl border border-white/15 bg-black/60 p-3 text-xs text-white/90 shadow-xl backdrop-blur-md",
          className
        )}
      >
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
          <span className="font-bold text-white">APT Daily</span>
        </div>
        <p className="text-[10px] text-white/50 py-4 text-center">이웃 소식 불러오는 중…</p>
      </div>
    );
  }

  const { daily } = feed;

  const handleLike = async (userId: string) => {
    if (!isLoggedIn) {
      onRequireLogin?.("좋아요");
      return;
    }
    setPending(`like-${userId}`);
    try {
      await toggleAptHomeLike(userId);
      onRefresh?.();
    } finally {
      setPending(null);
    }
  };

  const handleFavorite = async (userId: string) => {
    if (!isLoggedIn) {
      onRequireLogin?.("즐겨찾기");
      return;
    }
    setPending(`fav-${userId}`);
    try {
      await toggleAptFavoriteHome(userId);
      onRefresh?.();
    } finally {
      setPending(null);
    }
  };

  const handleCohabitation = async (userId: string) => {
    if (!isLoggedIn) {
      onRequireLogin?.("동거 신청");
      return;
    }
    setPending(`cohab-${userId}`);
    try {
      const result = await requestAptCohabitation(userId);
      if ("error" in result && result.error) {
        window.alert(result.error);
        return;
      }
      window.alert("동거 신청을 보냈습니다. 집주인이 알림창에서 수락할 수 있습니다.");
      onRefresh?.();
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex max-h-[min(70vh,520px)] w-[min(100%,17rem)] flex-col gap-2 overflow-y-auto rounded-2xl border border-white/15 bg-black/60 p-3 text-xs text-white/90 shadow-xl backdrop-blur-md",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Sparkles className="h-4 w-4 text-amber-300" />
        <span className="font-bold text-white">APT Daily</span>
        <span className="ml-auto text-[10px] text-white/45">{daily.dateKey}</span>
      </div>

      {daily.todayHome && (
        <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5 space-y-1.5">
          <p className="flex items-center gap-1 font-bold text-amber-100">
            <Home className="h-3.5 w-3.5" />
            오늘의 집
          </p>
          <p className="text-sm font-semibold text-white">
            {daily.todayHome.displayName}
            <span className="ml-1 text-[10px] font-normal text-white/60">{daily.todayHome.homeFloor}층</span>
          </p>
          <p className="text-[10px] text-white/55">{daily.todayHome.reason}</p>
          <HomeIdentityBrief identity={daily.todayHome.identity} />
          <p className="text-[10px] text-white/45 leading-snug">
            구경하기 → 층 이동 → 복도 → 입장 (잠시 기다리면 안내가 이어집니다)
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            <button
              type="button"
              onClick={() => onVisitUser(daily.todayHome!.userId)}
              className="rounded-lg bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-amber-500"
            >
              구경하기
            </button>
            {isLoggedIn && (
              <>
                <button
                  type="button"
                  disabled={pending === `like-${daily.todayHome.userId}`}
                  onClick={() => void handleLike(daily.todayHome!.userId)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[10px] font-semibold",
                    daily.likedHostIds.includes(daily.todayHome.userId)
                      ? "border-pink-400/50 bg-pink-500/20 text-pink-100"
                      : "border-white/20 text-white/80"
                  )}
                >
                  <Heart className="mr-0.5 inline h-3 w-3" />
                  좋아요
                </button>
                <button
                  type="button"
                  disabled={pending === `fav-${daily.todayHome.userId}`}
                  onClick={() => void handleFavorite(daily.todayHome!.userId)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[10px] font-semibold",
                    daily.favoritedHostIds.includes(daily.todayHome.userId)
                      ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
                      : "border-white/20 text-white/80"
                  )}
                >
                  <Star className="mr-0.5 inline h-3 w-3" />
                  즐겨찾기
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {daily.residentOfDay && daily.residentOfDay.userId !== daily.todayHome?.userId && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-2.5 space-y-1">
          <p className="flex items-center gap-1 font-bold text-violet-200">
            <Users className="h-3.5 w-3.5" />
            오늘의 입주민
          </p>
          <p className="font-semibold text-white">{daily.residentOfDay.displayName}</p>
          <p className="text-[10px] text-white/55">{daily.residentOfDay.label}</p>
          <button
            type="button"
            onClick={() => onVisitUser(daily.residentOfDay!.userId)}
            className="mt-1 rounded-lg border border-white/20 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/10"
          >
            {daily.residentOfDay.homeFloor}층 방문
          </button>
        </section>
      )}

      <section className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2.5 space-y-1">
        <p className="font-bold text-emerald-100">광장 · {daily.scheduledEvent.timeLabel}</p>
        <p className="text-sm font-semibold">{daily.scheduledEvent.title}</p>
        <p className="text-[10px] text-white/55">{daily.scheduledEvent.subtitle}</p>
      </section>

      {daily.weeklyBestRoom && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-2.5 space-y-1">
          <p className="flex items-center gap-1 font-bold text-sky-200">
            <Trophy className="h-3.5 w-3.5" />
            주간 베스트 룸
          </p>
          <p className="font-semibold">{daily.weeklyBestRoom.displayName} · {daily.weeklyBestRoom.homeFloor}층</p>
          <HomeIdentityBrief identity={daily.weeklyBestRoom.identity} />
          <p className="text-[10px] text-white/50">
            방문 {daily.weeklyBestRoom.visitCount} · 좋아요 {daily.weeklyBestRoom.likeCount}
          </p>
          <button
            type="button"
            onClick={() => onVisitUser(daily.weeklyBestRoom!.userId)}
            className="rounded-lg border border-white/15 px-2 py-0.5 text-[10px] hover:bg-white/10"
          >
            구경하기
          </button>
        </section>
      )}

      {isLoggedIn && daily.myVisitBadges.length > 0 && (
        <section className="space-y-1">
          <p className="font-bold text-white/80">내 방문 배지</p>
          <div className="flex flex-wrap gap-1">
            {daily.myVisitBadges.map((b) => (
              <span
                key={b.id}
                title={b.description}
                className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px]"
              >
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-white/45">
            방문 {daily.myVisitsMade}회 · {daily.myHomesVisited}집 구경
          </p>
        </section>
      )}

      {daily.visitRanking.length > 0 && (
        <section className="space-y-1">
          <p className="font-bold text-white/80">오늘 방문 랭킹</p>
          {daily.visitRanking.slice(0, 3).map((r, i) => (
            <button
              key={r.userId}
              type="button"
              onClick={() => onVisitUser(r.userId)}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-white/10"
            >
              <span className="w-4 text-[10px] text-white/40">{i + 1}</span>
              <span className="flex-1 truncate">{r.displayName}</span>
              <span className="text-[10px] text-white/50">{r.score}회</span>
            </button>
          ))}
        </section>
      )}

      {(daily.favoriteHomes.length > 0 || daily.frequentHomes.length > 0 || daily.followedNeighbors.length > 0) && (
        <section className="space-y-1 border-t border-white/10 pt-2">
          <p className="font-bold text-white/80">내 이웃</p>
          {[...daily.favoriteHomes, ...daily.frequentHomes.slice(0, 3), ...daily.followedNeighbors.slice(0, 2)]
            .filter((n, i, arr) => arr.findIndex((x) => x.userId === n.userId) === i)
            .slice(0, 5)
            .map((n) => (
              <div key={`${n.relation}-${n.userId}`} className="rounded-lg px-1 py-0.5 hover:bg-white/10">
                <button
                  type="button"
                  onClick={() => onVisitUser(n.userId)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="flex-1 truncate">{n.displayName}</span>
                  <span className="text-[10px] text-white/45">
                    {n.relation === "favorite" ? "★" : n.relation === "follow" ? "팔로우" : `${n.visitCount ?? 0}회`}
                  </span>
                </button>
                {n.doorOpen && (
                  <button
                    type="button"
                    disabled={pending === `cohab-${n.userId}`}
                    onClick={() => void handleCohabitation(n.userId)}
                    className="mt-1 rounded-md border border-emerald-300/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-100 disabled:opacity-50"
                  >
                    {pending === `cohab-${n.userId}` ? "신청 중..." : "동거 신청"}
                  </button>
                )}
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
