"use client";

import Link from "next/link";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
  if (pathname.match(/^\/u\/[^/]+\/connections$/)) return t("ui.followers_following");
  if (pathname.match(/^\/u\/[^/]+\/followers$/)) return t("ui.followers");
  if (pathname.match(/^\/u\/[^/]+\/following$/)) return t("live.sideFollowing");
  if (pathname.startsWith("/u/")) return t("settings.profile");
  if (pathname.startsWith("/post/")) return t("star.badge.post");
  if (pathname.startsWith("/settings")) {
    if (pathname === "/settings/profile") return t("settings.editProfile");
    if (pathname === "/settings/streamer") return t("ui.streamer");
    return t("settings.title");
  }
  if (pathname.startsWith("/auth/")) return t("settings.account");
  if (pathname === EXPLORE_PATH) return t("nav.explore");
  if (isCommunityFeedPath(pathname)) return t("nav.home");
  if (pathname === "/games") return t("nav.games");
  if (pathname.startsWith("/games/")) {
    if (pathname === "/games/ranking") return t("ui.game_rankings");
    if (pathname === "/games/history") return t("games.history");
    if (pathname === "/games/achievements") return t("ui.achievements");
    if (pathname === "/games/season") return t("ui.season");
    if (pathname === "/games/live") return t("games.spectate");
    return "GAME";
  }
  if (pathname === "/voice/new") return t("ui.create_broadcast");
  if (pathname.startsWith("/live/clips")) return t("ui.upload_clip");
  if (pathname === "/live") return t("nav.live");
  if (pathname.startsWith("/live/")) return t("nav.live");
  if (pathname === "/market") return t("nav.market");
  if (pathname === "/cosplay/apply") return t("settings.cosplayApply");
  if (pathname.startsWith("/cosplay")) return t("nav.cosplay");
  if (pathname === "/messages/new") return t("messages.newTitle");
  if (pathname === "/apt/house") return t("nav.home");
  if (pathname === "/apt/cohabitation") return t("ui.roommates");
  if (pathname === "/notifications") return t("nav.notifications");
  if (pathname === "/messages") return t("nav.messages");
  if (pathname === "/market/new") return t("nav.compose");
  if (pathname === "/market/my") return t("ui.my_listings");
  if (pathname === "/discover") return t("nav.discover");
  if (pathname === "/discover/matches") return t("ui.matches");
  if (pathname === "/discover/settings") return t("settings.discoverSettings");
  if (pathname.startsWith("/discover/")) return t("nav.discover");
  if (pathname === "/money") return t("nav.money");
  if (pathname === "/wallet") return t("nav.wallet");
  if (pathname.startsWith("/support/emoticons")) return t("ui.emoticons");
  if (pathname.startsWith("/support")) return t("nav.support");
  if (pathname === "/premium") return t("nav.premium");
  if (pathname === "/search") return t("common.search");
  if (pathname === "/rankings") return t("nav.rankings");
  if (pathname === "/events" || pathname === "/events/new") return t("ui.create_ad");
  if (pathname === "/communities") return t("nav.communities");
  if (pathname === "/communities/new") return t("ui.create_qna");
  if (pathname === "/sketch-quiz") return t("ui.sketch_quiz");
  if (pathname.startsWith("/play/")) return t("games.title");
  if (pathname === "/voice") return t("ui.voice_live");
  if (pathname.match(/^\/voice\/[^/]+$/) && pathname !== "/voice/new") return t("nav.liveStudio");
  if (pathname === "/star") return t("nav.star");
  if (pathname.match(/^\/c\/[^/]+\/members$/)) return t("ui.members");
  if (pathname.match(/^\/c\/[^/]+\/settings$/)) return t("ui.qna_settings");
  if (pathname.startsWith("/c/")) return t("nav.communities");
  if (pathname === "/events/map") return t("nav.eventsMap");
  if (pathname === "/anime/delete-requests") return t("anime.deleteRequests");
  if (pathname.match(/^\/anime\/[^/]+\/history$/)) return t("ui.edit_history");
  if (pathname === "/anime") return t("nav.anime");
  if (pathname === "/anime/popular") return t("anime.trendingTitle");
  if (pathname === "/anime/recent") return t("anime.recentTitle");
  if (pathname === "/anime/newest") return t("anime.newArticles");
  if (pathname.startsWith("/anime/list/")) return t("ui.genre_list");
  if (pathname.match(/^\/anime\/[^/]+\/edit$/)) return t("ui.edit_article");
  if (pathname === "/anime/new") return t("anime.addNew");
  if (pathname.startsWith("/anime/")) return t("nav.anime");
  if (pathname === "/cosplay/profiles") return t("anime.cosplayerHubTitle");
  if (pathname === "/cosplay/board/new") return t("nav.compose");
  if (pathname === "/market/adult-verify") return t("ui.adult_verification");
  if (pathname === "/market/verify") return t("ui.identity_verification");
  if (pathname.startsWith("/wallet")) return t("nav.wallet");
  if (pathname.match(/^\/market\/[^/]+$/) && pathname !== "/market/new" && pathname !== "/market/my") {
    return t("ui.listing");
  }
  if (pathname.startsWith("/market/")) return t("nav.market");
  if (pathname.startsWith("/works")) return t("nav.works");
  if (pathname.startsWith("/webtoon")) return t("nav.webtoon");
  if (pathname.startsWith("/payments/")) return t("ui.payment");
  if (pathname.startsWith("/legal")) return t("settings.legalTitle");
  if (pathname === "/bookmarks") return t("nav.star");
  if (pathname === "/my-page") return t("nav.myPage");
  if (pathname === "/compose") return t("nav.compose");
  if (pathname.startsWith("/avatar")) return t("ui.avatar");
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
