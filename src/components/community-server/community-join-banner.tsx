"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { Loader2, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { cn } from "@/lib/utils";

export function CommunityJoinBanner({ className }: { className?: string }) {
  const {
    isMember,
    isOwner,
    joinLoading,
    joinError,
    joinMessage,
    join,
    joinMode,
    hasJoinPassword,
  } = useCommunityMembership();
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite") ?? undefined;
  const [joinPassword, setJoinPassword] = useState("");

  if (isMember || isOwner) return null;

  function handleJoinClick() {
    if (sessionStatus === "unauthenticated") {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (sessionStatus === "loading") return;
    void join(inviteCode, hasJoinPassword ? joinPassword : undefined);
  }

  const passwordReady = !hasJoinPassword || /^\d{4}$/.test(joinPassword);

  return (
    <div
      className={cn(
        "shrink-0 border-b border-primary/20 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{t("community-server.s8y91q1")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {joinMode === "APPROVE"
              ? t("community-server.s5q05z8")
              : joinMode === "INVITE_ONLY"
                ? t("community-server.s19wt3v8")
                : t("community-server.spapvi1")}
            {hasJoinPassword ? t("community-server.s7eelw4") : ""}
          </p>
          {hasJoinPassword && (
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              pattern="\d{4}"
              placeholder={t("community-server.sl9v02k")}
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="mt-2 h-8 w-36 font-mono tracking-[0.2em] text-sm"
              aria-label={t("community-server.s1053bfr")}
            />
          )}
          {joinError && <p className="text-xs text-destructive mt-1">{joinError}</p>}
          {joinMessage && <p className="text-xs text-emerald-600 mt-1">{joinMessage}</p>}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 rounded-xl"
        disabled={
          joinLoading ||
          sessionStatus === "loading" ||
          (joinMode === "INVITE_ONLY" && !inviteCode) ||
          !passwordReady
        }
        onClick={handleJoinClick}
      >
        {joinLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : sessionStatus === "loading" ? (
          t("community-server.sauj92q")
        ) : joinMode === "APPROVE" ? (
          t("community-server.s119e12k")
        ) : joinMode === "INVITE_ONLY" ? (
          t("community-server.s16xmak8")
        ) : (
          t("community-server.s1rbj4uc")
        )}
      </Button>
    </div>
  );
}
