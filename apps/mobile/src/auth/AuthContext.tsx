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
import { scheduleTabWarmup, resetTabWarmup } from "@/navigation/tab-warmup";
import {
  activateAccount,
  getActiveAccount,
  getCachedActiveUser,
  listSavedAccountsPublic,
  migrateLegacySingleToken,
  patchActiveAccountProfile,
  saveAccountSession,
  savedAccountToCachedUser,
  type SavedMobileAccountPublic,
} from "@/auth/account-store";
import { prefetchImageUrls } from "@/perf/image";
import { clearTokens, getAccessToken, logoutCurrentAccount, setTokens } from "@/auth/token-store";
import type { MobileAuthUser } from "@/auth/types";

export type WebAuthMode = "signup" | "signin";

type AuthState = {
  status: "loading" | "signedOut" | "signedIn";
  user: MobileAuthUser | null;
  savedAccounts: SavedMobileAccountPublic[];
  openWebAuth: (
    mode: WebAuthMode,
    opts?: import("@/auth/oauth").OpenWebAuthOptions
  ) => Promise<void>;
  signInWithCredentials: (loginId: string, password: string) => Promise<void>;
  signInWithGoogleNative: (opts?: {
    flow?: "signin" | "signup";
    idToken?: string;
  }) => Promise<
    | { status: "signedIn" }
    | {
        status: "needsSignup";
        idToken: string;
        profile: import("@/auth/google-native").GoogleNativeProfile;
      }
  >;
  addAccount: (mode: WebAuthMode) => Promise<void>;
  switchAccount: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshSavedAccounts: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function prefetchHomeFeed(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.prefetchInfiniteQuery({
    queryKey: ["mobile-feed"],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam ?? null, 10),
    initialPageParam: null as string | null,
    getNextPageParam: (last: FeedPage) => last.nextCursor,
    staleTime: 90_000,
  });
}

async function registerPushSafe() {
  void import("@/push/push-registration")
    .then(({ registerForPushNotifications }) => registerForPushNotifications())
    .catch(() => undefined);
}

