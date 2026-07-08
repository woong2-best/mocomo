import { notFound } from "next/navigation";
import { CommunitySettingsForm } from "@/components/communities/community-settings-form";
import { CommunityRolesPanel } from "@/components/community-server/channels/settings-roles-panel";
import { CommunityJoinModeSettings } from "@/components/community-server/channels/settings-join-mode";
import { CommunityJoinRequestsPanel } from "@/components/community-server/channels/settings-join-requests";
import { CommunityChannelsPanel } from "@/components/community-server/channels/settings-channels-panel";
import { CommunityBansPanel } from "@/components/community-server/channels/settings-bans-panel";
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
      isNsfw: true,
      joinMode: true,
    },
  });
  if (!community) notFound();

  const canEditServer = isOwner || hasPermission(permissions, "editServerInfo");
  const canJoinMode = isOwner || hasPermission(permissions, "setJoinMode");
  const canJoinRequests =
    hasPermission(permissions, "manageJoinRequests") || hasPermission(permissions, "approveMembers");
  const canChannels =
    hasPermission(permissions, "manageChannels") || hasPermission(permissions, "createChannel");
  const canRoles = hasPermission(permissions, "manageRoles");
  const canBans = hasPermission(permissions, "banMembers");

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold">서버 설정</h1>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-8 max-w-2xl">
        {canEditServer && (
          <CommunitySettingsForm
            communityId={community.id}
            slug={communitySlug}
            initial={{
              name: community.name,
              description: community.description ?? "",
              category: community.category,
              isNsfw: community.isNsfw,
            }}
          />
        )}
        {canJoinMode && (
          <CommunityJoinModeSettings
            communityId={communityId}
            initialJoinMode={community.joinMode}
          />
        )}
        {canJoinRequests && community.joinMode === "APPROVE" && (
          <CommunityJoinRequestsPanel communityId={communityId} />
        )}
        {canChannels && (
          <CommunityChannelsPanel communityId={communityId} communitySlug={communitySlug} />
        )}
        {canBans && <CommunityBansPanel communityId={communityId} />}
        {canRoles && (
          <CommunityRolesPanel communityId={communityId} communitySlug={communitySlug} />
        )}
      </div>
    </div>
  );
}
