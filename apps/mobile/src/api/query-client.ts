import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient tuned for social feeds at scale:
 * - short staleTime for feed freshness
 * - bounded retries (avoid stampede)
 */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
