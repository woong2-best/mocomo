import { InteractionManager } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import { fetchCheckoutMeta } from "@/api/checkout";
import { fetchQnaFeedPage } from "@/api/community";
import { fetchAnimeList, fetchWallet } from "@/api/discovery";
import { starHubQueryOptions } from "@/api/star-hub-cache";
import { fetchEventsList, fetchEventsMap } from "@/api/events";
import { fetchLiveHub, type LiveHubResponse } from "@/api/live";
import type { MobileLiveCategoryId } from "@/features/live/live-categories";
import { fetchMarketplaceList } from "@/api/marketplace";
import { fetchDmInbox } from "@/api/messages";
import { followingDmQueryOptions } from "@/api/following-dm-cache";
import { fetchProfileEditState } from "@/api/profile";
import { fetchGemsWallet } from "@/api/gems";
import { fetchPaymentMethods } from "@/payments/stripe-setup";
import type { DrawerRoute, RootTabParamList } from "@/navigation/types";

const DEFAULT_MARKETPLACE_QUERY = { take: 48 };
const DEFAULT_RECOMMEND_QUERY = { take: 8, lane: "recommend" as const };
const STALE_MS = 90_000;
const LIVE_HUB_STALE_MS = 25_000;

function prefetchLiveHubInfinite(queryClient: QueryClient, category: MobileLiveCategoryId = "ALL") {
  void queryClient.prefetchInfiniteQuery({
    queryKey: ["mobile-live-hub", category],
    queryFn: ({ pageParam }) =>
      fetchLiveHub({
        category: category === "ALL" ? undefined : category,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last: LiveHubResponse) =>
      last.hasMore ? last.nextOffset : undefined,
    staleTime: LIVE_HUB_STALE_MS,
  });
}

let bundlesWarmed = false;
let queriesWarmed = false;
let drawerBundlesWarmed = false;
let drawerQueriesWarmed = false;

function staggerImports(loaders: Array<() => Promise<unknown>>, gapMs = 180, startMs = 0) {
  loaders.forEach((load, index) => {
    setTimeout(() => {
      void load();
    }, startMs + index * gapMs);
  });
}

export function resetTabWarmup(): void {
  bundlesWarmed = false;
  queriesWarmed = false;
  drawerBundlesWarmed = false;
  drawerQueriesWarmed = false;
}

/** Parse tab screen JS after Home first paint — avoids 2–4s require() on first tap. */
export function warmTabBundles(): void {
  if (bundlesWarmed) return;
  bundlesWarmed = true;
  staggerImports(
    [
      () => import("@/features/marketplace/MarketplaceListScreen"),
      () => import("@/features/marketplace/MarketHomeScreen"),
      () => import("@/features/messages/MessagesInboxScreen"),
      () => import("@/features/messages/MessagesNewScreen"),
      () => import("@/features/messages/ChatSettingsScreen"),
    ],
    140,
    0
  );
}

/** Parse drawer stack screens in the background — same delay as first sidebar tap without this. */
export function warmDrawerBundles(): void {
  if (drawerBundlesWarmed) return;
  drawerBundlesWarmed = true;
  staggerImports(
    [
      () => import("@/features/live/LiveListScreen"),
      () => import("@/features/star/StarListScreen"),
      () => import("@/features/community/CommunityListScreen"),
      () => import("@/features/anime/AnimeListScreen"),
      () => import("@/features/wallet/WalletScreen"),
      () => import("@/features/live/LiveStudioScreen"),
      () => import("@/features/events/EventsMapScreen"),
      () => import("@/features/events/EventsListScreen"),
      () => import("@/features/settings/SettingsScreen"),
      () => import("@/features/legal/LegalPoliciesScreen"),
    ],
    180,
    220
  );
}

function importDrawerRoute(route: DrawerRoute): void {
  switch (route) {
    case "Used":
      void import("@/features/marketplace/MarketplaceListScreen");
      void import("@/features/marketplace/MarketHomeScreen");
      return;
    case "LiveList":
      void import("@/features/live/LiveListScreen");
      return;
    case "StarList":
      void import("@/features/star/StarListScreen");
      return;
    case "CommunityList":
      void import("@/features/community/CommunityListScreen");
      return;
    case "AnimeList":
      void import("@/features/anime/AnimeListScreen");
      return;
    case "EventsList":
      void import("@/features/events/EventsListScreen");
      return;
    case "EventsMap":
      void import("@/features/events/EventsMapScreen");
      return;
    case "LiveStudio":
      void import("@/features/live/LiveStudioScreen");
      return;
    case "Wallet":
      void import("@/features/wallet/WalletScreen");
      return;
    case "Settings":
      void import("@/features/settings/SettingsScreen");
      return;
    case "ProfileEdit":
      void import("@/features/profile/ProfileEditScreen");
      return;
    case "LegalPolicies":
      void import("@/features/legal/LegalPoliciesScreen");
      return;
    case "Messages":
      void import("@/features/messages/MessagesInboxScreen");
      return;
    default:
      return;
  }
}

export function prefetchTabQueries(queryClient: QueryClient): void {
  if (queriesWarmed) return;
  queriesWarmed = true;

  void queryClient.prefetchQuery({
    queryKey: ["mobile-dm-inbox"],
    queryFn: fetchDmInbox,
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery(followingDmQueryOptions());

  void queryClient.prefetchQuery({
    queryKey: ["mobile-marketplace", "used", DEFAULT_MARKETPLACE_QUERY],
    queryFn: () => fetchMarketplaceList(DEFAULT_MARKETPLACE_QUERY),
    staleTime: STALE_MS,
  });
}

export function prefetchDrawerQueries(queryClient: QueryClient): void {
  if (drawerQueriesWarmed) return;
  drawerQueriesWarmed = true;

  prefetchLiveHubInfinite(queryClient, "ALL");
  void queryClient.prefetchQuery(starHubQueryOptions(queryClient, null));
  void queryClient.prefetchInfiniteQuery({
    queryKey: ["mobile-qna-feed", "ALL", ""],
    queryFn: ({ pageParam }) =>
      fetchQnaFeedPage({ cursor: pageParam, category: "ALL" }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: { nextCursor?: string | null }) => last.nextCursor,
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-anime", "", null],
    queryFn: () => fetchAnimeList(),
    staleTime: 60_000,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-events"],
    queryFn: fetchEventsList,
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-events-map", true],
    queryFn: () => fetchEventsMap({ global: true }),
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-wallet"],
    queryFn: () => fetchWallet(),
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-payment-methods"],
    queryFn: () => fetchPaymentMethods(),
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-gems-wallet"],
    queryFn: fetchGemsWallet,
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-checkout-meta"],
    queryFn: () => fetchCheckoutMeta(),
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-profile-edit"],
    queryFn: fetchProfileEditState,
    staleTime: STALE_MS,
  });
}

/** Run after feed is interactive — keeps cold start lean, navigation opens in ~1s. */
export function scheduleTabWarmup(queryClient: QueryClient): void {
  const run = () => {
    warmTabBundles();
    warmDrawerBundles();
    prefetchTabQueries(queryClient);
    prefetchDrawerQueries(queryClient);
  };
  InteractionManager.runAfterInteractions(run);
  setTimeout(run, 700);
}

export function prefetchTabForRoute(
  queryClient: QueryClient,
  route: keyof RootTabParamList
): void {
  warmTabBundles();
  switch (route) {
    case "Messages":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-dm-inbox"],
        queryFn: fetchDmInbox,
        staleTime: STALE_MS,
      });
      void queryClient.prefetchQuery(followingDmQueryOptions());
      break;
    case "Used":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-marketplace", "recommend"],
        queryFn: () => fetchMarketplaceList(DEFAULT_RECOMMEND_QUERY),
        staleTime: STALE_MS,
      });
      break;
    default:
      break;
  }
}

