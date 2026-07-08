"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";

export function MemberWelcomeDialog() {
  const { welcomeOpen, welcomePending, dismissWelcome, setWelcomeOpen } =
    useCommunityMembership();

  if (!welcomePending && !welcomeOpen) return null;

  return (
    <Dialog
      open={welcomeOpen}
      onOpenChange={(open) => {
        setWelcomeOpen(open);
        if (!open) void dismissWelcome();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">🎉 멤버가 되신 것을 축하합니다!</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-2">
            이제 이 커뮤니티의 게시글 작성, 댓글, 채팅, 음성채널 등 모든 기능을 이용할 수
            있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={() => void dismissWelcome()}>
            시작하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
