import { notFound } from "next/navigation";
import { getCommunityServerContext } from "@/lib/community-server/server-data";
import { SettingsChannelView } from "@/components/community-server/channels/settings-channel";
import { hasPermission } from "@/lib/community-server/permissions";

export const dynamic = "force-dynamic";

export default async function CommunitySettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getCommunityServerContext(slug);
  if (!ctx) notFound();
  if (
    !ctx.isOwner &&
    !hasPermission(ctx.permissions, "manageServer") &&
    !hasPermission(ctx.permissions, "manageChannels") &&
    !hasPermission(ctx.permissions, "manageJoinRequests") &&
    !hasPermission(ctx.permissions, "manageRoles")
  ) {
    notFound();
  }

  return (
    <SettingsChannelView
      communityId={ctx.communityId}
      communitySlug={slug}
      isOwner={ctx.isOwner}
      permissions={ctx.permissions}
    />
  );
}
