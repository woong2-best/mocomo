"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { DEFAULT_LANDING_PATH, EXPLORE_PATH } from "@/lib/site-routes";
import { HeaderAuth } from "@/components/layout/header-auth";
import { HeaderSearch } from "@/components/search/header-search";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { pressTap } from "@/lib/motion-presets";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

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
  "/voice",
  "/market",
]);

function titleForPath(pathname: string, t: (key: MessageKey, vars?: Record<string, string>) => string): string | null {
  if (pathname.match(/^\/u\/[^/]+\/connections$/)) return "팔로워 · 팔로잉";
  if (pathname.match(/^\/u\/[^/]+\/followers$/)) return "팔로워";
  if (pathname.match(/^\/u\/[^/]+\/following$/)) return "팔로잉";
  if (pathname.startsWith("/u/")) return "프로필";
  if (pathname.startsWith("/post/")) return "게시물";
  if (pathname.startsWith("/settings")) {
    if (pathname === "/settings/profile") return t("settings.editProfile");
    if (pathname === "/settings/creator") return t("settings.creatorRevenue");
    if (pathname === "/settings/streamer") return "스트리머";
    return t("settings.title");
  }
  if (pathname.startsWith("/auth/")) return "계정";
  if (pathname === EXPLORE_PATH) return t("nav.explore");
  if (pathname === DEFAULT_LANDING_PATH || pathname === "/feed") return t("nav.home");
  if (pathname === "/games") return t("nav.games");
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
  if (pathname === "/live") return t("nav.live");
  if (pathname.startsWith("/live/")) return t("nav.live");
  if (pathname === "/market") return t("nav.market");
  if (pathname.startsWith("/market/")) return t("nav.market");
  if (pathname === "/cosplay/apply") return "코스어 등록";
  if (pathname.startsWith("/cosplay")) return "코스프레";
  if (pathname === "/messages/new") return "새 메시지";
  if (pathname === "/apt/house") return "주택";
  if (pathname === "/apt/cohabitation") return "동거 관리";
  if (pathname === "/notifications") return t("nav.notifications");
  if (pathname === "/messages") return t("nav.messages");
  if (pathname === "/used") return t("nav.used");
  if (pathname === "/used/new") return "글쓰기";
  if (pathname === "/used/my") return "내 글";
  if (pathname === "/discover") return t("nav.discover");
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
  if (pathname === "/voice") return "음성 · 라이브";
  if (pathname.match(/^\/voice\/[^/]+$/) && pathname !== "/voice/new") return "방송 스튜디오";
  if (pathname === "/star") return "STAR";
  if (pathname === "/messages/groups/new") return "단체방 만들기";
  if (pathname === "/messages/join") return "단체방 입장";
  if (pathname.match(/^\/c\/[^/]+\/members$/)) return "멤버";
  if (pathname.match(/^\/c\/[^/]+\/settings$/)) return "커뮤니티 설정";
  if (pathname.startsWith("/c/")) return "커뮤니티";
  if (pathname === "/events/map") return "행사 지도";
  if (pathname === "/anime/delete-requests") return "삭제 요청";
  if (pathname.match(/^\/anime\/[^/]+\/history$/)) return "수정 기록";
  if (pathname === "/anime") return t("nav.anime");
  if (pathname === "/anime/popular") return "인기 글";
  if (pathname === "/anime/recent") return "최근 변경";
  if (pathname === "/anime/newest") return "최신 글";
  if (pathname.startsWith("/anime/list/")) return "장르 목록";
  if (pathname.match(/^\/anime\/[^/]+\/edit$/)) return "문서 편집";
  if (pathname === "/anime/new") return "문서 작성";
  if (pathname.startsWith("/anime/")) return t("nav.anime");
  if (pathname === "/cosplay/profiles") return "코스어 프로필";
  if (pathname === "/cosplay/board/new") return "글쓰기";
  if (pathname === "/used/adult-verify") return "성인 인증";
  if (pathname === "/used/verify") return "휴대폰 인증";
  if (pathname.startsWith("/market/sell-item")) return "판매 등록";
  if (pathname.startsWith("/market/seller")) return "판매자";
  if (pathname.startsWith("/market/i/")) return "상품";
  if (pathname.startsWith("/market/sell")) return "판매 등록";
  if (pathname.startsWith("/market/digital/")) return "디지털 굿즈";
  if (pathname.startsWith("/market/goods/")) return "실물 굿즈";
  if (pathname.startsWith("/market/emoticons/")) return "이모티콘";
  if (pathname.startsWith("/works")) return "크리에이터 작품";
  if (pathname.startsWith("/webtoon")) return "일러스트";
  if (pathname.startsWith("/payments/")) return "결제";
  if (pathname.startsWith("/legal")) return "약관";
  if (pathname === "/bookmarks") return "STAR";
  if (pathname === "/my-page") return t("nav.myPage");
  if (pathname === "/compose") return "글쓰기";
  if (pathname.startsWith("/support/emoticons")) return "이모티콘";
  if (pathname.startsWith("/support")) return "후원";
  if (pathname.startsWith("/avatar")) return "아바타";
  return null;
}

export function NativeAppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const isSearchPage = pathname === "/search";
  const isRoot = ROOT_PATHS.has(pathname);
  const title = titleForPath(pathname, t);
  const showBack = !isRoot && !!title && !isSearchPage;

  if (isSearchPage) {
    return (
      <motion.header
        className="sticky top-0 z-[150] flex min-h-[3.25rem] items-center gap-2 border-b border-border/70 bg-background/95 backdrop-blur-md px-3 pt-safe pb-2"
        initial={reduced ? false : { y: -12, opacity: 0 }}
        animate={reduced ? undefined : { y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <div className="flex w-10 shrink-0 items-center justify-start">
          <motion.button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/60"
            aria-label="뒤로"
            whileTap={reduced ? undefined : pressTap}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
        </div>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<div className="h-10 w-full rounded-full bg-muted/60" aria-hidden />}>
            <HeaderSearch variant="header" />
          </Suspense>
        </div>
        <div className="flex shrink-0 items-center justify-end min-w-[2.75rem]">
          <HeaderAuth compact />
        </div>
      </motion.header>
    );
  }

  return (
    <motion.header
      className="sticky top-0 z-[150] flex min-h-[3.25rem] items-center gap-2 border-b border-border/70 bg-background/95 backdrop-blur-md px-3 pt-safe pb-2"
      initial={reduced ? false : { y: -12, opacity: 0 }}
      animate={reduced ? undefined : { y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    >
      <div className="flex w-10 shrink-0 items-center justify-start">
        {showBack ? (
          <motion.button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/60"
            aria-label="뒤로"
            whileTap={reduced ? undefined : pressTap}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 text-center">
        {title ? (
          <motion.h1
            key={title}
            className="truncate text-base font-bold"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {title}
          </motion.h1>
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
    </motion.header>
  );
}
