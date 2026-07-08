"use client";

import { ChannelSidebar } from "@/components/community-server/channel-sidebar";
import { MemberSidebar } from "@/components/community-server/member-sidebar";
import { VoiceStatusBar } from "@/components/community-server/voice-status-bar";
import { CommunityVoiceProvider } from "@/components/community-server/community-voice-context";
import { CommunityPresenceSync } from "@/components/community-server/presence-sync";
import { useCommunityServer } from "@/hooks/use-community-server";
import type { CommunityServerContext, CommunityMemberView } from "@/lib/community-server/types";
import { hasPermission } from "@/lib/community-server/permissions";
import { Loader2 } from "lucide-react";

export function CommunityServerLayoutClient({
  slug,
  initialContext,
  initialMembers,
  children,
}: {
  slug: string;
  initialContext: CommunityServerContext;
  initialMembers: CommunityMemberView[];
  children: React.ReactNode;
}) {
  const { data: ctx, isLoading } = useCommunityServer(slug, initialContext);
  const server = ctx ?? initialContext;

  if (isLoading && !ctx) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        커뮤니티 로딩 중...
      </div>
    );
  }

  return (
    <CommunityVoiceProvider>
      <CommunityPresenceSync communityId={server.communityId} />
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
        <ChannelSidebar
          slug={slug}
          communityName={server.name}
          channels={server.channels}
          isOwner={server.isOwner}
          canManageChannels={hasPermission(server.permissions, "manageChannels")}
        />
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</main>
          <VoiceStatusBar />
        </div>
        <MemberSidebar communityId={server.communityId} initialMembers={initialMembers} />
      </div>
    </CommunityVoiceProvider>
  );
}
