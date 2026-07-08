"use client";

import { Loader2, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  } = useCommunityMembership();
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite") ?? undefined;

  if (isMember || isOwner) return null;

  function handleJoinClick() {
    if (sessionStatus === "unauthenticated") {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (sessionStatus === "loading") return;
    void join(inviteCode);
  }

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
          <p className="font-semibold text-sm">커뮤니티 둘러보기 중</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {joinMode === "APPROVE"
              ? "게시글과 채팅은 읽기 전용입니다. 참여하려면 가입 요청을 보내세요."
              : joinMode === "INVITE_ONLY"
                ? "초대 링크가 있는 멤버만 참여할 수 있습니다."
                : "게시글과 채팅은 읽기 전용입니다. 참여하면 글 작성·댓글·음성 채널을 이용할 수 있어요."}
          </p>
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
          (joinMode === "INVITE_ONLY" && !inviteCode)
        }
        onClick={handleJoinClick}
      >
        {joinLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : sessionStatus === "loading" ? (
          "확인 중…"
        ) : joinMode === "APPROVE" ? (
          "가입 요청하기"
        ) : joinMode === "INVITE_ONLY" ? (
          "초대 필요"
        ) : (
          "커뮤니티 참여하기"
        )}
      </Button>
    </div>
  );
}
