"use client";

import { Suspense } from "react";
import { ChannelSidebar } from "@/components/community-server/channel-sidebar";
import { MemberSidebar } from "@/components/community-server/member-sidebar";
import { VoiceStatusBar } from "@/components/community-server/voice-status-bar";
import { CommunityVoiceProvider } from "@/components/community-server/community-voice-context";
import { CommunityPresenceSync } from "@/components/community-server/presence-sync";
import { CommunityMembershipProvider } from "@/components/community-server/community-membership-context";
import { CommunityJoinBanner } from "@/components/community-server/community-join-banner";
import { MemberWelcomeDialog } from "@/components/community-server/member-welcome-dialog";
import type { CommunityServerContext, CommunityMemberView } from "@/lib/community-server/types";
import { hasPermission } from "@/lib/community-server/permissions";

export function CommunityServerLayoutClient({
  slug,
  initialContext,
  initialMembers = [],
  children,
}: {
  slug: string;
  initialContext: CommunityServerContext;
  initialMembers?: CommunityMemberView[];
  children: React.ReactNode;
}) {
  return (
    <CommunityMembershipProvider initial={initialContext}>
      <CommunityVoiceProvider>
        <CommunityPresenceSync communityId={initialContext.communityId} />
        <MemberWelcomeDialog />
        <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
          <ChannelSidebar
            slug={slug}
            communityName={initialContext.name}
            channels={initialContext.channels}
            isOwner={initialContext.isOwner}
            canManageChannels={hasPermission(initialContext.permissions, "manageChannels")}
          />
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <Suspense fallback={null}>
              <CommunityJoinBanner />
            </Suspense>
            <main className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</main>
            <VoiceStatusBar />
          </div>
          <MemberSidebar communityId={initialContext.communityId} initialMembers={initialMembers} />
        </div>
      </CommunityVoiceProvider>
    </CommunityMembershipProvider>
  );
}
