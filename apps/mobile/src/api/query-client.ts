import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient tuned for social feeds at scale:
 * - short staleTime for feed freshness
 * - long gcTime so backgrounded tabs keep memory (Twitter-style warm start)
 * - no window/reconnect refetch — resume uses silent merge instead
 * - bounded retries (avoid stampede)
 */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
