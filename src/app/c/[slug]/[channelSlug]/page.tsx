import { notFound, redirect } from "next/navigation";
import { getCommunityServerContext, getCommunityChannelCached } from "@/lib/community-server/server-data";
import { PostsChannelView } from "@/components/community-server/channels/posts-channel";
import { SettingsChannelView } from "@/components/community-server/channels/settings-channel";
import { hasPermission } from "@/lib/community-server/permissions";

export const dynamic = "force-dynamic";

export default async function CommunityChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;

  const [ctx, channel] = await Promise.all([
    getCommunityServerContext(slug),
    getCommunityChannelCached(slug, channelSlug),
  ]);
  if (!ctx || !channel) notFound();

  if (channel.type === "SETTINGS") {
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

  if (channel.type === "POSTS") {
    return <PostsChannelView communitySlug={slug} communityId={ctx.communityId} />;
  }

  if (channel.type === "ANNOUNCEMENT") {
    redirect(`/c/${slug}?tab=notice`);
  }

  redirect(`/c/${slug}`);
}
