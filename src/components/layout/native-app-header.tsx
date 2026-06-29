"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { DEFAULT_LANDING_PATH, EXPLORE_PATH } from "@/lib/site-routes";
import { HeaderAuth } from "@/components/layout/header-auth";
import { cn } from "@/lib/utils";

const ROOT_PATHS = new Set([
  "/",
  DEFAULT_LANDING_PATH,
  EXPLORE_PATH,
  "/games",
  "/notifications",
  "/messages",
  "/used",
  "/discover",
  "/live",
  "/market",
]);

function titleForPath(pathname: string): string | null {
  if (pathname.startsWith("/u/")) return "프로필";
  if (pathname.startsWith("/post/")) return "게시물";
  if (pathname.startsWith("/settings")) {
    if (pathname === "/settings/profile") return "프로필 수정";
    if (pathname === "/settings/creator") return "크리에이터 수익";
    if (pathname === "/settings/streamer") return "스트리머";
    return "설정";
  }
  if (pathname.startsWith("/auth/")) return "계정";
  if (pathname === EXPLORE_PATH) return "탐색";
  if (pathname === DEFAULT_LANDING_PATH || pathname === "/feed") return "홈";
  if (pathname === "/games") return "GAME";
  if (pathname.startsWith("/games/")) {
    if (pathname === "/games/ranking") return "게임 랭킹";
    if (pathname === "/games/history") return "내 전적";
    if (pathname === "/games/achievements") return "업적";
    if (pathname === "/games/season") return "시즌";
    if (pathname === "/games/live") return "관전";
    return "GAME";
  }
  if (pathname === "/voice/new") return "방송 만들기";
  if (pathname.startsWith("/live/clips")) return "클립 업로드";
  if (pathname === "/live") return "라이브";
  if (pathname.startsWith("/live/")) return "라이브";
  if (pathname === "/market") return "마켓";
  if (pathname.startsWith("/market/")) return "마켓";
  if (pathname === "/cosplay/apply") return "코스어 등록";
  if (pathname.startsWith("/cosplay")) return "코스프레";
  if (pathname === "/messages/new") return "새 메시지";
  if (pathname === "/apt/house") return "주택";
  if (pathname === "/apt/cohabitation") return "동거 관리";
  if (pathname === "/notifications") return "알림";
  if (pathname === "/messages") return "쪽지";
  if (pathname === "/used") return "중고거래";
  if (pathname === "/used/new") return "글쓰기";
  if (pathname === "/used/my") return "내 글";
  if (pathname === "/discover") return "매칭";
  if (pathname === "/discover/matches") return "매칭 목록";
  if (pathname === "/discover/settings") return "매칭 설정";
  if (pathname.startsWith("/discover/")) return "매칭";
  if (pathname === "/wallet") return "정산 · 출금";
  if (pathname === "/premium") return "프리미엄";
  if (pathname === "/search") return "검색";
  if (pathname === "/rankings") return "랭킹";
  if (pathname === "/events") return "이벤트";
  if (pathname === "/events/new") return "이벤트 만들기";
  if (pathname === "/communities") return "커뮤니티";
  if (pathname === "/communities/new") return "커뮤니티 만들기";
  if (pathname === "/sketch-quiz") return "스케치퀴즈";
  if (pathname.startsWith("/play/")) return "미니게임";
  if (pathname === "/voice") return "음성 채널";
  if (pathname === "/star") return "STAR";
  if (pathname === "/messages/groups/new") return "단체방 만들기";
  if (pathname.startsWith("/support")) return "후원";
  if (pathname.startsWith("/avatar")) return "아바타";
  return null;
}

export function NativeAppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = ROOT_PATHS.has(pathname);
  const title = titleForPath(pathname);
  const showBack = !isRoot && !!title;

  return (
    <header className="sticky top-0 z-[150] flex min-h-[3.25rem] items-center gap-2 border-b border-border/70 bg-background/95 backdrop-blur-md px-3 pt-safe pb-2">
      <div className="flex w-10 shrink-0 items-center justify-start">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/60"
            aria-label="뒤로"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 text-center">
        {title ? (
          <h1 className="truncate text-base font-bold">{title}</h1>
        ) : (
          <Link href={DEFAULT_LANDING_PATH} className="inline-flex items-center gap-2">
            <span className="font-display text-lg font-bold text-folk-cobalt">{BRAND.name}</span>
          </Link>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-0.5 min-w-[5.5rem]">
        {!showBack && (
          <Link
            href="/search"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/60",
              pathname.startsWith("/search") && "text-primary"
            )}
            aria-label="검색"
          >
            <Search className="h-5 w-5" />
          </Link>
        )}
        <HeaderAuth compact />
      </div>
    </header>
  );
}
