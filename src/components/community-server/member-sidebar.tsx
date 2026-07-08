"use client";

import { useCommunityMembers } from "@/hooks/use-community-members";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { MemberListContent } from "@/components/community-server/member-list-content";
import type { CommunityMemberView } from "@/lib/community-server/types";

export function MemberSidebar({
  communityId,
  initialMembers,
}: {
  communityId: string;
  initialMembers?: CommunityMemberView[];
}) {
  const { data: members = [] } = useCommunityMembers(communityId, initialMembers);
  const { memberCount, welcomePending, openWelcome } = useCommunityMembership();

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-muted/20 border-l border-border/60 h-full min-h-0">
      <MemberListContent
        members={members}
        communityId={communityId}
        memberCount={memberCount}
        welcomePending={welcomePending}
        onHeaderClick={openWelcome}
      />
    </aside>
  );
}
