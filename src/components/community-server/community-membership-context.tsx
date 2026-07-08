"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { joinCommunityServer, markCommunityWelcomeSeen } from "@/actions/community-join";
import type { CommunityPermissions, CommunityServerContext } from "@/lib/community-server/types";
import { guestPermissions } from "@/lib/community-server/permissions";

type MembershipState = {
  isMember: boolean;
  isOwner: boolean;
  memberCount: number;
  permissions: CommunityPermissions;
  welcomePending: boolean;
  joinLoading: boolean;
  joinError: string | null;
  joinMessage: string | null;
};

type MembershipContextValue = MembershipState & {
  communityId: string;
  joinMode: CommunityServerContext["joinMode"];
  isLoggedIn: boolean;
  join: (inviteCode?: string) => Promise<void>;
  dismissWelcome: () => Promise<void>;
  openWelcome: () => void;
  welcomeOpen: boolean;
  setWelcomeOpen: (open: boolean) => void;
};

const MembershipContext = createContext<MembershipContextValue | null>(null);

export function CommunityMembershipProvider({
  initial,
  children,
}: {
  initial: CommunityServerContext;
  children: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<MembershipState>(() => ({
    isMember: initial.isMember,
    isOwner: initial.isOwner,
    memberCount: initial.memberCount,
    permissions: initial.permissions,
    welcomePending: initial.showWelcome,
    joinLoading: false,
    joinError: null,
    joinMessage: null,
  }));
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const join = useCallback(
    async (inviteCode?: string) => {
      setState((s) => ({ ...s, joinLoading: true, joinError: null, joinMessage: null }));
      try {
        if (!initial.isLoggedIn) {
          router.push(`/auth/signin?callbackUrl=/c/${initial.slug}`);
          return;
        }
        const result = await joinCommunityServer(initial.communityId, inviteCode);
        if ("error" in result && result.error) {
          setState((s) => ({ ...s, joinError: result.error }));
          return;
        }
        if ("pending" in result && result.pending) {
          setState((s) => ({ ...s, joinMessage: result.message }));
          return;
        }
        if ("isMember" in result && result.isMember) {
          setState((s) => ({
            ...s,
            isMember: true,
            memberCount: result.memberCount,
            permissions: result.permissions,
            welcomePending: result.showWelcome,
          }));
          if (result.showWelcome) setWelcomeOpen(true);
          void queryClient.invalidateQueries({
            queryKey: ["community-members", initial.communityId],
          });
        }
      } finally {
        setState((s) => ({ ...s, joinLoading: false }));
      }
    },
    [initial.communityId, initial.isLoggedIn, initial.slug, queryClient, router]
  );

  const dismissWelcome = useCallback(async () => {
    setWelcomeOpen(false);
    setState((s) => ({ ...s, welcomePending: false }));
    await markCommunityWelcomeSeen(initial.communityId);
  }, [initial.communityId]);

  const openWelcome = useCallback(() => {
    if (state.welcomePending) setWelcomeOpen(true);
  }, [state.welcomePending]);

  const value = useMemo<MembershipContextValue>(
    () => ({
      ...state,
      communityId: initial.communityId,
      joinMode: initial.joinMode,
      isLoggedIn: initial.isLoggedIn,
      join,
      dismissWelcome,
      openWelcome,
      welcomeOpen,
      setWelcomeOpen,
    }),
    [state, initial.communityId, initial.joinMode, initial.isLoggedIn, join, dismissWelcome, openWelcome, welcomeOpen]
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useCommunityMembership() {
  const ctx = useContext(MembershipContext);
  if (!ctx) {
    return {
      isMember: false,
      isOwner: false,
      memberCount: 0,
      permissions: guestPermissions(),
      welcomePending: false,
      joinLoading: false,
      joinError: null,
      joinMessage: null,
      communityId: "",
      joinMode: "OPEN" as const,
      isLoggedIn: false,
      join: async () => undefined,
      dismissWelcome: async () => undefined,
      openWelcome: () => undefined,
      welcomeOpen: false,
      setWelcomeOpen: () => undefined,
    };
  }
  return ctx;
}
