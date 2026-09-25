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
import { ApiError, apiRequest } from "@/api/client";
import { clearDmBootstrap, loadDmInboxBootstrap } from "@/api/dm-bootstrap-cache";
import {
  clearFollowingDmBootstrap,
  FOLLOWING_DM_QUERY_KEY,
  loadFollowingDmBootstrap,
} from "@/api/following-dm-cache";
import { clearFeedBootstrap, loadFeedBootstrap } from "@/api/feed-bootstrap-cache";
import { clearStarHubBootstrap, hydrateStarHubQuery } from "@/api/star-hub-cache";
import {
  clearWalletBootstrap,
  loadWalletBootstrap,
} from "@/api/wallet-bootstrap-cache";
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
import { patchMe } from "@/api/discovery";
import { detectDeviceTimeZone } from "@/lib/device-timezone";

export type WebAuthMode = "signup" | "signin";

type AuthState = {
  status: "loading" | "signedOut" | "signedIn";
  user: MobileAuthUser | null;
  savedAccounts: SavedMobileAccountPublic[];
  openWebAuth: (
    mode: WebAuthMode,
    opts?: import("@/auth/oauth").OpenWebAuthOptions
  ) => Promise<
    | { status: "signedIn" }
    | {
        status: "needsSignup";
        handoff: string;
        provider: string;
        profile: { email: string | null; name: string | null; image: string | null };
      }
  >;
  signInWithCredentials: (loginId: string, password: string) => Promise<void>;
  signInWithGoogleNative: (opts?: {
    flow?: "signin" | "signup";
    idToken?: string;
    forcePicker?: boolean;
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
  }) => Promise<
    | { status: "signedIn" }
    | {
        status: "needsSignup";
        idToken: string;
        profile: import("@/auth/google-native").GoogleNativeProfile;
      }
  >;
  signInWithNaverNative: (opts?: {
    flow?: "signin" | "signup";
    accessToken?: string;
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
  }) => Promise<
    | { status: "signedIn" }
    | {
        status: "needsSignup";
        accessToken: string;
        profile: import("@/auth/naver-line-native").NativeOAuthProfile;
      }
  >;
  signInWithLineNative: (opts?: {
    flow?: "signin" | "signup";
    accessToken?: string;
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
  }) => Promise<
    | { status: "signedIn" }
    | {
        status: "needsSignup";
        accessToken: string;
        profile: import("@/auth/naver-line-native").NativeOAuthProfile;
      }
  >;
  completeOAuthSignupHandoff: (
    handoff: string,
    consent: {
      birthYear: number;
      birthMonth: number;
      birthDay: number;
      termsAccepted: true;
      privacyAccepted: true;
    }
  ) => Promise<void>;
  addAccount: (mode: WebAuthMode) => Promise<void>;
  /** Save current session before in-app add-account login (no browser). */
  prepareAddAccountSession: () => Promise<void>;
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
      await hydrateStarHubQuery(queryClient, nextUser.id);
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
    } catch (e) {
      const statusCode = e instanceof ApiError ? e.status : 0;
      // Only a confirmed unauthorized session may wipe tokens. 403/404/408/network
      // after a successful login used to kick the user straight back to Login.
      if (statusCode === 401) {
        await clearTokens();
        setUser(null);
        setStatus("signedOut");
        await refreshSavedAccounts();
      }
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

      const [cachedFeed, cachedInbox, cachedWallet, cachedFollowing, cachedUser] =
        await Promise.all([
          loadFeedBootstrap(),
          loadDmInboxBootstrap(),
          loadWalletBootstrap(),
          loadFollowingDmBootstrap(),
          getCachedActiveUser(),
        ]);
      await hydrateStarHubQuery(queryClient, cachedUser?.id ?? null);
      if (cancelled) return;
      if (cachedFeed) {
        queryClient.setQueryData(["mobile-feed"], cachedFeed);
      }
      if (cachedInbox) {
        queryClient.setQueryData(["mobile-dm-inbox"], cachedInbox);
      }
      if (cachedFollowing) {
        queryClient.setQueryData(
          FOLLOWING_DM_QUERY_KEY,
          { users: cachedFollowing.users },
          { updatedAt: cachedFollowing.savedAt }
        );
      }
      if (cachedWallet?.wallet) {
        queryClient.setQueryData(["mobile-wallet"], cachedWallet.wallet);
      }
      if (cachedWallet?.paymentMethods) {
        queryClient.setQueryData(["mobile-payment-methods"], cachedWallet.paymentMethods);
      }
      if (cachedWallet?.gems) {
        queryClient.setQueryData(["mobile-gems-wallet"], cachedWallet.gems);
      }

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
      } catch (e) {
        if (cancelled) return;
        const statusCode = e instanceof ApiError ? e.status : 0;
        if (statusCode === 401) {
          await clearTokens();
          setUser(null);
          setStatus("signedOut");
          await refreshSavedAccounts();
        }
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
      if (next.status === "needsSignup") {
        return {
          status: "needsSignup" as const,
          handoff: next.handoff,
          provider: next.provider,
          profile: next.profile,
        };
      }
      await applySignedInUser(next.user);
      void refreshMe();
      return { status: "signedIn" as const };
    },
    [applySignedInUser, refreshMe]
  );

  const openWebAuth = useCallback(
    async (mode: WebAuthMode, opts?: import("@/auth/oauth").OpenWebAuthOptions) => {
      return finishWebAuth(mode, opts?.addAccount === true, opts);
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
    async (opts?: {
      flow?: "signin" | "signup";
      idToken?: string;
      forcePicker?: boolean;
      birthYear?: number;
      birthMonth?: number;
      birthDay?: number;
      termsAccepted?: boolean;
      privacyAccepted?: boolean;
    }) => {
      const { authenticateWithGoogleNative } = await import("@/auth/google-native");
      const result = await authenticateWithGoogleNative({
        flow: opts?.flow ?? "signin",
        idToken: opts?.idToken,
        forcePicker: opts?.forcePicker,
        birthYear: opts?.birthYear,
        birthMonth: opts?.birthMonth,
        birthDay: opts?.birthDay,
        termsAccepted: opts?.termsAccepted,
        privacyAccepted: opts?.privacyAccepted,
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

  const signInWithNaverNative = useCallback(
    async (opts?: {
      flow?: "signin" | "signup";
      accessToken?: string;
      birthYear?: number;
      birthMonth?: number;
      birthDay?: number;
      termsAccepted?: boolean;
      privacyAccepted?: boolean;
    }) => {
      const { authenticateWithNaverNative } = await import("@/auth/naver-line-native");
      const result = await authenticateWithNaverNative({
        flow: opts?.flow ?? "signin",
        accessToken: opts?.accessToken,
        birthYear: opts?.birthYear,
        birthMonth: opts?.birthMonth,
        birthDay: opts?.birthDay,
        termsAccepted: opts?.termsAccepted,
        privacyAccepted: opts?.privacyAccepted,
      });
      if (result.status === "needsSignup") {
        return {
          status: "needsSignup" as const,
          accessToken: result.accessToken,
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

  const signInWithLineNative = useCallback(
    async (opts?: {
      flow?: "signin" | "signup";
      accessToken?: string;
      birthYear?: number;
      birthMonth?: number;
      birthDay?: number;
      termsAccepted?: boolean;
      privacyAccepted?: boolean;
    }) => {
      const { authenticateWithLineNative } = await import("@/auth/naver-line-native");
      const result = await authenticateWithLineNative({
        flow: opts?.flow ?? "signin",
        accessToken: opts?.accessToken,
        birthYear: opts?.birthYear,
        birthMonth: opts?.birthMonth,
        birthDay: opts?.birthDay,
        termsAccepted: opts?.termsAccepted,
        privacyAccepted: opts?.privacyAccepted,
      });
      if (result.status === "needsSignup") {
        return {
          status: "needsSignup" as const,
          accessToken: result.accessToken,
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

  const completeOAuthSignupHandoff = useCallback(
    async (
      handoff: string,
      consent: {
        birthYear: number;
        birthMonth: number;
        birthDay: number;
        termsAccepted: true;
        privacyAccepted: true;
      }
    ) => {
      const { completeWebOAuthSignup } = await import("@/auth/oauth");
      const user = await completeWebOAuthSignup(handoff, consent);
      await applySignedInUser(user);
      void refreshMe();
    },
    [applySignedInUser, refreshMe]
  );

  const prepareAddAccountSession = useCallback(async () => {
    const active = await getActiveAccount();
    if (active && user) {
      await saveAccountSession(user, active.accessToken, active.refreshToken);
    }
  }, [user]);

  const addAccount = useCallback(
    async (mode: WebAuthMode) => {
      await prepareAddAccountSession();
      const result = await finishWebAuth(mode, true);
      if (result.status === "needsSignup") {
        throw new Error("추가 계정은 가입 완료 후 다시 시도해 주세요.");
      }
    },
    [finishWebAuth, prepareAddAccountSession]
  );

  const switchAccount = useCallback(
    async (userId: string) => {
      if (user?.id === userId) return;
      await unregisterPushSafe();
      const hit = await activateAccount(userId);
      if (!hit) return;
      queryClient.clear();
      await Promise.all([
        clearFeedBootstrap(),
        clearDmBootstrap(),
        clearWalletBootstrap(),
        clearFollowingDmBootstrap(),
      ]);
      await hydrateStarHubQuery(queryClient, hit.userId);
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
      try {
        const { clearGoogleNativeSession } = await import("@/auth/google-native");
        await clearGoogleNativeSession();
      } catch {
        /* SDK unavailable */
      }
      const fallback = await logoutCurrentAccount();
      await Promise.all([
        clearFeedBootstrap(),
        clearDmBootstrap(),
        clearWalletBootstrap(),
        clearFollowingDmBootstrap(),
        clearStarHubBootstrap(),
      ]);
      queryClient.clear();
      if (fallback) {
        await hydrateStarHubQuery(queryClient, fallback.userId);
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

  useEffect(() => {
    if (status !== "signedIn" || !user) return;
    const tz = detectDeviceTimeZone();
    if (!tz || tz === user.timeZone) return;
    let cancelled = false;
    void patchMe({ timeZone: tz })
      .then(() => {
        if (!cancelled) void refreshMe();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status, user, user?.timeZone, refreshMe]);

  const value = useMemo(
    () => ({
      status,
      user,
      savedAccounts,
      openWebAuth,
      signInWithCredentials,
      signInWithGoogleNative,
      signInWithNaverNative,
      signInWithLineNative,
      completeOAuthSignupHandoff,
      addAccount,
      prepareAddAccountSession,
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
      signInWithNaverNative,
      signInWithLineNative,
      completeOAuthSignupHandoff,
      addAccount,
      prepareAddAccountSession,
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
