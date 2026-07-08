"use client";

import { Users } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MemberListContent } from "@/components/community-server/member-list-content";
import { useCommunityMembers } from "@/hooks/use-community-members";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { cn } from "@/lib/utils";

export function MobileMemberDrawer({
  communityId,
  open,
  onOpenChange,
}: {
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: members = [] } = useCommunityMembers(communityId);
  const { memberCount, welcomePending, openWelcome } = useCommunityMembership();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layer="stack"
        className={cn(
          "fixed inset-y-0 right-0 left-auto top-0 h-full w-[min(100vw,20rem)] max-w-full",
          "translate-x-0 translate-y-0 rounded-none border-l p-0 gap-0 flex flex-col"
        )}
      >
        <div className="flex flex-col h-full min-h-0 bg-muted/20">
          <MemberListContent
            members={members}
            communityId={communityId}
            memberCount={memberCount}
            welcomePending={welcomePending}
            onHeaderClick={openWelcome}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MobileMemberTabBar({
  communityId,
  open,
  onOpenChange,
}: {
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { welcomePending } = useCommunityMembership();

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs text-muted-foreground hover:text-foreground relative"
      >
        <Users className="h-5 w-5" />
        <span>멤버</span>
        {welcomePending && (
          <span className="absolute top-2 right-[calc(50%-1.25rem)] h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>
      <MobileMemberDrawer communityId={communityId} open={open} onOpenChange={onOpenChange} />
    </>
  );
}
