import type { HomeIdentitySummary } from "@/lib/apt/home-identity";
import type { AptCommunityRankEntry, AptPresenceOccupant, AptPlazaPerformer } from "@/lib/apt/presence-types";

export type AptDailyHomePick = {
  userId: string;
  displayName: string;
  homeFloor: number;
  score: number;
  visitScore: number;
  likeScore: number;
  activityScore: number;
  reason: string;
  identity?: HomeIdentitySummary;
};

export type AptResidentOfDay = {
  userId: string;
  displayName: string;
  homeFloor: number;
  reason: "most_visited" | "most_active" | "most_streaming" | "most_liked";
  label: string;
  score: number;
};

export type AptPlazaEventKind = "busking" | "exhibit" | "cosplay" | "live";

export type AptScheduledPlazaEvent = {
  title: string;
  subtitle: string;
  kind: AptPlazaEventKind;
  timeLabel: string;
};

export type AptWeeklyBestRoom = {
  userId: string;
  displayName: string;
  homeFloor: number;
  score: number;
  visitCount: number;
  likeCount: number;
  identity?: HomeIdentitySummary;
};

export type AptVisitBadge = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

export type AptNeighborLink = {
  userId: string;
  displayName: string;
  homeFloor: number;
  username: string;
  relation: "follow" | "favorite" | "frequent";
  visitCount?: number;
  doorOpen?: boolean;
};

export type AptDailyLoop = {
  dateKey: string;
  todayHome: AptDailyHomePick | null;
  residentOfDay: AptResidentOfDay | null;
  scheduledEvent: AptScheduledPlazaEvent;
  weeklyBestRoom: AptWeeklyBestRoom | null;
  visitRanking: AptCommunityRankEntry[];
  myVisitBadges: AptVisitBadge[];
  myVisitsMade: number;
  myHomesVisited: number;
  myHostVisits: number;
  favoriteHomes: AptNeighborLink[];
  followedNeighbors: AptNeighborLink[];
  frequentHomes: AptNeighborLink[];
  likedHostIds: string[];
  favoritedHostIds: string[];
};

const VISIT_BADGES: { id: string; threshold: number; label: string; emoji: string; description: string }[] = [
  { id: "first_visit", threshold: 1, label: "첫 발걸음", emoji: "👣", description: "이웃 집 첫 방문" },
  { id: "explorer", threshold: 5, label: "APT 탐험가", emoji: "🗺️", description: "5곳 이상 방문" },
  { id: "regular", threshold: 15, label: "단골 손님", emoji: "☕", description: "15회 이상 방문" },
  { id: "socialite", threshold: 30, label: "아파트 인싸", emoji: "✨", description: "30회 이상 방문" },
];

const HOST_BADGES: { id: string; threshold: number; label: string; emoji: string; description: string }[] = [
  { id: "welcoming", threshold: 3, label: "환영하는 집", emoji: "🏠", description: "손님 3명 이상" },
  { id: "popular_home", threshold: 10, label: "인기 입주민", emoji: "⭐", description: "손님 10명 이상" },
  { id: "hot_spot", threshold: 25, label: "핫플레이스", emoji: "🔥", description: "손님 25명 이상" },
];

const WEEKDAY_EVENTS: AptScheduledPlazaEvent[] = [
  { title: "월요일 · 인테리어展", subtitle: "주간 베스트 룸 구경", kind: "exhibit", timeLabel: "매일" },
  { title: "화요일 · 버스킹 데이", subtitle: "광장 악기 연주", kind: "busking", timeLabel: "저녁" },
  { title: "수요일 · 코스프레 쇼케이스", subtitle: "입주민 코스프레", kind: "cosplay", timeLabel: "오후" },
  { title: "목요일 · 오픈 하우스", subtitle: "오늘의 집 투어", kind: "exhibit", timeLabel: "종일" },
  { title: "금요일 · 라이브 나이트", subtitle: "APT 라이브 방송", kind: "live", timeLabel: "저녁 8시" },
  { title: "토요일 · 광장 페스티벌", subtitle: "버스킹 + 전시", kind: "busking", timeLabel: "주말" },
  { title: "일요일 · 이웃 만남의 날", subtitle: "집 방문 이벤트", kind: "exhibit", timeLabel: "종일" },
];

function dateKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function computeVisitBadges(visitsMade: number, hostVisits: number): AptVisitBadge[] {
  const badges: AptVisitBadge[] = [];
  for (const b of VISIT_BADGES) {
    if (visitsMade >= b.threshold) badges.push(b);
  }
  for (const b of HOST_BADGES) {
    if (hostVisits >= b.threshold) badges.push(b);
  }
  return badges;
}

export function computeTodayHome(
  occupants: AptPresenceOccupant[],
  likesToday: Map<string, number>
): AptDailyHomePick | null {
  const byUser = new Map(occupants.map((o) => [o.userId, o]));
  const ranked = occupants
    .map((o) => {
      const visitScore = o.visitorCountToday * 3;
      const likeScore = (likesToday.get(o.userId) ?? 0) * 5;
      const activityScore =
        o.visitCountToday * 2 + (o.isOnline ? 2 : 0) + (o.activity.streaming ? 4 : 0);
      const score = visitScore + likeScore + activityScore;
      return {
        userId: o.userId,
        displayName: o.displayName,
        homeFloor: o.homeFloor,
        score,
        visitScore,
        likeScore,
        activityScore,
        identity: o.identity,
        reason:
          visitScore >= likeScore && visitScore >= activityScore
            ? `오늘 ${o.visitorCountToday}명 방문`
            : likeScore >= activityScore
              ? `좋아요 ${likesToday.get(o.userId) ?? 0}`
              : "활발한 활동",
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0] ?? null;
}

export function computeResidentOfDay(
  occupants: AptPresenceOccupant[],
  likesToday: Map<string, number>,
  now = new Date()
): AptResidentOfDay | null {
  const day = now.getDay();
  const modes: AptResidentOfDay["reason"][] = [
    "most_visited",
    "most_active",
    "most_streaming",
    "most_liked",
  ];
  const mode = modes[day % modes.length];

  let pick: AptResidentOfDay | null = null;

  if (mode === "most_visited") {
    const o = [...occupants].sort((a, b) => b.visitorCountToday - a.visitorCountToday)[0];
    if (o && o.visitorCountToday > 0) {
      pick = {
        userId: o.userId,
        displayName: o.displayName,
        homeFloor: o.homeFloor,
        reason: mode,
        label: "오늘 가장 많이 방문받은 입주민",
        score: o.visitorCountToday,
      };
    }
  } else if (mode === "most_active") {
    const o = [...occupants].sort(
      (a, b) => b.visitCountToday + (b.isOnline ? 1 : 0) - (a.visitCountToday + (a.isOnline ? 1 : 0))
    )[0];
    if (o && (o.visitCountToday > 0 || o.isOnline)) {
      pick = {
        userId: o.userId,
        displayName: o.displayName,
        homeFloor: o.homeFloor,
        reason: mode,
        label: "오늘 가장 활발한 입주민",
        score: o.visitCountToday + (o.isOnline ? 1 : 0),
      };
    }
  } else if (mode === "most_streaming") {
    const o = occupants.find((x) => x.activity.streaming);
    if (o) {
      pick = {
        userId: o.userId,
        displayName: o.displayName,
        homeFloor: o.homeFloor,
        reason: mode,
        label: "지금 방송 중인 입주민",
        score: 1,
      };
    }
  } else {
    const ranked = occupants
      .map((o) => ({ o, likes: likesToday.get(o.userId) ?? 0 }))
      .filter((x) => x.likes > 0)
      .sort((a, b) => b.likes - a.likes);
    if (ranked[0]) {
      pick = {
        userId: ranked[0].o.userId,
        displayName: ranked[0].o.displayName,
        homeFloor: ranked[0].o.homeFloor,
        reason: mode,
        label: "오늘 가장 많은 좋아요",
        score: ranked[0].likes,
      };
    }
  }

  if (pick) return pick;

  const fallback = computeTodayHome(occupants, likesToday);
  if (!fallback) return null;
  return {
    userId: fallback.userId,
    displayName: fallback.displayName,
    homeFloor: fallback.homeFloor,
    reason: "most_visited",
    label: "오늘의 입주민",
    score: fallback.score,
  };
}

export function computeWeeklyBestRoom(
  occupants: AptPresenceOccupant[],
  visitsWeek: Map<string, number>,
  likesWeek: Map<string, number>
): AptWeeklyBestRoom | null {
  const ranked = occupants
    .map((o) => {
      const visitCount = visitsWeek.get(o.userId) ?? 0;
      const likeCount = likesWeek.get(o.userId) ?? 0;
      return {
        userId: o.userId,
        displayName: o.displayName,
        homeFloor: o.homeFloor,
        visitCount,
        likeCount,
        score: visitCount * 3 + likeCount * 5,
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]
    ? {
        ...ranked[0],
        identity: occupants.find((o) => o.userId === ranked[0]!.userId)?.identity,
      }
    : null;
}

export function getScheduledPlazaEvent(
  performers: AptPlazaPerformer[],
  todayHome: AptDailyHomePick | null,
  now = new Date()
): AptScheduledPlazaEvent {
  const live = performers.find((p) => p.kind === "stream");
  if (live) {
    return {
      title: `${live.displayName} LIVE`,
      subtitle: `${live.homeFloor}층 · 광장`,
      kind: "live",
      timeLabel: "지금",
    };
  }
  const busking = performers.find((p) => p.kind === "music");
  if (busking) {
    return {
      title: `${busking.displayName} 버스킹`,
      subtitle: "광장 · 악기 연주",
      kind: "busking",
      timeLabel: "지금",
    };
  }
  if (todayHome) {
    return {
      title: "오늘의 집 투어",
      subtitle: `${todayHome.displayName} · ${todayHome.homeFloor}층`,
      kind: "exhibit",
      timeLabel: "종일",
    };
  }
  return WEEKDAY_EVENTS[now.getDay()] ?? WEEKDAY_EVENTS[0];
}

export type DailyLoopInput = {
  occupants: AptPresenceOccupant[];
  likesToday: Map<string, number>;
  likesWeek: Map<string, number>;
  visitsWeek: Map<string, number>;
  visitorRanking: AptCommunityRankEntry[];
  plazaPerformers: AptPlazaPerformer[];
  myVisitsMade: number;
  myHomesVisited: number;
  myHostVisits: number;
  favoriteHomes: AptNeighborLink[];
  followedNeighbors: AptNeighborLink[];
  frequentHomes: AptNeighborLink[];
  likedHostIds: string[];
  favoritedHostIds: string[];
  now?: Date;
};

export function buildAptDailyLoop(input: DailyLoopInput): AptDailyLoop {
  const now = input.now ?? new Date();
  const todayHome = computeTodayHome(input.occupants, input.likesToday);
  const residentOfDay = computeResidentOfDay(input.occupants, input.likesToday, now);
  const weeklyBestRoom = computeWeeklyBestRoom(input.occupants, input.visitsWeek, input.likesWeek);
  const scheduledEvent = getScheduledPlazaEvent(input.plazaPerformers, todayHome, now);

  return {
    dateKey: dateKey(now),
    todayHome,
    residentOfDay,
    scheduledEvent,
    weeklyBestRoom,
    visitRanking: input.visitorRanking,
    myVisitBadges: computeVisitBadges(input.myVisitsMade, input.myHostVisits),
    myVisitsMade: input.myVisitsMade,
    myHomesVisited: input.myHomesVisited,
    myHostVisits: input.myHostVisits,
    favoriteHomes: input.favoriteHomes,
    followedNeighbors: input.followedNeighbors,
    frequentHomes: input.frequentHomes,
    likedHostIds: input.likedHostIds,
    favoritedHostIds: input.favoritedHostIds,
  };
}

export { startOfWeek, dateKey };

export function emptyAptDailyLoop(): AptDailyLoop {
  return buildAptDailyLoop({
    occupants: [],
    likesToday: new Map(),
    likesWeek: new Map(),
    visitsWeek: new Map(),
    visitorRanking: [],
    plazaPerformers: [],
    myVisitsMade: 0,
    myHomesVisited: 0,
    myHostVisits: 0,
    favoriteHomes: [],
    followedNeighbors: [],
    frequentHomes: [],
    likedHostIds: [],
    favoritedHostIds: [],
  });
}
