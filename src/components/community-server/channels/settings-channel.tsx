import { notFound } from "next/navigation";
import { CommunitySettingsForm } from "@/components/communities/community-settings-form";
import { CommunityRolesPanel } from "@/components/community-server/channels/settings-roles-panel";
import { CommunityJoinModeSettings } from "@/components/community-server/channels/settings-join-mode";
import { CommunityJoinRequestsPanel } from "@/components/community-server/channels/settings-join-requests";
import { CommunityBansPanel } from "@/components/community-server/channels/settings-bans-panel";
import { CommunityBrandingSettings } from "@/components/community-server/channels/settings-branding";
import { CommunityReportsPanel } from "@/components/community-server/channels/settings-reports-panel";
import { CommunityStatsAuditPanel } from "@/components/community-server/channels/settings-stats-panel";
import { SettingsLazySection } from "@/components/community-server/channels/settings-lazy-section";
import { hasPermission } from "@/lib/community-server/permissions";
import type { CommunityPermissions } from "@/lib/community-server/types";
import { db } from "@/lib/db";

export async function SettingsChannelView({
  communityId,
  communitySlug,
  isOwner,
  permissions,
}: {
  communityId: string;
  communitySlug: string;
  isOwner: boolean;
  permissions: CommunityPermissions;
}) {
  const canManage =
    isOwner ||
    hasPermission(permissions, "manageServer") ||
    hasPermission(permissions, "manageChannels") ||
    hasPermission(permissions, "manageJoinRequests") ||
    hasPermission(permissions, "manageRoles");

  if (!canManage) notFound();

  const community = await db.community.findUnique({
    where: { id: communityId },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      customCategoryLabel: true,
      isNsfw: true,
      iconUrl: true,
      coverUrl: true,
      bannerUrl: true,
      bannerVideoUrl: true,
      isPublic: true,
      joinMode: true,
      joinPasswordHash: true,
    },
  });
  if (!community) notFound();

  const canEditServer = isOwner || hasPermission(permissions, "editServerInfo");
  const canJoinMode = isOwner || hasPermission(permissions, "setJoinMode");
  const canJoinRequests =
    hasPermission(permissions, "manageJoinRequests") || hasPermission(permissions, "approveMembers");
  const canRoles = hasPermission(permissions, "manageRoles");
  const canBans = hasPermission(permissions, "banMembers");
  const canReports = hasPermission(permissions, "handleReports");
  const canStats = hasPermission(permissions, "viewStats") || hasPermission(permissions, "viewAuditLog");
  const canBranding =
    isOwner ||
    hasPermission(permissions, "editIcon") ||
    hasPermission(permissions, "editBanner") ||
    hasPermission(permissions, "setVisibility") ||
    hasPermission(permissions, "deleteServer");

  return (
    <div className="flex flex-col">
      <header className="px-1 pb-3">
        <h1 className="font-semibold">갤러리 관리</h1>
      </header>
      <div className="space-y-8 max-w-2xl">
        {canEditServer && (
          <CommunitySettingsForm
            communityId={community.id}
            slug={communitySlug}
            initial={{
              name: community.name,
              description: community.description ?? "",
              category: community.category,
              customCategoryLabel: community.customCategoryLabel,
              isNsfw: community.isNsfw,
            }}
          />
        )}
        {canBranding && (
          <CommunityBrandingSettings
            communityId={communityId}
            slug={communitySlug}
            initial={{
              iconUrl: community.iconUrl,
              coverUrl: community.coverUrl,
              bannerUrl: community.bannerUrl,
              bannerVideoUrl: community.bannerVideoUrl,
              isPublic: community.isPublic,
            }}
          />
        )}
        {canJoinMode && (
          <SettingsLazySection title="가입 방식" defaultOpen>
            <CommunityJoinModeSettings
              communityId={communityId}
              initialJoinMode={community.joinMode}
              initialHasJoinPassword={!!community.joinPasswordHash}
            />
          </SettingsLazySection>
        )}
        {canJoinRequests && community.joinMode === "APPROVE" && (
          <SettingsLazySection title="가입 요청">
            <CommunityJoinRequestsPanel communityId={communityId} />
          </SettingsLazySection>
        )}
        {canBans && (
          <SettingsLazySection title="차단 목록">
            <CommunityBansPanel communityId={communityId} />
          </SettingsLazySection>
        )}
        {canReports && (
          <SettingsLazySection title="신고">
            <CommunityReportsPanel communityId={communityId} />
          </SettingsLazySection>
        )}
        {canStats && (
          <SettingsLazySection title="통계 · 활동 로그">
            <CommunityStatsAuditPanel communityId={communityId} />
          </SettingsLazySection>
        )}
        {canRoles && (
          <SettingsLazySection title="역할">
            <CommunityRolesPanel communityId={communityId} communitySlug={communitySlug} />
          </SettingsLazySection>
        )}
      </div>
    </div>
  );
}
