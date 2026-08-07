import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { clearFeedBootstrap, loadFeedBootstrap } from "@/api/feed-bootstrap-cache";
import { fetchFeedPage, type FeedPage } from "@/api/feed";
import { MobileApi } from "@/api/paths";
import { clearTokens, getAccessToken } from "@/auth/token-store";
import type { MobileAuthUser } from "@/auth/types";

export type WebAuthMode = "signup" | "signin";

type AuthState = {
  status: "loading" | "signedOut" | "signedIn";
  user: MobileAuthUser | null;
  /** Opens website signup/signin in AuthSession; stores tokens on return. */
  openWebAuth: (mode: WebAuthMode) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function prefetchHomeFeed(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.prefetchInfiniteQuery({
    queryKey: ["mobile-feed"],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam ?? null, 12),
    initialPageParam: null as string | null,
    getNextPageParam: (last: FeedPage) => last.nextCursor,
    staleTime: 90_000,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [user, setUser] = useState<MobileAuthUser | null>(null);

  const refreshMe = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      setStatus("signedOut");
      return;
    }
    try {
      const data = await apiRequest<{ user: MobileAuthUser }>(MobileApi.me, { auth: true });
      setUser(data.user);
      setStatus("signedIn");
    } catch {
      await clearTokens();
      setUser(null);
      setStatus("signedOut");
    }
  }, []);

  /**
   * Cold start: SecureStore only for the gate.
   * If a token exists → show Main/Feed immediately and load /me + feed in parallel.
   * Never block the whole navigator on /me RTT.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (cancelled) return;
      if (!token) {
        setUser(null);
        setStatus("signedOut");
        return;
      }

      setStatus("signedIn");
      // Instant Home from last session (IG/Twitter), then refresh over the network.
      const cached = await loadFeedBootstrap();
      if (!cancelled && cached) {
        queryClient.setQueryData(["mobile-feed"], cached);
      }
      prefetchHomeFeed(queryClient);

      try {
        const data = await apiRequest<{ user: MobileAuthUser }>(MobileApi.me, { auth: true });
        if (cancelled) return;
        setUser(data.user);
        setStatus("signedIn");
      } catch {
        if (cancelled) return;
        await clearTokens();
        setUser(null);
        setStatus("signedOut");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const openWebAuth = useCallback(
    async (mode: WebAuthMode) => {
      const { openWebAuthSession } = await import("@/auth/oauth");
      const next = await openWebAuthSession(mode);
      setUser(next);
      setStatus("signedIn");
      prefetchHomeFeed(queryClient);
      void refreshMe();
    },
    [queryClient, refreshMe]
  );

  const signOut = useCallback(async () => {
    try {
      const { getRefreshToken } = await import("@/auth/token-store");
      const refreshToken = await getRefreshToken();
      await apiRequest(MobileApi.auth.logout, {
        method: "POST",
        auth: true,
        body: { refreshToken, allDevices: false },
      }).catch(() => undefined);
    } finally {
      await clearTokens();
      await clearFeedBootstrap();
      queryClient.clear();
      setUser(null);
      setStatus("signedOut");
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, user, openWebAuth, signOut, refreshMe }),
    [status, user, openWebAuth, signOut, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
