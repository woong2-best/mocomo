"use client";

import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { CommunityComposeButton } from "@/components/compose/community-compose-button";
import { CommunityJoinBanner } from "@/components/community-server/community-join-banner";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { hasPermission } from "@/lib/community-server/permissions";
import { cn } from "@/lib/utils";

export function CommunityGalleryHeader({
  slug,
  name,
  description,
  memberCount,
}: {
  slug: string;
  name: string;
  description: string | null;
  memberCount: number;
}) {
  const { isOwner, isMember, permissions, communityId } = useCommunityMembership();
  const canSettings =
    isOwner ||
    hasPermission(permissions, "manageServer") ||
    hasPermission(permissions, "manageChannels") ||
    hasPermission(permissions, "manageJoinRequests") ||
    hasPermission(permissions, "manageRoles");
  const canWrite = (isMember || isOwner) && hasPermission(permissions, "createPosts");

  return (
    <header className="shrink-0 border-b border-[#c8c8d0] dark:border-border bg-white dark:bg-card">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-[#3b4890] dark:text-primary">
              QnA
            </p>
            <h1 className="text-xl sm:text-2xl font-black text-[#111] dark:text-foreground truncate">
              {name}
            </h1>
            {description?.trim() ? (
              <p className="mt-1 text-sm text-[#555] dark:text-muted-foreground line-clamp-2">
                {description.trim()}
              </p>
            ) : null}
            <p className="mt-1 flex items-center gap-1 text-[12px] text-[#777] dark:text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              멤버 {memberCount.toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canSettings ? (
              <Link
                href={`/c/${slug}/settings`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                aria-label="갤러리 관리"
              >
                <Settings className="h-4 w-4" />
              </Link>
            ) : null}
            {canWrite ? <CommunityComposeButton communityId={communityId} /> : null}
          </div>
        </div>
        <CommunityJoinBanner className={cn("rounded-lg border border-primary/20")} />
      </div>
    </header>
  );
}
