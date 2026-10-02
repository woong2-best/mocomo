"use client";

import type { AptCommunityFeed } from "@/lib/apt/presence-types";
import type { AptPresenceOccupant } from "@/lib/apt/presence-types";
import type { HomeActivityState } from "@/lib/apt/presence-types";
import type { HomeIdentitySummary } from "@/lib/apt/home-identity";

export type { HomeActivityState, AptPresenceOccupant };

/** 창문 너머로 보이는 생활 유형 — 실제 집 상태에서 파생 */
export type WindowLifeKind = "tv" | "dark" | "music" | "stream" | "guest" | "warm";

export type SocialRankEntry = {
  userId: string;
  displayName: string;
  homeFloor: number;
  score: number;
  identity?: HomeIdentitySummary;
};

export type SocialVisitorEntry = {
  userId: string;
  displayName: string;
  agoLabel: string;
};

export type PlazaPerformerEntry = {
  userId: string;
  displayName: string;
  homeFloor: number;
  kind: "stream" | "music";
};

export type AptSocialSnapshot = {
  onlineCount: number;
  onlineFloors: number[];
  windowLifeByFloor: Map<number, WindowLifeKind>;
  streamingFloors: number[];
  popularHome: SocialRankEntry | null;
  visitorRanking: SocialRankEntry[];
  recentVisitors: SocialVisitorEntry[];
  guestbookNames: string[];
  todayEvent: string;
  elevatorBusy: boolean;
  plazaEvent: { title: string; subtitle: string; kind: "music" | "exhibit" | "notice" };
  plazaPerformers: PlazaPerformerEntry[];
  mostActiveFloor: { floor: number; onlineCount: number } | null;
  hasHomeDelivery: boolean;
  mailboxUnread: number;
  occupants: AptPresenceOccupant[];
  todayHome: SocialRankEntry | null;
  residentOfDay: { userId: string; displayName: string; homeFloor: number; label: string } | null;
  weeklyBestRoom: SocialRankEntry | null;
  scheduledEvent: { title: string; subtitle: string; kind: string; timeLabel: string };
};

export function windowLifeFromActivity(activity: HomeActivityState): WindowLifeKind {
  if (!activity.doorOpen && !activity.lightsOn) return "dark";
  if (activity.streaming) return "stream";
  if (activity.hasGuest) return "guest";
  if (activity.musicPlaying) return "music";
  if (activity.tvOn) return "tv";
  if (activity.lightsOn) return "warm";
  return "dark";
}

function buildTodayEvent(feed: AptCommunityFeed): string {
  if (feed.daily.todayHome) {
    return `오늘의 집: ${feed.daily.todayHome.displayName} · ${feed.daily.todayHome.homeFloor}층 (${feed.daily.todayHome.reason})`;
  }
  if (feed.mostVisitedToday) {
    return `오늘 가장 많이 방문: ${feed.mostVisitedToday.displayName} (${feed.mostVisitedToday.score}회)`;
  }
  if (feed.daily.residentOfDay) {
    return feed.daily.residentOfDay.label;
  }
  if (feed.mostActiveFloor && feed.mostActiveFloor.onlineCount > 1) {
    return `오늘 가장 활발한 층: ${feed.mostActiveFloor.floor}층 (${feed.mostActiveFloor.onlineCount}명 접속)`;
  }
  return "이웃 집을 방문해 보세요";
}

function buildPlazaEvent(feed: AptCommunityFeed): AptSocialSnapshot["plazaEvent"] {
  const ev = feed.daily.scheduledEvent;
  const kindMap: Record<string, AptSocialSnapshot["plazaEvent"]["kind"]> = {
    busking: "music",
    live: "music",
    exhibit: "exhibit",
    cosplay: "exhibit",
  };
  return {
    title: ev.title,
    subtitle: `${ev.subtitle} · ${ev.timeLabel}`,
    kind: kindMap[ev.kind] ?? "notice",
  };
}

/** 실제 커뮤니티 피드 → 3D/HUD 스냅샷 (NPC·해시 없음) */
export function buildSocialSnapshot(
  feed: AptCommunityFeed,
  homeFloor: number,
  ownUserId?: string | null
): AptSocialSnapshot {
  const online = feed.occupants.filter((o) => o.isOnline);
  const windowLifeByFloor = new Map<number, WindowLifeKind>();
  const streamingFloors: number[] = [];

  for (const o of feed.occupants) {
    const kind = windowLifeFromActivity(o.activity);
    windowLifeByFloor.set(o.homeFloor, kind);
    if (o.activity.streaming) streamingFloors.push(o.homeFloor);
  }

  const recentVisitors =
    ownUserId && feed.recentVisitorsToHome.length
      ? feed.recentVisitorsToHome
      : feed.occupants
          .filter((o) => o.userId !== ownUserId && o.visitCountToday > 0)
          .sort((a, b) => b.visitCountToday - a.visitCountToday)
          .slice(0, 4)
          .map((o) => ({
            userId: o.userId,
            displayName: o.displayName,
            agoLabel: "오늘",
          }));

  return {
    onlineCount: online.length,
    onlineFloors: online.map((o) => o.homeFloor),
    windowLifeByFloor,
    streamingFloors,
    popularHome: feed.popularHome,
    visitorRanking: feed.visitorRanking,
    recentVisitors,
    guestbookNames: feed.guestbookNames.length ? feed.guestbookNames : recentVisitors.map((v) => v.displayName),
    todayEvent: buildTodayEvent(feed),
    elevatorBusy: feed.elevatorBusy,
    plazaEvent: buildPlazaEvent(feed),
    plazaPerformers: feed.plazaPerformers.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      homeFloor: p.homeFloor,
      kind: p.kind,
    })),
    mostActiveFloor: feed.mostActiveFloor,
    hasHomeDelivery: false,
    mailboxUnread: ownUserId ? feed.mailboxUnread : 0,
    occupants: feed.occupants,
    todayHome: feed.daily.todayHome
      ? {
          userId: feed.daily.todayHome.userId,
          displayName: feed.daily.todayHome.displayName,
          homeFloor: feed.daily.todayHome.homeFloor,
          score: feed.daily.todayHome.score,
          identity: feed.daily.todayHome.identity,
        }
      : null,
    residentOfDay: feed.daily.residentOfDay
      ? {
          userId: feed.daily.residentOfDay.userId,
          displayName: feed.daily.residentOfDay.displayName,
          homeFloor: feed.daily.residentOfDay.homeFloor,
          label: feed.daily.residentOfDay.label,
        }
      : null,
    weeklyBestRoom: feed.daily.weeklyBestRoom
      ? {
          userId: feed.daily.weeklyBestRoom.userId,
          displayName: feed.daily.weeklyBestRoom.displayName,
          homeFloor: feed.daily.weeklyBestRoom.homeFloor,
          score: feed.daily.weeklyBestRoom.score,
          identity: feed.daily.weeklyBestRoom.identity,
        }
      : null,
    scheduledEvent: feed.daily.scheduledEvent,
  };
}

export function occupantForFloor(occupants: AptPresenceOccupant[], floor: number) {
  return occupants.find((o) => o.homeFloor === floor);
}
