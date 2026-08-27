"use client";

import type { ReactNode } from "react";
import { ActivityRoom } from "@/components/activities/activity-room";
import { PostsChannelComposerBar } from "@/components/community-server/channels/posts-channel-composer-bar";

export function PostsChannelShell({
  communityId,
  children,
}: {
  communityId: string;
  children: ReactNode;
}) {
  return (
    <ActivityRoom contextType="community" contextId={communityId}>
      <div className="flex flex-col h-full min-h-0">
        {children}
        <div className="shrink-0 border-t border-border/60 bg-background">
          <PostsChannelComposerBar communityId={communityId} />
        </div>
      </div>
    </ActivityRoom>
  );
}