async function unregisterPushSafe() {
  void import("@/push/push-registration")
    .then(({ unregisterPushNotifications }) => unregisterPushNotifications())
    .catch(() => undefined);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [user, setUser] = useState<MobileAuthUser | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<SavedMobileAccountPublic[]>([]);

  const refreshSavedAccounts = useCallback(async () => {
    setSavedAccounts(await listSavedAccountsPublic());
  }, []);

  const applySignedInUser = useCallback(
    async (nextUser: MobileAuthUser) => {
      setUser(nextUser);
      setStatus("signedIn");
      await patchActiveAccountProfile(nextUser);
      await refreshSavedAccounts();
      prefetchHomeFeed(queryClient);
      scheduleTabWarmup(queryClient);
      await registerPushSafe();
    },
    [queryClient, refreshSavedAccounts]
  );

  const refreshMe = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      setStatus("signedOut");
      await refreshSavedAccounts();
      return;
    }
    try {
      const data = await apiRequest<{ user: MobileAuthUser }>(MobileApi.me, { auth: true });
      const active = await getActiveAccount();
      if (active && (active.userId === "legacy" || active.username === "user")) {
        await saveAccountSession(data.user, active.accessToken, active.refreshToken);
      }
      await applySignedInUser(data.user);
    } catch {
      await clearTokens();
      setUser(null);
      setStatus("signedOut");
      await refreshSavedAccounts();
    }
  }, [applySignedInUser, refreshSavedAccounts]);

  /**
   * Cold start: SecureStore + disk feed hydrate BEFORE mounting Home.
   * Never flash an empty spinner when last session's feed is on disk (Twitter/IG).
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateLegacySingleToken();
      const token = await getAccessToken();
      if (cancelled) return;
      if (!token) {
        setUser(null);
        setStatus("signedOut");
        await refreshSavedAccounts();
        return;
      }

      const cached = await loadFeedBootstrap();
      if (cancelled) return;
      if (cached) {
        queryClient.setQueryData(["mobile-feed"], cached);
      }

      const cachedUser = await getCachedActiveUser();
      if (cancelled) return;
      if (cachedUser) {
        setUser(cachedUser);
        if (cachedUser.image) {
          prefetchImageUrls([cachedUser.image], 1);
        }
      }

      setStatus("signedIn");
      prefetchHomeFeed(queryClient);
      scheduleTabWarmup(queryClient);
      void registerPushSafe();

      try {
        const data = await apiRequest<{ user: MobileAuthUser }>(MobileApi.me, { auth: true });
        if (cancelled) return;
        const active = await getActiveAccount();
        if (active && (active.userId === "legacy" || active.username === "user")) {
          await saveAccountSession(data.user, active.accessToken, active.refreshToken);
        }
        setUser(data.user);
        setStatus("signedIn");
        await refreshSavedAccounts();
      } catch {
        if (cancelled) return;
        await clearTokens();
        setUser(null);
        setStatus("signedOut");
        await refreshSavedAccounts();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient, refreshSavedAccounts]);

  const finishWebAuth = useCallback(
    async (mode: WebAuthMode, addAccount: boolean, opts?: import("@/auth/oauth").OpenWebAuthOptions) => {
      const { openWebAuthSession } = await import("@/auth/oauth");
      const next = await openWebAuthSession(mode, { ...opts, addAccount });
      await applySignedInUser(next);
      void refreshMe();
    },
    [applySignedInUser, refreshMe]
  );

  const openWebAuth = useCallback(
    async (mode: WebAuthMode, opts?: import("@/auth/oauth").OpenWebAuthOptions) => {
      await finishWebAuth(mode, false, opts);
    },
    [finishWebAuth]
  );

  const signInWithCredentials = useCallback(
    async (loginId: string, password: string) => {
      const { loginWithCredentials } = await import("@/auth/credentials-login");
      const data = await loginWithCredentials(loginId, password);
      await setTokens(data.accessToken, data.refreshToken, data.user);
      await applySignedInUser(data.user);
      void refreshMe();
    },
    [applySignedInUser, refreshMe]
  );

  const signInWithGoogleNative = useCallback(
    async (opts?: { flow?: "signin" | "signup"; idToken?: string }) => {
      const { authenticateWithGoogleNative } = await import("@/auth/google-native");
      const result = await authenticateWithGoogleNative({
        flow: opts?.flow ?? "signin",
        idToken: opts?.idToken,
      });

      if (result.status === "needsSignup") {
        return {
          status: "needsSignup" as const,
          idToken: result.idToken,
          profile: result.profile,
        };
      }

      await setTokens(result.accessToken, result.refreshToken, result.user);
      await applySignedInUser(result.user);
      void refreshMe();
      return { status: "signedIn" as const };
    },
    [applySignedInUser, refreshMe]
  );

  const addAccount = useCallback(
    async (mode: WebAuthMode) => {
      const active = await getActiveAccount();
      if (active && user) {
        await saveAccountSession(user, active.accessToken, active.refreshToken);
      }
      await finishWebAuth(mode, true);
    },
    [finishWebAuth, user]
  );

  const switchAccount = useCallback(
    async (userId: string) => {
      if (user?.id === userId) return;
      await unregisterPushSafe();
      const hit = await activateAccount(userId);
      if (!hit) return;
      queryClient.clear();
      await clearFeedBootstrap();
      resetTabWarmup();
      setUser(savedAccountToCachedUser(hit));
      if (hit.image) prefetchImageUrls([hit.image], 1);
      setStatus("signedIn");
      prefetchHomeFeed(queryClient);
      scheduleTabWarmup(queryClient);
      await refreshMe();
    },
    [queryClient, refreshMe, user?.id]
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
      await unregisterPushSafe();
      void import("@/auth/google-native")
        .then((m) => m.clearGoogleNativeSession())
        .catch(() => undefined);
      const fallback = await logoutCurrentAccount();
      await clearFeedBootstrap();
      queryClient.clear();
      if (fallback) {
        setStatus("signedIn");
        prefetchHomeFeed(queryClient);
        scheduleTabWarmup(queryClient);
        await refreshMe();
      } else {
        setUser(null);
        setStatus("signedOut");
        await refreshSavedAccounts();
      }
    }
  }, [queryClient, refreshMe, refreshSavedAccounts]);

  const value = useMemo(
    () => ({
      status,
      user,
      savedAccounts,
      openWebAuth,
      signInWithCredentials,
      signInWithGoogleNative,
      addAccount,
      switchAccount,
      signOut,
      refreshMe,
      refreshSavedAccounts,
    }),
    [
      status,
      user,
      savedAccounts,
      openWebAuth,
      signInWithCredentials,
      signInWithGoogleNative,
      addAccount,
      switchAccount,
      signOut,
      refreshMe,
      refreshSavedAccounts,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
