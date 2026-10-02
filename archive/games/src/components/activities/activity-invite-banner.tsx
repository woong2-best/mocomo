"use client";

import { useActivity } from "@/components/activities/activity-provider";
import { Button } from "@/components/ui/button";

export function ActivityInviteBanner() {
  const { incoming, acceptInvite, declineInvite, session } = useActivity();

  if (incoming) {
    return (
      <div className="shrink-0 border-b border-folk-terracotta/30 bg-folk-cream/90 px-3 py-2.5 flex flex-wrap items-center gap-2 justify-between">
        <p className="text-xs sm:text-sm font-medium text-foreground">
          <span className="font-bold">{incoming.from.username}</span>
          {" invited you to play "}
          <span className="font-bold text-folk-terracotta">{incoming.title}</span>.
        </p>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" className="h-8 rounded-lg" onClick={acceptInvite}>
            Accept
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" onClick={declineInvite}>
            Decline
          </Button>
        </div>
      </div>
    );
  }

  if (session?.phase === "inviting") {
    return (
      <div className="shrink-0 border-b border-folk-cobalt/15 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        초대를 보내는 중… 상대가 수락하면 채팅 안에서 바로 시작됩니다.
      </div>
    );
  }

  return null;
}
