"use client";

import { Suspense, useEffect } from "react";
import { CommunityGalleryHeader } from "@/components/community-server/community-gallery-header";
import { CommunityMembershipProvider } from "@/components/community-server/community-membership-context";
import { MemberWelcomeDialog } from "@/components/community-server/member-welcome-dialog";
import { trackRecentCommunity } from "@/components/communities/recent-communities-bar";
import type { CommunityServerContext } from "@/lib/community-server/types";

export function CommunityServerLayoutClient({
  slug,
  initialContext,
  children,
}: {
  slug: string;
  initialContext: CommunityServerContext;
  children: React.ReactNode;
}) {
  useEffect(() => {
    trackRecentCommunity(slug, initialContext.name);
  }, [slug, initialContext.name]);

  return (
    <CommunityMembershipProvider initial={initialContext}>
      <MemberWelcomeDialog />
      <div className="flex flex-col h-full min-h-0 w-full overflow-y-auto bg-[#efeff3] dark:bg-background">
        <Suspense fallback={null}>
          <CommunityGalleryHeader
            slug={slug}
            name={initialContext.name}
            description={initialContext.description}
            memberCount={initialContext.memberCount}
          />
        </Suspense>
        <main className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-3 pb-10">{children}</main>
      </div>
    </CommunityMembershipProvider>
  );
}
