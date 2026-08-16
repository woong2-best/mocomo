import { InteractionManager } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import { fetchCheckoutMeta } from "@/api/checkout";
import { fetchCommunityList } from "@/api/community";
import { fetchAnimeList, fetchStarHub, fetchWallet } from "@/api/discovery";
import { fetchEventsList, fetchEventsMap } from "@/api/events";
import { fetchLiveHub } from "@/api/live";
import { fetchMarketplaceList } from "@/api/marketplace";
import { fetchDmInbox } from "@/api/messages";
import { fetchProfileEditState } from "@/api/profile";
import { fetchStarMarketList } from "@/api/star-market";
import { fetchPaymentMethods } from "@/payments/stripe-setup";
import type { DrawerRoute, RootTabParamList } from "@/navigation/types";

const DEFAULT_MARKETPLACE_QUERY = { take: 48 } as const;
const STALE_MS = 90_000;

let bundlesWarmed = false;
let queriesWarmed = false;
let drawerBundlesWarmed = false;
let drawerQueriesWarmed = false;

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
  void import("@/features/messages/MessagesInboxScreen");
  void import("@/features/market/MarketScreen");
  void import("@/features/marketplace/MarketplaceListScreen");
  void import("@/features/messages/MessagesNewScreen");
}

/** Parse drawer stack screens in the background — same delay as first sidebar tap without this. */
export function warmDrawerBundles(): void {
  if (drawerBundlesWarmed) return;
  drawerBundlesWarmed = true;
  void import("@/features/live/LiveListScreen");
  void import("@/features/star/StarListScreen");
  void import("@/features/community/CommunityListScreen");
  void import("@/features/anime/AnimeListScreen");
  void import("@/features/events/EventsListScreen");
  void import("@/features/events/EventsMapScreen");
  void import("@/features/wallet/WalletScreen");
  void import("@/features/settings/SettingsScreen");
  void import("@/features/legal/LegalPoliciesScreen");
  void import("@/features/profile/ProfileEditScreen");
}

export function prefetchTabQueries(queryClient: QueryClient): void {
  if (queriesWarmed) return;
  queriesWarmed = true;

  void queryClient.prefetchQuery({
    queryKey: ["mobile-dm-inbox"],
    queryFn: fetchDmInbox,
    staleTime: STALE_MS,
  });

  void queryClient.prefetchQuery({
    queryKey: ["mobile-star-market", "ALL", ""],
    queryFn: () => fetchStarMarketList({ type: "ALL", take: 48 }),
    staleTime: STALE_MS,
  });

  void queryClient.prefetchQuery({
    queryKey: ["mobile-marketplace", DEFAULT_MARKETPLACE_QUERY],
    queryFn: () => fetchMarketplaceList(DEFAULT_MARKETPLACE_QUERY),
    staleTime: STALE_MS,
  });
}

export function prefetchDrawerQueries(queryClient: QueryClient): void {
  if (drawerQueriesWarmed) return;
  drawerQueriesWarmed = true;

  void queryClient.prefetchQuery({
    queryKey: ["mobile-live-hub", "ALL"],
    queryFn: () => fetchLiveHub(),
    staleTime: 25_000,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-star-hub", null],
    queryFn: () => fetchStarHub(null),
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["mobile-community"],
    queryFn: () => fetchCommunityList(),
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
    queryKey: ["mobile-events-map", false],
    queryFn: () => fetchEventsMap({ global: false }),
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
  InteractionManager.runAfterInteractions(() => {
    warmTabBundles();
    warmDrawerBundles();
    prefetchTabQueries(queryClient);
    prefetchDrawerQueries(queryClient);
  });
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
      break;
    case "Market":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-star-market", "ALL", ""],
        queryFn: () => fetchStarMarketList({ type: "ALL", take: 48 }),
        staleTime: STALE_MS,
      });
      break;
    case "Used":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-marketplace", DEFAULT_MARKETPLACE_QUERY],
        queryFn: () => fetchMarketplaceList(DEFAULT_MARKETPLACE_QUERY),
        staleTime: STALE_MS,
      });
      break;
    default:
      break;
  }
}

/** Call on drawer row press-in so data + JS are ready before navigation completes. */
export function prefetchDrawerRoute(queryClient: QueryClient, route: DrawerRoute): void {
  warmDrawerBundles();
  warmTabBundles();

  switch (route) {
    case "Home":
    case "Messages":
    case "Market":
      prefetchTabForRoute(queryClient, route);
      return;
    case "LiveList":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-live-hub", "ALL"],
        queryFn: () => fetchLiveHub(),
        staleTime: 25_000,
      });
      return;
    case "StarList":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-star-hub", null],
        queryFn: () => fetchStarHub(null),
        staleTime: STALE_MS,
      });
      return;
    case "CommunityList":
      void queryClient.prefetchQuery({
        queryKey: ["mobile-community"],
        queryFn: () => fetchCommunityList(),
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
        queryKey: ["mobile-events-map", false],
        queryFn: () => fetchEventsMap({ global: false }),
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
