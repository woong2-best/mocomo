"use client";

import { ChannelSidebar } from "@/components/community-server/channel-sidebar";
import { MemberSidebar } from "@/components/community-server/member-sidebar";
import { VoiceStatusBar } from "@/components/community-server/voice-status-bar";
import { CommunityVoiceProvider } from "@/components/community-server/community-voice-context";
import { CommunityPresenceSync } from "@/components/community-server/presence-sync";
import type { CommunityServerContext, CommunityMemberView } from "@/lib/community-server/types";
import { hasPermission } from "@/lib/community-server/permissions";

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
  // 서버 RSC initialData만 사용 — 채널 전환마다 /api refetch 하지 않음
  const server = initialContext;

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
