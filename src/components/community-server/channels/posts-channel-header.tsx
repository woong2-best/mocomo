"use client";

import { CommunityComposeButton } from "@/components/compose/community-compose-button";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { MessageSquare } from "lucide-react";

export function PostsChannelHeader({ communityId }: { communityId: string }) {
  const { isMember, isOwner } = useCommunityMembership();

  return (
    <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
      <h1 className="font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        게시글
      </h1>
      {(isMember || isOwner) && <CommunityComposeButton communityId={communityId} />}
    </header>
  );
}

export function PostsChannelEmptyCta({ communityId }: { communityId: string }) {
  const { isMember, isOwner } = useCommunityMembership();
  if (!isMember && !isOwner) return null;
  return <CommunityComposeButton communityId={communityId} variant="secondary" />;
}
