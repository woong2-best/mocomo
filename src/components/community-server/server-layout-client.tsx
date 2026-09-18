"use client";

import { Suspense, useEffect, useState } from "react";
import { ChannelSidebar } from "@/components/community-server/channel-sidebar";
import { CommunityRightRail } from "@/components/community-server/community-right-rail";
import { CommunityPresenceSync } from "@/components/community-server/presence-sync";
import { CommunityMembershipProvider } from "@/components/community-server/community-membership-context";
import { CommunityJoinBanner } from "@/components/community-server/community-join-banner";
import { MemberWelcomeDialog } from "@/components/community-server/member-welcome-dialog";
import { MobileMemberTabBar } from "@/components/community-server/mobile-member-tab";
import { MobileChannelDrawer } from "@/components/community-server/mobile-channel-drawer";
import { trackRecentCommunity } from "@/components/communities/recent-communities-bar";
import type { CommunityServerContext } from "@/lib/community-server/types";
import { hasPermission, canCreateCommunityChannel } from "@/lib/community-server/permissions";

export function CommunityServerLayoutClient({
  slug,
  initialContext,
  children,
}: {
  slug: string;
  initialContext: CommunityServerContext;
  children: React.ReactNode;
}) {
  const [memberOpen, setMemberOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);

  useEffect(() => {
    trackRecentCommunity(slug, initialContext.name);
  }, [slug, initialContext.name]);

  return (
    <CommunityMembershipProvider initial={initialContext}>
      <CommunityPresenceSync communityId={initialContext.communityId} />
      <MemberWelcomeDialog />
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
        <ChannelSidebar
          slug={slug}
          communityId={initialContext.communityId}
          communityName={initialContext.name}
          bannerUrl={initialContext.bannerUrl}
          bannerVideoUrl={initialContext.bannerVideoUrl}
          channels={initialContext.channels}
          isOwner={initialContext.isOwner}
          canCreateChannel={canCreateCommunityChannel(initialContext.permissions)}
          canAccessSettings={
            initialContext.isOwner ||
            hasPermission(initialContext.permissions, "manageServer") ||
            hasPermission(initialContext.permissions, "manageChannels") ||
            hasPermission(initialContext.permissions, "manageJoinRequests") ||
            hasPermission(initialContext.permissions, "manageRoles")
          }
        />
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <Suspense fallback={null}>
            <CommunityJoinBanner />
          </Suspense>
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</main>
          <div className="lg:hidden shrink-0 flex border-t border-border/60 bg-background">
            <MobileChannelDrawer
              slug={slug}
              communityId={initialContext.communityId}
              communitySlug={slug}
              channels={initialContext.channels}
              canCreateChannel={canCreateCommunityChannel(initialContext.permissions)}
              open={channelOpen}
              onOpenChange={setChannelOpen}
            />
            <MobileMemberTabBar
              communityId={initialContext.communityId}
              open={memberOpen}
              onOpenChange={setMemberOpen}
            />
          </div>
        </div>
        <CommunityRightRail />
      </div>
    </CommunityMembershipProvider>
  );
}
