"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { BRAND } from "@/lib/brand";
import {
  DEFAULT_LANDING_PATH,
  EXPLORE_PATH,
  isCommunityFeedPath,
} from "@/lib/site-routes";
import { HeaderAuth } from "@/components/layout/header-auth";
import { HeaderSearch } from "@/components/search/header-search";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { pressTap } from "@/lib/motion-presets";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { uiText } from "@/lib/i18n/ui-text";
import { isMobileHubChromePath } from "@/lib/floating-tab-nav";
import { MobileHubHeader } from "@/components/layout/mobile-hub-header";

const ROOT_PATHS = new Set([
  "/",
  DEFAULT_LANDING_PATH,
  EXPLORE_PATH,
  "/games",
  "/notifications",
  "/messages",
  "/discover",
  "/live",
  "/voice",
  "/market",
]);

function titleForPath(
  pathname: string,
  t: (key: MessageKey, vars?: Record<string, string>) => string,
  locale: string
): string | null {
  const u = (ko: string, en: string) => uiText(locale, ko, en);
  if (pathname.match(/^\/u\/[^/]+\/connections$/)) return u("팔로워 · 팔로잉", "Followers · Following");
  if (pathname.match(/^\/u\/[^/]+\/followers$/)) return u("팔로워", "Followers");
  if (pathname.match(/^\/u\/[^/]+\/following$/)) return u("팔로잉", "Following");
  if (pathname.startsWith("/u/")) return u("프로필", "Profile");
  if (pathname.startsWith("/post/")) return u("게시물", "Post");
  if (pathname.startsWith("/settings")) {
    if (pathname === "/settings/profile") return t("settings.editProfile");
    if (pathname === "/settings/streamer") return u("스트리머", "Streamer");
    return t("settings.title");
  }
  if (pathname.startsWith("/auth/")) return u("계정", "Account");
  if (pathname === EXPLORE_PATH) return t("nav.explore");
  if (isCommunityFeedPath(pathname)) return t("nav.home");
  if (pathname === "/games") return t("nav.games");
  if (pathname.startsWith("/games/")) {
    if (pathname === "/games/ranking") return u("게임 랭킹", "Game rankings");
    if (pathname === "/games/history") return t("games.history");
    if (pathname === "/games/achievements") return u("업적", "Achievements");
    if (pathname === "/games/season") return u("시즌", "Season");
    if (pathname === "/games/live") return t("games.spectate");
    return "GAME";
  }
  if (pathname === "/voice/new") return u("방송 만들기", "Create broadcast");
  if (pathname.startsWith("/live/clips")) return u("클립 업로드", "Upload clip");
  if (pathname === "/live") return t("nav.live");
  if (pathname.startsWith("/live/")) return t("nav.live");
  if (pathname === "/market") return t("nav.market");
  if (pathname === "/cosplay/apply") return t("settings.cosplayApply");
  if (pathname.startsWith("/cosplay")) return t("nav.cosplay");
  if (pathname === "/messages/new") return u("새 메시지", "New message");
  if (pathname === "/apt/house") return u("주택", "Home");
  if (pathname === "/apt/cohabitation") return u("동거 관리", "Roommates");
  if (pathname === "/notifications") return t("nav.notifications");
  if (pathname === "/messages") return t("nav.messages");
  if (pathname === "/market/new") return t("nav.compose");
  if (pathname === "/market/my") return u("내 글", "My listings");
  if (pathname === "/discover") return t("nav.discover");
  if (pathname === "/discover/matches") return u("매칭 목록", "Matches");
  if (pathname === "/discover/settings") return t("settings.discoverSettings");
  if (pathname.startsWith("/discover/")) return t("nav.discover");
  if (pathname === "/money") return t("nav.money");
  if (pathname === "/wallet") return t("nav.wallet");
  if (pathname.startsWith("/support/emoticons")) return u("이모티콘", "Emoticons");
  if (pathname.startsWith("/support")) return t("nav.support");
  if (pathname === "/premium") return t("nav.premium");
  if (pathname === "/search") return t("common.search");
  if (pathname === "/rankings") return t("nav.rankings");
  if (pathname === "/events" || pathname === "/events/new") return u("광고 등록", "Create ad");
  if (pathname === "/communities") return t("nav.communities");
  if (pathname === "/communities/new") return u("QnA 만들기", "Create QnA");
  if (pathname === "/sketch-quiz") return u("스케치퀴즈", "Sketch quiz");
  if (pathname.startsWith("/play/")) return t("games.title");
  if (pathname === "/voice") return u("음성 · 라이브", "Voice · Live");
  if (pathname.match(/^\/voice\/[^/]+$/) && pathname !== "/voice/new") return t("nav.liveStudio");
  if (pathname === "/star") return t("nav.star");
  if (pathname.match(/^\/c\/[^/]+\/members$/)) return u("멤버", "Members");
  if (pathname.match(/^\/c\/[^/]+\/settings$/)) return u("QnA 설정", "QnA settings");
  if (pathname.startsWith("/c/")) return t("nav.communities");
  if (pathname === "/events/map") return t("nav.eventsMap");
  if (pathname === "/anime/delete-requests") return t("anime.deleteRequests");
  if (pathname.match(/^\/anime\/[^/]+\/history$/)) return u("수정 기록", "Edit history");
  if (pathname === "/anime") return t("nav.anime");
  if (pathname === "/anime/popular") return t("anime.trendingTitle");
  if (pathname === "/anime/recent") return t("anime.recentTitle");
  if (pathname === "/anime/newest") return t("anime.newArticles");
  if (pathname.startsWith("/anime/list/")) return u("장르 목록", "Genre list");
  if (pathname.match(/^\/anime\/[^/]+\/edit$/)) return u("문서 편집", "Edit article");
  if (pathname === "/anime/new") return t("anime.addNew");
  if (pathname.startsWith("/anime/")) return t("nav.anime");
  if (pathname === "/cosplay/profiles") return t("anime.cosplayerHubTitle");
  if (pathname === "/cosplay/board/new") return t("nav.compose");
  if (pathname === "/market/adult-verify") return u("성인 인증", "Adult verification");
  if (pathname === "/market/verify") return u("본인 확인", "Identity verification");
  if (pathname.startsWith("/wallet")) return t("nav.wallet");
  if (pathname.match(/^\/market\/[^/]+$/) && pathname !== "/market/new" && pathname !== "/market/my") {
    return u("상품", "Listing");
  }
  if (pathname.startsWith("/market/")) return t("nav.market");
  if (pathname.startsWith("/works")) return t("nav.works");
  if (pathname.startsWith("/webtoon")) return t("nav.webtoon");
  if (pathname.startsWith("/payments/")) return u("결제", "Payment");
  if (pathname.startsWith("/legal")) return t("settings.legalTitle");
  if (pathname === "/bookmarks") return t("nav.star");
  if (pathname === "/my-page") return t("nav.myPage");
  if (pathname === "/compose") return t("nav.compose");
  if (pathname.startsWith("/avatar")) return u("아바타", "Avatar");
  return null;
}

export function NativeAppHeader() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { t, locale } = useLocale();
  const reduced = usePrefersReducedMotion();
  const isSearchPage = pathname === "/search";
  const isRoot = ROOT_PATHS.has(pathname);
  const title = titleForPath(pathname, t, locale);
  const showBack = !isRoot && !!title && !isSearchPage;

  if (isMobileHubChromePath(pathname)) {
    return <MobileHubHeader className="lg:hidden" />;
  }

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
            aria-label={t("common.back")}
            whileTap={reduced ? undefined : pressTap}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
        </div>
        <div className="min-w-0 flex-1">
          <Suspense
            fallback={
              <div className="h-11 w-full rounded-xl border-2 border-folk-cobalt/20 bg-muted/40" aria-hidden />
            }
          >
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
            aria-label={t("common.back")}
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
            aria-label={t("common.search")}
          >
            <Search className="h-5 w-5" />
          </Link>
        )}
        <HeaderAuth compact />
      </div>
    </motion.header>
  );
}
