"use client";

import { MemberListContent } from "@/components/community-server/member-list-content";
import { useCommunityMembers } from "@/hooks/use-community-members";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";

export function MembersChannelClient({ communityId }: { communityId: string }) {
  const { data: members = [] } = useCommunityMembers(communityId);
  const { memberCount } = useCommunityMembership();

  return (
    <div className="flex flex-col h-full min-h-0 lg:hidden">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 lg:hidden">
        <h1 className="font-semibold">멤버 — {memberCount || members.length}명</h1>
      </header>
      <div className="flex flex-col flex-1 min-h-0">
        <MemberListContent members={members} communityId={communityId} memberCount={memberCount} />
      </div>
    </div>
  );
}