/** Call on drawer row press-in so data + JS are ready before navigation completes. */
export function prefetchDrawerRoute(queryClient: QueryClient, route: DrawerRoute): void {
  importDrawerRoute(route);

  switch (route) {
    case "Used":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-marketplace", "recommend"],
        queryFn: () => fetchMarketplaceList(DEFAULT_RECOMMEND_QUERY),
        staleTime: STALE_MS,
      });
      return;
    case "Home":
    case "LiveList":
      prefetchLiveHubInfinite(queryClient, "ALL");
      return;
    case "Messages":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-dm-inbox"],
        queryFn: fetchDmInbox,
        staleTime: STALE_MS,
      });
      void queryClient.prefetchQuery(followingDmQueryOptions());
      return;
    case "StarList":
      void queryClient.prefetchQuery(starHubQueryOptions(queryClient, null));
      return;
    case "CommunityList":
      void queryClient.prefetchInfiniteQuery({
        queryKey: ["mobile-qna-feed", "ALL", ""],
        queryFn: ({ pageParam }) =>
          fetchQnaFeedPage({ cursor: pageParam, category: "ALL" }),
        initialPageParam: null as string | null,
        getNextPageParam: (last: { nextCursor?: string | null }) => last.nextCursor,
        staleTime: STALE_MS,
      });
      return;
    case "AnimeList":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-anime", "", null],
        queryFn: () => fetchAnimeList(),
        staleTime: 60_000,
      });
      return;
    case "EventsList":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-events"],
        queryFn: fetchEventsList,
        staleTime: STALE_MS,
      });
      return;
    case "EventsMap":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-events-map", true],
        queryFn: () => fetchEventsMap({ global: true }),
        staleTime: STALE_MS,
      });
      return;
    case "LiveStudio":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-live-studio"],
        queryFn: () =>
          import("@/api/live-studio").then((mod) => mod.fetchStudioSettings()),
        staleTime: STALE_MS,
      });
      void queryClient.prefetchQuery({
        queryKey: ["mobile-live-studio-accounts"],
        queryFn: () =>
          import("@/api/live-studio").then((mod) => mod.fetchStudioAccounts()),
        staleTime: STALE_MS,
      });
      return;
    case "Wallet":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-wallet"],
        queryFn: () => fetchWallet(),
        staleTime: STALE_MS,
      });
      void queryClient.prefetchQuery({
        queryKey: ["mobile-payment-methods"],
        queryFn: () => fetchPaymentMethods(),
        staleTime: STALE_MS,
      });
      void queryClient.prefetchQuery({
        queryKey: ["mobile-gems-wallet"],
        queryFn: fetchGemsWallet,
        staleTime: STALE_MS,
      });
      return;
    case "Settings":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-checkout-meta"],
        queryFn: () => fetchCheckoutMeta(),
        staleTime: STALE_MS,
      });
      return;
    case "ProfileEdit":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-profile-edit"],
        queryFn: fetchProfileEditState,
        staleTime: STALE_MS,
      });
      return;
    case "LegalPolicies":
      void import("@/features/legal/LegalPoliciesScreen");
      return;
    default:
      return;
  }
}
